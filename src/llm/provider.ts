import { DEFAULT_LLM_CONFIG } from '../shared/constants';

// ─── Timeout Helper ──────────────────────────────────────────────────────────

const LLM_TIMEOUT_MS = 60_000; // 60 seconds max per LLM call

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = LLM_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ─── LLM Provider Types ──────────────────────────────────────────────────────

export type LLMProvider = 'openai' | 'anthropic' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

// Content can be plain text or multimodal (text + images for vision)
export type LLMContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentPart[];
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMToolCall {
  id: string;
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: LLMToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

// ─── LLM Provider Implementation ─────────────────────────────────────────────

class LLMProviderService {
  private config: LLMConfig | null = null;

  configure(config: Partial<LLMConfig> & { apiKey: string }): void {
    this.config = {
      provider: config.provider ?? (DEFAULT_LLM_CONFIG.provider as LLMProvider),
      model: config.model ?? DEFAULT_LLM_CONFIG.model,
      apiKey: config.apiKey,
      maxTokens: config.maxTokens ?? DEFAULT_LLM_CONFIG.maxTokens,
      temperature: config.temperature ?? DEFAULT_LLM_CONFIG.temperature,
    };
  }

  isConfigured(): boolean {
    if (!this.config) return false;
    if (this.config.provider === 'ollama') return true; // Ollama local needs no key
    return this.config.apiKey.length > 0;
  }

  getConfig(): LLMConfig | null {
    return this.config;
  }

  async complete(
    messages: LLMMessage[],
    options?: {
      tools?: LLMToolDefinition[];
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    },
  ): Promise<LLMResponse> {
    if (!this.config) {
      throw new Error('LLM provider not configured. Set your API key in Settings.');
    }

    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(messages, options);
      case 'anthropic':
        return this.callAnthropic(messages, options);
      case 'ollama':
        return this.callOllama(messages, options);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  // ── OpenAI ────────────────────────────────────────────────────────────────

  private async callOpenAI(
    messages: LLMMessage[],
    options?: {
      tools?: LLMToolDefinition[];
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    },
  ): Promise<LLMResponse> {
    const model = this.config!.model;

    // Models that use max_completion_tokens instead of max_tokens
    const useNewParam = model.startsWith('gpt-5') || model.startsWith('gpt-4.1') || model.startsWith('o3') || model.startsWith('o4');
    const tokenKey = useNewParam ? 'max_completion_tokens' : 'max_tokens';

    // Reasoning models and some mini/nano variants don't support custom temperature.
    // Only include temperature for models known to accept it.
    const supportsTemperature = !model.startsWith('o3') && !model.startsWith('o4')
      && !model.includes('-mini') && !model.includes('-nano');

    const body: Record<string, unknown> = {
      model,
      messages,
      [tokenKey]: options?.maxTokens ?? this.config!.maxTokens,
    };

    if (supportsTemperature) {
      body.temperature = options?.temperature ?? this.config!.temperature;
    }

    if (options?.tools?.length) {
      body.tools = options.tools;
    }

    if (options?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config!.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content ?? null,
      toolCalls: choice?.message?.tool_calls?.map((tc: Record<string, unknown>) => ({
        id: tc.id as string,
        function: tc.function as LLMToolCall['function'],
      })),
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason ?? 'unknown',
    };
  }

  // ── Anthropic ─────────────────────────────────────────────────────────────

  private async callAnthropic(
    messages: LLMMessage[],
    options?: {
      tools?: LLMToolDefinition[];
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    },
  ): Promise<LLMResponse> {
    // Separate system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: this.config!.model,
      max_tokens: options?.maxTokens ?? this.config!.maxTokens,
      temperature: options?.temperature ?? this.config!.temperature,
      messages: nonSystemMessages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (options?.tools?.length) {
      body.tools = options.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config!.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Parse Anthropic response format
    let content: string | null = null;
    const toolCalls: LLMToolCall[] = [];

    for (const block of data.content ?? []) {
      if (block.type === 'text') {
        content = (content ?? '') + block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
      finishReason: data.stop_reason ?? 'unknown',
    };
  }

  // ── Ollama (local or Cloud) ─────────────────────────────────────────────────

  private getOllamaBaseUrl(): string {
    if (this.config!.provider !== 'ollama') return '';
    return this.config!.apiKey?.length
      ? 'https://ollama.com'
      : 'http://localhost:11434';
  }

  private async callOllama(
    messages: LLMMessage[],
    options?: {
      tools?: LLMToolDefinition[];
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    },
  ): Promise<LLMResponse> {
    const baseUrl = this.getOllamaBaseUrl();

    // Normalize messages: Ollama uses 'images' array for vision, not content parts
    const ollamaMessages = messages.map((m) => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }
      // Multimodal: extract text and images separately
      const textParts = m.content.filter((p): p is { type: 'text'; text: string } => p.type === 'text');
      const imageParts = m.content.filter((p): p is { type: 'image_url'; image_url: { url: string } } => p.type === 'image_url');
      const text = textParts.map((p) => p.text).join('\n');
      const images = imageParts
        .map((p) => {
          // Ollama expects base64 without data URI prefix
          const url = p.image_url.url;
          const base64Match = url.match(/^data:[^;]+;base64,(.+)$/);
          return base64Match ? base64Match[1] : null;
        })
        .filter(Boolean);
      return { role: m.role, content: text, ...(images.length ? { images } : {}) };
    });

    const body: Record<string, unknown> = {
      model: this.config!.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: options?.temperature ?? this.config!.temperature ?? 0.7,
        num_predict: options?.maxTokens ?? this.config!.maxTokens ?? 4096,
      },
    };

    if (options?.tools?.length) {
      body.tools = options.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));
    }

    if (options?.jsonMode) {
      body.format = 'json';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config!.apiKey?.length) {
      headers['Authorization'] = `Bearer ${this.config!.apiKey}`;
    }

    const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const msg = data.message ?? {};

    const toolCalls: LLMToolCall[] | undefined = msg.tool_calls?.length
      ? msg.tool_calls.map((tc: { function?: { name?: string; arguments?: unknown } }, i: number) => ({
          id: `ollama-tc-${i}`,
          function: {
            name: tc.function?.name ?? '',
            arguments:
              typeof tc.function?.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function?.arguments ?? {}),
          },
        }))
      : undefined;

    return {
      content: msg.content ?? null,
      toolCalls,
      usage:
        data.prompt_eval_count != null
          ? {
              promptTokens: data.prompt_eval_count,
              completionTokens: data.eval_count ?? 0,
              totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
            }
          : undefined,
      finishReason: data.done_reason ?? (data.done ? 'stop' : 'unknown'),
    };
  }
}

export const llmProvider = new LLMProviderService();
