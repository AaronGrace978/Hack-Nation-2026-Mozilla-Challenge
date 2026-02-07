// ─── DOM Reader ───────────────────────────────────────────────────────────────
// Reads page content, extracts text, and captures structure.

export interface PageSnapshot {
  url: string;
  title: string;
  text: string;
  html: string;
  selection: string;
  metadata: {
    domain: string;
    path: string;
    language: string;
    description: string;
    headings: { level: number; text: string }[];
    links: { text: string; href: string }[];
    forms: { id: string; action: string; inputs: { name: string; type: string; value: string }[] }[];
    images: { alt: string; src: string }[];
  };
}

export function readFullPage(): PageSnapshot {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((el) => ({
    level: parseInt(el.tagName[1]),
    text: el.textContent?.trim() ?? '',
  }));

  const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 50).map((el) => ({
    text: el.textContent?.trim() ?? '',
    href: (el as HTMLAnchorElement).href,
  }));

  const forms = Array.from(document.querySelectorAll('form')).map((form) => ({
    id: form.id || form.getAttribute('name') || '',
    action: (form as HTMLFormElement).action,
    inputs: Array.from(form.querySelectorAll('input, textarea, select')).map((input) => ({
      name: (input as HTMLInputElement).name || input.id || '',
      type: (input as HTMLInputElement).type || input.tagName.toLowerCase(),
      value: (input as HTMLInputElement).type === 'password' ? '***' : (input as HTMLInputElement).value || '',
    })),
  }));

  const images = Array.from(document.querySelectorAll('img[alt]')).slice(0, 20).map((img) => ({
    alt: (img as HTMLImageElement).alt,
    src: (img as HTMLImageElement).src,
  }));

  // Get visible text content
  const textContent = getVisibleText(document.body);

  return {
    url: window.location.href,
    title: document.title,
    text: textContent.substring(0, 10000),
    html: document.documentElement.outerHTML.substring(0, 50000),
    selection: window.getSelection()?.toString() ?? '',
    metadata: {
      domain: window.location.hostname,
      path: window.location.pathname,
      language: document.documentElement.lang || 'en',
      description:
        document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
      headings,
      links,
      forms,
      images,
    },
  };
}

export function readElement(selector: string): {
  found: boolean;
  text: string;
  html: string;
  rect: DOMRect | null;
} {
  const el = document.querySelector(selector);
  if (!el) {
    return { found: false, text: '', html: '', rect: null };
  }

  return {
    found: true,
    text: el.textContent?.trim() ?? '',
    html: el.outerHTML.substring(0, 5000),
    rect: el.getBoundingClientRect(),
  };
}

export function readSelection(): string {
  return window.getSelection()?.toString() ?? '';
}

// ── Helper: Get Visible Text ────────────────────────────────────────────────

function getVisibleText(element: Element): string {
  const HIDDEN_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG']);
  const parts: string[] = [];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) parts.push(text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    if (HIDDEN_TAGS.has(el.tagName)) return;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    for (const child of node.childNodes) {
      walk(child);
    }
  }

  walk(element);
  return parts.join(' ');
}
