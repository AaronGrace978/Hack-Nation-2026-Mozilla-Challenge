import type { AgentRole } from '../agents/types';
import {
  type PermissionGrant,
  type PermissionRequest,
  type PermissionEscalation,
  type PermissionPolicy,
  PermissionLevel,
  PermissionScope,
  DEFAULT_POLICY,
} from './types';
import { auditStore } from './audit';
import { generateId } from '../shared/utils';

// ─── Permission Check Result ──────────────────────────────────────────────────

export interface PermissionCheckResult {
  allowed: boolean;
  grant?: PermissionGrant;
  reason: string;
  needsEscalation: boolean;
  escalation?: PermissionEscalation;
}

// ─── Pending Escalation Callback ──────────────────────────────────────────────

type EscalationHandler = (escalation: PermissionEscalation) => Promise<{
  approved: boolean;
  duration?: number;
  singleUse?: boolean;
}>;

// ─── Permission Manager ──────────────────────────────────────────────────────

class PermissionManager {
  private grants: Map<string, PermissionGrant> = new Map();
  private policy: PermissionPolicy = DEFAULT_POLICY;
  private escalationHandler: EscalationHandler | null = null;
  private listeners: Set<(grants: PermissionGrant[]) => void> = new Set();

  // ── Configuration ─────────────────────────────────────────────────────────

  setPolicy(policy: Partial<PermissionPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  getPolicy(): PermissionPolicy {
    return { ...this.policy };
  }

  setEscalationHandler(handler: EscalationHandler): void {
    this.escalationHandler = handler;
  }

  // ── Grant Management ──────────────────────────────────────────────────────

  grant(
    level: PermissionLevel,
    agent: AgentRole,
    options: {
      scope?: PermissionScope;
      taskId?: string;
      domain?: string;
      duration?: number;
      singleUse?: boolean;
    } = {},
  ): PermissionGrant {
    const ttl = options.duration ?? this.policy.defaultTTL[level];

    const g: PermissionGrant = {
      id: generateId('perm'),
      level,
      agent,
      scope: options.scope ?? PermissionScope.TASK,
      grantedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      taskId: options.taskId,
      domain: options.domain,
      singleUse: options.singleUse ?? false,
      used: false,
    };

    this.grants.set(g.id, g);
    this.notify();
    return g;
  }

  revoke(grantId: string): boolean {
    const g = this.grants.get(grantId);
    if (!g) return false;
    g.revokedAt = Date.now();
    this.grants.set(grantId, g);
    this.notify();
    return true;
  }

  revokeAll(agent?: AgentRole): void {
    for (const [id, g] of this.grants) {
      if (!agent || g.agent === agent) {
        g.revokedAt = Date.now();
        this.grants.set(id, g);
      }
    }
    this.notify();
  }

  revokeForTask(taskId: string): void {
    for (const [id, g] of this.grants) {
      if (g.taskId === taskId) {
        g.revokedAt = Date.now();
        this.grants.set(id, g);
      }
    }
    this.notify();
  }

  // ── Permission Checking ───────────────────────────────────────────────────

  check(
    agent: AgentRole,
    level: PermissionLevel,
    domain: string,
    taskId?: string,
  ): PermissionCheckResult {
    // 1. Check agent ceiling
    const ceiling = this.policy.agentCeilings[agent];
    if (ceiling !== undefined && level > ceiling) {
      return {
        allowed: false,
        reason: `Agent ${agent} ceiling is ${PermissionLevel[ceiling]}, requested ${PermissionLevel[level]}`,
        needsEscalation: false,
      };
    }

    // 2. Clean expired grants
    this.cleanExpired();

    // 3. Find a matching active grant
    const grant = this.findGrant(agent, level, domain, taskId);
    if (grant) {
      // Mark single-use as used
      if (grant.singleUse) {
        grant.used = true;
        this.grants.set(grant.id, grant);
        this.notify();
      }
      return {
        allowed: true,
        grant,
        reason: 'Permission granted',
        needsEscalation: false,
      };
    }

    // 4. Check if always-ask level
    const needsEscalation = this.policy.alwaysAskLevels.includes(level) || level > PermissionLevel.READ_ONLY;

    const escalation: PermissionEscalation = {
      requestId: generateId('esc'),
      agent,
      level,
      domain,
      action: `${PermissionLevel[level]} on ${domain}`,
      reason: `Agent ${agent} needs ${PermissionLevel[level]} access to ${domain}`,
      suggestedDuration: this.policy.defaultTTL[level],
      riskLevel: this.assessRisk(level),
    };

    return {
      allowed: false,
      reason: 'No matching grant found',
      needsEscalation,
      escalation,
    };
  }

  // ── Request + Escalation Flow ─────────────────────────────────────────────

  async requestPermission(request: PermissionRequest): Promise<PermissionCheckResult> {
    // First check if already granted
    const existing = this.check(request.agent, request.level, request.domain, request.taskId);
    if (existing.allowed) {
      auditStore.log(
        request.agent,
        request.action,
        request.domain,
        request.level,
        'allowed',
        { permissionGrantId: existing.grant?.id },
      );
      return existing;
    }

    // Check blocked actions
    if (this.isBlocked(request.action)) {
      auditStore.log(
        request.agent,
        request.action,
        request.domain,
        request.level,
        'blocked',
        { reason: 'Action is on the blocked list' },
      );
      return {
        allowed: false,
        reason: `Action "${request.action}" is blocked by policy`,
        needsEscalation: false,
      };
    }

    // Auto-grant READ_ONLY and NAVIGATE permissions (as described in Settings UI)
    // These are low-risk tiers that should not block the workflow.
    if (
      request.level <= PermissionLevel.NAVIGATE &&
      !this.policy.alwaysAskLevels.includes(request.level)
    ) {
      const grant = this.grant(request.level, request.agent, {
        scope: PermissionScope.TASK_SITE,
        taskId: request.taskId,
        domain: request.domain,
        duration: this.policy.defaultTTL[request.level],
      });

      auditStore.log(
        request.agent,
        request.action,
        request.domain,
        request.level,
        'allowed',
        { permissionGrantId: grant.id, reason: 'Auto-granted (low-risk tier)' },
      );

      return {
        allowed: true,
        grant,
        reason: 'Auto-granted',
        needsEscalation: false,
      };
    }

    // Escalate to user for INTERACT, SUBMIT, PURCHASE
    if (this.escalationHandler && existing.escalation) {
      auditStore.log(
        request.agent,
        request.action,
        request.domain,
        request.level,
        'escalated',
      );

      const response = await this.escalationHandler(existing.escalation);
      if (response.approved) {
        const grant = this.grant(request.level, request.agent, {
          scope: PermissionScope.TASK_SITE,
          taskId: request.taskId,
          domain: request.domain,
          duration: response.duration,
          singleUse: response.singleUse,
        });

        auditStore.log(
          request.agent,
          request.action,
          request.domain,
          request.level,
          'allowed',
          { permissionGrantId: grant.id, reason: 'User approved escalation' },
        );

        return {
          allowed: true,
          grant,
          reason: 'User approved',
          needsEscalation: false,
        };
      }
    }

    auditStore.log(
      request.agent,
      request.action,
      request.domain,
      request.level,
      'denied',
      { reason: 'User denied or no escalation handler' },
    );

    return {
      allowed: false,
      reason: 'Permission denied by user',
      needsEscalation: false,
    };
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  getActiveGrants(): PermissionGrant[] {
    this.cleanExpired();
    return Array.from(this.grants.values()).filter(
      (g) => !g.revokedAt && g.expiresAt > Date.now() && !(g.singleUse && g.used),
    );
  }

  getAllGrants(): PermissionGrant[] {
    return Array.from(this.grants.values());
  }

  subscribe(listener: (grants: PermissionGrant[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private findGrant(
    agent: AgentRole,
    level: PermissionLevel,
    domain: string,
    taskId?: string,
  ): PermissionGrant | undefined {
    const now = Date.now();
    const active = Array.from(this.grants.values()).filter(
      (g) =>
        g.agent === agent &&
        g.level >= level &&
        !g.revokedAt &&
        g.expiresAt > now &&
        !(g.singleUse && g.used),
    );

    // Priority: task+site > task > site > global
    return (
      active.find((g) => g.scope === PermissionScope.TASK_SITE && g.taskId === taskId && g.domain === domain) ??
      active.find((g) => g.scope === PermissionScope.TASK && g.taskId === taskId) ??
      active.find((g) => g.scope === PermissionScope.SITE && g.domain === domain) ??
      active.find((g) => g.scope === PermissionScope.GLOBAL)
    );
  }

  private cleanExpired(): void {
    const now = Date.now();
    let changed = false;
    for (const [id, g] of this.grants) {
      if (g.expiresAt <= now && !g.revokedAt) {
        g.revokedAt = now;
        this.grants.set(id, g);
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  private isBlocked(action: string): boolean {
    return this.policy.blockedActions.some(
      (blocked) => action.toLowerCase().includes(blocked.toLowerCase()),
    );
  }

  private assessRisk(level: PermissionLevel): PermissionEscalation['riskLevel'] {
    switch (level) {
      case PermissionLevel.READ_ONLY:
        return 'low';
      case PermissionLevel.NAVIGATE:
        return 'low';
      case PermissionLevel.INTERACT:
        return 'medium';
      case PermissionLevel.SUBMIT:
        return 'high';
      case PermissionLevel.PURCHASE:
        return 'critical';
      default:
        return 'medium';
    }
  }

  private notify(): void {
    const grants = this.getActiveGrants();
    for (const listener of this.listeners) {
      listener(grants);
    }
  }
}

export const permissionManager = new PermissionManager();
