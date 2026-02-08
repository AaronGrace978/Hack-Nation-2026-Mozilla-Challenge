import { useState, useEffect, useCallback } from 'react';
import type { AgentActivity, Workflow } from '../../agents/types';
import { ExtMessageType, type ExtMessage, type StateSync, type ChatMessagePayload } from '../../shared/messages';

// ─── Background Connection with Auto-Reconnect ──────────────────────────────

let port: chrome.runtime.Port | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = 15;

const listeners = new Set<(msg: ExtMessage) => void>();
const connectionListeners = new Set<(connected: boolean) => void>();

function notifyConnection(connected: boolean): void {
  for (const listener of connectionListeners) {
    listener(connected);
  }
}

function connect(): chrome.runtime.Port {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  port = chrome.runtime.connect({ name: 'nexus-sidebar' });
  reconnectAttempts = 0;
  notifyConnection(true);

  port.onMessage.addListener((msg: ExtMessage) => {
    for (const listener of listeners) {
      listener(msg);
    }
  });

  port.onDisconnect.addListener(() => {
    port = null;
    notifyConnection(false);
    scheduleReconnect();
  });

  return port;
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  // Exponential backoff: 500ms, 1s, 2s, 4s, ... up to 30s
  const delay = Math.min(500 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    try {
      connect();
      // Re-request full state after successful reconnect
      sendToBackground(ExtMessageType.GET_STATE, {});
    } catch {
      // connect() will call scheduleReconnect via onDisconnect
    }
  }, delay);
}

function getPort(): chrome.runtime.Port {
  if (!port) {
    return connect();
  }
  return port;
}

export function sendToBackground(type: ExtMessageType, payload: unknown): void {
  try {
    const p = getPort();
    p.postMessage({ type, payload, timestamp: Date.now() });
  } catch {
    port = null;
    notifyConnection(false);
    scheduleReconnect();
  }
}

export function subscribe(listener: (msg: ExtMessage) => void): () => void {
  listeners.add(listener);
  getPort(); // Ensure connection
  return () => listeners.delete(listener);
}

// ─── Connection Status Hook ──────────────────────────────────────────────────

export function useConnectionStatus() {
  const [connected, setConnected] = useState(port !== null);

  useEffect(() => {
    const listener = (c: boolean) => setConnected(c);
    connectionListeners.add(listener);
    setConnected(port !== null);
    return () => { connectionListeners.delete(listener); };
  }, []);

  return connected;
}

// ─── Agent State Hook ────────────────────────────────────────────────────────

export function useAgents() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      switch (msg.type) {
        case ExtMessageType.AGENT_ACTIVITY:
          setActivities((prev) => {
            const activity = msg.payload as AgentActivity;
            const idx = prev.findIndex((a) => a.agentRole === activity.agentRole);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = activity;
              return updated;
            }
            return [...prev, activity];
          });
          break;

        case ExtMessageType.WORKFLOW_UPDATE:
          setWorkflow(msg.payload as Workflow);
          break;

        case ExtMessageType.STATE_SYNC: {
          const state = msg.payload as StateSync;
          setWorkflow(state.workflow);
          if (state.activities.length) setActivities(state.activities);
          break;
        }
      }
    });

    // Request initial state
    sendToBackground(ExtMessageType.GET_STATE, {});

    return unsub;
  }, []);

  const cancelWorkflow = useCallback(() => {
    sendToBackground(ExtMessageType.CANCEL_WORKFLOW, {});
  }, []);

  return { activities, workflow, cancelWorkflow };
}

// ─── Chat Hook ───────────────────────────────────────────────────────────────

export function useChat() {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const isConnected = useConnectionStatus();

  // Reset processing state when connection is lost
  useEffect(() => {
    if (!isConnected) {
      setIsProcessing(false);
    }
  }, [isConnected]);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      switch (msg.type) {
        case ExtMessageType.CHAT_MESSAGE: {
          const newMsg = msg.payload as ChatMessagePayload;
          setMessages((prev) => {
            // Deduplicate: if the server echoes back a user message we already
            // added optimistically (id starts with 'local-'), replace it with
            // the server-confirmed version.
            if (newMsg.role === 'user') {
              const localIdx = prev.findIndex(
                (m) =>
                  m.id.startsWith('local-') &&
                  m.content === newMsg.content &&
                  Math.abs(m.timestamp - newMsg.timestamp) < 5000,
              );
              if (localIdx >= 0) {
                const updated = [...prev];
                updated[localIdx] = newMsg;
                return updated;
              }
            }
            return [...prev, newMsg];
          });
          break;
        }

        case ExtMessageType.WORKFLOW_UPDATE: {
          const workflow = msg.payload as Workflow;
          setIsProcessing(workflow.status === 'in_progress');
          break;
        }

        case ExtMessageType.STATE_SYNC: {
          const state = msg.payload as StateSync;
          if (state.chatHistory.length) setMessages(state.chatHistory);
          if (state.workflow) {
            setIsProcessing(state.workflow.status === 'in_progress');
          } else {
            setIsProcessing(false);
          }
          break;
        }
      }
    });

    sendToBackground(ExtMessageType.GET_STATE, {});

    return unsub;
  }, []);

  const sendMessage = useCallback((text: string, attachments?: unknown[]) => {
    // Optimistic UI: add user message to local state immediately so it
    // appears without waiting for the background to echo it back.
    const userMsg: ChatMessagePayload = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);
    sendToBackground(ExtMessageType.USER_INPUT, { text, attachments });
  }, []);

  // Safety: if isProcessing stays true for > 3 minutes, something hung — reset it
  useEffect(() => {
    if (!isProcessing) return;
    const safetyTimer = setTimeout(() => {
      setIsProcessing(false);
    }, 3 * 60 * 1000);
    return () => clearTimeout(safetyTimer);
  }, [isProcessing]);

  return { messages, isProcessing, sendMessage, isConnected };
}
