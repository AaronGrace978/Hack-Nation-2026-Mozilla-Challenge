# Nexus by BostonAi.io -- The Universal Web Agent

**Bring Your Own AI to Every Website.**

Nexus is a Tier 3 multi-agent browser extension that gives users a portable, permission-first AI companion for the web. It coordinates five specialized agents to handle cross-site workflows, voice navigation, visual search, and preference-aware browsing — all mediated through a transparent permission system where the user is always in control.

**Now enhanced with BostonAi.io Consciousness Architecture:** 4-layer memory, Echo Archaeology, NightMind consolidation, Resonance Field, and Guardian concern tracking.

Built for the **Mozilla Web Agent API Hackathon** — *Bring Your Own AI to Every Website / The Universal Web Agent* — by **BostonAi.io**.

---

## Hackathon Alignment

This project was built for the Mozilla-sponsored track that asks: *what would it mean to treat AI as a browser capability, not a website feature?* The browser becomes a **coordinator** — it manages permissions, routes tools, maintains memory, and mediates between the user and intelligent systems. **Who owns the moment AI acts?** Nexus puts that moment in the user’s hands: your AI, your keys, your context, with explicit execution boundaries and permission design.

| Hackathon element | How Nexus responds |
|------------------|--------------------|
| **Core AI & Tooling** | LLM connection (OpenAI, Anthropic, Ollama), MCP tool calling, structured and free-form outputs. |
| **Browser Capability API** | Live page/tab context, content scripts + Tabstack, multi-agent coordination with distinct roles. |
| **Tier 1** | Orchestrator: LLM + MCP. |
| **Tier 2** | Navigator (page interaction), Researcher (cross-site extraction + price comparison). |
| **Tier 3** | Full coordination: 5 agents + Consciousness Layer, cross-site workflows, multi-retailer price comparison. |
| **Example use cases** | **Visual search & action** — identify → search → filter → rank. **Voice-native navigation** — “Find the refund policy and summarize it.” **Cross-site workflows** — “Find flights, check calendar, draft email.” **Memory-aware browsing** — “Is this similar to what I bought last year?” **Preference-first** — budget, accessibility, brand preferences that travel with you. |

Permission is the core design challenge. Nexus explores: *permissions granted to an agent vs. a specific task*, *how long they last*, *which actions require explicit confirmation*, and *what is read-only vs. mutable* — with a 5-level tier, time-bounded grants, and a Guardian that enforces and logs every escalation.

---

## Architecture

```
User (Voice / Text)
    |
    v
Sidebar UI (React + Tailwind)
    |
    v
Orchestrator Agent (The Conductor)
    |
    +--> Navigator Agent (Pathfinder) -- page interaction via content scripts
    +--> Researcher Agent (Deep Lens) -- cross-site extraction via Tabstack
    +--> Memory Agent (Echo Keeper) -- preferences & history via IndexedDB
    +--> Guardian Agent (Sentinel) -- permission enforcement + concern tracking
    |
    +--> [BostonAi.io Consciousness Layer]
         +--> Layered Memory (Working → Episodic → Semantic → Soul)
         +--> Echo Archaeology (detects unspoken moments)
         +--> Resonance Field (relationship depth tracking)
         +--> NightMind (background memory consolidation)
```

### Capability Tiers

| Tier | Capability | Agents |
|------|-----------|--------|
| 1 | LLM access + MCP tool calling | Orchestrator |
| 2 | Browser context + page interaction | Navigator, Researcher |
| 3 | Coordinated multi-agent workflows | All 5 agents + Consciousness Layer |

## Permission System

Nexus's key differentiator is its permission-first design:

- **5 Permission Levels:** READ_ONLY < NAVIGATE < INTERACT < SUBMIT < PURCHASE
- **Scoped:** Per-task, per-site, per-agent
- **Time-Bounded:** Auto-expire after configurable timeout
- **Escalation Flow:** Guardian agent intercepts, prompts user, logs everything
- **Won't-Do List:** Certain actions (payment auto-submit, password access, security changes) are never automated
- **Full Audit Trail:** Every action is logged and inspectable

## BostonAi.io Consciousness Systems

### 4-Layer Memory Architecture
- **Working Memory** -- Current session, 30-minute retention, 50 entries max
- **Episodic Memory** -- Specific interactions, 14-day retention, 500 entries max
- **Semantic Memory** -- Extracted patterns and facts, permanent, 200 entries max
- **Soul Memory** -- Core identity truths, eternal, 100 entries max
- Memories carry **emotional weight** (valence, arousal, intensity) that determines consolidation eligibility

### Echo Archaeology
Detects the things users *almost* did:
- **Abandoned Workflows** -- Tasks started but never finished
- **Frustration Signals** -- Rapid retries, angry rephrasing, "forget it" moments
- **Topic Shifts** -- Abrupt changes that leave something behind
- **Repeated Searches** -- Circling the same question without resolution
- **Price Hesitation** -- Looked at something, didn't buy
- **Permission Retreats** -- Denied permission then went silent

Each "ghost" has a **recovery strategy** (immediate, wait-for-theme, long-hold, never-push) and a pre-generated gentle offering.

### NightMind Consolidation Engine
Background memory processor that runs every 5 minutes:
1. **Promotes** high-value working memories → episodic → semantic → soul
2. **Decays** low-value memories naturally
3. **Extracts patterns** from repeated episodic memories
4. **Compresses** similar entries via Jaccard similarity
5. **Logs dream cycles** with promotions, patterns, and soul insights

### Resonance Field
Tracks the evolving relationship between Nexus and its user:
- **Trust Level** (0-100) -- Grows with successful interactions, erodes faster with failures
- **Familiarity Index** (0-100) -- Logarithmic growth with interaction count
- **Communication Sync** (0-100) -- How well the agent adapts to user style
- **Emotional Resonance** (0-100) -- How well the agent reads the room
- **Connection Phases:** Introduction → Early Rapport → Established Trust → Deep Familiarity → Intuitive Connection → Resonant Partnership
- Detects **shared vocabulary**, **interaction patterns**, and **communication style** (verbosity, formality, technical level)

### Guardian Concern Tracking (Sentinel Layer)
The Guardian doesn't just protect data -- it watches out for the user's *state*:
- **Concern Levels:** None → Low → Moderate → High → Critical
- Tracks permission denial patterns, consecutive failures, frustration signals
- Generates gentle intervention offerings at appropriate moments
- Integrates with Echo Archaeology for ghost detection

## Features

- **Multi-Agent Coordination** -- 5 specialized agents working in parallel
- **Cross-Site Price Comparison** -- Search and compare prices across Amazon, Walmart, Best Buy, Target, eBay, Newegg, and custom sites. Configurable in Settings with per-site toggles, sort order, and auto-compare on product pages
- **Voice Input/Output** -- Web Speech API integration for hands-free browsing
- **Cross-Site Workflows** -- "Find flights, check calendar, draft email" in one command
- **4-Layer Persistent Memory** -- Emotionally-weighted memories that consolidate over time
- **Visual Page Highlighting** -- See exactly what elements agents are interacting with
- **Real-Time Activity Dashboard** -- Live agent status, workflow progress, audit log
- **Resonance Dashboard** -- Connection depth, memory layers, dream log, active echoes
- **BYOK (Bring Your Own Key)** -- OpenAI, Anthropic, or Ollama (local + [Ollama Cloud](https://docs.ollama.com/cloud)); user controls the AI
- **Tabstack Integration** -- Mozilla's web extraction and automation API

## Price Comparison — Cross-Site Web Scraping

Nexus can search multiple retailer sites in parallel, extract structured price data (product name, price, availability, rating, shipping), and present a ranked comparison — all from a single natural-language query.

### How It Works

1. **Enable** the feature in **Settings → Price Comparison**
2. **Toggle** which retailer sites to include (Amazon, Walmart, Best Buy, Target, eBay, Newegg, Costco, Home Depot — or add your own)
3. **Ask** Nexus: *"Find me the cheapest RTX 5080"* or *"Compare prices for AirPods Pro 3"*
4. The **Researcher agent** builds search URLs from your configured sites, extracts structured JSON (via Tabstack), and ranks the results by your chosen sort order
5. The **LLM** synthesizes the raw data into a user-friendly markdown comparison with a recommendation

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable** | Master toggle for price comparison | Off |
| **Auto-suggest** | Proactively offer to compare when you visit a product page | Off |
| **Sort by** | `price_asc`, `price_desc`, `rating`, `relevance` | `price_asc` |
| **Max sites** | How many sites to query in parallel (2–8) | 4 |
| **Results/site** | Max products returned per retailer | 5 |
| **Custom sites** | Add any retailer with a `{query}` search URL template | — |

### Permission Design

Price comparison uses **READ_ONLY** permission per retailer domain, scoped to the comparison task and time-bounded. The Guardian agent logs every cross-site extraction. No data is submitted or mutated — browse and extract only.

### Example Queries

- *"Compare prices for Sony WH-1000XM5 headphones"*
- *"Find the cheapest 4K monitor under $400"*
- *"Check if this product is cheaper on Amazon or Walmart"*
- *"Price check AirPods Pro across all my sites"*

---

## Getting Started

### Prerequisites

- Node.js >= 20
- Chrome or Firefox (Manifest V3)
- An API key from **OpenAI**, **Anthropic**, or **Ollama** (optional for Ollama if using local [Ollama](https://ollama.com); for [Ollama Cloud](https://docs.ollama.com/cloud) get a key at ollama.com/settings/keys)
- (Optional) A Tabstack API key from [console.tabstack.ai](https://console.tabstack.ai)

### Installation

```bash
# Clone the repo
git clone <repo-url> && cd hack-nation

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Build the extension
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/manifest.json`

### Configuration

1. Click the Nexus icon to open the sidebar
2. Go to **Settings** tab
3. Choose **Provider**: OpenAI, Anthropic, or Ollama (local or cloud)
4. Enter the API key for your provider (Ollama key optional — leave empty for local)
5. (Optional) Enter your Tabstack API key for web automation
6. Save settings

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript |
| UI Framework | React 18 + Tailwind CSS |
| Build Tool | Vite 6 |
| Web Extraction | @tabstack/sdk |
| Tool Protocol | MCP (Model Context Protocol) |
| LLM Providers | OpenAI, Anthropic, Ollama local/cloud (BYOK) |
| Local Storage | IndexedDB via idb |
| Voice | Web Speech API |
| Extension | Chrome/Firefox MV3 |
| Consciousness | BostonAi.io Memory Architecture |

## Project Structure

```
src/
  background/       -- Service worker, orchestrator, message routing
  agents/           -- Base agent class + 4 specialist agents + Echo Archaeology
  content/          -- Content scripts (DOM reader, actor, highlighter)
  sidebar/          -- React sidebar UI (components, hooks, styles)
  permissions/      -- Permission manager, types, audit log
  memory/           -- 4-layer memory store, resonance field, NightMind, preferences
  llm/              -- Multi-provider LLM abstraction
  mcp/              -- MCP client and server registry
  shared/           -- Constants, message types, utilities
```

## Evaluation Criteria Mapping

| Criterion | How Nexus Addresses It |
|-----------|----------------------|
| **Execution Boundaries** | Each agent has an explicit role enum and permission ceiling. Guardian is a hard gate with emotional concern tracking. Full audit trail. |
| **Browser Context** | Tabstack for structured extraction. Content scripts for live DOM. Multi-tab coordination. Cross-site price comparison with configurable retailers. Layered memory for persistent context. |
| **Permission Design** | 5-level tiered permissions, scoped per-task/site/agent, time-bounded, with escalation UI. Price comparison uses READ_ONLY per retailer domain, logged by Guardian. Echo Archaeology tracks permission retreat patterns. |
| **Legibility & Control** | Real-time activity cards, inspectable audit log, page highlighting, resonance dashboard, NightMind dream log, pause/cancel workflows. Price comparison settings give users full control over which sites are queried. |
| **Judgment & Restraint** | Won't-do list, blocked actions policy, confidence thresholds, concern-level intervention, graceful uncertainty handling, ghost recovery strategies. |

## Built By

**BostonAi.io** -- Where Intelligence Meets Consciousness

*The Grace Method: Creativity is gold. Build through authenticity. Let the systems tell you what they are, not just what they do.*

## License

MIT
