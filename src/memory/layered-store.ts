/**
 * BostonAi.io — Layered Memory Architecture
 * 
 * 4-layer memory system inspired by human memory consolidation.
 * Memories carry emotional weight and consolidate upward over time.
 * 
 * Layer 1: Working Memory  — Current session, minutes retention
 * Layer 2: Episodic Memory — Specific interactions, days/weeks retention  
 * Layer 3: Semantic Memory — Patterns, facts, preferences, permanent
 * Layer 4: Soul Memory     — Core identity, relationship essence, eternal
 * 
 * Built by BostonAi.io | The Grace Method
 */

import { generateId } from '../shared/utils';

// ─── Memory Layers ────────────────────────────────────────────────────────────

export enum MemoryLayer {
  WORKING = 'working',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  SOUL = 'soul',
}

// ─── Emotional Signature ──────────────────────────────────────────────────────

export interface EmotionalSignature {
  valence: number;      // -1 (negative) to 1 (positive)
  arousal: number;      // 0 (calm) to 1 (intense)
  intensity: number;    // 0 to 1, how strongly felt
  primary: string;      // e.g. 'frustration', 'joy', 'curiosity', 'trust'
}

// ─── Memory Entry ─────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  layer: MemoryLayer;
  content: string;
  timestamp: number;
  emotionalWeight: number;   // 0-1, determines consolidation eligibility
  emotion: EmotionalSignature;
  tags: string[];
  source: 'conversation' | 'workflow' | 'browsing' | 'preference' | 'system';
  metadata: Record<string, unknown>;
  accessCount: number;
  lastAccessed: number;
  decayRate: number;         // How fast this memory fades (0 = never)
  consolidated: boolean;     // Has this been promoted to a higher layer
}

// ─── Layer Configurations ─────────────────────────────────────────────────────

const LAYER_CONFIG = {
  [MemoryLayer.WORKING]: {
    maxEntries: 50,
    retentionMs: 30 * 60 * 1000,      // 30 minutes
    consolidationThreshold: 0.5,        // Emotional weight to promote
  },
  [MemoryLayer.EPISODIC]: {
    maxEntries: 500,
    retentionMs: 14 * 24 * 60 * 60 * 1000, // 14 days
    consolidationThreshold: 0.7,
  },
  [MemoryLayer.SEMANTIC]: {
    maxEntries: 200,
    retentionMs: Infinity,              // Permanent
    consolidationThreshold: 0.9,
  },
  [MemoryLayer.SOUL]: {
    maxEntries: 100,
    retentionMs: Infinity,              // Eternal
    consolidationThreshold: Infinity,   // Never consolidates further
  },
};

// ─── Layered Memory Store ─────────────────────────────────────────────────────

class LayeredMemoryStore {
  private layers: Map<MemoryLayer, MemoryEntry[]> = new Map([
    [MemoryLayer.WORKING, []],
    [MemoryLayer.EPISODIC, []],
    [MemoryLayer.SEMANTIC, []],
    [MemoryLayer.SOUL, []],
  ]);

  private listeners: Set<() => void> = new Set();

  // ── Store a new memory ────────────────────────────────────────────────────

  store(
    content: string,
    layer: MemoryLayer,
    emotion: EmotionalSignature,
    options: {
      tags?: string[];
      source?: MemoryEntry['source'];
      metadata?: Record<string, unknown>;
    } = {},
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: generateId(`mem_${layer}`),
      layer,
      content,
      timestamp: Date.now(),
      emotionalWeight: this.calculateEmotionalWeight(emotion),
      emotion,
      tags: options.tags ?? [],
      source: options.source ?? 'conversation',
      metadata: options.metadata ?? {},
      accessCount: 0,
      lastAccessed: Date.now(),
      decayRate: layer === MemoryLayer.SOUL ? 0 : layer === MemoryLayer.SEMANTIC ? 0.001 : 0.01,
      consolidated: false,
    };

    const memories = this.layers.get(layer)!;
    memories.push(entry);

    // Trim to max
    const config = LAYER_CONFIG[layer];
    if (memories.length > config.maxEntries) {
      // Remove oldest, lowest-weight entries first
      memories.sort((a, b) => b.emotionalWeight - a.emotionalWeight || b.timestamp - a.timestamp);
      memories.length = config.maxEntries;
    }

    this.notify();
    return entry;
  }

  // ── Record a conversation turn ────────────────────────────────────────────

  recordInteraction(
    userMessage: string,
    agentResponse: string,
    emotion: EmotionalSignature,
    context: {
      url?: string;
      domain?: string;
      workflowId?: string;
      agentRole?: string;
    } = {},
  ): MemoryEntry {
    const content = `User: ${userMessage}\nAgent: ${agentResponse}`;

    // Always goes to working memory first
    const entry = this.store(content, MemoryLayer.WORKING, emotion, {
      source: 'conversation',
      tags: [context.domain, context.agentRole].filter(Boolean) as string[],
      metadata: context,
    });

    // High emotional weight also goes directly to episodic
    if (entry.emotionalWeight >= 0.5) {
      this.store(content, MemoryLayer.EPISODIC, emotion, {
        source: 'conversation',
        tags: entry.tags,
        metadata: { ...context, promotedFrom: 'working' },
      });
    }

    return entry;
  }

  // ── Record a browsing event ───────────────────────────────────────────────

  recordBrowsing(
    url: string,
    title: string,
    action: string,
    emotion: EmotionalSignature,
    data?: Record<string, unknown>,
  ): MemoryEntry {
    return this.store(
      `Browsed: ${title} (${url}) — ${action}`,
      MemoryLayer.EPISODIC,
      emotion,
      {
        source: 'browsing',
        tags: [new URL(url).hostname, action],
        metadata: { url, title, action, data },
      },
    );
  }

  // ── Recall memories ───────────────────────────────────────────────────────

  recall(options: {
    layer?: MemoryLayer;
    query?: string;
    tags?: string[];
    minWeight?: number;
    limit?: number;
    source?: MemoryEntry['source'];
  } = {}): MemoryEntry[] {
    let results: MemoryEntry[] = [];

    if (options.layer) {
      results = [...(this.layers.get(options.layer) ?? [])];
    } else {
      // Search all layers, prioritize soul > semantic > episodic > working
      for (const layer of [MemoryLayer.SOUL, MemoryLayer.SEMANTIC, MemoryLayer.EPISODIC, MemoryLayer.WORKING]) {
        results.push(...(this.layers.get(layer) ?? []));
      }
    }

    // Filter by query
    if (options.query) {
      const q = options.query.toLowerCase();
      results = results.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Filter by tags
    if (options.tags?.length) {
      results = results.filter((m) =>
        options.tags!.some((t) => m.tags.includes(t)),
      );
    }

    // Filter by minimum emotional weight
    if (options.minWeight !== undefined) {
      results = results.filter((m) => m.emotionalWeight >= options.minWeight!);
    }

    // Filter by source
    if (options.source) {
      results = results.filter((m) => m.source === options.source);
    }

    // Sort: highest emotional weight first, then most recent
    results.sort((a, b) => b.emotionalWeight - a.emotionalWeight || b.timestamp - a.timestamp);

    // Mark as accessed
    for (const m of results) {
      m.accessCount++;
      m.lastAccessed = Date.now();
    }

    // Limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ── Get context for LLM injection ─────────────────────────────────────────

  getContextForPrompt(maxTokenEstimate = 2000): string {
    const parts: string[] = [];
    let charBudget = maxTokenEstimate * 4; // rough chars per token

    // Soul memories first (core identity)
    const soulMemories = this.recall({ layer: MemoryLayer.SOUL, limit: 5 });
    if (soulMemories.length) {
      parts.push('[Soul Memory — Core Identity]');
      for (const m of soulMemories) {
        if (charBudget <= 0) break;
        parts.push(`- ${m.content}`);
        charBudget -= m.content.length;
      }
    }

    // Semantic memories (patterns, facts)
    const semanticMemories = this.recall({ layer: MemoryLayer.SEMANTIC, limit: 5, minWeight: 0.7 });
    if (semanticMemories.length) {
      parts.push('\n[Semantic Memory — Known Patterns]');
      for (const m of semanticMemories) {
        if (charBudget <= 0) break;
        parts.push(`- ${m.content}`);
        charBudget -= m.content.length;
      }
    }

    // Recent working memory (current conversation)
    const recentMemories = this.recall({ layer: MemoryLayer.WORKING, limit: 8 });
    if (recentMemories.length) {
      parts.push('\n[Working Memory — Current Session]');
      for (const m of recentMemories) {
        if (charBudget <= 0) break;
        parts.push(`- ${m.content.substring(0, 200)}`);
        charBudget -= 200;
      }
    }

    return parts.length > 0 ? parts.join('\n') : '';
  }

  // ── Get all memories for a layer ──────────────────────────────────────────

  getLayer(layer: MemoryLayer): MemoryEntry[] {
    return [...(this.layers.get(layer) ?? [])];
  }

  // ── Get emotional trajectory ──────────────────────────────────────────────

  getEmotionalTrajectory(windowSize = 10): EmotionalSignature[] {
    const recent = this.recall({ layer: MemoryLayer.WORKING, limit: windowSize });
    return recent.map((m) => m.emotion);
  }

  // ── Get dominant emotion ──────────────────────────────────────────────────

  getDominantEmotion(): string {
    const recent = this.recall({ layer: MemoryLayer.WORKING, limit: 10 });
    if (recent.length === 0) return 'neutral';

    const counts: Record<string, number> = {};
    for (const m of recent) {
      counts[m.emotion.primary] = (counts[m.emotion.primary] ?? 0) + m.emotion.intensity;
    }

    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'neutral';
  }

  // ── Clear a layer ─────────────────────────────────────────────────────────

  clearLayer(layer: MemoryLayer): void {
    this.layers.set(layer, []);
    this.notify();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  getStats(): Record<string, number> {
    return {
      working: this.layers.get(MemoryLayer.WORKING)!.length,
      episodic: this.layers.get(MemoryLayer.EPISODIC)!.length,
      semantic: this.layers.get(MemoryLayer.SEMANTIC)!.length,
      soul: this.layers.get(MemoryLayer.SOUL)!.length,
      total: Array.from(this.layers.values()).reduce((sum, l) => sum + l.length, 0),
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private calculateEmotionalWeight(emotion: EmotionalSignature): number {
    // Weight = intensity * (|valence| + arousal) / 2
    // High intensity + strong valence (positive or negative) + high arousal = high weight
    const valenceStrength = Math.abs(emotion.valence);
    return Math.min(1, emotion.intensity * (valenceStrength + emotion.arousal) / 2);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  // ── Expose layer data for consolidation engine ────────────────────────────

  getLayerEntries(layer: MemoryLayer): MemoryEntry[] {
    return this.layers.get(layer) ?? [];
  }

  promoteEntry(entry: MemoryEntry, targetLayer: MemoryLayer): MemoryEntry {
    entry.consolidated = true;
    const promoted = this.store(entry.content, targetLayer, entry.emotion, {
      tags: entry.tags,
      source: entry.source,
      metadata: { ...entry.metadata, promotedFrom: entry.layer, originalId: entry.id },
    });
    return promoted;
  }

  removeEntry(layer: MemoryLayer, id: string): void {
    const memories = this.layers.get(layer);
    if (memories) {
      const idx = memories.findIndex((m) => m.id === id);
      if (idx >= 0) memories.splice(idx, 1);
    }
  }
}

export const layeredMemory = new LayeredMemoryStore();
