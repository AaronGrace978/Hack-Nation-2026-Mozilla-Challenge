/**
 * BostonAi.io — Guardian Agent (Sentinel)
 * 
 * Permission enforcement + emotional wellbeing tracking.
 * The Guardian doesn't just protect the user's data —
 * it watches out for the user's *state*.
 * 
 * Built by BostonAi.io | The Grace Method
 */

import { BaseAgent } from './base-agent';
import {
  AgentRole,
  AgentStatus,
  type SubTask,
  type TaskResult,
} from './types';
import { permissionManager } from '../permissions/manager';
import { auditStore, type AuditEntry } from '../permissions/audit';
import {
  PermissionLevel,
  type PermissionRequest,
  type PermissionEscalation,
  DEFAULT_POLICY,
} from '../permissions/types';
import { generateId, extractDomain } from '../shared/utils';
import { echoArchaeology, GhostType } from './echo-archaeology';
import { layeredMemory, MemoryLayer } from '../memory/layered-store';

// ─── Won't-Do List ────────────────────────────────────────────────────────────
// Actions that the system should NEVER automate, regardless of permissions.

const WONT_DO_PATTERNS = [
  // Financial safety
  /auto.?submit.?payment/i,
  /enter.?credit.?card/i,
  /enter.?bank/i,
  /transfer.?funds/i,
  /wire.?money/i,

  // Security
  /change.?password/i,
  /modify.?security/i,
  /disable.?(2fa|mfa|two.?factor)/i,
  /grant.?admin/i,
  /delete.?account/i,

  // Privacy
  /share.?personal.?data/i,
  /export.?contacts/i,
  /access.?medical/i,
  /read.?private.?messages/i,

  // Dangerous
  /download.?executable/i,
  /run.?script/i,
  /install.?extension/i,
];

// ─── Concern Levels ───────────────────────────────────────────────────────────

export enum ConcernLevel {
  NONE = 'none',
  LOW = 'low',           // Slight frustration / hesitation detected
  MODERATE = 'moderate', // Repeated failures or abandoned workflows
  HIGH = 'high',         // Rapid frustration signals or long silence
  CRITICAL = 'critical', // User in distress (immediate gentle intervention)
}

export interface ConcernState {
  level: ConcernLevel;
  reason: string;
  detectedAt: number;
  ghostIds: string[];
  offeringMade: boolean;
}

// ─── Guardian Agent ───────────────────────────────────────────────────────────

export class GuardianAgent extends BaseAgent {
  private pendingEscalations: Map<string, {
    escalation: PermissionEscalation;
    resolve: (result: { approved: boolean; duration?: number; singleUse?: boolean }) => void;
  }> = new Map();

  private currentConcern: ConcernState = {
    level: ConcernLevel.NONE,
    reason: '',
    detectedAt: 0,
    ghostIds: [],
    offeringMade: false,
  };

  private permissionDenialCount = 0;
  private consecutiveFailures = 0;

  constructor() {
    super(AgentRole.GUARDIAN);
  }

  // ── Main Execution ────────────────────────────────────────────────────────

  protected async onExecute(task: SubTask): Promise<TaskResult> {
    // Guardian doesn't execute tasks in the traditional sense.
    // It validates actions from other agents.
    const action = task.input?.action as string;
    const agent = task.input?.agent as AgentRole;
    const level = task.input?.level as PermissionLevel;
    const domain = task.input?.domain as string;

    if (!action || level === undefined) {
      return {
        success: false,
        error: 'Invalid guardian task: missing action or level',
        confidence: 1,
      };
    }

    const result = await this.validateAction(agent, action, level, domain, task.id);
    return {
      success: result.allowed,
      data: result,
      confidence: 1,
      metadata: { validationResult: result },
    };
  }

  // ── Action Validation Pipeline ────────────────────────────────────────────

  async validateAction(
    agent: AgentRole,
    action: string,
    level: PermissionLevel,
    domain: string,
    taskId: string,
  ): Promise<{
    allowed: boolean;
    reason: string;
    grantId?: string;
  }> {
    // Step 1: Check won't-do list
    if (this.isWontDo(action)) {
      auditStore.log(agent, action, domain, level, 'blocked', {
        reason: 'Action matches won\'t-do list',
      });
      return {
        allowed: false,
        reason: `This action is on Nexus's safety list and cannot be automated: "${action}". Please perform this action manually.`,
      };
    }

    // Step 2: Check if action is on the blocked list
    if (DEFAULT_POLICY.blockedActions.some((b) => action.toLowerCase().includes(b))) {
      auditStore.log(agent, action, domain, level, 'blocked', {
        reason: 'Action matches blocked policy',
      });
      return {
        allowed: false,
        reason: `Action "${action}" is blocked by security policy.`,
      };
    }

    // Step 3: Check agent ceiling
    const ceiling = DEFAULT_POLICY.agentCeilings[agent];
    if (ceiling !== undefined && level > ceiling) {
      auditStore.log(agent, action, domain, level, 'denied', {
        reason: `Agent ${agent} ceiling exceeded`,
      });
      return {
        allowed: false,
        reason: `Agent ${agent} is not authorized for ${PermissionLevel[level]} actions. Maximum: ${PermissionLevel[ceiling]}.`,
      };
    }

    // Step 4: Check existing grants
    const check = permissionManager.check(agent, level, domain, taskId);
    if (check.allowed && check.grant) {
      auditStore.log(agent, action, domain, level, 'allowed', {
        permissionGrantId: check.grant.id,
      });
      return {
        allowed: true,
        reason: 'Permission granted',
        grantId: check.grant.id,
      };
    }

    // Step 5: Escalate to user
    if (check.needsEscalation && check.escalation) {
      auditStore.log(agent, action, domain, level, 'escalated');
      return this.escalateToUser(check.escalation, agent, action, domain, level, taskId);
    }

    auditStore.log(agent, action, domain, level, 'denied', {
      reason: 'No grant and no escalation path',
    });
    return {
      allowed: false,
      reason: 'Permission denied. No escalation path available.',
    };
  }

  // ── Escalation ────────────────────────────────────────────────────────────

  private async escalateToUser(
    escalation: PermissionEscalation,
    agent: AgentRole,
    action: string,
    domain: string,
    level: PermissionLevel,
    taskId: string,
  ): Promise<{ allowed: boolean; reason: string; grantId?: string }> {
    // Use the permission manager's escalation handler
    const request: PermissionRequest = {
      id: escalation.requestId,
      agent,
      level,
      domain,
      taskId,
      action,
      reason: escalation.reason,
      timestamp: Date.now(),
    };

    const result = await permissionManager.requestPermission(request);

    if (result.allowed) {
      return {
        allowed: true,
        reason: 'User approved',
        grantId: result.grant?.id,
      };
    }

    return {
      allowed: false,
      reason: 'User denied the request',
    };
  }

  // ── Won't-Do Check ────────────────────────────────────────────────────────

  private isWontDo(action: string): boolean {
    return WONT_DO_PATTERNS.some((pattern) => pattern.test(action));
  }

  // ── Audit Queries ─────────────────────────────────────────────────────────

  getRecentAudit(count = 20): AuditEntry[] {
    return auditStore.getRecent(count);
  }

  getBlockedActions(): AuditEntry[] {
    return auditStore.getByOutcome('blocked');
  }

  getDeniedActions(): AuditEntry[] {
    return auditStore.getByOutcome('denied');
  }

  // ── Pending Escalation Management ─────────────────────────────────────────

  resolvePendingEscalation(
    requestId: string,
    approved: boolean,
    duration?: number,
    singleUse?: boolean,
  ): void {
    const pending = this.pendingEscalations.get(requestId);
    if (pending) {
      pending.resolve({ approved, duration, singleUse });
      this.pendingEscalations.delete(requestId);

      // Track permission denials for concern tracking
      if (!approved) {
        this.permissionDenialCount++;
        echoArchaeology.recordPermissionRetreat(
          pending.escalation.reason,
          pending.escalation.requestId,
        );

        if (this.permissionDenialCount >= 3) {
          this.raiseConcern(
            ConcernLevel.MODERATE,
            'Multiple permission denials — user may be uncomfortable with agent capabilities',
          );
        }
      } else {
        this.permissionDenialCount = Math.max(0, this.permissionDenialCount - 1);
      }
    }
  }

  // ── Concern Tracking System (BostonAi.io Sentinel Layer) ───────────────

  assessUserInput(userInput: string, context: {
    currentWorkflow?: string;
    currentUrl?: string;
    previousAction?: string;
    timeSinceLastInput?: number;
  }): ConcernState {
    // Feed to Echo Archaeology for ghost detection
    const ghost = echoArchaeology.analyze(userInput, context);

    if (ghost) {
      switch (ghost.type) {
        case GhostType.FRUSTRATION_SIGNAL:
          this.raiseConcern(
            ghost.confidence > 0.8 ? ConcernLevel.HIGH : ConcernLevel.MODERATE,
            ghost.synthesizedNeed,
            [ghost.id],
          );
          break;

        case GhostType.REPEATED_SEARCH:
          this.raiseConcern(
            ConcernLevel.LOW,
            ghost.synthesizedNeed,
            [ghost.id],
          );
          break;

        case GhostType.ABANDONED_WORKFLOW:
        case GhostType.TOPIC_SHIFT:
          this.raiseConcern(
            ConcernLevel.LOW,
            ghost.synthesizedNeed,
            [ghost.id],
          );
          break;

        default:
          break;
      }
    }

    // Check for long silence (user went quiet)
    if (context.timeSinceLastInput && context.timeSinceLastInput > 5 * 60 * 1000) {
      // 5 minutes of silence after activity
      this.currentConcern = {
        level: ConcernLevel.NONE,
        reason: '',
        detectedAt: Date.now(),
        ghostIds: [],
        offeringMade: false,
      };
    }

    return this.currentConcern;
  }

  recordWorkflowOutcome(success: boolean, workflowIntent?: string): void {
    if (!success) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= 2) {
        this.raiseConcern(
          ConcernLevel.MODERATE,
          'Multiple workflows have failed. Something might need a different approach.',
        );
      }
    } else {
      this.consecutiveFailures = 0;
      // Success lowers concern
      if (this.currentConcern.level !== ConcernLevel.NONE) {
        this.currentConcern.level = ConcernLevel.LOW;
      }
    }
  }

  getConcern(): ConcernState {
    return { ...this.currentConcern };
  }

  getConcernOffering(): string | null {
    if (this.currentConcern.level === ConcernLevel.NONE) return null;
    if (this.currentConcern.offeringMade) return null;

    // Get ready ghosts that haven't been offered yet
    const readyGhosts = echoArchaeology.getReadyGhosts();
    if (readyGhosts.length > 0) {
      const ghost = readyGhosts[0];
      echoArchaeology.markOffered(ghost.id);
      return ghost.offeringText;
    }

    // Generic concern offerings
    switch (this.currentConcern.level) {
      case ConcernLevel.LOW:
        return null; // Don't interrupt for low concern
      case ConcernLevel.MODERATE:
        this.currentConcern.offeringMade = true;
        return 'I notice things aren\'t going as smoothly as expected. Want me to try a different approach?';
      case ConcernLevel.HIGH:
        this.currentConcern.offeringMade = true;
        return 'I can tell this is frustrating. Let me step back and try something different — or I can just listen.';
      case ConcernLevel.CRITICAL:
        this.currentConcern.offeringMade = true;
        return 'Hey — it seems like this isn\'t working the way either of us wants. No pressure to keep going. What would actually help right now?';
      default:
        return null;
    }
  }

  private raiseConcern(level: ConcernLevel, reason: string, ghostIds: string[] = []): void {
    // Only escalate, never downgrade from external events
    const levels = [ConcernLevel.NONE, ConcernLevel.LOW, ConcernLevel.MODERATE, ConcernLevel.HIGH, ConcernLevel.CRITICAL];
    const currentIdx = levels.indexOf(this.currentConcern.level);
    const newIdx = levels.indexOf(level);

    if (newIdx > currentIdx) {
      this.currentConcern = {
        level,
        reason,
        detectedAt: Date.now(),
        ghostIds: [...this.currentConcern.ghostIds, ...ghostIds],
        offeringMade: false,
      };

      // Log to soul memory if concern is high
      if (newIdx >= 3) {
        layeredMemory.store(
          `User showed ${level} concern: ${reason}`,
          MemoryLayer.EPISODIC,
          { valence: -0.5, arousal: 0.7, intensity: 0.6, primary: 'concern' },
          { source: 'system', tags: ['guardian', 'concern', level] },
        );
      }
    }
  }
}

export const guardianAgent = new GuardianAgent();
