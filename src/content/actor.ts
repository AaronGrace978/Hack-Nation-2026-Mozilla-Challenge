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
