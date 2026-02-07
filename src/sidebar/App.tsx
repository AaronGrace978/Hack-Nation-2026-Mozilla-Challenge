import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { AgentStatusPanel } from './components/AgentStatus';
import { ActionLog } from './components/ActionLog';
import { MemoryPanel } from './components/MemoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { PermissionDialog } from './components/PermissionDialog';
import { WorkflowViz } from './components/WorkflowViz';
import { ResonancePanel } from './components/ResonancePanel';

// ─── SVG Icon Components ──────────────────────────────────────────────────────

const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconMemory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ─── Tab Definitions ──────────────────────────────────────────────────────────

type Tab = 'chat' | 'activity' | 'memory' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <IconChat /> },
  { id: 'activity', label: 'Activity', icon: <IconActivity /> },
  { id: 'memory', label: 'Memory', icon: <IconMemory /> },
  { id: 'settings', label: 'Settings', icon: <IconSettings /> },
];

// ─── Activity Sub-tabs ────────────────────────────────────────────────────────

type ActivityView = 'agents' | 'workflow' | 'log' | 'resonance';

// ─── App Component ────────────────────────────────────────────────────────────

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [activityView, setActivityView] = useState<ActivityView>('agents');

  return (
    <div className="flex flex-col h-screen bg-dark-0 text-surface-3">
      {/* Header — Mozilla Hackathon branded */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-dark-3 bg-dark-1">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-nexus-400">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h1 className="text-sm font-bold firefox-flame tracking-tight">Nexus</h1>
          <span className="text-[10px] text-nexus-400 bg-nexus-600/10 px-1.5 py-0.5 rounded border border-nexus-600/20">
            Mozilla Hackathon
          </span>
        </div>
        <span className="text-[9px] text-dark-4 opacity-70 tracking-wide">BostonAi.io</span>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'activity' && (
          <div className="flex flex-col h-full">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-dark-3 bg-dark-1">
              {([
                { id: 'agents' as const, label: 'Agents' },
                { id: 'workflow' as const, label: 'Workflow' },
                { id: 'log' as const, label: 'Audit Log' },
                { id: 'resonance' as const, label: 'Resonance' },
              ]).map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActivityView(sub.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                    activityView === sub.id
                      ? 'bg-nexus-600/20 text-nexus-400'
                      : 'text-dark-4 hover:text-surface-3'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {activityView === 'agents' && <AgentStatusPanel />}
              {activityView === 'workflow' && <WorkflowViz />}
              {activityView === 'log' && <ActionLog />}
              {activityView === 'resonance' && <ResonancePanel />}
            </div>
          </div>
        )}
        {activeTab === 'memory' && <MemoryPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* Tab Bar */}
      <nav className="flex items-center border-t border-dark-3 bg-dark-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
              activeTab === tab.id
                ? 'text-nexus-400'
                : 'text-dark-4 hover:text-surface-3'
            }`}
          >
            <span className="flex items-center justify-center">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Permission Dialog Overlay */}
      <PermissionDialog />
    </div>
  );
}
