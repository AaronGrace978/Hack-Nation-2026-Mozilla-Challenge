import type { AgentRole } from '../agents/types';
import type { PermissionLevel } from './types';
import { generateId } from '../shared/utils';

// ─── Audit Entry ──────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: number;
  agent: AgentRole;
  action: string;
  target: string;            // URL, domain, or element description
  permissionLevel: PermissionLevel;
  permissionGrantId?: string;
  outcome: 'allowed' | 'denied' | 'escalated' | 'blocked';
  reason?: string;
  metadata?: Record<string, unknown>;
}

// ─── Audit Store ──────────────────────────────────────────────────────────────

const MAX_ENTRIES = 1000;

class AuditStore {
  private entries: AuditEntry[] = [];
  private listeners: Set<(entries: AuditEntry[]) => void> = new Set();

  log(
    agent: AgentRole,
    action: string,
    target: string,
    permissionLevel: PermissionLevel,
    outcome: AuditEntry['outcome'],
    extra?: { permissionGrantId?: string; reason?: string; metadata?: Record<string, unknown> },
  ): AuditEntry {
    const entry: AuditEntry = {
      id: generateId('audit'),
      timestamp: Date.now(),
      agent,
      action,
      target,
      permissionLevel,
      outcome,
      permissionGrantId: extra?.permissionGrantId,
      reason: extra?.reason,
      metadata: extra?.metadata,
    };

    this.entries.push(entry);

    // Trim to max
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }

    this.notify();
    return entry;
  }

  getAll(): AuditEntry[] {
    return [...this.entries];
  }

  getRecent(count: number): AuditEntry[] {
    return this.entries.slice(-count);
  }

  getByAgent(agent: AgentRole): AuditEntry[] {
    return this.entries.filter((e) => e.agent === agent);
  }

  getByOutcome(outcome: AuditEntry['outcome']): AuditEntry[] {
    return this.entries.filter((e) => e.outcome === outcome);
  }

  clear(): void {
    this.entries = [];
    this.notify();
  }

  subscribe(listener: (entries: AuditEntry[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const entries = this.getAll();
    for (const listener of this.listeners) {
      listener(entries);
    }
  }
}

export const auditStore = new AuditStore();
