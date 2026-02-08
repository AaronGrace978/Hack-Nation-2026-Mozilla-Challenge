import { readFullPage, readElement, readSelection } from './reader';
import { clickElement, typeInElement, scrollPage, selectOption, focusElement, findAndClickAddToCart } from './actor';
import { highlightForAgent, clearAllHighlights } from './highlighter';
import { ExtMessageType } from '../shared/messages';

// ─── Content Script Entry Point ───────────────────────────────────────────────

console.log('[Nexus] Content script loaded');

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch((err) => {
    sendResponse({ error: String(err) });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(msg: { type: string; payload: unknown }): Promise<unknown> {
  const payload = msg.payload as Record<string, unknown>;

  switch (msg.type) {
    // ── Page Reading ────────────────────────────────────────────────────────

    case ExtMessageType.READ_PAGE: {
      const readType = (payload?.type as string) ?? 'full';
      switch (readType) {
        case 'full':
          return readFullPage();
        case 'selection':
          return { selection: readSelection() };
        case 'element': {
          const selector = payload?.selector as string;
          if (!selector) return { error: 'No selector provided' };
          return readElement(selector);
        }
        default:
          return readFullPage();
      }
    }

    // ── Page Interaction ────────────────────────────────────────────────────

    case ExtMessageType.INTERACT_PAGE: {
      const action = payload?.action as string;
      const selector = payload?.selector as string;
      const value = payload?.value as string;

      // Highlight the target element
      if (selector) {
        highlightForAgent(selector, 'navigator', action, 2000);
      }

      switch (action) {
        case 'click':
          return clickElement(selector);
        case 'type':
          return typeInElement(selector, value);
        case 'scroll':
          return scrollPage(value ?? 'down', (payload?.amount as number) ?? 500);
        case 'select':
          return selectOption(selector, value);
        case 'focus':
          return focusElement(selector);
        case 'add_to_cart':
          return findAndClickAddToCart();
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    }

    // ── Highlighting ────────────────────────────────────────────────────────

    case ExtMessageType.HIGHLIGHT_ELEMENT: {
      const selector = payload?.selector as string;
      const agent = (payload?.agent as string) ?? 'navigator';
      const action = (payload?.action as string) ?? 'highlighting';
      const duration = (payload?.duration as number) ?? 3000;

      if (!selector) return { error: 'No selector provided' };
      highlightForAgent(selector, agent, action, duration);
      return { success: true };
    }

    case ExtMessageType.CLEAR_HIGHLIGHTS: {
      clearAllHighlights();
      return { success: true };
    }

    default:
      return { error: `Unknown message type: ${msg.type}` };
  }
}
