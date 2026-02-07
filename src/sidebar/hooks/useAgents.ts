import { useState, useEffect, useCallback } from 'react';
import type { AgentActivity, Workflow } from '../../agents/types';
import { ExtMessageType, type ExtMessage, type StateSync, type ChatMessagePayload } from '../../shared/messages';

// ─── Background Connection Hook ──────────────────────────────────────────────

let port: chrome.runtime.Port | null = null;
const listeners = new Set<(msg: ExtMessage) => void>();

function getPort(): chrome.runtime.Port {
  if (!port) {
    port = chrome.runtime.connect({ name: 'nexus-sidebar' });
    port.onMessage.addListener((msg: ExtMessage) => {
      for (const listener of listeners) {
        listener(msg);
      }
    });
    port.onDisconnect.addListener(() => {
      port = null;
    });
  }
  return port;
}

export function sendToBackground(type: ExtMessageType, payload: unknown): void {
  try {
    const p = getPort();
    p.postMessage({ type, payload, timestamp: Date.now() });
  } catch {
    port = null;
  }
}

export function subscribe(listener: (msg: ExtMessage) => void): () => void {
  listeners.add(listener);
  getPort(); // Ensure connection
  return () => listeners.delete(listener);
}

// ─── Agent State Hook ─────────────────────────────────────────────────────────

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

// ─── Chat Hook ────────────────────────────────────────────────────────────────

export function useChat() {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      switch (msg.type) {
        case ExtMessageType.CHAT_MESSAGE:
          setMessages((prev) => [...prev, msg.payload as ChatMessagePayload]);
          break;

        case ExtMessageType.WORKFLOW_UPDATE: {
          const workflow = msg.payload as Workflow;
          setIsProcessing(workflow.status === 'in_progress');
          break;
        }

        case ExtMessageType.STATE_SYNC: {
          const state = msg.payload as StateSync;
          if (state.chatHistory.length) setMessages(state.chatHistory);
          break;
        }
      }
    });

    sendToBackground(ExtMessageType.GET_STATE, {});

    return unsub;
  }, []);

  const sendMessage = useCallback((text: string, attachments?: unknown[]) => {
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

  return { messages, isProcessing, sendMessage };
}
