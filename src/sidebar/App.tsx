import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { AgentStatusPanel } from './components/AgentStatus';
import { ActionLog } from './components/ActionLog';
import { MemoryPanel } from './components/MemoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { PermissionDialog } from './components/PermissionDialog';
import { WorkflowViz } from './components/WorkflowViz';
import { ResonancePanel } from './components/ResonancePanel';

// ─── Tab Definitions ──────────────────────────────────────────────────────────

type Tab = 'chat' | 'activity' | 'memory' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'activity', label: 'Activity', icon: '📊' },
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
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
          <span className="text-lg">🦊</span>
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
            <span className="text-base">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Permission Dialog Overlay */}
      <PermissionDialog />
    </div>
  );
}
