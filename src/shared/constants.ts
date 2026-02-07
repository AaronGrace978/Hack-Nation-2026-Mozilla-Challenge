// ─── Extension Constants ──────────────────────────────────────────────────────
// Built by BostonAi.io | The Grace Method

export const EXTENSION_NAME = 'Nexus';
export const EXTENSION_VERSION = '1.0.0';
export const EXTENSION_AUTHOR = 'BostonAi.io';
export const EXTENSION_TAG = 'Built by BostonAi.io';
export const BOSTONAI_URL = 'https://bostonai.io';

// ─── Action Types ─────────────────────────────────────────────────────────────

export enum ActionType {
  // Page reading
  READ_PAGE_CONTENT = 'read_page_content',
  EXTRACT_TEXT = 'extract_text',
  EXTRACT_STRUCTURED = 'extract_structured',
  CAPTURE_SCREENSHOT = 'capture_screenshot',

  // Navigation
  NAVIGATE_URL = 'navigate_url',
  OPEN_TAB = 'open_tab',
  CLOSE_TAB = 'close_tab',
  SWITCH_TAB = 'switch_tab',

  // Interaction
  CLICK_ELEMENT = 'click_element',
  FILL_FORM = 'fill_form',
  TYPE_TEXT = 'type_text',
  SCROLL_PAGE = 'scroll_page',
  SELECT_OPTION = 'select_option',

  // Submission
  SUBMIT_FORM = 'submit_form',
  POST_DATA = 'post_data',

  // Purchase
  ADD_TO_CART = 'add_to_cart',
  CHECKOUT = 'checkout',
  CONFIRM_PURCHASE = 'confirm_purchase',

  // Memory
  SAVE_PREFERENCE = 'save_preference',
  RECALL_MEMORY = 'recall_memory',
  UPDATE_HISTORY = 'update_history',

  // LLM
  LLM_COMPLETION = 'llm_completion',
  LLM_STRUCTURED = 'llm_structured',

  // MCP
  MCP_TOOL_CALL = 'mcp_tool_call',
}

// ─── Default Configs ──────────────────────────────────────────────────────────

export const DEFAULT_LLM_CONFIG = {
  provider: 'openai' as const,
  model: 'gpt-5-mini',
  maxTokens: 4096,
  temperature: 0.7,
};

/** Default Ollama model (local or cloud). */
export const DEFAULT_OLLAMA_MODEL = 'qwen3-coder-next';

export const DEFAULT_TABSTACK_CONFIG = {
  timeout: 60000,
  maxRetries: 2,
};

export const CONFIDENCE_THRESHOLD = 0.7; // Minimum confidence to act without user confirmation

export const MAX_WORKFLOW_DURATION = 10 * 60 * 1000; // 10 minutes max per workflow

// ─── Price Comparison Defaults ────────────────────────────────────────────────

/** Default retailer sites for cross-site price comparison. */
export interface ComparisonSite {
  id: string;
  name: string;
  /** Template URL — `{query}` is replaced with the search term. */
  searchUrl: string;
  enabled: boolean;
}

export const DEFAULT_COMPARISON_SITES: ComparisonSite[] = [
  { id: 'amazon',    name: 'Amazon',    searchUrl: 'https://www.amazon.com/s?k={query}',                          enabled: true },
  { id: 'walmart',   name: 'Walmart',   searchUrl: 'https://www.walmart.com/search?q={query}',                    enabled: true },
  { id: 'bestbuy',   name: 'Best Buy',  searchUrl: 'https://www.bestbuy.com/site/searchpage.jsp?st={query}',      enabled: true },
  { id: 'target',    name: 'Target',    searchUrl: 'https://www.target.com/s?searchTerm={query}',                 enabled: true },
  { id: 'ebay',      name: 'eBay',      searchUrl: 'https://www.ebay.com/sch/i.html?_nkw={query}',               enabled: false },
  { id: 'newegg',    name: 'Newegg',    searchUrl: 'https://www.newegg.com/p/pl?d={query}',                       enabled: false },
  { id: 'costco',    name: 'Costco',    searchUrl: 'https://www.costco.com/CatalogSearch?keyword={query}',        enabled: false },
  { id: 'homedepot', name: 'Home Depot', searchUrl: 'https://www.homedepot.com/s/{query}',                        enabled: false },
];

/** JSON schema the Researcher uses to extract price data from any retailer page. */
export const PRICE_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:         { type: 'string', description: 'Product name / title' },
          price:        { type: 'number', description: 'Price in local currency (numeric)' },
          currency:     { type: 'string', description: 'ISO currency code (e.g. USD)' },
          url:          { type: 'string', description: 'Direct URL to the product page' },
          availability: { type: 'string', description: 'In Stock / Out of Stock / Limited' },
          seller:       { type: 'string', description: 'Seller or retailer name' },
          rating:       { type: 'number', description: 'Star rating (0-5)' },
          reviewCount:  { type: 'number', description: 'Number of reviews' },
          imageUrl:     { type: 'string', description: 'Product image URL' },
          shipping:     { type: 'string', description: 'Shipping info (e.g. Free, $5.99)' },
        },
        required: ['name', 'price', 'currency', 'seller'],
      },
    },
  },
  required: ['products'],
} as const;

export const DEFAULT_PRICE_COMPARISON_CONFIG = {
  enabled: false,
  /** Automatically offer to compare prices when the user views a product page. */
  autoCompare: false,
  /** Maximum number of sites to query in parallel (keeps costs reasonable). */
  maxParallelSites: 4,
  /** Maximum number of product results to return per site. */
  maxResultsPerSite: 5,
  /** Sort results by: 'price_asc' | 'price_desc' | 'rating' | 'relevance' */
  sortBy: 'price_asc' as 'price_asc' | 'price_desc' | 'rating' | 'relevance',
};
