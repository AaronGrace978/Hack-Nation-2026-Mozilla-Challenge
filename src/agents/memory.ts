import { BaseAgent } from './base-agent';
import {
  AgentRole,
  type SubTask,
  type TaskResult,
} from './types';
import { memoryStore, type BrowsingHistoryEntry, type UserPreference } from '../memory/store';
import { preferenceEngine } from '../memory/preferences';
import { llmProvider, type LLMMessage } from '../llm/provider';
import { MEMORY_TOOLS } from '../llm/tools';

// ─── Memory Agent ─────────────────────────────────────────────────────────────
// Manages user preferences, browsing history, and contextual memory.
// No browser permission needed -- only accesses local IndexedDB.

export class MemoryAgent extends BaseAgent {
  constructor() {
    super(AgentRole.MEMORY);
  }

  // ── Main Execution ────────────────────────────────────────────────────────

  protected async onExecute(task: SubTask): Promise<TaskResult> {
    const input = task.input as Record<string, unknown>;
    const action = (input.action as string) ?? 'recall';

    this.reportProgress(`Memory: ${action}`);

    switch (action) {
      case 'recall_preferences':
        return this.recallPreferences(input);
      case 'recall_history':
        return this.recallHistory(input);
      case 'save_preference':
        return this.savePreference(input);
      case 'save_history':
        return this.saveHistory(input);
      case 'save_context':
        return this.saveContext(input);
      case 'get_preference_context':
        return this.getPreferenceContext();
      case 'compare_with_history':
        return this.compareWithHistory(input);
      default:
        return this.handleWithLLM(task);
    }
  }

  // ── Recall Preferences ────────────────────────────────────────────────────

  private async recallPreferences(input: Record<string, unknown>): Promise<TaskResult> {
    const category = input.category as string | undefined;
    const preferences = await memoryStore.getPreferences(category);

    return {
      success: true,
      data: preferences,
      confidence: 1,
      metadata: { count: preferences.length },
    };
  }

  // ── Recall History ────────────────────────────────────────────────────────

  private async recallHistory(input: Record<string, unknown>): Promise<TaskResult> {
    const query = input.query as string | undefined;
    const domain = input.domain as string | undefined;
    const limit = (input.limit as number) ?? 20;

    let results: BrowsingHistoryEntry[];

    if (query) {
      results = await memoryStore.searchHistory(query);
    } else {
      results = await memoryStore.getHistory({ domain, limit });
    }

    return {
      success: true,
      data: results,
      confidence: 1,
      metadata: { count: results.length },
    };
  }

  // ── Save Preference ───────────────────────────────────────────────────────

  private async savePreference(input: Record<string, unknown>): Promise<TaskResult> {
    const category = input.category as string;
    const key = input.key as string;
    const value = input.value;
    const description = input.description as string;

    if (!category || !key || value === undefined) {
      return { success: false, error: 'category, key, and value are required', confidence: 0 };
    }

    const pref = await memoryStore.setPreference(category, key, value, description ?? `${category}.${key}`);

    return {
      success: true,
      data: pref,
      confidence: 1,
    };
  }

  // ── Save History ──────────────────────────────────────────────────────────

  private async saveHistory(input: Record<string, unknown>): Promise<TaskResult> {
    const entry = await memoryStore.addHistory({
      url: input.url as string,
      domain: input.domain as string,
      title: input.title as string,
      summary: input.summary as string | undefined,
      action: input.action_type as string | undefined,
      data: input.data as Record<string, unknown> | undefined,
      timestamp: Date.now(),
    });

    return {
      success: true,
      data: entry,
      confidence: 1,
    };
  }

  // ── Save Context ──────────────────────────────────────────────────────────

  private async saveContext(input: Record<string, unknown>): Promise<TaskResult> {
    const entry = await memoryStore.addContext({
      type: (input.type as 'interaction' | 'purchase' | 'research' | 'preference_inferred') ?? 'interaction',
      content: input.content as string,
      relatedUrls: input.relatedUrls as string[] | undefined,
      metadata: input.metadata as Record<string, unknown> | undefined,
      timestamp: Date.now(),
      expiresAt: input.expiresAt as number | undefined,
    });

    return {
      success: true,
      data: entry,
      confidence: 1,
    };
  }

  // ── Get Preference Context ────────────────────────────────────────────────

  private async getPreferenceContext(): Promise<TaskResult> {
    const context = await preferenceEngine.buildContext();
    const promptText = await preferenceEngine.toPromptContext();

    return {
      success: true,
      data: { context, promptText },
      confidence: 1,
    };
  }

  // ── Compare With History ──────────────────────────────────────────────────

  private async compareWithHistory(input: Record<string, unknown>): Promise<TaskResult> {
    const currentContent = input.content as string;
    const query = input.query as string;

    if (!currentContent) {
      return { success: false, error: 'No content to compare', confidence: 0 };
    }

    // Retrieve relevant history
    const history = query
      ? await memoryStore.searchHistory(query)
      : await memoryStore.getHistory({ limit: 10 });

    if (history.length === 0) {
      return {
        success: true,
        data: { comparison: 'No relevant history found to compare against.', history: [] },
        confidence: 0.5,
      };
    }

    // Use LLM to compare
    const historyContext = history
      .map((h) => `- [${h.title}] ${h.url} - ${h.summary ?? h.action ?? 'visited'}${h.data ? ` | Data: ${JSON.stringify(h.data)}` : ''}`)
      .join('\n');

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a memory comparison agent. Compare current content with the user\'s past browsing history and provide insights about similarities, differences, and recommendations.',
      },
      {
        role: 'user',
        content: `Current content:\n${currentContent.substring(0, 3000)}\n\nPast history:\n${historyContext}`,
      },
    ];

    const response = await this.callLLM(messages, { temperature: 0.4 });

    return {
      success: true,
      data: {
        comparison: response.content,
        matchedHistory: history,
      },
      confidence: 0.75,
    };
  }

  // ── LLM-Driven Task Handling ──────────────────────────────────────────────

  private async handleWithLLM(task: SubTask): Promise<TaskResult> {
    // Get current preferences for context
    const prefContext = await preferenceEngine.toPromptContext();

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a memory management agent. You can recall preferences, search history, save new preferences, and compare current content with past interactions.${prefContext}`,
      },
      {
        role: 'user',
        content: `Memory task: ${task.description}\nInput: ${JSON.stringify(task.input)}`,
      },
    ];

    const response = await this.callLLM(messages, {
      tools: MEMORY_TOOLS,
      temperature: 0.3,
    });

    if (response.toolCalls?.length) {
      const results: unknown[] = [];
      for (const toolCall of response.toolCalls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await this.executeToolCall(toolCall.function.name, args);
        results.push(result);
      }
      return {
        success: true,
        data: { response: response.content, toolResults: results },
        confidence: 0.8,
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
  ): Promise<TaskResult> {
    switch (name) {
      case 'recall_preferences':
        return this.recallPreferences(args);
      case 'recall_history':
        return this.recallHistory(args);
      case 'save_preference':
        return this.savePreference(args);
      default:
        return { success: false, error: `Unknown tool: ${name}`, confidence: 0 };
    }
  }
}

export const memoryAgent = new MemoryAgent();
