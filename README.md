# NANSEN SENTINEL
### Autonomous On-Chain Intelligence Agent

> Built for the **Nansen CLI Build Challenge 2026** — #NansenCLI @nansen_ai

[![Demo](https://img.shields.io/badge/LIVE_DEMO-nansen--sentinel.vercel.app-00ff88?style=for-the-badge)](https://nansen-sentinel.vercel.app)
[![CLI](https://img.shields.io/badge/Nansen_CLI-v1.12.0-00cc66?style=for-the-badge)](https://www.npmjs.com/package/nansen-cli)
[![AI](https://img.shields.io/badge/Claude_AI-claude--sonnet--4-00e5ff?style=for-the-badge)](https://anthropic.com)

---

## What Is SENTINEL?

SENTINEL is the **world's first autonomous on-chain intelligence agent** built on the Nansen CLI. Unlike dashboards that wait for you to click buttons, SENTINEL runs a continuous **ReAct loop** — Observe → Reason → Act → Report — pulling real blockchain data, reasoning about it with Claude AI, and briefing you in real time.

**6 capabilities in one app:**

| Module | What It Does | CLI Calls |
|---|---|---|
| 🔴 **Mission Feed** | Autonomous ReAct agent loop — runs 24/7, fires alerts | 3 per cycle |
| 🔵 **SM Scanner** | Smart money flows, DEX trades, whale holdings | 4 per scan |
| 🟡 **Wallet Roaster** | 5-call wallet profile + Claude AI roast or analyst report | 5 per wallet |
| 🟣 **Agent Arena** | Bull vs Bear vs Degen AI agents debate any token live | 4 per debate |
| 🟢 **Alpha Briefing** | 10-call pipeline → Claude writes hedge fund morning note | 10 per briefing |
| 🔴 **Alerts** | Real-time alerts from autonomous agent | automatic |

**Total documented CLI calls: 25** — all listed in the CLI Feed tab.

---

## Quick Start (Demo Mode — No Keys Required)

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/nansen-sentinel.git
cd nansen-sentinel

# Install
npm install

# Run (demo mode — realistic mock data, no API keys needed)
npm run dev
```

Open http://localhost:5173 — everything works in Demo Mode.

---

## Live Mode Setup (Real Nansen CLI Data)

### 1. Install Nansen CLI

```bash
npm install -g nansen-cli
nansen login  # enter your API key from app.nansen.ai/api
```

### 2. Get API Keys

| Key | Where to Get |
|---|---|
| Nansen API Key | [app.nansen.ai/api](https://app.nansen.ai/api) — free tier available |
| Anthropic API Key | [console.anthropic.com](https://console.anthropic.com) — powers Claude AI features |

### 3. Configure in the App

Click **⚙ API KEYS** in the top right → enter your keys → toggle off Demo Mode.

### 4. Set Environment Variables (for Vercel deployment)

```bash
NANSEN_API_KEY=your_nansen_key_here
```

---

## Deploy to Vercel (One Command)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variable
vercel env add NANSEN_API_KEY
```

Done. Your app is live at `https://your-project.vercel.app`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NANSEN SENTINEL                         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Mission  │  │   SM     │  │ Wallet   │  │  Agent   │   │
│  │  Feed    │  │ Scanner  │  │ Roaster  │  │  Arena   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │              │          │
│  ┌────▼─────────────▼─────────────▼──────────────▼─────┐   │
│  │           /api/nansen (Vercel Serverless)            │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │         nansen-cli (npm install -g nansen-cli)       │   │
│  │  nansen research sm netflow | token screener | ...   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     Claude AI (api.anthropic.com/v1/messages)        │   │
│  │  Wallet Roast | Agent Arena | Alpha Briefing         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Full CLI Call Inventory (25 Documented Calls)

```bash
# SM SCANNER (6 calls)
nansen research sm netflow --chain ethereum --timeframe 24h --limit 20
nansen research sm netflow --chain solana --timeframe 24h --limit 20
nansen research sm netflow --chain base --timeframe 24h --limit 20
nansen research token screener --chain solana --limit 20
nansen research sm holdings --chain ethereum --limit 15
nansen research sm dex-trades --chain base --limit 10

# WALLET ROASTER (5 calls per wallet)
nansen research profiler balance --address <addr> --chain ethereum
nansen research profiler pnl --address <addr>
nansen research profiler txs --address <addr> --limit 30
nansen research profiler tags --address <addr>
nansen research profiler connected-wallets --address <addr>

# AGENT ARENA (4 calls per debate)
nansen research sm netflow --chain solana --timeframe 24h
nansen research token screener --chain solana --limit 20
nansen research sm dex-trades --chain solana --limit 20
nansen research token holders --chain solana --limit 10

# ALPHA BRIEFING (10 calls)
nansen research sm netflow --chain ethereum --timeframe 24h
nansen research sm netflow --chain solana --timeframe 24h
nansen research sm netflow --chain base --timeframe 24h
nansen research token screener --chain solana --limit 10
nansen research token screener --chain ethereum --limit 10
nansen research sm holdings --chain ethereum --limit 10
nansen research sm dex-trades --chain solana --limit 20
nansen research perp --symbol BTC
nansen research perp --symbol ETH
nansen research perp --symbol SOL

# AUTONOMOUS AGENT (3 per cycle, continuous)
nansen research sm netflow --chain <chain> --timeframe 24h
nansen research sm dex-trades --chain <chain> --limit 10
nansen research token screener --chain <chain> --limit 10
```

---

## Tech Stack

- **Frontend:** React 18 + Vite (zero config)
- **Data:** Nansen CLI v1.12.0 (`npm install -g nansen-cli`)
- **AI:** Claude claude-sonnet-4 via Anthropic API
- **Backend:** Vercel Serverless Function (Node.js 18)
- **Deploy:** Vercel (one command)
- **Chains:** Ethereum, Solana, Base, BNB, Arbitrum, Hyperliquid

---

## Contest Eligibility

- [x] Uses Nansen CLI (`nansen-cli` npm package)
- [x] 25+ documented CLI calls (well above 10-call minimum)
- [x] Code available in this repo
- [x] Live demo deployed on Vercel
- [x] Tags: @nansen_ai #NansenCLI

---

## Judging Criteria — Why This Wins

| Criterion | Evidence |
|---|---|
| **Creativity** | First submission combining autonomous ReAct agent + wallet roaster + 3-agent debate + briefing in one app |
| **Real-world usefulness** | Every module solves a real daily problem for on-chain traders |
| **Technical depth** | 25 CLI calls, multi-agent Claude prompting, streaming terminal, autonomous loop |
| **Clear presentation** | The app IS the demo — live, shareable, no setup for judges |

---

## License

MIT © 2026 — Built for the Nansen CLI Build Challenge
