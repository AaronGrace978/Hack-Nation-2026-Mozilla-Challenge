import type { LLMToolDefinition } from './provider';

// ─── Tool Definitions for Agents ──────────────────────────────────────────────
// These are the function-calling tools available to the orchestrator and agents.

export const ORCHESTRATOR_TOOLS: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'decompose_intent',
      description:
        'Break down a user intent into a list of subtasks that can be assigned to specialized agents.',
      parameters: {
        type: 'object',
        properties: {
          subtasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'What this subtask accomplishes' },
                agent: {
                  type: 'string',
                  enum: ['navigator', 'researcher', 'memory'],
                  description: 'Which agent should handle this subtask',
                },
                dependencies: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Indices of subtasks that must complete before this one',
                },
                input: {
                  type: 'object',
                  description: 'Input data for the subtask',
                },
              },
              required: ['description', 'agent'],
            },
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the overall plan',
          },
        },
        required: ['subtasks', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'synthesize_results',
      description: 'Combine results from multiple subtasks into a coherent response for the user.',
      parameters: {
        type: 'object',
        properties: {
          response: { type: 'string', description: 'The final response to show the user' },
          confidence: {
            type: 'number',
            description: 'Confidence level 0-1 in the overall result',
          },
          actionsTaken: {
            type: 'array',
            items: { type: 'string' },
            description: 'Summary of actions performed',
          },
        },
        required: ['response', 'confidence'],
      },
    },
  },
];

export const NAVIGATOR_TOOLS: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_page',
      description: 'Read the content of the current page or a specific element.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['full', 'selection', 'element'],
            description: 'What to read from the page',
          },
          selector: {
            type: 'string',
            description: 'CSS selector for specific element (only for type=element)',
          },
        },
        required: ['type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'click_element',
      description: 'Click on a page element identified by CSS selector or description.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of the element to click' },
          description: { type: 'string', description: 'Human-readable description of what is being clicked' },
        },
        required: ['selector', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fill_input',
      description: 'Type text into an input field.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of the input field' },
          value: { type: 'string', description: 'Text to type into the field' },
          description: { type: 'string', description: 'What this input is for' },
        },
        required: ['selector', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Navigate the current tab to a URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to navigate to' },
          reason: { type: 'string', description: 'Why navigating to this URL' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scroll_page',
      description: 'Scroll the page in a direction.',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['up', 'down', 'top', 'bottom'],
          },
          amount: {
            type: 'number',
            description: 'Pixels to scroll (default 500)',
          },
        },
        required: ['direction'],
      },
    },
  },
];

export const RESEARCHER_TOOLS: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'extract_page_data',
      description: 'Extract structured data from a webpage URL using Tabstack.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to extract data from' },
          schema: {
            type: 'object',
            description: 'JSON schema defining the structure of data to extract',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_markdown',
      description: 'Convert a webpage to clean markdown text.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to convert to markdown' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'automate_task',
      description: 'Execute a browser automation task using natural language instructions.',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Natural language description of the task' },
          url: { type: 'string', description: 'Starting URL for the automation' },
          guardrails: {
            type: 'string',
            description: 'Safety constraints (e.g., "browse and extract only")',
          },
        },
        required: ['task', 'url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_data',
      description: 'Compare extracted data from multiple sources.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                data: { type: 'object' },
              },
            },
            description: 'Items to compare',
          },
          criteria: {
            type: 'string',
            description: 'What criteria to compare on',
          },
        },
        required: ['items', 'criteria'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_prices',
      description: 'Search and compare prices for a product across multiple retailer sites. Uses the user\'s configured comparison sites. Returns ranked results with prices, availability, ratings, and a recommendation.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Product name or search query (e.g. "Sony WH-1000XM5 headphones")',
          },
        },
        required: ['query'],
      },
    },
  },
];

export const MEMORY_TOOLS: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'recall_preferences',
      description: 'Retrieve user preferences relevant to the current context.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Category of preferences (budget, brand, accessibility, dietary, etc.)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recall_history',
      description: 'Search browsing/interaction history.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for history' },
          domain: { type: 'string', description: 'Filter by domain' },
          limit: { type: 'number', description: 'Max results to return' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_preference',
      description: 'Save a new user preference.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          key: { type: 'string' },
          value: { description: 'The preference value' },
          description: { type: 'string' },
        },
        required: ['category', 'key', 'value', 'description'],
      },
    },
  },
];
