import { z } from 'zod';
import { llmProvider, type LLMMessage } from './provider';

// ─── Structured Output Parsing ────────────────────────────────────────────────

export async function getStructuredOutput<T extends z.ZodType>(
  messages: LLMMessage[],
  schema: T,
  description: string,
): Promise<z.infer<T>> {
  const systemPrompt: LLMMessage = {
    role: 'system',
    content: `You must respond with valid JSON matching this schema description: ${description}. Only output JSON, no other text.`,
  };

  const response = await llmProvider.complete([systemPrompt, ...messages], {
    jsonMode: true,
    temperature: 0.3, // Lower temp for structured output
  });

  if (!response.content) {
    throw new Error('Empty response from LLM');
  }

  const parsed = JSON.parse(response.content);
  return schema.parse(parsed);
}

// ─── Common Schemas ───────────────────────────────────────────────────────────

export const IntentDecompositionSchema = z.object({
  subtasks: z.array(
    z.object({
      description: z.string(),
      agent: z.enum(['navigator', 'researcher', 'memory']),
      dependencies: z.array(z.number()).default([]),
      input: z.record(z.unknown()).default({}),
    }),
  ),
  summary: z.string(),
  requiresBrowserContext: z.boolean(),
  estimatedComplexity: z.enum(['simple', 'moderate', 'complex']),
});

export type IntentDecomposition = z.infer<typeof IntentDecompositionSchema>;

export const PageAnalysisSchema = z.object({
  mainContent: z.string(),
  pageType: z.enum(['product', 'article', 'search_results', 'form', 'list', 'login', 'other']),
  keyElements: z.array(
    z.object({
      type: z.string(),
      selector: z.string().optional(),
      description: z.string(),
    }),
  ),
  actionableItems: z.array(
    z.object({
      action: z.string(),
      selector: z.string().optional(),
      description: z.string(),
    }),
  ),
});

export type PageAnalysis = z.infer<typeof PageAnalysisSchema>;

export const ComparisonResultSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      source: z.string(),
      score: z.number(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      matchesPreferences: z.boolean(),
    }),
  ),
  recommendation: z.string(),
  confidence: z.number(),
});

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;
