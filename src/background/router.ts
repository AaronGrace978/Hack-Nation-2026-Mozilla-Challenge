import {
  ExtMessageType,
  createMessage,
  type ExtMessage,
  type UserInputPayload,
  type PermissionResponsePayload,
  type ChatMessagePayload,
  type StateSync,
} from '../shared/messages';
import { orchestrator } from './orchestrator';
import { guardianAgent } from '../agents/guardian';
import { navigatorAgent } from '../agents/navigator';
import { permissionManager } from '../permissions/manager';
import { auditStore } from '../permissions/audit';
import { memoryStore } from '../memory/store';
import { llmProvider } from '../llm/provider';
import { researcherAgent } from '../agents/researcher';
import { mcpRegistry } from '../mcp/registry';
import { type PermissionEscalation } from '../permissions/types';
import type { AgentActivity, Workflow } from '../agents/types';
import { generateId } from '../shared/utils';
import { MAX_WORKFLOW_DURATION } from '../shared/constants';

// ─── Timeout Helper ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ─── Message Router ───────────────────────────────────────────────────────────
// Routes messages between sidebar UI, background agents, and content scripts.

class MessageRouter {
  private chatHistory: ChatMessagePayload[] = [];
  private sidebarPort: chrome.runtime.Port | null = null;

  async initialize(): Promise<void> {
    // Restore chat history from session storage (survives sidebar reloads)
    try {
      const stored = await chrome.storage.session.get('nexus_chat_history');
      const history = stored.nexus_chat_history as ChatMessagePayload[] | undefined;
      if (history?.length) {
        this.chatHistory = history;
      }
    } catch {
      // storage.session may not be available, that's OK
    }

    // Load settings
    const provider = await memoryStore.getSetting<string>('llm_provider', 'openai');
    const model = await memoryStore.getSetting<string>('llm_model', 'gpt-5-mini');
    const openaiKey = await memoryStore.getSetting<string>('openai_api_key', '');
    const anthropicKey = await memoryStore.getSetting<string>('anthropic_api_key', '');
    const ollamaKey = await memoryStore.getSetting<string>('ollama_api_key', '');

    const apiKey =
      provider === 'openai'
        ? openaiKey
        : provider === 'anthropic'
          ? anthropicKey
          : provider === 'ollama'
            ? ollamaKey
            : openaiKey;

    const configured =
      provider === 'ollama' ? true : (apiKey?.length ?? 0) > 0;
    if (configured) {
      llmProvider.configure({
        apiKey: apiKey ?? '',
        provider: provider as 'openai' | 'anthropic' | 'ollama',
        model,
      });
    }

    const tabstackKey = await memoryStore.getSetting<string>('tabstack_api_key', '');
    if (tabstackKey) {
      researcherAgent.setTabstackApiKey(tabstackKey);
    }

    // Wire up navigator agent to forward messages to content scripts
    navigatorAgent.setTabMessageHandler(async (msg) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found');

      const message = createMessage(msg.type as ExtMessageType, msg.payload);

      const send = (tabId: number) =>
        chrome.tabs.sendMessage(tabId, message);

      const injectAndRetry = async (delayMs: number): Promise<unknown> => {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
        await new Promise((r) => setTimeout(r, delayMs));
        return send(tab.id);
      };

      try {
        return await send(tab.id);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isNoReceiver =
          /Could not establish connection|Receiving end does not exist/i.test(errMsg);
        if (!isNoReceiver) throw err;

        // Content script not loaded — inject and retry with short delay so listener is ready
        try {
          return await injectAndRetry(400);
        } catch (retryErr) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          const stillNoReceiver =
            /Could not establish connection|Receiving end does not exist/i.test(retryMsg);
          if (stillNoReceiver) {
            await new Promise((r) => setTimeout(r, 800));
            return await send(tab.id);
          }
          throw retryErr;
        }
      }
    });

    // Initialize MCP servers
    await mcpRegistry.initialize();

    // Set up orchestrator callbacks
    orchestrator.setCallbacks({
      onWorkflowUpdate: (workflow) => this.sendToSidebar(ExtMessageType.WORKFLOW_UPDATE, workflow),
      onAgentActivity: (activity) => this.sendToSidebar(ExtMessageType.AGENT_ACTIVITY, activity),
      onChatMessage: (msg) => {
        const chatMsg: ChatMessagePayload = {
          id: generateId('chat'),
          role: msg.role as ChatMessagePayload['role'],
          content: msg.content,
          agentRole: msg.agentRole,
          timestamp: Date.now(),
        };
        this.chatHistory.push(chatMsg);
        this.persistChat();
        this.sendToSidebar(ExtMessageType.CHAT_MESSAGE, chatMsg);
      },
      onPermissionRequest: (escalation) => {
        this.sendToSidebar(ExtMessageType.PERMISSION_REQUEST, escalation);
      },
    });

    // Set up permission escalation handler
    permissionManager.setEscalationHandler(async (escalation: PermissionEscalation) => {
      return new Promise((resolve) => {
        // Store the resolve callback to call when user responds
        this._pendingPermissions.set(escalation.requestId, resolve);
        this.sendToSidebar(ExtMessageType.PERMISSION_REQUEST, escalation);
      });
    });

    // Listen for sidebar connections
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'nexus-sidebar') {
        this.sidebarPort = port;
        port.onMessage.addListener((msg) => this.handleSidebarMessage(msg));
        port.onDisconnect.addListener(() => {
          this.sidebarPort = null;
        });

        // Send initial state
        this.sendStateSync();
      }
    });

    // Listen for content script messages
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      this.handleContentMessage(msg, sender, sendResponse);
      return true; // Keep channel open for async response
    });
  }

  // ── Pending Permissions ───────────────────────────────────────────────────

  private _pendingPermissions: Map<
    string,
    (result: { approved: boolean; duration?: number; singleUse?: boolean }) => void
  > = new Map();

  // ── Sidebar Message Handling ──────────────────────────────────────────────

  private async handleSidebarMessage(msg: ExtMessage): Promise<void> {
    switch (msg.type) {
      case ExtMessageType.USER_INPUT: {
        const payload = msg.payload as UserInputPayload;

        // Deduplicate rapid-fire messages (voice input can spam)
        const lastMsg = this.chatHistory[this.chatHistory.length - 1];
        if (
          lastMsg?.role === 'user' &&
          lastMsg.content === payload.text &&
          Date.now() - lastMsg.timestamp < 2000
        ) {
          break; // Drop duplicate within 2 seconds
        }

        // Add to chat history
        const userMsg: ChatMessagePayload = {
          id: generateId('chat'),
          role: 'user',
          content: payload.text,
          timestamp: Date.now(),
        };
        this.chatHistory.push(userMsg);
        this.persistChat();
        this.sendToSidebar(ExtMessageType.CHAT_MESSAGE, userMsg);

        // ── BostonAi.io: Auto-capture page context ─────────────────────
        const pageContext = await this.captureCurrentPage();

        // Process with orchestrator (inject page context) — with safety timeout
        const timeoutMsg = 'That took too long — the request timed out. Try again or simplify the query.';
        let response: string;
        try {
          response = await withTimeout(
            orchestrator.processUserInput(payload.text, payload.attachments, pageContext),
            MAX_WORKFLOW_DURATION,
            timeoutMsg,
          );
          // If the timeout fired, force-cancel any lingering workflow
          if (response === timeoutMsg) {
            orchestrator.cancelWorkflow();
          }
        } catch (err) {
          response = `Something went wrong: ${err instanceof Error ? err.message : String(err)}`;
          orchestrator.cancelWorkflow();
        }

        // Don't add "workflow in progress" rejections to chat as assistant messages
        if (response === 'A workflow is already in progress. Please wait or cancel it first.') {
          break; // Silently drop — user already sees the active workflow
        }

        // Add response to chat
        const assistantMsg: ChatMessagePayload = {
          id: generateId('chat'),
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
        };
        this.chatHistory.push(assistantMsg);
        this.persistChat();
        this.sendToSidebar(ExtMessageType.CHAT_MESSAGE, assistantMsg);
        break;
      }

      case ExtMessageType.PERMISSION_RESPONSE: {
        const payload = msg.payload as PermissionResponsePayload;
        const resolver = this._pendingPermissions.get(payload.requestId);
        if (resolver) {
          resolver({
            approved: payload.approved,
            duration: payload.duration,
            singleUse: payload.singleUse,
          });
          this._pendingPermissions.delete(payload.requestId);
        }
        break;
      }

      case ExtMessageType.CANCEL_WORKFLOW:
        orchestrator.cancelWorkflow();
        break;

      case ExtMessageType.UPDATE_SETTINGS: {
        const settings = msg.payload as Record<string, unknown>;
        for (const [key, value] of Object.entries(settings)) {
          await memoryStore.setSetting(key, value);
        }

        const prov = (settings.llm_provider as string) ?? 'openai';
        const apiKey =
          prov === 'openai'
            ? (settings.openai_api_key as string)
            : prov === 'anthropic'
              ? (settings.anthropic_api_key as string)
              : (settings.ollama_api_key as string) ?? '';

        const configured = prov === 'ollama' ? true : (apiKey?.length ?? 0) > 0;
        if (configured) {
          llmProvider.configure({
            apiKey: apiKey ?? '',
            provider: prov as 'openai' | 'anthropic' | 'ollama',
            model: (settings.llm_model as string) ?? 'gpt-5-mini',
          });
        }
        if (settings.tabstack_api_key) {
          researcherAgent.setTabstackApiKey(settings.tabstack_api_key as string);
        }
        break;
      }

      case ExtMessageType.GET_STATE:
        this.sendStateSync();
        break;
    }
  }

  // ── Content Script Message Handling ────────────────────────────────────────

  private handleContentMessage(
    msg: ExtMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ): void {
    switch (msg.type) {
      case ExtMessageType.PAGE_CONTENT:
      case ExtMessageType.INTERACTION_RESULT:
        // Forward to the appropriate handler
        sendResponse({ received: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  // ── BostonAi.io: Auto Page Context + Vision ──────────────────────────────

  private async captureCurrentPage(): Promise<{
    url: string;
    title: string;
    text: string;
    domain: string;
    screenshot: string | null;
  }> {
    const result = {
      url: '',
      title: '',
      text: '',
      domain: '',
      screenshot: null as string | null,
    };

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) return result;

      result.url = tab.url;
      result.title = tab.title ?? '';
      result.domain = new URL(tab.url).hostname;

      // Read page text via content script (keep it lean for speed)
      try {
        let pageData: unknown;
        try {
          pageData = await chrome.tabs.sendMessage(
            tab.id,
            createMessage(ExtMessageType.READ_PAGE, { type: 'full' }),
          );
        } catch (readErr) {
          const msg = readErr instanceof Error ? readErr.message : String(readErr);
          if (/Could not establish connection|Receiving end does not exist/i.test(msg)) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js'],
            });
            await new Promise((r) => setTimeout(r, 400));
            pageData = await chrome.tabs.sendMessage(
              tab.id,
              createMessage(ExtMessageType.READ_PAGE, { type: 'full' }),
            );
          } else throw readErr;
        }
        if (pageData && typeof pageData === 'object' && 'text' in pageData && typeof (pageData as { text: string }).text === 'string') {
          result.text = (pageData as { text: string }).text.substring(0, 6000);
        }
      } catch {
        // Content script might not be injectable (e.g. chrome:// pages)
      }

      // Screenshot: only capture on demand, not every message (saves ~1-2s)
      // Vision is available via the fast path when needed
    } catch {
      // Tab query failed
    }

    return result;
  }

  // ── Persist Chat History ──────────────────────────────────────────────────

  private persistChat(): void {
    try {
      // Keep the last 200 messages to avoid hitting storage limits
      const toStore = this.chatHistory.slice(-200);
      chrome.storage.session.set({ nexus_chat_history: toStore });
    } catch {
      // Ignore storage errors
    }
  }

  // ── Send to Sidebar ───────────────────────────────────────────────────────

  private sendToSidebar(type: ExtMessageType, payload: unknown): void {
    if (this.sidebarPort) {
      try {
        this.sidebarPort.postMessage(createMessage(type, payload));
      } catch {
        // Port might be disconnected
        this.sidebarPort = null;
      }
    }
  }

  // ── State Sync ────────────────────────────────────────────────────────────

  private sendStateSync(): void {
    const state: StateSync = {
      workflow: orchestrator.getWorkflow(),
      activities: [],
      pendingPermissions: [],
      activeGrants: permissionManager.getActiveGrants(),
      chatHistory: this.chatHistory,
    };
    this.sendToSidebar(ExtMessageType.STATE_SYNC, state);
  }
}

export const messageRouter = new MessageRouter();
