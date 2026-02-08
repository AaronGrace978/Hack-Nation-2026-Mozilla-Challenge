import type { AgentActivity, AgentMessage, Workflow } from '../agents/types';
import type { PermissionEscalation, PermissionGrant } from '../permissions/types';

// ─── Extension Message Types (sidebar <-> background <-> content) ─────────────

export enum ExtMessageType {
  // Sidebar -> Background
  USER_INPUT = 'user_input',
  CANCEL_WORKFLOW = 'cancel_workflow',
  PAUSE_WORKFLOW = 'pause_workflow',
  RESUME_WORKFLOW = 'resume_workflow',
  PERMISSION_RESPONSE = 'permission_response',
  UPDATE_SETTINGS = 'update_settings',
  GET_STATE = 'get_state',

  // Background -> Sidebar
  WORKFLOW_UPDATE = 'workflow_update',
  AGENT_ACTIVITY = 'agent_activity',
  PERMISSION_REQUEST = 'permission_request',
  CHAT_MESSAGE = 'chat_message',
  STATE_SYNC = 'state_sync',

  // Background -> Content
  READ_PAGE = 'read_page',
  INTERACT_PAGE = 'interact_page',
  HIGHLIGHT_ELEMENT = 'highlight_element',
  CLEAR_HIGHLIGHTS = 'clear_highlights',

  // Content -> Background
  PAGE_CONTENT = 'page_content',
  INTERACTION_RESULT = 'interaction_result',

  // Memory operations
  SAVE_MEMORY = 'save_memory',
  GET_MEMORIES = 'get_memories',
  GET_PREFERENCES = 'get_preferences',
  UPDATE_PREFERENCES = 'update_preferences',
}

// ─── Message Payloads ─────────────────────────────────────────────────────────

export interface UserInputPayload {
  text: string;
  attachments?: {
    type: 'screenshot' | 'selection';
    data: string;
  }[];
}

export interface PermissionResponsePayload {
  requestId: string;
  approved: boolean;
  duration?: number; // TTL in ms, if user chose custom duration
  singleUse?: boolean;
}

export interface ChatMessagePayload {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  agentRole?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PageReadRequest {
  type: 'full' | 'selection' | 'element';
  selector?: string;
  includeScreenshot?: boolean;
}

export interface PageContent {
  url: string;
  title: string;
  text: string;
  html?: string;
  screenshot?: string; // base64
  selection?: string;
  metadata: {
    domain: string;
    path: string;
    language?: string;
  };
}

export interface PageInteraction {
  action: 'click' | 'type' | 'scroll' | 'select' | 'focus' | 'add_to_cart';
  selector?: string;
  value?: string;
  coordinates?: { x: number; y: number };
}

export interface StateSync {
  workflow: Workflow | null;
  activities: AgentActivity[];
  pendingPermissions: PermissionEscalation[];
  activeGrants: PermissionGrant[];
  chatHistory: ChatMessagePayload[];
}

// ─── Generic Extension Message Wrapper ────────────────────────────────────────

export interface ExtMessage<T = unknown> {
  type: ExtMessageType;
  payload: T;
  timestamp: number;
}

export function createMessage<T>(type: ExtMessageType, payload: T): ExtMessage<T> {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}
