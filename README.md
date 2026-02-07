# Nexus by BostonAi.io — The Universal Web Agent

![Nexus Project Cover](assets/nexus-cover.png)

**Bring Your Own AI to Every Website.**

Nexus is a multi-agent browser extension that gives users a portable, permission-first AI companion for the web. It coordinates five specialized agents to handle cross-site workflows, voice navigation, visual search, and preference-aware browsing — all mediated through a transparent permission system where the user is always in control.

Built for the **Hack-Nation 2026 Global AI Hackathon** (Mozilla Web Agent API Challenge) by **BostonAi.io**.

---

## What It Does

- **Chat with any webpage** — Ask questions about the page you're on and get instant answers
- **Cross-site price comparison** — "Find me the cheapest RTX 5080" searches Amazon, Walmart, Best Buy, Target, and more in parallel
- **Voice navigation** — Hands-free browsing via Web Speech API
- **Cross-site workflows** — "Find flights, check calendar, draft email" in one command
- **BYOK (Bring Your Own Key)** — Works with OpenAI, Anthropic, or Ollama (local + cloud). Your keys, your data

---

## Architecture

```
User (Voice / Text)
    |
    v
Sidebar UI (React + Tailwind)
    |
    v
Orchestrator Agent
    |
    +--> Navigator Agent     -- page interaction via content scripts
    +--> Researcher Agent    -- cross-site extraction via Tabstack
    +--> Memory Agent        -- preferences & history via IndexedDB
    +--> Guardian Agent      -- permission enforcement & audit logging
```

### Capability Tiers

| Tier | Capability | Agents |
|------|-----------|--------|
| 1 | LLM access + MCP tool calling | Orchestrator |
| 2 | Browser context + page interaction | Navigator, Researcher |
| 3 | Coordinated multi-agent workflows | All 5 agents |

---

## Permission System

Nexus's key differentiator is its permission-first design:

- **5 Permission Levels:** READ_ONLY → NAVIGATE → INTERACT → SUBMIT → PURCHASE
- **Scoped** per-task, per-site, per-agent
- **Time-bounded** — auto-expire after configurable timeout
- **Escalation flow** — Guardian agent intercepts, prompts user, logs everything
- **Won't-do list** — Payment auto-submit, password access, and security changes are never automated
- **Full audit trail** — every action is logged and inspectable

---

## Price Comparison

Search multiple retailer sites in parallel, extract structured price data, and get a ranked comparison — all from a single natural-language query.

1. Enable in **Settings → Price Comparison**
2. Toggle which retailers to include (Amazon, Walmart, Best Buy, Target, eBay, Newegg, Costco, Home Depot — or add your own)
3. Ask: *"Compare prices for Sony WH-1000XM5 headphones"*
4. Researcher agent builds search URLs, extracts structured JSON via Tabstack, and ranks results
5. LLM synthesizes a markdown comparison with a recommendation

All price comparison uses **READ_ONLY** permissions per retailer domain. No data is submitted or mutated.

---

## Getting Started

### Prerequisites

- Node.js >= 20
- Chrome or Firefox (Manifest V3)
- An API key from **OpenAI**, **Anthropic**, or **Ollama**
- (Optional) A Tabstack API key from [console.tabstack.ai](https://console.tabstack.ai)

### Installation

```bash
# Clone the repo
git clone https://github.com/AaronGrace978/Hack-Nation-2026-Mozilla-Challenge.git
cd Hack-Nation-2026-Mozilla-Challenge

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
3. Choose your LLM provider (OpenAI, Anthropic, or Ollama)
4. Enter your API key
5. (Optional) Enter your Tabstack API key for web automation

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript |
| UI | React 18 + Tailwind CSS |
| Build | Vite 6 |
| Web Extraction | @tabstack/sdk |
| Tool Protocol | MCP (Model Context Protocol) |
| LLM Providers | OpenAI, Anthropic, Ollama (BYOK) |
| Storage | IndexedDB |
| Voice | Web Speech API |
| Extension | Chrome/Firefox MV3 |

## Project Structure

```
src/
  background/       -- Service worker, orchestrator, message routing
  agents/           -- Base agent class + specialist agents
  content/          -- Content scripts (DOM reader, actor, highlighter)
  sidebar/          -- React sidebar UI (components, hooks, styles)
  permissions/      -- Permission manager, types, audit log
  memory/           -- Memory store, preferences
  llm/              -- Multi-provider LLM abstraction
  mcp/              -- MCP client and server registry
  shared/           -- Constants, message types, utilities
```

---

## Built By

**BostonAi.io** — Aaron Grace

## License

MIT
