import { BaseAgent } from './base-agent';
import {
  AgentRole,
  AgentStatus,
  type SubTask,
  type TaskResult,
} from './types';
import { PermissionLevel } from '../permissions/types';
import { llmProvider, type LLMMessage } from '../llm/provider';
import { NAVIGATOR_TOOLS } from '../llm/tools';
import { extractDomain } from '../shared/utils';
import {
  ExtMessageType,
  createMessage,
  type PageContent,
  type PageInteraction,
  type PageReadRequest,
} from '../shared/messages';

// ─── Navigator Agent ──────────────────────────────────────────────────────────
// Handles page reading, DOM interaction, and tab management.
// Uses content scripts for direct page manipulation.

export class NavigatorAgent extends BaseAgent {
  public tabMessageHandler: ((msg: { type: string; payload: unknown }) => Promise<unknown>) | null = null;

  constructor() {
    super(AgentRole.NAVIGATOR);
  }

  // Set the handler that sends messages to content scripts
  setTabMessageHandler(handler: (msg: { type: string; payload: unknown }) => Promise<unknown>): void {
    this.tabMessageHandler = handler;
  }

  // ── Main Execution ────────────────────────────────────────────────────────

  protected async onExecute(task: SubTask): Promise<TaskResult> {
    const input = task.input as Record<string, unknown>;
    let action = (input.action as string) ?? 'read_page';
    const url = input.url as string | undefined;
    const domain = url ? extractDomain(url) : 'current';

    // ── Smart intent detection ─────────────────────────────────────────────
    // The LLM sometimes generates "click", "navigate", or other actions when
    // the real intent is to add to cart. Detect this and reroute regardless
    // of what action the LLM chose.
    const desc = (task.description ?? '').toLowerCase();
    const inputDesc = ((input.description ?? '') as string).toLowerCase();
    const combined = `${desc} ${inputDesc}`;
    // Permissive match: "add" followed by up to 30 chars then "cart"/"bag"/"basket"
    const isCartIntent = /add.{0,30}cart|add.{0,30}bag|add.{0,30}basket|buy\s*now/i.test(combined);

    if (isCartIntent && action !== 'add_to_cart') {
      action = 'add_to_cart';
    }

    this.reportProgress(`Navigator: ${action}`);

    switch (action) {
      case 'read_page':
        return this.readPage(input, domain, task.id);
      case 'navigate':
        return this.navigateTo(input, task.id);
      case 'click':
        return this.clickElement(input, domain, task.id);
      case 'fill':
        return this.fillInput(input, domain, task.id);
      case 'scroll':
        return this.scrollPage(input, domain, task.id);
      case 'analyze_page':
        return this.analyzePage(input, domain, task.id);
      case 'add_to_cart':
        return this.addToCart(input, domain, task.id);
      default:
        return this.handleWithLLM(task);
    }
  }

  // ── Page Reading ──────────────────────────────────────────────────────────

  private async readPage(
    input: Record<string, unknown>,
    domain: string,
    taskId: string,
  ): Promise<TaskResult> {
    const permResult = await this.withPermission(
      PermissionLevel.READ_ONLY,
      domain,
      'Read page content',
      async () => {
        return this.sendToContent(ExtMessageType.READ_PAGE, {
          type: input.readType ?? 'full',
          selector: input.selector,
          includeScreenshot: input.includeScreenshot ?? false,
        } as PageReadRequest);
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    return {
      success: true,
      data: permResult.result,
      confidence: 0.9,
    };
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  private async navigateTo(
    input: Record<string, unknown>,
    taskId: string,
  ): Promise<TaskResult> {
    const url = input.url as string;
    if (!url) {
      return { success: false, error: 'No URL provided', confidence: 0 };
    }

    const domain = extractDomain(url);
    const permResult = await this.withPermission(
      PermissionLevel.NAVIGATE,
      domain,
      `Navigate to ${url}`,
      async () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            await chrome.tabs.update(tab.id, { url });
            await this.waitForTabLoad(tab.id, 20000);
          }
        }
        return { navigated: true, url };
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    return {
      success: true,
      data: permResult.result,
      confidence: 0.95,
    };
  }

  // ── Click ─────────────────────────────────────────────────────────────────

  private async clickElement(
    input: Record<string, unknown>,
    domain: string,
    taskId: string,
  ): Promise<TaskResult> {
    const selector = input.selector as string;
    if (!selector) {
      // Last-resort fallback: if description suggests cart intent, reroute
      const clickDesc = ((input.description ?? '') as string).toLowerCase();
      if (/add.{0,30}cart|add.{0,30}bag|add.{0,30}basket|buy\s*now/i.test(clickDesc)) {
        return this.addToCart(input, domain, taskId);
      }
      return { success: false, error: 'No selector provided', confidence: 0 };
    }

    const permResult = await this.withPermission(
      PermissionLevel.INTERACT,
      domain,
      `Click element: ${input.description ?? selector}`,
      async () => {
        return this.sendToContent(ExtMessageType.INTERACT_PAGE, {
          action: 'click',
          selector,
        } as PageInteraction);
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    return {
      success: true,
      data: permResult.result,
      confidence: 0.85,
    };
  }

  // ── Fill Input ────────────────────────────────────────────────────────────

  private async fillInput(
    input: Record<string, unknown>,
    domain: string,
    taskId: string,
  ): Promise<TaskResult> {
    const selector = input.selector as string;
    const value = input.value as string;

    const permResult = await this.withPermission(
      PermissionLevel.INTERACT,
      domain,
      `Fill input: ${input.description ?? selector}`,
      async () => {
        return this.sendToContent(ExtMessageType.INTERACT_PAGE, {
          action: 'type',
          selector,
          value,
        } as PageInteraction);
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    return {
      success: true,
      data: permResult.result,
      confidence: 0.85,
    };
  }

  // ── Add to Cart ─────────────────────────────────────────────────────────────

  private async addToCart(
    input: Record<string, unknown>,
    domain: string,
    taskId: string,
  ): Promise<TaskResult> {
    const url = input.url as string | undefined;
    const targetDomain = url ? extractDomain(url) : domain;

    const permResult = await this.withPermission(
      PermissionLevel.INTERACT,
      targetDomain,
      'Add item to cart (find and click Add to Cart button)',
      async () => {
        let tabId: number | undefined;

        if (url && typeof chrome !== 'undefined' && chrome.tabs) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = tab?.id;
          if (tabId) {
            await chrome.tabs.update(tabId, { url });
            // Wait for the initial page load
            await this.waitForTabLoad(tabId, 20000);
            // Retailer pages often do client-side redirects after
            // the initial "complete" event. Wait, then check for
            // a second load cycle (redirect).
            await new Promise((r) => setTimeout(r, 2000));
            await this.waitForTabLoad(tabId, 5000);
            // Final hydration wait — React/JS frameworks need time
            await new Promise((r) => setTimeout(r, 2000));
          }
        }

        // Retry up to 4 times with increasing delays.
        // Catches BOTH { success: false } results AND thrown errors
        // (content script unreachable after navigation/redirect).
        let lastError = 'Unknown error';
        const maxRetries = 4;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            // Force-inject content script before each attempt (idempotent if already loaded)
            await this.ensureContentScript(tabId);
            await new Promise((r) => setTimeout(r, attempt === 0 ? 500 : 1000));

            const result = await this.sendToContent(ExtMessageType.INTERACT_PAGE, {
              action: 'add_to_cart',
            } as PageInteraction) as { success?: boolean; error?: string };

            if (result?.success !== false) {
              return result;
            }

            lastError = result?.error ?? 'Add to Cart button not found';
          } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
          }

          // Wait before retry (increasing backoff)
          if (attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          }
        }

        return { success: false, error: lastError };
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    const result = permResult.result as { success?: boolean; error?: string };
    return {
      success: result?.success !== false,
      data: permResult.result,
      confidence: result?.success !== false ? 0.9 : 0,
      error: result?.error,
    };
  }

  // ── Force-inject content script into active tab ────────────────────────────

  private async ensureContentScript(tabId?: number): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.scripting) return;

    try {
      let targetId = tabId;
      if (!targetId && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        targetId = tab?.id;
      }
      if (!targetId) return;

      await chrome.scripting.executeScript({
        target: { tabId: targetId },
        files: ['content.js'],
      });
    } catch {
      // May fail on restricted pages (chrome://, about:, etc.) — that's OK
    }
  }

  // ── Scroll ────────────────────────────────────────────────────────────────

  private async scrollPage(
    input: Record<string, unknown>,
    domain: string,
    taskId: string,
  ): Promise<TaskResult> {
    const permResult = await this.withPermission(
      PermissionLevel.READ_ONLY,
      domain,
      'Scroll page',
      async () => {
        return this.sendToContent(ExtMessageType.INTERACT_PAGE, {
          action: 'scroll',
          value: input.direction as string ?? 'down',
        } as PageInteraction);
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    return { success: true, data: permResult.result, confidence: 0.95 };
  }

  // ── Page Analysis (LLM-powered) ───────────────────────────────────────────

  private async analyzePage(
    input: Record<string, unknown>,
    domain: string,
    taskId: string,
  ): Promise<TaskResult> {
    // First read the page
    const pageResult = await this.readPage(
      { readType: 'full' },
      domain,
      taskId,
    );

    if (!pageResult.success) return pageResult;

    const pageContent = pageResult.data as PageContent;

    // Then analyze with LLM
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a page analysis agent. Analyze the following page content and identify key elements, actionable items, and the page type. Be concise and focused.`,
      },
      {
        role: 'user',
        content: `Analyze this page:\nURL: ${pageContent.url}\nTitle: ${pageContent.title}\n\nContent:\n${pageContent.text?.substring(0, 4000) ?? 'No text content'}`,
      },
    ];

    const llmResponse = await this.callLLM(messages, { temperature: 0.3 });

    return {
      success: true,
      data: {
        pageContent,
        analysis: llmResponse.content,
      },
      confidence: 0.8,
    };
  }

  // ── LLM-Driven Task Handling ──────────────────────────────────────────────

  private async handleWithLLM(task: SubTask): Promise<TaskResult> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a browser navigation agent. You can read pages, click elements, fill forms, and navigate. 
Plan what actions to take to accomplish the given task. Use the available tools.
Be precise with CSS selectors. If unsure, first read the page to understand its structure.`,
      },
      {
        role: 'user',
        content: `Task: ${task.description}\nInput: ${JSON.stringify(task.input)}`,
      },
    ];

    const response = await this.callLLM(messages, {
      tools: NAVIGATOR_TOOLS,
      temperature: 0.3,
    });

    // Process tool calls
    if (response.toolCalls?.length) {
      const results: unknown[] = [];
      for (const toolCall of response.toolCalls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await this.executeToolCall(toolCall.function.name, args, task.id);
        results.push(result);
      }
      return {
        success: true,
        data: { response: response.content, toolResults: results },
        confidence: 0.75,
      };
    }

    return {
      success: true,
      data: response.content,
      confidence: 0.7,
    };
  }

  private async executeToolCall(
    name: string,
    args: Record<string, unknown>,
    taskId: string,
  ): Promise<TaskResult> {
    switch (name) {
      case 'read_page':
        return this.readPage(args, 'current', taskId);
      case 'click_element':
        return this.clickElement(args, 'current', taskId);
      case 'fill_input':
        return this.fillInput(args, 'current', taskId);
      case 'navigate_to':
        return this.navigateTo(args, taskId);
      case 'scroll_page':
        return this.scrollPage(args, 'current', taskId);
      default:
        return { success: false, error: `Unknown tool: ${name}`, confidence: 0 };
    }
  }

  // ── Wait for tab to finish loading (so content script is ready) ───────────
  // Debounces: if a redirect causes another loading cycle within `settleMs`,
  // waits for that too. This prevents resolving during a client-side redirect.

  private waitForTabLoad(tabId: number, timeoutMs: number, settleMs = 800): Promise<void> {
    return new Promise((resolve) => {
      let settleTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (settleTimer) clearTimeout(settleTimer);
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
      };

      const scheduleResolve = () => {
        // Debounce: reset the settle timer each time we get "complete"
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          cleanup();
          resolve();
        }, settleMs);
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);

      const listener = (
        id: number,
        changeInfo: { status?: string },
      ) => {
        if (id !== tabId) return;
        if (changeInfo.status === 'loading') {
          // A new navigation started (redirect) — cancel any pending resolve
          if (settleTimer) {
            clearTimeout(settleTimer);
            settleTimer = null;
          }
        } else if (changeInfo.status === 'complete') {
          scheduleResolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
      chrome.tabs.get(tabId).then((tab) => {
        if (tab.status === 'complete') {
          scheduleResolve();
        }
      }).catch(() => {});
    });
  }

  // ── Content Script Communication ──────────────────────────────────────────

  private async sendToContent(type: ExtMessageType, payload: unknown): Promise<unknown> {
    try {
      if (this.tabMessageHandler) {
        return await this.tabMessageHandler({ type, payload });
      }

      // Fallback: use chrome.tabs API
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          // Try to inject content script if not already present
          try {
            return await chrome.tabs.sendMessage(tab.id, createMessage(type, payload));
          } catch {
            // Content script not loaded — try injecting it first
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js'],
            });
            // Retry after injection
            return await chrome.tabs.sendMessage(tab.id, createMessage(type, payload));
          }
        }
      }
    } catch (err) {
      throw new Error(`Content script unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }

    throw new Error('No active tab found for content script communication');
  }
}

export const navigatorAgent = new NavigatorAgent();
