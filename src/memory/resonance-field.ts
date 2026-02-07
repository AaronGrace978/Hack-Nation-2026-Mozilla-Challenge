/**
 * BostonAi.io — Resonance Field
 * 
 * Tracks the evolving relationship between Nexus and its user over time.
 * Not preferences. Not settings. The actual *quality* of connection.
 * 
 * Measures trust, familiarity, communication style alignment,
 * and shared vocabulary that emerges naturally from repeated interaction.
 * 
 * Built by BostonAi.io | The Grace Method
 */

import { generateId } from '../shared/utils';
import { EmotionalSignature } from './layered-store';

// ─── Connection Metrics ───────────────────────────────────────────────────────

export interface ConnectionMetrics {
  trustLevel: number;          // 0-100, grows with successful interactions
  familiarityIndex: number;    // 0-100, grows with repeated patterns
  communicationSync: number;   // 0-100, how well agent adapts to user style
  emotionalResonance: number;  // 0-100, how well agent reads the room
  overallDepth: number;        // Composite score 0-100
  sessionCount: number;        // Total sessions
  totalInteractions: number;   // Total interactions across all sessions
  firstMet: number;            // Timestamp of first interaction
  lastSeen: number;            // Timestamp of last interaction
  longestStreak: number;       // Longest consecutive days of interaction
  currentStreak: number;       // Current consecutive days
}

// ─── Shared Language Entry ────────────────────────────────────────────────────

export interface SharedTerm {
  id: string;
  term: string;              // The word or phrase
  origin: 'user' | 'agent' | 'co-created';
  firstUsed: number;
  useCount: number;
  context: string;           // What it means in this relationship
  isShorthand: boolean;      // User uses abbreviations/nicknames
}

// ─── Interaction Pattern ──────────────────────────────────────────────────────

export interface InteractionPattern {
  id: string;
  pattern: string;           // Description of the pattern
  frequency: number;         // How often this happens
  lastOccurrence: number;
  examples: string[];        // Recent examples
  confidence: number;        // 0-1
}

// ─── Communication Style ──────────────────────────────────────────────────────

export interface CommunicationStyle {
  verbosity: 'terse' | 'moderate' | 'detailed';
  formality: 'casual' | 'mixed' | 'formal';
  technicalLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  preferredResponseLength: 'short' | 'medium' | 'long';
  humorTolerance: number;     // 0-1
  emojiUsage: boolean;
  typicalGreeting: string;
  typicalFarewell: string;
}

// ─── Resonance Field ──────────────────────────────────────────────────────────

class ResonanceFieldEngine {
  private metrics: ConnectionMetrics = {
    trustLevel: 10,           // Start with baseline trust (they installed us)
    familiarityIndex: 0,
    communicationSync: 10,
    emotionalResonance: 10,
    overallDepth: 5,
    sessionCount: 0,
    totalInteractions: 0,
    firstMet: Date.now(),
    lastSeen: Date.now(),
    longestStreak: 0,
    currentStreak: 0,
  };

  private sharedLanguage: SharedTerm[] = [];
  private patterns: InteractionPattern[] = [];
  private communicationStyle: CommunicationStyle = {
    verbosity: 'moderate',
    formality: 'casual',
    technicalLevel: 'intermediate',
    preferredResponseLength: 'medium',
    humorTolerance: 0.5,
    emojiUsage: false,
    typicalGreeting: '',
    typicalFarewell: '',
  };

  private sessionStart: number = Date.now();
  private lastInteractionDate: string = '';
  private listeners: Set<(metrics: ConnectionMetrics) => void> = new Set();

  // ── Record an interaction ─────────────────────────────────────────────────

  recordInteraction(
    userInput: string,
    agentOutput: string,
    emotion: EmotionalSignature,
    outcome: 'success' | 'failure' | 'partial' | 'cancelled',
  ): void {
    this.metrics.totalInteractions++;
    this.metrics.lastSeen = Date.now();

    // Update trust based on outcome
    this.updateTrust(outcome, emotion);

    // Update emotional resonance (how well we "read the room")
    this.updateEmotionalResonance(emotion, outcome);

    // Update familiarity
    this.updateFamiliarity(userInput);

    // Analyze communication style
    this.analyzeStyle(userInput);

    // Look for shared language emergence
    this.detectSharedLanguage(userInput, agentOutput);

    // Detect interaction patterns
    this.detectPatterns(userInput);

    // Update streak
    this.updateStreak();

    // Recalculate overall depth
    this.recalculateDepth();

    this.notify();
  }

  // ── Start a new session ───────────────────────────────────────────────────

  startSession(): void {
    this.metrics.sessionCount++;
    this.sessionStart = Date.now();
    this.notify();
  }

  // ── Get current connection depth ──────────────────────────────────────────

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  getConnectionPhase(): string {
    const depth = this.metrics.overallDepth;
    if (depth < 10) return 'Introduction';
    if (depth < 25) return 'Early Rapport';
    if (depth < 50) return 'Established Trust';
    if (depth < 75) return 'Deep Familiarity';
    if (depth < 90) return 'Intuitive Connection';
    return 'Resonant Partnership';
  }

  getSharedLanguage(): SharedTerm[] {
    return [...this.sharedLanguage];
  }

  getPatterns(): InteractionPattern[] {
    return [...this.patterns];
  }

  getCommunicationStyle(): CommunicationStyle {
    return { ...this.communicationStyle };
  }

  // ── Generate context for LLM ──────────────────────────────────────────────

  getContextForPrompt(): string {
    const phase = this.getConnectionPhase();
    const parts: string[] = [
      `[Resonance Field — ${phase}]`,
      `Trust: ${this.metrics.trustLevel}/100 | Familiarity: ${this.metrics.familiarityIndex}/100`,
      `Sessions: ${this.metrics.sessionCount} | Total interactions: ${this.metrics.totalInteractions}`,
      `Communication style: ${this.communicationStyle.verbosity}, ${this.communicationStyle.formality}, ${this.communicationStyle.technicalLevel}`,
    ];

    if (this.sharedLanguage.length > 0) {
      parts.push(`\nShared vocabulary: ${this.sharedLanguage.map((s) => `"${s.term}"`).join(', ')}`);
    }

    if (this.patterns.length > 0) {
      parts.push(`\nKnown patterns: ${this.patterns.map((p) => p.pattern).join('; ')}`);
    }

    // Adaptive behavior hints based on depth
    if (this.metrics.overallDepth < 25) {
      parts.push('\n[Guidance: Be clear, explain actions, don\'t assume familiarity]');
    } else if (this.metrics.overallDepth < 50) {
      parts.push('\n[Guidance: Can use some shorthand, reference past interactions]');
    } else if (this.metrics.overallDepth < 75) {
      parts.push('\n[Guidance: Can anticipate needs, use shared language, be proactive]');
    } else {
      parts.push('\n[Guidance: Full intuitive mode — anticipate, act, communicate naturally]');
    }

    return parts.join('\n');
  }

  // ── Internal: Trust Updates ───────────────────────────────────────────────

  private updateTrust(
    outcome: 'success' | 'failure' | 'partial' | 'cancelled',
    emotion: EmotionalSignature,
  ): void {
    const trustDelta: Record<string, number> = {
      success: 2,
      partial: 0.5,
      failure: -3,      // Trust erodes faster than it builds
      cancelled: -1,
    };

    // Emotional trust: positive emotions during success boost trust more
    const emotionalBonus = emotion.valence > 0 ? emotion.intensity * 1.5 : 0;

    this.metrics.trustLevel = Math.max(
      0,
      Math.min(100, this.metrics.trustLevel + (trustDelta[outcome] ?? 0) + emotionalBonus),
    );
  }

  // ── Internal: Emotional Resonance (reading the room) ─────────────────────

  private updateEmotionalResonance(
    emotion: EmotionalSignature,
    outcome: 'success' | 'failure' | 'partial' | 'cancelled',
  ): void {
    const resonanceDelta: Record<string, number> = {
      success: emotion.valence > 0 ? 1.5 + emotion.intensity : 0.3,
      partial: emotion.valence > 0 ? 0.5 : -0.5,
      failure: -2,
      cancelled: -0.5,
    };
    const delta = resonanceDelta[outcome] ?? 0;
    this.metrics.emotionalResonance = Math.max(
      0,
      Math.min(100, this.metrics.emotionalResonance + delta),
    );
  }

  // ── Internal: Familiarity ─────────────────────────────────────────────────

  private updateFamiliarity(input: string): void {
    // Familiarity grows logarithmically — fast at first, plateaus
    const growth = Math.max(0.1, 5 / Math.log2(this.metrics.totalInteractions + 2));
    this.metrics.familiarityIndex = Math.min(100, this.metrics.familiarityIndex + growth);
  }

  // ── Internal: Communication Style Analysis ────────────────────────────────

  private analyzeStyle(input: string): void {
    const words = input.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

    // Verbosity
    if (words.length < 5) this.communicationStyle.verbosity = 'terse';
    else if (words.length > 30) this.communicationStyle.verbosity = 'detailed';

    // Formality
    const informalMarkers = /\b(hey|lol|btw|idk|tbh|nah|yeah|gonna|wanna|kinda|ya)\b/i;
    if (informalMarkers.test(input)) this.communicationStyle.formality = 'casual';

    // Technical level
    const techMarkers = /\b(api|sdk|dom|css|html|json|regex|typescript|component|middleware|endpoint|schema|query|mutation)\b/i;
    const techMatches = (input.match(techMarkers) || []).length;
    if (techMatches >= 3) this.communicationStyle.technicalLevel = 'expert';
    else if (techMatches >= 2) this.communicationStyle.technicalLevel = 'advanced';
    else if (techMatches >= 1) this.communicationStyle.technicalLevel = 'intermediate';

    // Emoji usage
    const hasEmoji = /[\u{1F300}-\u{1FAD6}]/u.test(input);
    if (hasEmoji) this.communicationStyle.emojiUsage = true;

    // Response length preference (inferred from input length)
    if (words.length < 10) this.communicationStyle.preferredResponseLength = 'short';
    else if (words.length > 40) this.communicationStyle.preferredResponseLength = 'long';

    // Update communication sync
    this.metrics.communicationSync = Math.min(
      100,
      this.metrics.communicationSync + 0.5,
    );
  }

  // ── Internal: Shared Language ─────────────────────────────────────────────

  private detectSharedLanguage(userInput: string, agentOutput: string): void {
    // Look for repeated unusual terms
    const userWords: string[] = userInput.toLowerCase().match(/\b\w{4,}\b/g) ?? [];
    const agentWords: string[] = agentOutput.toLowerCase().match(/\b\w{4,}\b/g) ?? [];

    // Terms that appear in both
    const sharedWords = userWords.filter((w) => agentWords.includes(w));

    // Common words to exclude
    const commonWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been', 'were', 'they',
      'their', 'what', 'when', 'where', 'which', 'would', 'could',
      'should', 'about', 'there', 'these', 'those', 'other', 'some',
      'than', 'then', 'more', 'also', 'just', 'only', 'very',
      'will', 'each', 'make', 'like', 'long', 'look', 'many',
      'come', 'over', 'such', 'take', 'year', 'them', 'know',
      'want', 'give', 'most', 'find', 'here', 'thing', 'does',
      'page', 'site', 'click', 'help', 'please', 'thank', 'thanks',
    ]);

    for (const word of sharedWords) {
      if (commonWords.has(word)) continue;

      const existing = this.sharedLanguage.find((s) => s.term === word);
      if (existing) {
        existing.useCount++;
      } else if (this.sharedLanguage.length < 50) {
        this.sharedLanguage.push({
          id: generateId('term'),
          term: word,
          origin: 'co-created',
          firstUsed: Date.now(),
          useCount: 1,
          context: userInput.substring(0, 100),
          isShorthand: word.length <= 4,
        });
      }
    }

    // Prune low-frequency terms
    this.sharedLanguage = this.sharedLanguage.filter(
      (s) => s.useCount >= 2 || Date.now() - s.firstUsed < 60 * 60 * 1000,
    );
  }

  // ── Internal: Pattern Detection ───────────────────────────────────────────

  private detectPatterns(input: string): void {
    const lowerInput = input.toLowerCase();

    // Time-based patterns
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    this.updatePattern(`Active in the ${timeOfDay}`, input);

    // Task-type patterns
    if (/\b(compare|vs|versus|better|which)\b/i.test(input)) {
      this.updatePattern('Frequently compares options', input);
    }
    if (/\b(price|cost|deal|cheap|expensive|discount)\b/i.test(input)) {
      this.updatePattern('Price-conscious shopping', input);
    }
    if (/\b(research|learn|understand|explain|how)\b/i.test(input)) {
      this.updatePattern('Research-oriented browsing', input);
    }
    if (/\b(buy|order|purchase|add to cart|checkout)\b/i.test(input)) {
      this.updatePattern('Decisive purchasing behavior', input);
    }
  }

  private updatePattern(description: string, example: string): void {
    const existing = this.patterns.find((p) => p.pattern === description);
    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = Date.now();
      existing.examples = [...existing.examples.slice(-4), example.substring(0, 80)];
      existing.confidence = Math.min(1, existing.confidence + 0.05);
    } else {
      this.patterns.push({
        id: generateId('pattern'),
        pattern: description,
        frequency: 1,
        lastOccurrence: Date.now(),
        examples: [example.substring(0, 80)],
        confidence: 0.3,
      });
    }
  }

  // ── Internal: Streak ──────────────────────────────────────────────────────

  private updateStreak(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastInteractionDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (this.lastInteractionDate === yesterday) {
      this.metrics.currentStreak++;
    } else if (this.lastInteractionDate !== '') {
      this.metrics.currentStreak = 1;
    } else {
      this.metrics.currentStreak = 1;
    }

    this.metrics.longestStreak = Math.max(this.metrics.longestStreak, this.metrics.currentStreak);
    this.lastInteractionDate = today;
  }

  // ── Internal: Recalculate ─────────────────────────────────────────────────

  private recalculateDepth(): void {
    this.metrics.overallDepth =
      this.metrics.trustLevel * 0.35 +
      this.metrics.familiarityIndex * 0.25 +
      this.metrics.communicationSync * 0.2 +
      this.metrics.emotionalResonance * 0.2;
  }

  // ── Subscribe ─────────────────────────────────────────────────────────────

  subscribe(listener: (metrics: ConnectionMetrics) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l(this.getMetrics());
  }
}

export const resonanceField = new ResonanceFieldEngine();
