import React from 'react';
import { useAgents } from '../hooks/useAgents';
import { AgentRole, AgentStatus as AgentStatusEnum } from '../../agents/types';

// ─── Agent Status Cards ───────────────────────────────────────────────────────

// BostonAi.io — Agent Names (Corporate / Soul)
const AGENT_META: Record<string, { icon: string; label: string; soulName: string; color: string }> = {
  [AgentRole.ORCHESTRATOR]: { icon: '🎯', label: 'Orchestrator', soulName: 'The Conductor', color: 'border-yellow-500/30' },
  [AgentRole.NAVIGATOR]: { icon: '🧭', label: 'Navigator', soulName: 'Pathfinder', color: 'border-blue-500/30' },
  [AgentRole.RESEARCHER]: { icon: '🔍', label: 'Researcher', soulName: 'Deep Lens', color: 'border-green-500/30' },
  [AgentRole.MEMORY]: { icon: '🧠', label: 'Memory', soulName: 'Echo Keeper', color: 'border-purple-500/30' },
  [AgentRole.GUARDIAN]: { icon: '🛡️', label: 'Guardian', soulName: 'Sentinel', color: 'border-red-500/30' },
};

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  [AgentStatusEnum.IDLE]: { dot: 'bg-dark-4', label: 'Idle' },
  [AgentStatusEnum.THINKING]: { dot: 'bg-yellow-400 animate-pulse', label: 'Thinking' },
  [AgentStatusEnum.EXECUTING]: { dot: 'bg-green-400 animate-pulse', label: 'Executing' },
  [AgentStatusEnum.WAITING_PERMISSION]: { dot: 'bg-orange-400 animate-pulse', label: 'Awaiting Permission' },
  [AgentStatusEnum.COMPLETED]: { dot: 'bg-green-400', label: 'Completed' },
  [AgentStatusEnum.ERROR]: { dot: 'bg-red-400', label: 'Error' },
  [AgentStatusEnum.PAUSED]: { dot: 'bg-blue-400', label: 'Paused' },
};

export function AgentStatusPanel() {
  const { activities, workflow, cancelWorkflow } = useAgents();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Workflow Status */}
      {workflow && (
        <div className="px-3 py-2 bg-dark-2 border-b border-dark-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-surface-0">Active Workflow</span>
            {workflow.status === 'in_progress' && (
              <button
                onClick={cancelWorkflow}
                className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="text-xs text-dark-4 truncate">{workflow.userIntent}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              workflow.status === 'in_progress' ? 'bg-nexus-600/20 text-nexus-400' :
              workflow.status === 'completed' ? 'bg-green-500/20 text-green-400' :
              workflow.status === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-dark-3 text-dark-4'
            }`}>
              {workflow.status}
            </span>
            <span className="text-[10px] text-dark-4">
              {workflow.tasks.length} tasks
            </span>
          </div>
        </div>
      )}

      {/* Agent Cards */}
      <div className="p-3 space-y-2">
        <h3 className="text-xs font-semibold text-dark-4 uppercase tracking-wider mb-2">
          Agent Status
        </h3>

        {Object.values(AgentRole).map((role) => {
          const meta = AGENT_META[role];
          if (!meta) return null;
          const activity = activities.find((a) => a.agentRole === role);
          const status = activity?.status ?? AgentStatusEnum.IDLE;
          const style = STATUS_STYLES[status] ?? STATUS_STYLES[AgentStatusEnum.IDLE];

          return (
            <div
              key={role}
              className={`bg-dark-2 rounded-lg p-2.5 border-l-2 ${meta.color} animate-fade-in`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{meta.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-surface-0">{meta.label}</span>
                    <span className="text-[9px] text-dark-4 -mt-0.5">{meta.soulName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  <span className="text-[10px] text-dark-4">{style.label}</span>
                </div>
              </div>
              {activity?.lastAction && (
                <p className="text-[11px] text-dark-4 mt-1 truncate pl-6">
                  {activity.lastAction}
                </p>
              )}
              {activity?.currentTask && (
                <p className="text-[11px] text-nexus-400 mt-0.5 truncate pl-6">
                  {activity.currentTask}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Task List */}
      {workflow?.tasks && workflow.tasks.length > 0 && (
        <div className="p-3 border-t border-dark-3">
          <h3 className="text-xs font-semibold text-dark-4 uppercase tracking-wider mb-2">
            Tasks
          </h3>
          <div className="space-y-1.5">
            {workflow.tasks.map((task, idx) => (
              <div
                key={task.id}
                className="flex items-center gap-2 text-xs"
              >
                <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] ${
                  task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  task.status === 'in_progress' ? 'bg-nexus-600/20 text-nexus-400' :
                  task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-dark-3 text-dark-4'
                }`}>
                  {task.status === 'completed' ? '✓' : 
                   task.status === 'failed' ? '✕' : 
                   task.status === 'in_progress' ? '⟳' : (idx + 1)}
                </span>
                <span className={`flex-1 truncate ${
                  task.status === 'completed' ? 'text-dark-4 line-through' : 'text-surface-3'
                }`}>
                  {task.description}
                </span>
                <span className="text-[10px] text-dark-4 capitalize">
                  {task.assignedAgent}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
