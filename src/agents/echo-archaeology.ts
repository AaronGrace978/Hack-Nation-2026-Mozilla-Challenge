/**
 * BostonAi.io — Echo Archaeology System
 * 
 * Detects unspoken moments during web browsing and agent interaction.
 * Holds abandoned tasks, frustration signals, and topic shifts
 * until the user is ready to revisit them.
 * 
 * "The things you almost did matter as much as the things you did."
 * 
 * Built by BostonAi.io | The Grace Method
 */

import { generateId } from '../shared/utils';

// ─── Ghost Types ──────────────────────────────────────────────────────────────

export enum GhostType {
  ABANDONED_WORKFLOW = 'abandoned_workflow',     // Started a task, never finished
  FRUSTRATION_SIGNAL = 'frustration_signal',     // Rapid retries, angry rephrasing
  TOPIC_SHIFT = 'topic_shift',                   // Abruptly changed what they were doing
  REPEATED_SEARCH = 'repeated_search',           // Searching for the same thing repeatedly
  PERMISSION_RETREAT = 'permission_retreat',      // Denied permission then went silent
  PRICE_HESITATION = 'price_hesitation',         // Looked at something, didn't buy
  COMPARISON_PARALYSIS = 'comparison_paralysis', // Compared endlessly, decided nothing
  QUIET_EXIT = 'quiet_exit',                     // Left without finishing or saying anything
}

export enum RecoveryStrategy {
  IMMEDIATE = 'immediate',           // Offer help right away
  WAIT_FOR_THEME = 'wait_for_theme', // Wait until the topic comes up again naturally
  WAIT_FOR_CALM = 'wait_for_calm',   // Wait until emotional intensity drops
  LONG_HOLD = 'long_hold',          // Hold for days, offer gently later
  NEVER_PUSH = 'never_push',         // Only surface if user explicitly asks
}

// ─── Ghost (Unspoken Moment) ──────────────────────────────────────────────────

export interface Ghost {
  id: string;
  timestamp: number;
  type: GhostType;
  context: string;            // What was happening when the ghost was detected
  originalIntent: string;     // What the user seemed to want
  synthesizedNeed: string;    // What we think they actually need
  confidence: number;         // 0-1, how confident we are in this detection
  recoveryStrategy: RecoveryStrategy;
  offeringText: string;       // Pre-generated gentle offering
  resolved: boolean;
  offeredCount: number;
  minWaitMs: number;          // Minimum wait before offering
  metadata: Record<string, unknown>;
}

// ─── Detection Patterns ───────────────────────────────────────────────────────

const FRUSTRATION_SIGNALS = [
  /\b(ugh|argh|damn|wtf|this is broken|doesn'?t work|still not|wrong again|stupid)\b/i,
  /\b(forget it|never ?mind|whatever|just stop|cancel)\b/i,
  /\b(try again|one more time|let me rephrase|i already said)\b/i,
];

const HESITATION_SIGNALS = [
  /\b(hmm|maybe|i don'?t know|not sure|let me think|actually)\b/i,
  /\b(is it worth|too expensive|can'?t afford|out of.*budget)\b/i,
];

const ABANDONMENT_SIGNALS = [
  /\b(do something else|change of plans|different thing|skip|move on)\b/i,
];

// ─── Echo Archaeology Engine ──────────────────────────────────────────────────

class EchoArchaeologyEngine {
  private ghosts: Ghost[] = [];
  private recentInputs: { text: string; timestamp: number }[] = [];
  private listeners: Set<(ghosts: Ghost[]) => void> = new Set();

  // ── Analyze user input for ghosts ─────────────────────────────────────────

  analyze(
    userInput: string,
    context: {
      currentWorkflow?: string;
      currentUrl?: string;
      previousAction?: string;
      timeSinceLastInput?: number;
    } = {},
  ): Ghost | null {
    this.recentInputs.push({ text: userInput, timestamp: Date.now() });

    // Keep only last 20 inputs
    if (this.recentInputs.length > 20) {
      this.recentInputs = this.recentInputs.slice(-20);
    }

    // Check for frustration
    const frustration = this.detectFrustration(userInput, context);
    if (frustration) return this.recordGhost(frustration);

    // Check for topic shift / abandonment
    const abandonment = this.detectAbandonment(userInput, context);
    if (abandonment) return this.recordGhost(abandonment);

    // Check for hesitation
    const hesitation = this.detectHesitation(userInput, context);
    if (hesitation) return this.recordGhost(hesitation);

    // Check for repeated searching
    const repetition = this.detectRepetition(userInput);
    if (repetition) return this.recordGhost(repetition);

    return null;
  }

  // ── Detect when a workflow ends without completion ────────────────────────

  recordAbandonedWorkflow(
    workflowIntent: string,
    completedTasks: number,
    totalTasks: number,
    lastUrl?: string,
  ): Ghost {
    const ghost: Omit<Ghost, 'id'> = {
      timestamp: Date.now(),
      type: GhostType.ABANDONED_WORKFLOW,
      context: `Workflow "${workflowIntent}" stopped at task ${completedTasks}/${totalTasks}`,
      originalIntent: workflowIntent,
      synthesizedNeed: `You started looking into "${workflowIntent}" but didn't finish. That's okay — it'll be here if you want to pick it back up.`,
      confidence: 0.8,
      recoveryStrategy: RecoveryStrategy.WAIT_FOR_THEME,
      offeringText: `Earlier you were looking into "${workflowIntent}". Want me to pick that back up?`,
      resolved: false,
      offeredCount: 0,
      minWaitMs: 5 * 60 * 1000, // 5 minutes
      metadata: { completedTasks, totalTasks, lastUrl },
    };

    return this.recordGhost(ghost);
  }

  // ── Record permission denial retreat ──────────────────────────────────────

  recordPermissionRetreat(action: string, domain: string): Ghost {
    const ghost: Omit<Ghost, 'id'> = {
      timestamp: Date.now(),
      type: GhostType.PERMISSION_RETREAT,
      context: `Denied permission for "${action}" on ${domain}, then went quiet`,
      originalIntent: action,
      synthesizedNeed: 'You might have wanted that action but weren\'t comfortable granting permission. That boundary is respected.',
      confidence: 0.6,
      recoveryStrategy: RecoveryStrategy.NEVER_PUSH,
      offeringText: `If you ever want to revisit that ${action} on ${domain}, just let me know. No pressure.`,
      resolved: false,
      offeredCount: 0,
      minWaitMs: 30 * 60 * 1000, // 30 minutes
      metadata: { action, domain },
    };

    return this.recordGhost(ghost);
  }

  // ── Check if any ghosts are ready to surface ──────────────────────────────

  getReadyGhosts(): Ghost[] {
    const now = Date.now();
    return this.ghosts.filter(
      (g) =>
        !g.resolved &&
        g.offeredCount < 3 && // Don't offer more than 3 times
        now - g.timestamp >= g.minWaitMs &&
        g.recoveryStrategy !== RecoveryStrategy.NEVER_PUSH,
    );
  }

  // ── Check if a topic matches an existing ghost ────────────────────────────

  checkThemeMatch(currentTopic: string): Ghost | null {
    const topic = currentTopic.toLowerCase();
    return this.ghosts.find(
      (g) =>
        !g.resolved &&
        g.recoveryStrategy === RecoveryStrategy.WAIT_FOR_THEME &&
        (g.originalIntent.toLowerCase().includes(topic) ||
          topic.includes(g.originalIntent.toLowerCase().split(' ').slice(0, 3).join(' '))),
    ) ?? null;
  }

  // ── Mark a ghost as resolved ──────────────────────────────────────────────

  resolveGhost(id: string): void {
    const ghost = this.ghosts.find((g) => g.id === id);
    if (ghost) {
      ghost.resolved = true;
      this.notify();
    }
  }

  // ── Mark a ghost as offered ───────────────────────────────────────────────

  markOffered(id: string): void {
    const ghost = this.ghosts.find((g) => g.id === id);
    if (ghost) {
      ghost.offeredCount++;
      this.notify();
    }
  }

  // ── Get all active ghosts ─────────────────────────────────────────────────

  getActiveGhosts(): Ghost[] {
    return this.ghosts.filter((g) => !g.resolved);
  }

  getAllGhosts(): Ghost[] {
    return [...this.ghosts];
  }

  // ── Detection Methods ─────────────────────────────────────────────────────

  private detectFrustration(
    input: string,
    context: Record<string, unknown>,
  ): Omit<Ghost, 'id'> | null {
    const match = FRUSTRATION_SIGNALS.some((p) => p.test(input));
    if (!match) return null;

    // Also check for rapid retries (3+ inputs in 30 seconds)
    const recent = this.recentInputs.filter(
      (r) => Date.now() - r.timestamp < 30000,
    );
    const isRapidFire = recent.length >= 3;

    return {
      timestamp: Date.now(),
      type: GhostType.FRUSTRATION_SIGNAL,
      context: `User showed frustration: "${input}"`,
      originalIntent: context.currentWorkflow as string ?? input,
      synthesizedNeed: 'Something isn\'t working the way you expected. That\'s frustrating.',
      confidence: isRapidFire ? 0.9 : 0.7,
      recoveryStrategy: RecoveryStrategy.IMMEDIATE,
      offeringText: 'I can tell this isn\'t going smoothly. Want me to try a different approach?',
      resolved: false,
      offeredCount: 0,
      minWaitMs: 0, // Immediate for frustration
      metadata: { trigger: input, rapidFire: isRapidFire },
    };
  }

  private detectAbandonment(
    input: string,
    context: Record<string, unknown>,
  ): Omit<Ghost, 'id'> | null {
    const match = ABANDONMENT_SIGNALS.some((p) => p.test(input));
    if (!match) return null;

    return {
      timestamp: Date.now(),
      type: GhostType.TOPIC_SHIFT,
      context: `User shifted away from: ${context.previousAction ?? 'unknown'}`,
      originalIntent: context.currentWorkflow as string ?? context.previousAction as string ?? '',
      synthesizedNeed: 'You moved on from something. It\'ll be here if you come back.',
      confidence: 0.6,
      recoveryStrategy: RecoveryStrategy.WAIT_FOR_THEME,
      offeringText: `You were working on something else earlier. Want to go back to it?`,
      resolved: false,
      offeredCount: 0,
      minWaitMs: 2 * 60 * 1000,
      metadata: { previousAction: context.previousAction },
    };
  }

  private detectHesitation(
    input: string,
    context: Record<string, unknown>,
  ): Omit<Ghost, 'id'> | null {
    const match = HESITATION_SIGNALS.some((p) => p.test(input));
    if (!match) return null;

    // Only record if there's a browsing/shopping context
    if (!context.currentUrl) return null;

    return {
      timestamp: Date.now(),
      type: GhostType.PRICE_HESITATION,
      context: `Hesitation detected while browsing: ${context.currentUrl}`,
      originalIntent: input,
      synthesizedNeed: 'You were considering something but held back.',
      confidence: 0.5,
      recoveryStrategy: RecoveryStrategy.LONG_HOLD,
      offeringText: 'Remember that thing you were looking at? I can check if the price dropped.',
      resolved: false,
      offeredCount: 0,
      minWaitMs: 24 * 60 * 60 * 1000, // 24 hours
      metadata: { url: context.currentUrl },
    };
  }

  private detectRepetition(input: string): Omit<Ghost, 'id'> | null {
    // Check if the user has searched for similar things 3+ times
    const recent = this.recentInputs.slice(-10);
    const similar = recent.filter((r) => {
      const words1 = input.toLowerCase().split(/\s+/);
      const words2 = r.text.toLowerCase().split(/\s+/);
      const overlap = words1.filter((w) => words2.includes(w)).length;
      return overlap >= Math.min(words1.length, words2.length) * 0.5;
    });

    if (similar.length < 3) return null;

    return {
      timestamp: Date.now(),
      type: GhostType.REPEATED_SEARCH,
      context: `User has searched for similar things ${similar.length} times`,
      originalIntent: input,
      synthesizedNeed: 'You keep coming back to this. Let me help you narrow it down.',
      confidence: 0.75,
      recoveryStrategy: RecoveryStrategy.IMMEDIATE,
      offeringText: `I notice you've been searching for this a few times. Want me to do a deep dive and find the best option?`,
      resolved: false,
      offeredCount: 0,
      minWaitMs: 0,
      metadata: { searchCount: similar.length },
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private recordGhost(data: Omit<Ghost, 'id'>): Ghost {
    const ghost: Ghost = { id: generateId('ghost'), ...data };
    this.ghosts.push(ghost);

    // Keep max 50 ghosts
    if (this.ghosts.length > 50) {
      this.ghosts = this.ghosts.filter((g) => !g.resolved).concat(
        this.ghosts.filter((g) => g.resolved).slice(-10),
      );
    }

    this.notify();
    return ghost;
  }

  subscribe(listener: (ghosts: Ghost[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const ghosts = this.getActiveGhosts();
    for (const l of this.listeners) l(ghosts);
  }
}

export const echoArchaeology = new EchoArchaeologyEngine();
