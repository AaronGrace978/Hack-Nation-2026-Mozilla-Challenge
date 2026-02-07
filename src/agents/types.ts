// ─── Agent Role Definitions ───────────────────────────────────────────────────

export enum AgentRole {
  ORCHESTRATOR = 'orchestrator',
  NAVIGATOR = 'navigator',
  RESEARCHER = 'researcher',
  MEMORY = 'memory',
  GUARDIAN = 'guardian',
}

export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  WAITING_PERMISSION = 'waiting_permission',
  COMPLETED = 'completed',
  ERROR = 'error',
  PAUSED = 'paused',
}

// ─── Task Definitions ─────────────────────────────────────────────────────────

export interface SubTask {
  id: string;
  parentTaskId: string;
  assignedAgent: AgentRole;
  description: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: TaskResult;
  dependencies: string[]; // IDs of tasks that must complete first
  createdAt: number;
  completedAt?: number;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked', // waiting on dependency or permission
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  confidence: number; // 0-1, how confident the agent is in this result
  metadata?: Record<string, unknown>;
}

// ─── Agent Messages ───────────────────────────────────────────────────────────

export enum AgentMessageType {
  // Orchestrator -> Agent
  ASSIGN_TASK = 'assign_task',
  CANCEL_TASK = 'cancel_task',
  PAUSE_TASK = 'pause_task',
  RESUME_TASK = 'resume_task',

  // Agent -> Orchestrator
  TASK_STARTED = 'task_started',
  TASK_PROGRESS = 'task_progress',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',

  // Agent -> Guardian
  PERMISSION_REQUEST = 'permission_request',
  PERMISSION_RESPONSE = 'permission_response',

  // Guardian -> UI
  PERMISSION_ESCALATION = 'permission_escalation',
  PERMISSION_RESOLVED = 'permission_resolved',

  // Agent -> UI (status updates)
  STATUS_UPDATE = 'status_update',
  ACTION_LOG = 'action_log',
}

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  from: AgentRole;
  to: AgentRole | 'ui' | 'all';
  payload: unknown;
  timestamp: number;
}

// ─── Agent Activity (for UI display) ──────────────────────────────────────────

export interface AgentActivity {
  agentRole: AgentRole;
  status: AgentStatus;
  currentTask?: string;
  lastAction?: string;
  progress?: number; // 0-100
  timestamp: number;
}

// ─── Workflow Definition ──────────────────────────────────────────────────────

export interface Workflow {
  id: string;
  userIntent: string;
  status: TaskStatus;
  tasks: SubTask[];
  createdAt: number;
  completedAt?: number;
  result?: string; // Final response to user
}
