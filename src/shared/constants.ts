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
