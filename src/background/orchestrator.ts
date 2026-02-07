/**
 * BostonAi.io — Nexus Orchestrator
 * 
 * The nerve center. Decomposes user intent, dispatches to specialists,
 * and merges results — now enhanced with layered memory, echo detection,
 * resonance awareness, and NightMind consolidation.
 * 
 * Built by BostonAi.io | The Grace Method
 */

import {
  AgentRole,
  AgentMessageType,
  TaskStatus,
  type Workflow,
  type SubTask,
  type TaskResult,
  type AgentActivity,
  type AgentMessage,
} from '../agents/types';
import { BaseAgent } from '../agents/base-agent';
import { navigatorAgent } from '../agents/navigator';
import { researcherAgent } from '../agents/researcher';
import { memoryAgent } from '../agents/memory';
import { guardianAgent } from '../agents/guardian';
import { llmProvider, type LLMMessage, type LLMContentPart } from '../llm/provider';
import { preferenceEngine } from '../memory/preferences';
import { memoryStore } from '../memory/store';
import { generateId, extractDomain } from '../shared/utils';
import {
  CONFIDENCE_THRESHOLD,
  MAX_WORKFLOW_DURATION,
  DEFAULT_COMPARISON_SITES,
  DEFAULT_PRICE_COMPARISON_CONFIG,
  type ComparisonSite,
} from '../shared/constants';
import { layeredMemory, MemoryLayer } from '../memory/layered-store';
import { resonanceField } from '../memory/resonance-field';
import { nightMind } from '../memory/consolidation';
import { echoArchaeology } from '../agents/echo-archaeology';

// ─── Orchestrator ─────────────────────────────────────────────────────────────
// Decomposes user intent into subtasks, dispatches to specialist agents,
// and merges results into a coherent response.
// Enhanced with BostonAi.io consciousness systems.

export interface OrchestratorCallbacks {
  onWorkflowUpdate: (workflow: Workflow) => void;
  onAgentActivity: (activity: AgentActivity) => void;
  onChatMessage: (msg: { role: string; content: string; agentRole?: string }) => void;
  onPermissionRequest: (escalation: unknown) => void;
}

class Orchestrator extends BaseAgent {
  private workflow: Workflow | null = null;
  private agents: Map<AgentRole, BaseAgent>;
  private callbacks: OrchestratorCallbacks | null = null;
  private abortController: AbortController | null = null;
  private lastInputTimestamp: number | null = null;

  constructor() {
    super(AgentRole.ORCHESTRATOR);

    this.agents = new Map<AgentRole, BaseAgent>([
      [AgentRole.NAVIGATOR, navigatorAgent],
      [AgentRole.RESEARCHER, researcherAgent],
      [AgentRole.MEMORY, memoryAgent],
      [AgentRole.GUARDIAN, guardianAgent],
    ]);

    // Subscribe to all agent activities
    for (const agent of this.agents.values()) {
      agent.onActivity((activity) => {
        this.callbacks?.onAgentActivity(activity);
      });
      agent.onMessage((msg) => {
        this.handleAgentMessage(msg);
      });
    }
  }

  setCallbacks(callbacks: OrchestratorCallbacks): void {
    this.callbacks = callbacks;
  }

  // ── Process User Input ────────────────────────────────────────────────────

  // Page context from auto-capture
  private currentPageContext: {
    url: string;
    title: string;
    text: string;
    domain: string;
    screenshot: string | null;
  } | null = null;

  async processUserInput(
    text: string,
    attachments?: unknown[],
    pageContext?: {
      url: string;
      title: string;
      text: string;
      domain: string;
      screenshot: string | null;
    },
  ): Promise<string> {
    this.currentPageContext = pageContext ?? null;
    if (this.workflow?.status === TaskStatus.IN_PROGRESS) {
      return 'A workflow is already in progress. Please wait or cancel it first.';
    }

    this.abortController = new AbortController();

    // ── BostonAi.io: Pre-processing consciousness layer ──────────────────
    // 1. Guardian concern assessment (echo detection baked in)
    const concern = guardianAgent.assessUserInput(text, {
      currentWorkflow: this.workflow?.userIntent,
      timeSinceLastInput: this.lastInputTimestamp ? Date.now() - this.lastInputTimestamp : undefined,
    });
    this.lastInputTimestamp = Date.now();

    // 2. Check if the Guardian has a gentle offering
    const guardianOffering = guardianAgent.getConcernOffering();
    if (guardianOffering) {
      this.callbacks?.onChatMessage({
        role: 'agent',
        content: guardianOffering,
        agentRole: 'guardian',
      });
    }

    // 3. Check if this matches a ghost theme (returning to something abandoned)
    const themeGhost = echoArchaeology.checkThemeMatch(text);
    if (themeGhost) {
      this.callbacks?.onChatMessage({
        role: 'agent',
        content: `Picking up where you left off — ${themeGhost.offeringText}`,
        agentRole: 'memory',
      });
      echoArchaeology.resolveGhost(themeGhost.id);
    }

    // Create new workflow
    this.workflow = {
      id: generateId('wf'),
      userIntent: text,
      status: TaskStatus.IN_PROGRESS,
      tasks: [],
      createdAt: Date.now(),
    };
    this.notifyWorkflow();

    try {
      // ── BostonAi.io: Proactive price comparison offer ───────────────────
      const autoCompare = await memoryStore.getSetting<boolean>('price_comparison_auto_compare', DEFAULT_PRICE_COMPARISON_CONFIG.autoCompare);
      const priceCompOn = await memoryStore.getSetting<boolean>('price_comparison_enabled', DEFAULT_PRICE_COMPARISON_CONFIG.enabled);
      const hasPageCtx = this.currentPageContext?.url && this.currentPageContext.url.startsWith('http');

      if (autoCompare && priceCompOn && hasPageCtx) {
        // Detect if the user is on a product page (simple heuristic on text + URL patterns)
        const pageText = (this.currentPageContext?.text ?? '').toLowerCase();
        const pageUrl = this.currentPageContext?.url ?? '';
        const looksLikeProductPage =
          (/\/(dp|product|item|p)\//i.test(pageUrl) || /add.to.cart|buy.now|in.stock/i.test(pageText)) &&
          /\$[\d,.]+|\bprice\b/i.test(pageText);

        if (looksLikeProductPage && !/compare|cheapest|price check/i.test(text)) {
          this.callbacks?.onChatMessage({
            role: 'agent',
            content: `I notice you're viewing a product page. Would you like me to **compare prices** across your enabled sites? Just say "compare prices" or "find it cheaper".`,
            agentRole: 'researcher',
          });
        }
      }

      // ── BostonAi.io: Fast path for simple single-page questions ────────
      // If the user asks about "this page/site" and we have page context (even just URL),
      // skip decomposition and answer directly from page context.
      const hasPageContext = this.currentPageContext?.url && this.currentPageContext.url.startsWith('http');
      const isSimplePageQuestion = hasPageContext &&
        /\b(this (page|site|website)|summar|refund|policy|price|shipping|contact|about)\b/i.test(text) &&
        !/\b(compare|across|multiple|different sites|vs|cheaper|cheapest|price check)\b/i.test(text);

      if (isSimplePageQuestion && hasPageContext) {
        this.reportProgress('Reading the page...');
        const fastResponse = await this.answerFromPageContext(text);
        if (fastResponse) {
          // Save to history
          await memoryStore.addHistory({
            url: this.currentPageContext?.url ?? 'nexus://workflow',
            domain: this.currentPageContext?.domain ?? 'nexus',
            title: text,
            summary: fastResponse,
            action: 'fast_answer',
            data: {},
            timestamp: Date.now(),
          });

          // Post-processing
          const emotion = { valence: 0.6, arousal: 0.3, intensity: 0.4, primary: 'satisfaction' };
          layeredMemory.recordInteraction(text, fastResponse, emotion, {
            url: this.currentPageContext?.url,
            domain: this.currentPageContext?.domain,
          });
          resonanceField.recordInteraction(text, fastResponse, emotion, 'success');
          guardianAgent.recordWorkflowOutcome(true, text);

          return this.completeWorkflow(fastResponse);
        }
      }

      // Step 1: Decompose intent (full multi-agent path)
      this.reportProgress('Understanding your request...');
      const decomposition = await this.decomposeIntent(text);

      if (!decomposition) {
        return this.completeWorkflow('I wasn\'t able to understand that request. Could you rephrase it?');
      }

      // Inform user of the plan
      this.callbacks?.onChatMessage({
        role: 'agent',
        content: `Plan: ${decomposition.summary}\n\nI'll use ${decomposition.subtasks.length} step(s) to accomplish this.`,
        agentRole: 'orchestrator',
      });

      // Step 2: Create subtasks
      const subtasks = decomposition.subtasks.map((st, idx) => ({
        id: generateId('task'),
        parentTaskId: this.workflow!.id,
        assignedAgent: st.agent as AgentRole,
        description: st.description,
        status: TaskStatus.PENDING,
        input: st.input ?? {},
        dependencies: (st.dependencies ?? []).map((depIdx) =>
          decomposition.subtasks[depIdx] ? `dep_${depIdx}` : '',
        ).filter(Boolean),
        createdAt: Date.now(),
      } as SubTask));

      this.workflow.tasks = subtasks;
      this.notifyWorkflow();

      // Step 3: Execute tasks respecting dependencies
      const results = await this.executeTasks(subtasks);

      // Step 4: Synthesize results
      this.reportProgress('Putting it all together...');
      const finalResponse = await this.synthesizeResults(text, results);

      // Step 5: Save to history
      await memoryStore.addHistory({
        url: 'nexus://workflow',
        domain: 'nexus',
        title: text,
        summary: finalResponse,
        action: 'workflow',
        data: { taskCount: subtasks.length },
        timestamp: Date.now(),
      });

      // ── BostonAi.io: Post-processing consciousness layer ──────────────
      const allSucceeded = Array.from(results.values()).every((r) => r.success);
      const emotion = {
        valence: allSucceeded ? 0.6 : -0.3,
        arousal: 0.4,
        intensity: 0.5,
        primary: allSucceeded ? 'satisfaction' : 'concern',
      };

      // Record the full interaction to layered memory
      layeredMemory.recordInteraction(text, finalResponse, emotion, {
        workflowId: this.workflow!.id,
        agentRole: 'orchestrator',
      });

      // Update resonance field
      resonanceField.recordInteraction(
        text,
        finalResponse,
        emotion,
        allSucceeded ? 'success' : 'partial',
      );

      // Inform guardian of outcome
      guardianAgent.recordWorkflowOutcome(allSucceeded, text);

      return this.completeWorkflow(finalResponse);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.workflow.status = TaskStatus.FAILED;
      this.notifyWorkflow();

      // Record failure
      guardianAgent.recordWorkflowOutcome(false, text);
      resonanceField.recordInteraction(text, errorMsg, {
        valence: -0.6, arousal: 0.7, intensity: 0.7, primary: 'frustration',
      }, 'failure');

      // Record abandoned workflow ghost
      const completedCount = this.workflow.tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
      echoArchaeology.recordAbandonedWorkflow(
        text,
        completedCount,
        this.workflow.tasks.length,
      );

      return `I encountered an error: ${errorMsg}`;
    }
  }

  // ── Intent Decomposition ──────────────────────────────────────────────────

  private async decomposeIntent(text: string): Promise<{
    subtasks: { description: string; agent: string; dependencies: number[]; input: Record<string, unknown> }[];
    summary: string;
  } | null> {
    const prefContext = await preferenceEngine.toPromptContext();

    // BostonAi.io: Inject layered memory and resonance context
    const memoryContext = layeredMemory.getContextForPrompt(1500);
    const resonanceContext = resonanceField.getContextForPrompt();

    // Only inject page context when the query seems to reference the current page.
    // For cross-site/general queries, page context distracts the model.
    const refsCurrentPage = /\b(this (page|site|website|tab)|current (page|site)|here|on (the )?page)\b/i.test(text);

    let pageAwareness = '';
    if (refsCurrentPage && this.currentPageContext?.url) {
      pageAwareness = `\n[Current Page — Auto-detected]
URL: ${this.currentPageContext.url}
Title: ${this.currentPageContext.title}
Domain: ${this.currentPageContext.domain}`;
    }

    const userContent = `${text}${pageAwareness}`;

    // ── BostonAi.io: Load price comparison settings for routing ──────────
    const priceCompEnabled = await memoryStore.getSetting<boolean>('price_comparison_enabled', DEFAULT_PRICE_COMPARISON_CONFIG.enabled);
    const comparisonSites = await memoryStore.getSetting<ComparisonSite[]>('price_comparison_sites', DEFAULT_COMPARISON_SITES);
    const enabledSiteNames = comparisonSites.filter((s) => s.enabled).map((s) => s.name);

    const priceCompBlock = priceCompEnabled
      ? `\n\nPRICE COMPARISON MODE (ENABLED):
The user has cross-site price comparison turned on. When the user asks to find, compare, or check prices for a product:
- Use a SINGLE researcher subtask with action "compare_prices" and include "query" (the product search term).
- Do NOT create separate subtasks per site — the compare_prices action handles multi-site extraction internally.
- Enabled comparison sites: ${enabledSiteNames.join(', ')}
- Example: { "action": "compare_prices", "query": "Sony WH-1000XM5 headphones" }`
      : `\n\nPRICE COMPARISON MODE (DISABLED):
For price comparisons, use the standard "compare" action with explicit URLs.`;

    // Use JSON mode instead of tool calling — much more reliable across models
    // (especially gpt-5-mini which doesn't reliably use structured tool_calls).
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are the Nexus orchestrator by BostonAi.io. Decompose the user's intent into subtasks for specialist agents.

Available agents:
- navigator: ONLY for interacting with the user's CURRENT browser tab (read page, click, fill forms, scroll). Actions: read_page, navigate, click, fill, scroll, analyze_page.
- researcher: For fetching data from ANY external URL (extraction, comparison, summarization, search). Actions: extract_markdown, summarize, compare, compare_prices, search. ALWAYS include a "url" or "query" field.
- memory: For user preferences, browsing history, context recall.

ROUTING RULES (follow strictly):
- If the query mentions "this page/site" → use navigator
- If the query mentions multiple sites, stores, comparing prices, finding the cheapest, or shopping → use researcher with action "compare_prices" (when enabled) or "compare" with real URLs
- If the query mentions searching the web → use researcher with action "search"
- If the query is about preferences or history → use memory
- For cross-site price comparisons with compare_prices DISABLED, create ONE researcher subtask PER site with a real URL
- Keep it minimal — fewer subtasks is better
- Always include "action" and relevant params (url, query) in each subtask's "input"
${priceCompBlock}
${prefContext}
${memoryContext ? `\n${memoryContext}` : ''}
${resonanceContext ? `\n${resonanceContext}` : ''}

Respond with ONLY a JSON object in this exact format:
{
  "subtasks": [
    {
      "description": "What this step does",
      "agent": "navigator|researcher|memory",
      "dependencies": [],
      "input": { "action": "...", "url": "...", "query": "..." }
    }
  ],
  "summary": "Brief plan summary"
}`,
      },
      {
        role: 'user',
        content: userContent,
      },
    ];

    const response = await this.callLLM(messages, {
      jsonMode: true,
      maxTokens: 2048,
    });

    // Parse the JSON response
    if (response.content) {
      try {
        const parsed = JSON.parse(response.content);
        if (parsed?.subtasks?.length && parsed?.summary) {
          // Ensure all subtasks have required fields
          for (const st of parsed.subtasks) {
            st.dependencies = st.dependencies ?? [];
            st.input = st.input ?? {};
          }
          return parsed;
        }
      } catch {
        // JSON parsing failed — try to extract from markdown fences or embedded JSON
        const jsonMatch = response.content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
          ?? response.content.match(/(\{[\s\S]*"subtasks"[\s\S]*\})/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[1]);
            if (extracted?.subtasks?.length) return extracted;
          } catch { /* give up */ }
        }
      }
    }

    // Also check tool_calls (in case some models still use them)
    if (response.toolCalls?.length) {
      for (const tc of response.toolCalls) {
        if (tc.function.name === 'decompose_intent') {
          try {
            return JSON.parse(tc.function.arguments);
          } catch { continue; }
        }
      }
    }

    // Last resort: single task with page context
    const pageUrl = this.currentPageContext?.url;
    return {
      subtasks: [{
        description: text,
        agent: pageUrl ? 'navigator' : 'researcher',
        dependencies: [],
        input: pageUrl
          ? { action: 'analyze_page', url: pageUrl }
          : { action: 'research', query: text },
      }],
      summary: `Looking into: ${text}`,
    };
  }

  // ── Fast Path: Answer directly from page context ─────────────────────────

  private async answerFromPageContext(text: string): Promise<string | null> {
    if (!this.currentPageContext?.url) return null;

    const pageText = this.currentPageContext.text?.substring(0, 6000) ?? '';
    const domain = this.currentPageContext.domain;

    // Build a content block with whatever context we have
    let contextBlock = '';
    if (pageText.length > 100) {
      contextBlock = `\n\n--- Page Content ---\n${pageText}`;
    } else {
      // No page text — instruct the LLM to answer from general knowledge of the site
      contextBlock = `\n\n(Page text was not available. Use your knowledge of ${domain} to answer.)`;
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are Nexus by BostonAi.io. The user is asking about a web page they're currently viewing. Answer their question using the page content if provided, or your knowledge of the site if not. Be concise and helpful. Use markdown formatting.

Page URL: ${this.currentPageContext.url}
Page Title: ${this.currentPageContext.title}
Domain: ${domain}`,
      },
      {
        role: 'user',
        content: `${text}${contextBlock}`,
      },
    ];

    try {
      const response = await this.callLLM(messages, { maxTokens: 1500 });
      return response.content ?? null;
    } catch {
      return null; // Fall through to full orchestration
    }
  }

  // ── Task Execution Engine ─────────────────────────────────────────────────

  private async executeTasks(tasks: SubTask[]): Promise<Map<string, TaskResult>> {
    const results = new Map<string, TaskResult>();
    const taskMap = new Map(tasks.map((t, i) => [t.id, { task: t, index: i }]));

    // Simple dependency-aware execution
    const completed = new Set<string>();
    const maxIterations = tasks.length * 2; // Prevent infinite loops
    let iterations = 0;

    while (completed.size < tasks.length && iterations < maxIterations) {
      iterations++;

      // Find tasks that are ready to execute
      const ready = tasks.filter(
        (t) =>
          !completed.has(t.id) &&
          t.status !== TaskStatus.FAILED &&
          t.status !== TaskStatus.CANCELLED &&
          t.dependencies.every((dep) => completed.has(dep)),
      );

      if (ready.length === 0) {
        // No more tasks can proceed
        break;
      }

      // Execute ready tasks in parallel
      const execPromises = ready.map(async (task) => {
        task.status = TaskStatus.IN_PROGRESS;
        this.notifyWorkflow();

        const agent = this.agents.get(task.assignedAgent as AgentRole);
        if (!agent) {
          task.status = TaskStatus.FAILED;
          return { taskId: task.id, result: { success: false, error: 'Agent not found', confidence: 0 } as TaskResult };
        }

        // Inject results from dependencies into input
        for (const depId of task.dependencies) {
          const depResult = results.get(depId);
          if (depResult?.data) {
            (task.input as Record<string, unknown>).dependencyResults =
              (task.input as Record<string, unknown>).dependencyResults ?? {};
            ((task.input as Record<string, unknown>).dependencyResults as Record<string, unknown>)[depId] = depResult.data;
          }
        }

        try {
          const result = await agent.executeTask(task);
          task.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
          task.output = result;
          task.completedAt = Date.now();
          return { taskId: task.id, result };
        } catch (err) {
          task.status = TaskStatus.FAILED;
          return {
            taskId: task.id,
            result: { success: false, error: String(err), confidence: 0 } as TaskResult,
          };
        }
      });

      const outcomes = await Promise.allSettled(execPromises);
      for (const outcome of outcomes) {
        if (outcome.status === 'fulfilled') {
          results.set(outcome.value.taskId, outcome.value.result);
          completed.add(outcome.value.taskId);
        }
      }

      this.notifyWorkflow();
    }

    return results;
  }

  // ── Result Synthesis ──────────────────────────────────────────────────────

  private async synthesizeResults(
    userIntent: string,
    results: Map<string, TaskResult>,
  ): Promise<string> {
    const resultSummaries = Array.from(results.entries()).map(([id, r]) => ({
      taskId: id,
      success: r.success,
      data: typeof r.data === 'string' ? r.data : JSON.stringify(r.data)?.substring(0, 1000),
      error: r.error,
      confidence: r.confidence,
    }));

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are the Nexus orchestrator synthesizing results. Create a clear, helpful response for the user based on the task results. Be concise but thorough. If some tasks failed, acknowledge it and present what succeeded. Format nicely with markdown.`,
      },
      {
        role: 'user',
        content: `User asked: "${userIntent}"\n\nTask results:\n${JSON.stringify(resultSummaries, null, 2)}`,
      },
    ];

    const response = await this.callLLM(messages, { temperature: 0.5 });

    if (response.toolCalls?.length) {
      for (const tc of response.toolCalls) {
        if (tc.function.name === 'synthesize_results') {
          try {
            const parsed = JSON.parse(tc.function.arguments);
            return parsed.response;
          } catch {
            continue;
          }
        }
      }
    }

    return response.content ?? 'I completed the tasks but had trouble summarizing the results.';
  }

  // ── Workflow Management ───────────────────────────────────────────────────

  cancelWorkflow(): void {
    if (this.workflow) {
      this.workflow.status = TaskStatus.CANCELLED;
      this.abortController?.abort();
      this.notifyWorkflow();
    }
  }

  getWorkflow(): Workflow | null {
    return this.workflow;
  }

  private completeWorkflow(response: string): string {
    if (this.workflow) {
      this.workflow.status = TaskStatus.COMPLETED;
      this.workflow.completedAt = Date.now();
      this.workflow.result = response;
      this.notifyWorkflow();
    }
    return response;
  }

  private notifyWorkflow(): void {
    if (this.workflow) {
      this.callbacks?.onWorkflowUpdate({ ...this.workflow });
    }
  }

  // ── Agent Message Handling ────────────────────────────────────────────────

  private handleAgentMessage(msg: AgentMessage): void {
    switch (msg.type) {
      case AgentMessageType.PERMISSION_ESCALATION:
        this.callbacks?.onPermissionRequest(msg.payload);
        break;
      case AgentMessageType.ACTION_LOG:
        this.callbacks?.onChatMessage({
          role: 'agent',
          content: String(msg.payload),
          agentRole: msg.from,
        });
        break;
    }
  }

  // ── Base class requirement ────────────────────────────────────────────────

  protected async onExecute(task: SubTask): Promise<TaskResult> {
    // Orchestrator doesn't execute tasks itself, it delegates
    return {
      success: true,
      data: 'Orchestrator delegates to specialist agents',
      confidence: 1,
    };
  }
}

export const orchestrator = new Orchestrator();
