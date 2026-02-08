// ─── Page Actor ───────────────────────────────────────────────────────────────
// Performs interactions on the page: click, type, scroll, select, focus.

export interface InteractionResult {
  success: boolean;
  action: string;
  target: string;
  error?: string;
}

export function clickElement(selector: string): InteractionResult {
  try {
    const el = document.querySelector(selector);
    if (!el) {
      return { success: false, action: 'click', target: selector, error: 'Element not found' };
    }

    // Scroll into view first
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Dispatch click event
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    el.dispatchEvent(event);

    return { success: true, action: 'click', target: selector };
  } catch (err) {
    return { success: false, action: 'click', target: selector, error: String(err) };
  }
}

export function typeInElement(selector: string, value: string): InteractionResult {
  try {
    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) {
      return { success: false, action: 'type', target: selector, error: 'Element not found' };
    }

    // Focus the element
    el.focus();

    // Clear existing value
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // Set new value
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    return { success: true, action: 'type', target: selector };
  } catch (err) {
    return { success: false, action: 'type', target: selector, error: String(err) };
  }
}

export function scrollPage(direction: string, amount = 500): InteractionResult {
  try {
    switch (direction) {
      case 'down':
        window.scrollBy({ top: amount, behavior: 'smooth' });
        break;
      case 'up':
        window.scrollBy({ top: -amount, behavior: 'smooth' });
        break;
      case 'top':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'bottom':
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        break;
      default:
        return { success: false, action: 'scroll', target: direction, error: 'Invalid direction' };
    }

    return { success: true, action: 'scroll', target: direction };
  } catch (err) {
    return { success: false, action: 'scroll', target: direction, error: String(err) };
  }
}

export function selectOption(selector: string, value: string): InteractionResult {
  try {
    const el = document.querySelector(selector) as HTMLSelectElement | null;
    if (!el) {
      return { success: false, action: 'select', target: selector, error: 'Element not found' };
    }

    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));

    return { success: true, action: 'select', target: selector };
  } catch (err) {
    return { success: false, action: 'select', target: selector, error: String(err) };
  }
}

export function focusElement(selector: string): InteractionResult {
  try {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      return { success: false, action: 'focus', target: selector, error: 'Element not found' };
    }

    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return { success: true, action: 'focus', target: selector };
  } catch (err) {
    return { success: false, action: 'focus', target: selector, error: String(err) };
  }
}

// ─── Add to Cart (find by text, then click) ───────────────────────────────────

const ADD_TO_CART_PATTERNS = [
  /add\s+to\s+cart/i,
  /add\s+to\s+bag/i,
  /add\s+to\s+basket/i,
  /buy\s+now/i,
  /add\s+to\s+cart\s*$/i,
  /add\s+item/i,
];

function isAddToCartLike(el: Element): boolean {
  const text = (el.textContent ?? '').trim();
  const value = (el as HTMLInputElement).value?.trim?.() ?? '';
  const label = (el.getAttribute('aria-label') ?? '').trim();
  const title = (el.getAttribute('title') ?? '').trim();
  // Also check data-* attributes that retailers use for button state
  const dataState = (el.getAttribute('data-button-state') ?? '').trim();
  const combined = [text, value, label, title, dataState].join(' ');
  return ADD_TO_CART_PATTERNS.some((p) => p.test(combined));
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// Deduplicate candidates (same element may match multiple selectors)
function dedup(elements: Element[]): Element[] {
  const seen = new Set<Element>();
  return elements.filter((el) => {
    if (seen.has(el)) return false;
    seen.add(el);
    return true;
  });
}

export function findAndClickAddToCart(): InteractionResult {
  // ── Phase 0: Detect CAPTCHA / bot-wall pages ────────────────────────────
  // Retailers like Walmart show a "Robot or human?" challenge page.
  // Detect this early so the user gets a clear message instead of
  // "No Add to Cart button found".
  const bodyText = (document.body?.innerText ?? '').substring(0, 2000).toLowerCase();
  const titleText = (document.title ?? '').toLowerCase();
  const captchaSignals = [
    /robot or human/i,
    /are you a human/i,
    /verify you('re| are) human/i,
    /captcha/i,
    /press and hold/i,
    /confirm.{0,20}human/i,
    /blocked.{0,20}bot/i,
    /access.{0,20}denied/i,
    /unusual traffic/i,
  ];
  const isCaptcha = captchaSignals.some((p) => p.test(bodyText) || p.test(titleText));
  if (isCaptcha) {
    return {
      success: false,
      action: 'add_to_cart',
      target: 'CAPTCHA',
      error: 'This page is showing a CAPTCHA / bot verification challenge. Please solve it manually, then try again.',
    };
  }

  const candidates: Element[] = [];

  // ── Phase 1: Data-attribute / class selectors (most reliable, site-specific) ──
  // Use case-insensitive attribute selectors where possible.
  // CSS attribute selectors are case-sensitive by default; we use the `i` flag.
  const dataSelectors = [
    // Best Buy
    '[data-button-state="ADD_TO_CART" i]',
    '[data-button-state="add-to-cart" i]',
    '[data-sku-id][data-button-state]',
    '.fulfillment-add-to-cart-button button',
    '.fulfillment-add-to-cart-button',
    '[data-lid="huc-add-to-cart"]',
    // Amazon
    '#add-to-cart-button',
    'input[name="submit.add-to-cart"]',
    '#buyNow',
    // Walmart
    '[data-testid="add-to-cart"]',
    'button[data-automation-id="atc"]',
    // Target
    '[data-test="orderPickupButton"]',
    '[data-test="shipItButton"]',
    // Generic / common patterns
    '.add-to-cart-button',
    '.add-to-cart-btn',
    '#add-to-cart',
    '[class*="addToCart"]',
    '[class*="add-to-cart"]',
    '[class*="AddToCart"]',
    '[data-testid*="add-to-cart" i]',
    '[data-testid*="addToCart"]',
  ];

  for (const sel of dataSelectors) {
    try {
      document.querySelectorAll(sel).forEach((el) => {
        if (isVisible(el)) candidates.push(el);
      });
    } catch {
      // Some browsers don't support the `i` flag in attribute selectors — skip
    }
  }

  // ── Phase 2: Text-based matching on interactive elements ──────────────────
  document.querySelectorAll('button, input[type="submit"], [role="button"], a[href]').forEach((el) => {
    if (isAddToCartLike(el) && isVisible(el)) candidates.push(el);
  });

  // ── Phase 3: Deep search — spans/divs inside buttons that hold the text ────
  // Sometimes the button itself has no text, but a child span does.
  document.querySelectorAll('button span, button div, [role="button"] span').forEach((span) => {
    if (isAddToCartLike(span) && isVisible(span)) {
      // Push the parent button, not the span
      const btn = span.closest('button, [role="button"]');
      if (btn && isVisible(btn)) candidates.push(btn);
    }
  });

  const unique = dedup(candidates);

  // Prefer first visible match (main CTA is usually first in DOM order)
  const toClick = unique[0];
  if (!toClick) {
    return { success: false, action: 'add_to_cart', target: 'Add to Cart', error: 'No Add to Cart button found on this page' };
  }

  toClick.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Use both .click() and dispatchEvent for maximum compatibility
  // (some React sites intercept native click, others need the event)
  try {
    (toClick as HTMLElement).click();
  } catch {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    toClick.dispatchEvent(event);
  }

  return { success: true, action: 'add_to_cart', target: (toClick.textContent ?? '').trim().substring(0, 50) };
}
