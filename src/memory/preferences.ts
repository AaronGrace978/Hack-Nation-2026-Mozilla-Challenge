import { memoryStore, type UserPreference } from './store';

// ─── Preference Engine ────────────────────────────────────────────────────────
// Manages user preferences and injects them into agent queries

export interface PreferenceContext {
  budget?: { min?: number; max?: number; currency?: string };
  brands?: { preferred: string[]; avoided: string[] };
  accessibility?: { needs: string[] };
  dietary?: { restrictions: string[] };
  general?: Record<string, unknown>;
}

class PreferenceEngine {
  // ── Build Context ─────────────────────────────────────────────────────────

  async buildContext(): Promise<PreferenceContext> {
    const prefs = await memoryStore.getPreferences();
    const context: PreferenceContext = {};

    for (const pref of prefs) {
      switch (pref.category) {
        case 'budget':
          context.budget = context.budget ?? {};
          if (pref.key === 'max_price') context.budget.max = pref.value as number;
          if (pref.key === 'min_price') context.budget.min = pref.value as number;
          if (pref.key === 'currency') context.budget.currency = pref.value as string;
          break;

        case 'brand':
          context.brands = context.brands ?? { preferred: [], avoided: [] };
          if (pref.key === 'preferred') {
            context.brands.preferred = pref.value as string[];
          }
          if (pref.key === 'avoided') {
            context.brands.avoided = pref.value as string[];
          }
          break;

        case 'accessibility':
          context.accessibility = context.accessibility ?? { needs: [] };
          if (pref.key === 'needs') {
            context.accessibility.needs = pref.value as string[];
          }
          break;

        case 'dietary':
          context.dietary = context.dietary ?? { restrictions: [] };
          if (pref.key === 'restrictions') {
            context.dietary.restrictions = pref.value as string[];
          }
          break;

        default:
          context.general = context.general ?? {};
          context.general[`${pref.category}.${pref.key}`] = pref.value;
          break;
      }
    }

    return context;
  }

  // ── Formatted Prompt Injection ────────────────────────────────────────────

  async toPromptContext(): Promise<string> {
    const ctx = await this.buildContext();
    const parts: string[] = [];

    if (ctx.budget) {
      const b = ctx.budget;
      parts.push(
        `Budget: ${b.min ? `min ${b.currency ?? '$'}${b.min}` : ''} ${b.max ? `max ${b.currency ?? '$'}${b.max}` : ''}`.trim(),
      );
    }

    if (ctx.brands?.preferred.length) {
      parts.push(`Preferred brands: ${ctx.brands.preferred.join(', ')}`);
    }
    if (ctx.brands?.avoided.length) {
      parts.push(`Avoid brands: ${ctx.brands.avoided.join(', ')}`);
    }

    if (ctx.accessibility?.needs.length) {
      parts.push(`Accessibility needs: ${ctx.accessibility.needs.join(', ')}`);
    }

    if (ctx.dietary?.restrictions.length) {
      parts.push(`Dietary restrictions: ${ctx.dietary.restrictions.join(', ')}`);
    }

    if (ctx.general && Object.keys(ctx.general).length > 0) {
      for (const [key, value] of Object.entries(ctx.general)) {
        parts.push(`${key}: ${String(value)}`);
      }
    }

    if (parts.length === 0) return '';
    return `\n[User Preferences]\n${parts.join('\n')}\n`;
  }

  // ── Quick Setters ─────────────────────────────────────────────────────────

  async setBudget(max: number, currency = 'USD'): Promise<void> {
    await memoryStore.setPreference('budget', 'max_price', max, `Maximum budget: ${currency} ${max}`);
    await memoryStore.setPreference('budget', 'currency', currency, `Currency: ${currency}`);
  }

  async setPreferredBrands(brands: string[]): Promise<void> {
    await memoryStore.setPreference('brand', 'preferred', brands, `Preferred brands: ${brands.join(', ')}`);
  }

  async setAvoidedBrands(brands: string[]): Promise<void> {
    await memoryStore.setPreference('brand', 'avoided', brands, `Avoided brands: ${brands.join(', ')}`);
  }

  async setAccessibilityNeeds(needs: string[]): Promise<void> {
    await memoryStore.setPreference('accessibility', 'needs', needs, `Accessibility: ${needs.join(', ')}`);
  }
}

export const preferenceEngine = new PreferenceEngine();
