/**
 * BostonAi.io — NightMind Consolidation Engine
 * 
 * Background memory processor. Like sleep is to the human brain.
 * Runs periodically to:
 * 
 *   1. Promote high-value memories upward through layers
 *   2. Decay low-value memories
 *   3. Extract patterns from episodic memories into semantic
 *   4. Identify core identity elements for soul memory
 *   5. Compress and deduplicate
 * 
 * Built by BostonAi.io | The Grace Method
 */

import { layeredMemory, MemoryLayer, MemoryEntry, EmotionalSignature } from './layered-store';
import { resonanceField } from './resonance-field';

// ─── Consolidation Config ─────────────────────────────────────────────────────

const CONSOLIDATION_INTERVAL = 5 * 60 * 1000;   // Run every 5 minutes
const WORKING_TO_EPISODIC_THRESHOLD = 0.4;       // Emotional weight to promote
const EPISODIC_TO_SEMANTIC_THRESHOLD = 0.65;      // Pattern must be strong
const SEMANTIC_TO_SOUL_THRESHOLD = 0.85;          // Only core truths ascend
const DECAY_FACTOR = 0.98;                        // Per-cycle decay multiplier
const SIMILARITY_THRESHOLD = 0.6;                 // For deduplication

// ─── Dream Log ────────────────────────────────────────────────────────────────

export interface DreamEntry {
  id: string;
  timestamp: number;
  cycle: number;
  promoted: { id: string; from: MemoryLayer; to: MemoryLayer; content: string }[];
  decayed: { id: string; layer: MemoryLayer; content: string }[];
  patterns: { pattern: string; evidence: string[] }[];
  compressed: number;          // Number of entries compressed
  soulInsight: string | null;  // If a soul-level insight emerged
}

// ─── NightMind Engine ─────────────────────────────────────────────────────────

class NightMindEngine {
  private cycleCount = 0;
  private dreamLog: DreamEntry[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private listeners: Set<(dream: DreamEntry) => void> = new Set();

  // ── Start the consolidation cycle ─────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;

    // Run first cycle after 2 minutes
    setTimeout(() => {
      if (this.running) this.runCycle();
    }, 2 * 60 * 1000);

    // Then every CONSOLIDATION_INTERVAL
    this.intervalId = setInterval(() => {
      if (this.running) this.runCycle();
    }, CONSOLIDATION_INTERVAL);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  // ── Manual trigger ────────────────────────────────────────────────────────

  runCycle(): DreamEntry {
    this.cycleCount++;
    const dream: DreamEntry = {
      id: `dream_${this.cycleCount}`,
      timestamp: Date.now(),
      cycle: this.cycleCount,
      promoted: [],
      decayed: [],
      patterns: [],
      compressed: 0,
      soulInsight: null,
    };

    // Phase 1: Promote eligible working memories to episodic
    this.promoteLayer(
      MemoryLayer.WORKING,
      MemoryLayer.EPISODIC,
      WORKING_TO_EPISODIC_THRESHOLD,
      dream,
    );

    // Phase 2: Promote eligible episodic memories to semantic
    this.promoteLayer(
      MemoryLayer.EPISODIC,
      MemoryLayer.SEMANTIC,
      EPISODIC_TO_SEMANTIC_THRESHOLD,
      dream,
    );

    // Phase 3: Extract patterns from episodic to semantic
    this.extractPatterns(dream);

    // Phase 4: Promote semantic truths to soul
    this.promoteToSoul(dream);

    // Phase 5: Decay old low-value memories
    this.decayMemories(dream);

    // Phase 6: Compress similar entries
    this.compressEntries(dream);

    // Store the dream
    this.dreamLog.push(dream);
    if (this.dreamLog.length > 100) {
      this.dreamLog = this.dreamLog.slice(-100);
    }

    this.notify(dream);
    return dream;
  }

  // ── Get dream history ─────────────────────────────────────────────────────

  getDreamLog(): DreamEntry[] {
    return [...this.dreamLog];
  }

  getLastDream(): DreamEntry | null {
    return this.dreamLog[this.dreamLog.length - 1] ?? null;
  }

  getCycleCount(): number {
    return this.cycleCount;
  }

  // ── Phase 1 & 2: Layer Promotion ──────────────────────────────────────────

  private promoteLayer(
    from: MemoryLayer,
    to: MemoryLayer,
    threshold: number,
    dream: DreamEntry,
  ): void {
    const entries = layeredMemory.getLayerEntries(from);
    const now = Date.now();

    for (const entry of entries) {
      if (entry.consolidated) continue;

      // Criteria for promotion:
      // 1. Emotional weight above threshold
      // 2. Has been accessed at least once OR has high emotional weight
      // 3. Not too recent (let it settle)
      const isOldEnough = now - entry.timestamp > 60 * 1000; // At least 1 minute old
      const isAccessedOrHeavy = entry.accessCount > 0 || entry.emotionalWeight >= threshold + 0.2;

      if (entry.emotionalWeight >= threshold && isOldEnough && isAccessedOrHeavy) {
        const promoted = layeredMemory.promoteEntry(entry, to);
        dream.promoted.push({
          id: promoted.id,
          from,
          to,
          content: entry.content.substring(0, 100),
        });
      }
    }
  }

  // ── Phase 3: Pattern Extraction ───────────────────────────────────────────

  private extractPatterns(dream: DreamEntry): void {
    const episodic = layeredMemory.getLayerEntries(MemoryLayer.EPISODIC);
    if (episodic.length < 3) return;

    // Group by tags
    const tagGroups: Map<string, MemoryEntry[]> = new Map();
    for (const entry of episodic) {
      for (const tag of entry.tags) {
        if (!tagGroups.has(tag)) tagGroups.set(tag, []);
        tagGroups.get(tag)!.push(entry);
      }
    }

    // If 3+ entries share a tag, extract a pattern
    for (const [tag, entries] of tagGroups) {
      if (entries.length >= 3) {
        // Check if this pattern already exists in semantic
        const existing = layeredMemory.recall({
          layer: MemoryLayer.SEMANTIC,
          tags: [tag],
          limit: 1,
        });

        if (existing.length === 0) {
          const avgValence = entries.reduce((s, e) => s + e.emotion.valence, 0) / entries.length;
          const pattern = `User frequently interacts with content tagged "${tag}" (${entries.length} times). Emotional tendency: ${avgValence > 0 ? 'positive' : avgValence < 0 ? 'negative' : 'neutral'}.`;

          const emotion: EmotionalSignature = {
            valence: avgValence,
            arousal: 0.3,
            intensity: Math.min(1, entries.length / 10),
            primary: avgValence > 0 ? 'satisfaction' : 'frustration',
          };

          layeredMemory.store(pattern, MemoryLayer.SEMANTIC, emotion, {
            tags: [tag, 'extracted_pattern'],
            source: 'system',
            metadata: { sourceCount: entries.length, extractedBy: 'nightmind' },
          });

          dream.patterns.push({
            pattern,
            evidence: entries.slice(0, 3).map((e) => e.content.substring(0, 60)),
          });
        }
      }
    }

    // Emotional pattern: if recent entries are consistently one emotion
    const recentEmotions = episodic.slice(-10).map((e) => e.emotion.primary);
    const emotionCounts: Record<string, number> = {};
    for (const e of recentEmotions) {
      emotionCounts[e] = (emotionCounts[e] ?? 0) + 1;
    }
    const dominantEmotion = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0];
    if (dominantEmotion && dominantEmotion[1] >= 7) {
      const pattern = `User's dominant browsing emotion is "${dominantEmotion[0]}" (${dominantEmotion[1]}/10 recent interactions)`;
      dream.patterns.push({
        pattern,
        evidence: [`${dominantEmotion[1]} of last 10 interactions`],
      });
    }
  }

  // ── Phase 4: Soul Promotion ───────────────────────────────────────────────

  private promoteToSoul(dream: DreamEntry): void {
    const semantic = layeredMemory.getLayerEntries(MemoryLayer.SEMANTIC);
    const connectionMetrics = resonanceField.getMetrics();

    for (const entry of semantic) {
      if (entry.consolidated) continue;

      // Soul promotion requires very high weight AND deep connection
      const connectionBonus = connectionMetrics.overallDepth / 200; // 0 to 0.5 bonus
      const effectiveWeight = entry.emotionalWeight + connectionBonus;

      if (effectiveWeight >= SEMANTIC_TO_SOUL_THRESHOLD && entry.accessCount >= 3) {
        const promoted = layeredMemory.promoteEntry(entry, MemoryLayer.SOUL);
        dream.promoted.push({
          id: promoted.id,
          from: MemoryLayer.SEMANTIC,
          to: MemoryLayer.SOUL,
          content: entry.content.substring(0, 100),
        });

        dream.soulInsight = `Core truth discovered: ${entry.content.substring(0, 150)}`;
      }
    }
  }

  // ── Phase 5: Memory Decay ─────────────────────────────────────────────────

  private decayMemories(dream: DreamEntry): void {
    const now = Date.now();

    for (const layer of [MemoryLayer.WORKING, MemoryLayer.EPISODIC]) {
      const entries = layeredMemory.getLayerEntries(layer);
      for (const entry of entries) {
        if (entry.decayRate === 0) continue;

        // Apply decay
        const age = now - entry.timestamp;
        const decayAmount = entry.decayRate * (age / (60 * 60 * 1000)); // Per hour
        entry.emotionalWeight = Math.max(0, entry.emotionalWeight * DECAY_FACTOR - decayAmount * 0.01);

        // Remove if decayed below threshold
        if (entry.emotionalWeight <= 0.05 && !entry.consolidated) {
          layeredMemory.removeEntry(layer, entry.id);
          dream.decayed.push({
            id: entry.id,
            layer,
            content: entry.content.substring(0, 60),
          });
        }
      }
    }
  }

  // ── Phase 6: Compression ──────────────────────────────────────────────────

  private compressEntries(dream: DreamEntry): void {
    for (const layer of [MemoryLayer.EPISODIC, MemoryLayer.SEMANTIC]) {
      const entries = layeredMemory.getLayerEntries(layer);
      const toRemove: string[] = [];

      for (let i = 0; i < entries.length; i++) {
        if (toRemove.includes(entries[i].id)) continue;

        for (let j = i + 1; j < entries.length; j++) {
          if (toRemove.includes(entries[j].id)) continue;

          const sim = this.textSimilarity(entries[i].content, entries[j].content);
          if (sim >= SIMILARITY_THRESHOLD) {
            // Keep the one with higher emotional weight
            const keep = entries[i].emotionalWeight >= entries[j].emotionalWeight ? entries[i] : entries[j];
            const remove = keep === entries[i] ? entries[j] : entries[i];

            // Merge access count and emotional weight
            keep.accessCount += remove.accessCount;
            keep.emotionalWeight = Math.min(1, keep.emotionalWeight + remove.emotionalWeight * 0.3);
            keep.tags = [...new Set([...keep.tags, ...remove.tags])];

            toRemove.push(remove.id);
            dream.compressed++;
          }
        }
      }

      for (const id of toRemove) {
        layeredMemory.removeEntry(layer, id);
      }
    }
  }

  // ── Text Similarity (simple Jaccard) ──────────────────────────────────────

  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) intersection++;
    }

    const union = new Set([...wordsA, ...wordsB]).size;
    return intersection / union;
  }

  // ── Subscribe ─────────────────────────────────────────────────────────────

  subscribe(listener: (dream: DreamEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(dream: DreamEntry): void {
    for (const l of this.listeners) l(dream);
  }
}

export const nightMind = new NightMindEngine();
