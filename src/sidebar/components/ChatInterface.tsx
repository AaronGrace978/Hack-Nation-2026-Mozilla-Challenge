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

const AGENT_ICONS: Record<string, string> = {
  orchestrator: '🎯',
  navigator: '🧭',
  researcher: '🔍',
  memory: '🧠',
  guardian: '🛡️',
};

// ─── Chat Interface Component ─────────────────────────────────────────────────

export function ChatInterface() {
  const { messages, isProcessing, sendMessage } = useChat();
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
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (() => {
          const phase = resonanceField.getConnectionPhase();
          const isPartner = phase === 'Resonant Partnership';
          return (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60 px-4">
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="text-sm font-semibold text-surface-0 mb-1">
              {isPartner ? 'Good to see you, partner' : phase === 'Introduction' ? 'Welcome to Nexus' : 'Welcome back'}
            </h3>
            <p className="text-xs text-dark-4 leading-relaxed">
              {isPartner
                ? "We're in sync. Tell me what you need — I'll anticipate, coordinate, and have your back."
                : 'Your universal web agent. Tell me what you need — I\'ll coordinate across sites, remember your preferences, and always ask before acting.'}
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
          <span>{AGENT_ICONS[message.agentRole] ?? '🤖'}</span>
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
