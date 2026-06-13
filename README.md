# Nansen Sentinel

> An on-chain intelligence dashboard that surfaces smart-money flows, wallet profiles, and token signals, with a built-in demo mode that runs without any API keys.

## Overview

Nansen Sentinel is a single-page web app for exploring on-chain "smart money" activity. It pulls smart-money netflows, DEX trades, wallet holdings, token screener data, and per-wallet profiles from an on-chain intelligence data API, and layers optional natural-language summaries on top via configurable LLM providers. It ships with a **demo mode** (enabled by default) that returns rich, realistic mock data so the entire interface works end-to-end with no keys configured. Point it at a real data API key and an LLM key to switch to live data.

## Features

- **Smart Money Scanner** — smart-money netflows, recent DEX trades, and top holdings across multiple chains.
- **Wallet Roaster** — multi-call wallet profile (balance, PnL, transactions, labels, related wallets) with an optional LLM-generated narrative summary.
- **Agent Arena** — multiple LLM personas (bull / bear / degen / verdict) reason over the same token data and produce contrasting takes.
- **Alpha Briefing** — aggregates several data calls into a single LLM-written market briefing.
- **Mission Feed & Alerts** — an autonomous observe → reason → report loop that scans data on an interval and raises alerts.
- **CLI Feed** — a live terminal-style log of every data call the app makes.
- **Demo mode** — default-on mock data for both the data API and LLM responses, so the app is fully usable offline / without keys. This is a real, first-class mode, not a stub.
- **Configurable providers** — LLM provider, model, and base URL are set in the in-app API Keys panel; data and LLM keys can also come from server environment variables.

## Tech stack

- **Frontend:** React 18, Vite 5
- **Dev backend:** Express 4 (with `cors`), Node.js (ESM), `dotenv`
- **Tooling:** `concurrently` (runs Vite + the API server together), `@vitejs/plugin-react`
- **Deploy target:** Vercel (Vite framework preset)

## Architecture

- `index.html` / `src/` — the React 18 + Vite single-page app. `src/App.jsx` hosts the tabbed UI; feature panels live in `src/components/`; data/LLM access and mock data live in `src/lib/`; the autonomous loop and call log live in `src/hooks/`.
- `server.js` — the local Express API server (port 3001). It proxies two concerns:
  - `POST /api/nansen` — translates app commands into on-chain data API requests, calls the upstream REST API, and reshapes responses for the UI.
  - `POST /api/claude` and `POST /api/claude-stream` — forward prompts to a selected LLM provider (non-streaming and SSE streaming). Several provider backends are supported, including OpenAI-compatible HTTP endpoints and a locally hosted model server.
- `vite.config.js` — the Vite dev server proxies `/api` to `http://localhost:3001`, so the client and API server run side by side in development.
- `vercel.json` — Vite build config and SPA rewrites for deployment. Note: the API routing here expects a serverless function under `api/`, which is not yet committed to this repo (see Status).

## Getting started

### Prerequisites

- Node.js 18+ (the deploy config targets the Node.js 18 runtime)
- npm

### Installation

```bash
npm install
```

### Configuration

All keys are optional in demo mode. To run against live data, provide them either through the in-app **API Keys** panel or as environment variables read by `server.js`. Create a `.env` file (it is gitignored) with the names you need:

| Variable | Purpose |
|---|---|
| `NANSEN_API_KEY` | Key for the on-chain intelligence data API (used by `/api/nansen`). |
| `ANTHROPIC_API_KEY` | Default LLM provider key. |
| `OPENAI_API_KEY` | LLM key used when the OpenAI-compatible provider is selected. |
| `KIMI_API_KEY` | LLM key used when the Kimi provider is selected. |

The local model provider runs without a key. Per-request keys entered in the API Keys panel take precedence over environment variables. Never commit real key values.

### Running

```bash
npm run dev          # runs Vite (port 5173) and the API server (port 3001) together
npm run dev:client   # Vite dev server only
npm run dev:server   # Express API server only (port 3001)
```

Open http://localhost:5173. With demo mode left on (the default), every panel works immediately. Open the **API Keys** panel to enter keys, choose an LLM provider, and turn demo mode off for live data.

### Build

```bash
npm run build        # production build into dist/
npm run preview      # serve the production build locally
```

## Usage

The app is driven entirely through the UI tabs:

- **SM Scanner** — pick a chain and view netflows, DEX trades, and holdings.
- **Wallet Roaster** — enter an address to fetch its profile and generate a summary.
- **Agent Arena** — choose a token and run the multi-persona debate.
- **Alpha Briefing** — generate an aggregated market briefing.
- **Mission Feed / Alerts** — start the autonomous loop to scan on an interval and raise alerts.
- **CLI Feed** — inspect the exact data calls being made.

## Status

Working MVP. The React + Vite frontend and the local Express dev server (`server.js`) are functional, and demo mode provides a complete, usable experience without any keys. Live mode works when a valid data API key and an LLM key are supplied.

Known gaps:

- `vercel.json` references a serverless function at `api/nansen.js`, but that file is not present in the repo. Local development uses `server.js` instead; a Vercel deployment of the API routes would require adding the matching serverless function(s).
- There are no automated tests.

## License

No license specified.
