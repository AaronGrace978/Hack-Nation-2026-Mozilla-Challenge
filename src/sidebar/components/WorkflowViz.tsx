import React from 'react';
import { useAgents } from '../hooks/useAgents';
import { TaskStatus } from '../../agents/types';

// ─── Workflow Visualization ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  [TaskStatus.PENDING]: { icon: '○', color: 'text-dark-4', bg: 'bg-dark-3' },
  [TaskStatus.IN_PROGRESS]: { icon: '◉', color: 'text-nexus-400', bg: 'bg-nexus-600/20' },
  [TaskStatus.COMPLETED]: { icon: '✓', color: 'text-green-400', bg: 'bg-green-500/20' },
  [TaskStatus.FAILED]: { icon: '✕', color: 'text-red-400', bg: 'bg-red-500/20' },
  [TaskStatus.CANCELLED]: { icon: '—', color: 'text-dark-4', bg: 'bg-dark-3' },
  [TaskStatus.BLOCKED]: { icon: '⊘', color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

export function WorkflowViz() {
  const { workflow } = useAgents();

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-dark-4">
        No active workflow. Start a conversation to see tasks here.
      </div>
    );
  }

  const completedCount = workflow.tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const progress = workflow.tasks.length > 0 ? (completedCount / workflow.tasks.length) * 100 : 0;

  return (
    <div className="p-3 space-y-3">
      {/* Workflow Header */}
      <div>
        <h3 className="text-xs font-semibold text-surface-0 mb-1">
          {workflow.userIntent}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-dark-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-nexus-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-dark-4">
            {completedCount}/{workflow.tasks.length}
          </span>
        </div>
      </div>

      {/* Task Tree */}
      <div className="space-y-0.5">
        {workflow.tasks.map((task, idx) => {
          const config = STATUS_CONFIG[task.status] ?? STATUS_CONFIG[TaskStatus.PENDING];
          const duration = task.completedAt
            ? `${((task.completedAt - task.createdAt) / 1000).toFixed(1)}s`
            : task.status === TaskStatus.IN_PROGRESS
              ? 'running...'
              : '';

          return (
            <div key={task.id} className="flex items-start gap-2">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full ${config.bg} flex items-center justify-center text-[10px] ${config.color}`}>
                  {config.icon}
                </div>
                {idx < workflow.tasks.length - 1 && (
                  <div className="w-px h-6 bg-dark-3" />
                )}
              </div>

              {/* Task details */}
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-0">{task.description}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-dark-4 capitalize">
                    {task.assignedAgent}
                  </span>
                  {duration && (
                    <span className="text-[10px] text-dark-4">{duration}</span>
                  )}
                  {task.output?.confidence !== undefined && (
                    <span className="text-[10px] text-dark-4">
                      {Math.round(task.output.confidence * 100)}% conf
                    </span>
                  )}
                </div>
                {task.output?.error && (
                  <p className="text-[10px] text-red-400 mt-0.5">{task.output.error}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Workflow result */}
      {workflow.result && (
        <div className="bg-dark-2 rounded-lg p-3 border border-dark-3">
          <h4 className="text-[10px] font-semibold text-dark-4 uppercase tracking-wider mb-1">
            Result
          </h4>
          <p className="text-xs text-surface-0 markdown-content whitespace-pre-wrap">
            {workflow.result}
          </p>
        </div>
      )}
    </div>
  );
}
