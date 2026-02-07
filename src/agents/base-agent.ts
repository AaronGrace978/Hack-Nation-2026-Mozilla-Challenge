import {
  AgentRole,
  AgentStatus,
  AgentMessageType,
  type AgentMessage,
  type AgentActivity,
  type SubTask,
  type TaskResult,
  TaskStatus,
} from './types';
import { permissionManager, type PermissionCheckResult } from '../permissions/manager';
import { type PermissionLevel, type PermissionRequest } from '../permissions/types';
import { auditStore } from '../permissions/audit';
import { llmProvider, type LLMMessage, type LLMResponse, type LLMToolDefinition } from '../llm/provider';
import { generateId, extractDomain } from '../shared/utils';

// ─── Base Agent ───────────────────────────────────────────────────────────────

export abstract class BaseAgent {
  readonly role: AgentRole;
  protected status: AgentStatus = AgentStatus.IDLE;
  protected currentTask: SubTask | null = null;
  private activityListeners: Set<(activity: AgentActivity) => void> = new Set();
  private messageListeners: Set<(msg: AgentMessage) => void> = new Set();

  constructor(role: AgentRole) {
    this.role = role;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async executeTask(task: SubTask): Promise<TaskResult> {
    this.currentTask = task;
    this.setStatus(AgentStatus.THINKING);
    this.emitMessage(AgentMessageType.TASK_STARTED, { taskId: task.id });

    try {
      const result = await this.onExecute(task);

      this.setStatus(AgentStatus.COMPLETED);
      this.emitMessage(AgentMessageType.TASK_COMPLETED, {
        taskId: task.id,
        result,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.setStatus(AgentStatus.ERROR);
      this.emitMessage(AgentMessageType.TASK_FAILED, {
        taskId: task.id,
        error: errorMsg,
      });

      return {
        success: false,
        error: errorMsg,
        confidence: 0,
      };
    } finally {
      this.currentTask = null;
    }
  }

  // ── Abstract Method - Subclasses Implement ────────────────────────────────

  protected abstract onExecute(task: SubTask): Promise<TaskResult>;

  // ── Permission-Aware Action Execution ─────────────────────────────────────

  protected async withPermission(
    level: PermissionLevel,
    domain: string,
    action: string,
    fn: () => Promise<unknown>,
  ): Promise<{ allowed: boolean; result?: unknown; reason?: string }> {
    const request: PermissionRequest = {
      id: generateId('req'),
      agent: this.role,
      level,
      domain,
      taskId: this.currentTask?.id ?? 'unknown',
      action,
      reason: `Agent ${this.role} needs ${action} access to ${domain}`,
      timestamp: Date.now(),
    };

    this.setStatus(AgentStatus.WAITING_PERMISSION);
    const check = await permissionManager.requestPermission(request);

    if (!check.allowed) {
      return { allowed: false, reason: check.reason };
    }

    this.setStatus(AgentStatus.EXECUTING);
    const result = await fn();

    auditStore.log(
      this.role,
      action,
      domain,
      level,
      'allowed',
      { permissionGrantId: check.grant?.id },
    );

    return { allowed: true, result };
  }

  // ── LLM Interaction ───────────────────────────────────────────────────────

  protected async callLLM(
    messages: LLMMessage[],
    options?: {
      tools?: LLMToolDefinition[];
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    },
  ): Promise<LLMResponse> {
    this.setStatus(AgentStatus.THINKING);
    this.reportProgress(`Thinking...`);
    return llmProvider.complete(messages, options);
  }

  // ── Status Management ─────────────────────────────────────────────────────

  getStatus(): AgentStatus {
    return this.status;
  }

  getActivity(): AgentActivity {
    return {
      agentRole: this.role,
      status: this.status,
      currentTask: this.currentTask?.description,
      timestamp: Date.now(),
    };
  }

  protected setStatus(status: AgentStatus): void {
    this.status = status;
    this.notifyActivity();
  }

  protected reportProgress(action: string, progress?: number): void {
    const activity: AgentActivity = {
      agentRole: this.role,
      status: this.status,
      currentTask: this.currentTask?.description,
      lastAction: action,
      progress,
      timestamp: Date.now(),
    };
    for (const listener of this.activityListeners) {
      listener(activity);
    }
  }

  // ── Messaging ─────────────────────────────────────────────────────────────

  protected emitMessage(type: AgentMessageType, payload: unknown, to: AgentMessage['to'] = 'all'): void {
    const msg: AgentMessage = {
      id: generateId('msg'),
      type,
      from: this.role,
      to,
      payload,
      timestamp: Date.now(),
    };
    for (const listener of this.messageListeners) {
      listener(msg);
    }
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  onActivity(listener: (activity: AgentActivity) => void): () => void {
    this.activityListeners.add(listener);
    return () => this.activityListeners.delete(listener);
  }

  onMessage(listener: (msg: AgentMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private notifyActivity(): void {
    const activity = this.getActivity();
    for (const listener of this.activityListeners) {
      listener(activity);
    }
  }
}
