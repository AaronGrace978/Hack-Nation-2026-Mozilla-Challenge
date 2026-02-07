import React, { useState, useEffect } from 'react';
import { auditStore, type AuditEntry } from '../../permissions/audit';
import { PermissionLevel } from '../../permissions/types';
import { formatTimestamp } from '../../shared/utils';

// ─── Action Log Component ─────────────────────────────────────────────────────

const OUTCOME_STYLES: Record<string, { dot: string; text: string }> = {
  allowed: { dot: 'bg-green-400', text: 'text-green-400' },
  denied: { dot: 'bg-red-400', text: 'text-red-400' },
  escalated: { dot: 'bg-yellow-400', text: 'text-yellow-400' },
  blocked: { dot: 'bg-red-600', text: 'text-red-500' },
};

export function ActionLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setEntries(auditStore.getRecent(100));
    const unsub = auditStore.subscribe((all) => {
      setEntries(all.slice(-100));
    });
    return unsub;
  }, []);

  const filtered =
    filter === 'all'
      ? entries
      : entries.filter((e) => e.outcome === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-dark-3">
        {['all', 'allowed', 'denied', 'escalated', 'blocked'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-2 py-0.5 rounded-md capitalize transition-colors ${
              filter === f
                ? 'bg-nexus-600/20 text-nexus-400'
                : 'text-dark-4 hover:text-surface-3'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {filtered.length === 0 && (
          <div className="text-center text-xs text-dark-4 py-8">
            No actions logged yet. Start a workflow to see activity here.
          </div>
        )}

        {filtered.map((entry) => {
          const style = OUTCOME_STYLES[entry.outcome] ?? OUTCOME_STYLES.allowed;
          return (
            <div
              key={entry.id}
              className="bg-dark-2 rounded-lg px-2.5 py-2 text-xs animate-fade-in"
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  <span className="text-surface-0 font-medium capitalize">{entry.agent}</span>
                  <span className={`text-[10px] ${style.text}`}>{entry.outcome}</span>
                </div>
                <span className="text-[10px] text-dark-4">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
              <p className="text-dark-4 truncate">{entry.action}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-dark-4">{entry.target}</span>
                <span className="text-[10px] px-1 rounded bg-dark-3 text-dark-4">
                  {PermissionLevel[entry.permissionLevel]}
                </span>
              </div>
              {entry.reason && (
                <p className="text-[10px] text-dark-4 mt-0.5 italic">{entry.reason}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
