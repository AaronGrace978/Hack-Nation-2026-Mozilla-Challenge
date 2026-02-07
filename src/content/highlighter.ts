// ─── Visual Highlighter ───────────────────────────────────────────────────────
// Draws colored overlays on elements being interacted with by agents,
// so the user can see exactly what the agent is touching.

const HIGHLIGHT_CLASS = 'nexus-highlight';
const OVERLAY_ID = 'nexus-highlight-overlay';

interface HighlightConfig {
  selector: string;
  color: string;
  label?: string;
  duration?: number; // ms, 0 = persistent
}

// Color mapping for agents
const AGENT_COLORS: Record<string, string> = {
  navigator: 'rgba(76, 110, 245, 0.3)',    // Blue
  researcher: 'rgba(81, 207, 102, 0.3)',    // Green
  orchestrator: 'rgba(255, 212, 59, 0.3)',  // Yellow
  guardian: 'rgba(255, 107, 107, 0.3)',      // Red
};

// Inject styles
function ensureStyles(): void {
  if (document.getElementById('nexus-highlight-styles')) return;

  const style = document.createElement('style');
  style.id = 'nexus-highlight-styles';
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid rgba(76, 110, 245, 0.8) !important;
      outline-offset: 2px !important;
      transition: outline 0.3s ease, background-color 0.3s ease !important;
      position: relative !important;
    }
    
    .${HIGHLIGHT_CLASS}::after {
      content: attr(data-nexus-label);
      position: absolute;
      top: -24px;
      left: 0;
      background: rgba(76, 110, 245, 0.9);
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 999999;
      white-space: nowrap;
      pointer-events: none;
    }
    
    .nexus-highlight-pulse {
      animation: nexus-pulse 1.5s ease-in-out infinite !important;
    }
    
    @keyframes nexus-pulse {
      0%, 100% { outline-color: rgba(76, 110, 245, 0.8); }
      50% { outline-color: rgba(76, 110, 245, 0.3); }
    }
    
    #${OVERLAY_ID} {
      position: fixed;
      pointer-events: none;
      z-index: 999998;
      border: 2px dashed rgba(76, 110, 245, 0.6);
      border-radius: 4px;
      transition: all 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

export function highlightElement(config: HighlightConfig): () => void {
  ensureStyles();

  const el = document.querySelector(config.selector);
  if (!el) return () => {};

  const htmlEl = el as HTMLElement;

  // Apply highlight
  htmlEl.classList.add(HIGHLIGHT_CLASS);
  if (config.label) {
    htmlEl.setAttribute('data-nexus-label', config.label);
  }

  // Set custom color via inline style
  const originalOutline = htmlEl.style.outlineColor;
  if (config.color) {
    htmlEl.style.outlineColor = config.color;
  }

  // Scroll into view
  htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Auto-remove after duration
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (config.duration && config.duration > 0) {
    timer = setTimeout(() => cleanup(), config.duration);
  }

  function cleanup() {
    htmlEl.classList.remove(HIGHLIGHT_CLASS, 'nexus-highlight-pulse');
    htmlEl.removeAttribute('data-nexus-label');
    htmlEl.style.outlineColor = originalOutline;
    if (timer) clearTimeout(timer);
  }

  return cleanup;
}

export function highlightForAgent(
  selector: string,
  agentRole: string,
  action: string,
  duration = 3000,
): () => void {
  return highlightElement({
    selector,
    color: AGENT_COLORS[agentRole] ?? AGENT_COLORS.navigator,
    label: `${agentRole}: ${action}`,
    duration,
  });
}

export function clearAllHighlights(): void {
  const elements = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  elements.forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS, 'nexus-highlight-pulse');
    el.removeAttribute('data-nexus-label');
  });

  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}

export function showBoundingBox(rect: DOMRect, color = 'rgba(76, 110, 245, 0.6)'): () => void {
  ensureStyles();

  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);
  }

  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.borderColor = color;
  overlay.style.display = 'block';

  return () => {
    overlay!.style.display = 'none';
  };
}
