import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useAgents';
import { VoiceInput } from './VoiceInput';
import { resonanceField } from '../../memory/resonance-field';
import type { ChatMessagePayload } from '../../shared/messages';

// ─── Page Awareness Hook ──────────────────────────────────────────────────────

function usePageAwareness() {
  const [pageInfo, setPageInfo] = useState<{ url: string; title: string; domain: string } | null>(null);

  useEffect(() => {
    const update = () => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs?.[0];
          if (tab?.url && !tab.url.startsWith('chrome://')) {
            setPageInfo({
              url: tab.url,
              title: tab.title ?? '',
              domain: new URL(tab.url).hostname,
            });
          } else {
            setPageInfo(null);
          }
        });
      } catch {
        setPageInfo(null);
      }
    };

    update();
    // Poll every 2 seconds for tab changes
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

  return pageInfo;
}

// ─── Agent Role Colors ────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  orchestrator: 'text-yellow-400',
  navigator: 'text-blue-400',
  researcher: 'text-green-400',
  memory: 'text-purple-400',
  guardian: 'text-red-400',
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  orchestrator: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  navigator: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  ),
  researcher: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  memory: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  guardian: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

// ─── Chat Interface Component ─────────────────────────────────────────────────

export function ChatInterface() {
  const { messages, isProcessing, sendMessage, isConnected } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pageInfo = usePageAwareness();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isProcessing) return;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceResult = React.useCallback((text: string) => {
    if (!text.trim() || isProcessing) {
      setInput(text);
      return;
    }
    sendMessage(text.trim());
    setInput('');
  }, [isProcessing, sendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="px-3 py-1.5 bg-amber-900/30 border-b border-amber-700/40 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] text-amber-300">Reconnecting to Nexus...</span>
        </div>
      )}
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (() => {
          const phase = resonanceField.getConnectionPhase();
          const isPartner = phase === 'Resonant Partnership';
          return (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60 px-4">
            <div className="mb-2 text-nexus-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-surface-0 mb-1">
              {isPartner ? 'Good to see you, partner' : phase === 'Introduction' ? 'Welcome to Nexus' : 'Welcome back'}
            </h3>
            <p className="text-xs text-dark-4 leading-relaxed">
              {isPartner
                ? "We're in sync. Tell me what you need — I'll anticipate, coordinate, and have your back."
                : 'Your universal web agent — built for the Mozilla Web Agent API Hackathon. Tell me what you need — I\'ll coordinate across sites, remember your preferences, and always ask before acting.'}
            </p>
            <div className="mt-4 space-y-1.5 text-xs text-left w-full">
              <SuggestionChip
                text="Find the refund policy on this site and summarize it"
                onClick={(t) => sendMessage(t)}
              />
              <SuggestionChip
                text="Compare prices for wireless headphones across 3 stores"
                onClick={(t) => sendMessage(t)}
              />
              <SuggestionChip
                text="Set my budget to $100 and preferred brands to Sony, Bose"
                onClick={(t) => sendMessage(t)}
              />
            </div>
          </div>
          );
        })()}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              <span className="typing-dot w-1.5 h-1.5 bg-nexus-400 rounded-full" />
              <span className="typing-dot w-1.5 h-1.5 bg-nexus-400 rounded-full" />
              <span className="typing-dot w-1.5 h-1.5 bg-nexus-400 rounded-full" />
            </div>
            <span className="text-xs text-dark-4">Working on it...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Page Awareness Indicator */}
      {pageInfo && (
        <div className="px-3 py-1 bg-dark-1 border-t border-dark-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-dark-4 truncate">
            Seeing: <span className="text-surface-3">{pageInfo.domain}</span>
            {pageInfo.title ? ` — ${pageInfo.title.substring(0, 40)}` : ''}
          </span>
          <span className="text-[9px] text-dark-4 ml-auto opacity-50">+ screenshot</span>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-dark-3 p-3">
        <div className="flex items-end gap-2 bg-dark-2 rounded-xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-surface-0 placeholder-dark-4 outline-none resize-none max-h-24"
            style={{ lineHeight: '1.4' }}
          />
          <VoiceInput onResult={handleVoiceResult} />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className="p-1.5 rounded-lg bg-nexus-600 text-white disabled:opacity-30 hover:bg-nexus-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessagePayload }) {
  const isUser = message.role === 'user';
  const isAgent = message.role === 'agent';

  return (
    <div className={`animate-slide-up ${isUser ? 'flex justify-end' : ''}`}>
      {isAgent && message.agentRole && (
        <div className={`flex items-center gap-1 mb-0.5 text-xs ${AGENT_COLORS[message.agentRole] ?? 'text-dark-4'}`}>
          <span className="flex items-center">{AGENT_ICONS[message.agentRole] ?? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="3" /><line x1="12" y1="8" x2="12" y2="11" />
            </svg>
          )}</span>
          <span className="capitalize">{message.agentRole}</span>
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-nexus-600 text-white rounded-br-md'
            : 'bg-dark-2 text-surface-0 rounded-bl-md'
        }`}
      >
        <div className="markdown-content whitespace-pre-wrap">{message.content}</div>
      </div>
      <div className="text-[10px] text-dark-4 mt-0.5 px-1">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

// ─── Suggestion Chip ──────────────────────────────────────────────────────────

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="w-full text-left px-3 py-2 rounded-lg bg-dark-2 hover:bg-dark-3 text-xs text-surface-3 hover:text-surface-0 transition-colors border border-dark-3"
    >
      {text}
    </button>
  );
}
