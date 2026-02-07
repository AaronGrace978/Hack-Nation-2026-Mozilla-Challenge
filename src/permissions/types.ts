import type { AgentRole } from '../agents/types';

// ─── Permission Levels (ordered by severity) ──────────────────────────────────

export enum PermissionLevel {
  READ_ONLY = 0,   // Read page content, extract text
  NAVIGATE = 1,    // Navigate to URLs, switch tabs
  INTERACT = 2,    // Click buttons, fill forms (non-destructive)
  SUBMIT = 3,      // Submit forms, post data
  PURCHASE = 4,    // Financial transactions, checkout flows
}

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  [PermissionLevel.READ_ONLY]: 'Read Only',
  [PermissionLevel.NAVIGATE]: 'Navigate',
  [PermissionLevel.INTERACT]: 'Interact',
  [PermissionLevel.SUBMIT]: 'Submit',
  [PermissionLevel.PURCHASE]: 'Purchase',
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionLevel, string> = {
  [PermissionLevel.READ_ONLY]: 'Can read page content and extract information',
  [PermissionLevel.NAVIGATE]: 'Can navigate to URLs and switch between tabs',
  [PermissionLevel.INTERACT]: 'Can click buttons, fill forms, and interact with page elements',
  [PermissionLevel.SUBMIT]: 'Can submit forms and post data to websites',
  [PermissionLevel.PURCHASE]: 'Can complete financial transactions and checkout flows',
};

// ─── Permission Grant ─────────────────────────────────────────────────────────

export interface PermissionGrant {
  id: string;
  level: PermissionLevel;
  agent: AgentRole;
  scope: PermissionScope;
  grantedAt: number;
  expiresAt: number;       // Unix timestamp, auto-expire
  taskId?: string;         // If task-scoped, which task
  domain?: string;         // If site-scoped, which domain
  singleUse: boolean;      // If true, revoked after first use
  used: boolean;           // Whether it has been consumed (for singleUse)
  revokedAt?: number;      // If manually revoked
}

export enum PermissionScope {
  GLOBAL = 'global',       // Applies everywhere
  TASK = 'task',           // Applies only to a specific task/workflow
  SITE = 'site',           // Applies only to a specific domain
  TASK_SITE = 'task_site', // Applies to a specific task on a specific site
}

// ─── Permission Request (Agent -> Guardian) ───────────────────────────────────

export interface PermissionRequest {
  id: string;
  agent: AgentRole;
  level: PermissionLevel;
  domain: string;
  taskId: string;
  action: string;          // Human-readable description of what the agent wants to do
  reason: string;          // Why the agent needs this permission
  timestamp: number;
}

// ─── Permission Escalation (Guardian -> UI) ───────────────────────────────────

export interface PermissionEscalation {
  requestId: string;
  agent: AgentRole;
  level: PermissionLevel;
  domain: string;
  action: string;
  reason: string;
  suggestedDuration: number; // Suggested TTL in ms (e.g. 300000 = 5 min)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// ─── Permission Policy (Default rules) ────────────────────────────────────────

export interface PermissionPolicy {
  // Default maximum level per agent
  agentCeilings: Record<AgentRole, PermissionLevel>;
  // Default TTL for each permission level (in ms)
  defaultTTL: Record<PermissionLevel, number>;
  // Levels that always require explicit user approval
  alwaysAskLevels: PermissionLevel[];
  // Actions that are never allowed (won't-do list)
  blockedActions: string[];
}

export const DEFAULT_POLICY: PermissionPolicy = {
  agentCeilings: {
    orchestrator: PermissionLevel.NAVIGATE,
    navigator: PermissionLevel.INTERACT,
    researcher: PermissionLevel.NAVIGATE,
    memory: PermissionLevel.READ_ONLY,
    guardian: PermissionLevel.READ_ONLY,
  } as Record<AgentRole, PermissionLevel>,
  defaultTTL: {
    [PermissionLevel.READ_ONLY]: 30 * 60 * 1000,   // 30 minutes
    [PermissionLevel.NAVIGATE]: 10 * 60 * 1000,     // 10 minutes
    [PermissionLevel.INTERACT]: 5 * 60 * 1000,      // 5 minutes
    [PermissionLevel.SUBMIT]: 2 * 60 * 1000,        // 2 minutes
    [PermissionLevel.PURCHASE]: 60 * 1000,           // 1 minute (very short)
  },
  alwaysAskLevels: [PermissionLevel.SUBMIT, PermissionLevel.PURCHASE],
  blockedActions: [
    'access_password_fields',
    'modify_security_settings',
    'auto_submit_payments',
    'access_banking_credentials',
    'modify_account_settings',
    'delete_user_data',
    'download_executables',
    'grant_third_party_access',
  ],
};
