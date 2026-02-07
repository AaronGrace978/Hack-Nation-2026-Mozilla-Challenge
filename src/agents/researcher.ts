import { BaseAgent } from './base-agent';
import {
  AgentRole,
  type SubTask,
  type TaskResult,
} from './types';
import { PermissionLevel } from '../permissions/types';
import { llmProvider, type LLMMessage } from '../llm/provider';
import { RESEARCHER_TOOLS } from '../llm/tools';
import { preferenceEngine } from '../memory/preferences';
import { extractDomain } from '../shared/utils';

// ─── Timeout Helper ──────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 30_000; // 30 seconds max per external fetch

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ─── Tabstack Client (lazy-initialized) ──────────────────────────────────────

let tabstackClient: any = null;

function getTabstack(): any {
  if (!tabstackClient) {
    // Dynamic import to avoid issues if API key isn't set
    try {
      // Will be configured at runtime
      const Tabstack = (globalThis as any).__tabstack_sdk;
      if (Tabstack) {
        tabstackClient = new Tabstack({
          apiKey: (globalThis as any).__tabstack_api_key ?? '',
        });
      }
    } catch {
      console.warn('Tabstack SDK not available');
    }
  }
  return tabstackClient;
}

// ─── Researcher Agent ─────────────────────────────────────────────────────────
// Handles cross-site research: extraction, comparison, summarization.
// Uses Tabstack SDK for web extraction and automation.

export class ResearcherAgent extends BaseAgent {
  private tabstackApiKey: string = '';

  constructor() {
    super(AgentRole.RESEARCHER);
  }

  setTabstackApiKey(key: string): void {
    this.tabstackApiKey = key;
    tabstackClient = null; // Reset to re-init with new key
  }

  // ── Main Execution ────────────────────────────────────────────────────────

  protected async onExecute(task: SubTask): Promise<TaskResult> {
    const input = task.input as Record<string, unknown>;
    const action = (input.action as string) ?? 'research';

    this.reportProgress(`Researcher: ${action}`);

    switch (action) {
      case 'extract_markdown':
        return this.extractMarkdown(input, task.id);
      case 'extract_json':
        return this.extractJson(input, task.id);
      case 'automate':
        return this.automateTask(input, task.id);
      case 'compare':
        return this.compareAcrossSites(input, task.id);
      case 'summarize':
        return this.summarizeUrl(input, task.id);
      case 'search':
        return this.searchAndExtract(input, task.id);
      default:
        return this.handleWithLLM(task);
    }
  }

  // ── Extract Markdown ──────────────────────────────────────────────────────

  private async extractMarkdown(
    input: Record<string, unknown>,
    taskId: string,
  ): Promise<TaskResult> {
    const url = input.url as string;
    if (!url) return { success: false, error: 'No URL provided', confidence: 0 };

    const domain = extractDomain(url);
    const permResult = await this.withPermission(
      PermissionLevel.READ_ONLY,
      domain,
      `Extract content from ${url}`,
      async () => {
        // Use Tabstack if available, otherwise fallback to fetch
        if (this.tabstackApiKey) {
          const response = await fetchWithTimeout('https://api.tabstack.ai/v1/extract/markdown', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.tabstackApiKey}`,
            },
            body: JSON.stringify({ url }),
          });
          if (response.ok) return response.json();
          throw new Error(`Tabstack error: ${response.status}`);
        }
        // Fallback: basic fetch (with timeout)
        const response = await fetchWithTimeout(url, {});
        return { content: await response.text(), url };
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    return { success: true, data: permResult.result, confidence: 0.9 };
  }

  // ── Extract JSON ──────────────────────────────────────────────────────────

  private async extractJson(
    input: Record<string, unknown>,
    taskId: string,
  ): Promise<TaskResult> {
    const url = input.url as string;
    const schema = input.schema as Record<string, unknown>;

    if (!url) return { success: false, error: 'No URL provided', confidence: 0 };

    const domain = extractDomain(url);
    const permResult = await this.withPermission(
      PermissionLevel.READ_ONLY,
      domain,
      `Extract structured data from ${url}`,
      async () => {
        if (this.tabstackApiKey) {
          const response = await fetchWithTimeout('https://api.tabstack.ai/v1/extract/json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.tabstackApiKey}`,
            },
            body: JSON.stringify({ url, json_schema: schema }),
          });
          if (response.ok) return response.json();
          throw new Error(`Tabstack error: ${response.status}`);
        }
        throw new Error('Tabstack API key required for JSON extraction');
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    return { success: true, data: permResult.result, confidence: 0.85 };
  }

  // ── Automate Task ─────────────────────────────────────────────────────────

  private async automateTask(
    input: Record<string, unknown>,
    taskId: string,
  ): Promise<TaskResult> {
    const taskDescription = input.task as string;
    const url = input.url as string;
    const guardrails = (input.guardrails as string) ?? 'browse and extract only';

    if (!url || !taskDescription) {
      return { success: false, error: 'URL and task required', confidence: 0 };
    }

    const domain = extractDomain(url);
    const permResult = await this.withPermission(
      PermissionLevel.NAVIGATE,
      domain,
      `Automate: ${taskDescription}`,
      async () => {
        if (!this.tabstackApiKey) {
          throw new Error('Tabstack API key required for automation');
        }

        const response = await fetchWithTimeout('https://api.tabstack.ai/v1/automate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.tabstackApiKey}`,
          },
          body: JSON.stringify({
            task: taskDescription,
            url,
            guardrails,
            maxIterations: 50,
          }),
        }, 90_000); // 90s for automation tasks (they take longer)

        if (!response.ok) {
          throw new Error(`Tabstack automate error: ${response.status}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        let finalResult: unknown = null;
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter((l) => l.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              if (event.event === 'task:completed') {
                finalResult = event.data?.finalAnswer;
              }
              this.reportProgress(`Automation: ${event.event}`);
            } catch {
              // Skip non-JSON lines
            }
          }
        }

        return finalResult;
      },
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason, confidence: 0 };
    }

    return { success: true, data: permResult.result, confidence: 0.8 };
  }

  // ── Cross-Site Comparison ─────────────────────────────────────────────────

  private async compareAcrossSites(
    input: Record<string, unknown>,
    taskId: string,
  ): Promise<TaskResult> {
    const urls = input.urls as string[];
    const criteria = input.criteria as string;
    const schema = input.schema as Record<string, unknown>;

    if (!urls?.length) {
      return { success: false, error: 'No URLs provided for comparison', confidence: 0 };
    }

    this.reportProgress(`Comparing ${urls.length} sources...`);

    // Extract data from all URLs in parallel
    const extractions = await Promise.allSettled(
      urls.map((url) =>
        this.extractJson({ url, schema }, taskId),
      ),
    );

    const results = extractions
      .filter((r): r is PromiseFulfilledResult<TaskResult> => r.status === 'fulfilled' && r.value.success)
      .map((r) => r.value.data);

    // Get user preferences for ranking
    const prefContext = await preferenceEngine.toPromptContext();

    // Use LLM to compare and rank
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a research analyst. Compare the following data from multiple sources based on the given criteria. Rank them and provide a recommendation.${prefContext}`,
      },
      {
        role: 'user',
        content: `Compare these results based on "${criteria}":\n${JSON.stringify(results, null, 2)}`,
      },
    ];

    const llmResponse = await this.callLLM(messages, { temperature: 0.3 });

    return {
      success: true,
      data: {
        extractions: results,
        analysis: llmResponse.content,
      },
      confidence: 0.75,
    };
  }

  // ── URL Summarization ─────────────────────────────────────────────────────

  private async summarizeUrl(
    input: Record<string, unknown>,
    taskId: string,
  ): Promise<TaskResult> {
    const url = input.url as string;
    if (!url) return { success: false, error: 'No URL provided', confidence: 0 };

    // First extract
    const extracted = await this.extractMarkdown({ url }, taskId);
    if (!extracted.success) return extracted;

    const content = (extracted.data as Record<string, unknown>)?.content as string;

    // Then summarize with LLM
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'Summarize the following webpage content concisely. Focus on key facts and actionable information.',
      },
      {
        role: 'user',
        content: `Summarize this page content:\n${content?.substring(0, 6000) ?? 'No content available'}`,
      },
    ];

    const llmResponse = await this.callLLM(messages, { temperature: 0.3 });

    return {
      success: true,
      data: {
        url,
        summary: llmResponse.content,
        fullContent: content,
      },
      confidence: 0.85,
    };
  }

  // ── Search and Extract ────────────────────────────────────────────────────

  private async searchAndExtract(
    input: Record<string, unknown>,
    taskId: string,
  ): Promise<TaskResult> {
    const query = input.query as string;
    if (!query) return { success: false, error: 'No query provided', confidence: 0 };

    // Build a search URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    this.reportProgress(`Searching for: ${query}`);

    // Use Tabstack to automate the search
    if (this.tabstackApiKey) {
      return this.automateTask(
        {
          task: `Search for "${query}" and extract the top 5 results with titles, URLs, and snippets`,
          url: searchUrl,
          guardrails: 'browse and extract only, do not click on any results',
        },
        taskId,
      );
    }

    // Fallback: just return the search URL
    return {
      success: true,
      data: { query, searchUrl, note: 'Tabstack API key needed for full search automation' },
      confidence: 0.5,
    };
  }

  // ── LLM-Driven Task Handling ──────────────────────────────────────────────

  private async handleWithLLM(task: SubTask): Promise<TaskResult> {
    const prefContext = await preferenceEngine.toPromptContext();

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a web research agent. You can extract data from URLs, automate browser tasks, and compare information across sites. Plan your approach carefully.${prefContext}`,
      },
      {
        role: 'user',
        content: `Research task: ${task.description}\nInput: ${JSON.stringify(task.input)}`,
      },
    ];

    const response = await this.callLLM(messages, {
      tools: RESEARCHER_TOOLS,
      temperature: 0.4,
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
      case 'extract_page_data':
        return this.extractJson(args, taskId);
      case 'extract_markdown':
        return this.extractMarkdown(args, taskId);
      case 'automate_task':
        return this.automateTask(args, taskId);
      case 'compare_data':
        return this.compareAcrossSites(args, taskId);
      default:
        return { success: false, error: `Unknown tool: ${name}`, confidence: 0 };
    }
  }
}

export const researcherAgent = new ResearcherAgent();
