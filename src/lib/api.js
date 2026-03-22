/* ═══════════════════════════════════════════════════════════
   lib/api.js — All external API calls
   Nansen CLI (via /api/nansen proxy) + Anthropic Claude
   ═══════════════════════════════════════════════════════════ */

// ── NANSEN CLI ────────────────────────────────────────────────────────────────

export async function nansenCLI(args, nansenKey) {
  try {
    const res = await fetch('/api/nansen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args, apiKey: nansenKey })
    })
    const data = await res.json()
    if (data.success === false) {
      console.warn('[nansenCLI] API error:', data.error)
      // Propagate credit/rate errors so callers can stop
      if (data.code === 'NO_CREDITS' || data.code === 'RATE_LIMITED') {
        data._fatal = true
      }
    }
    return data
  } catch (err) {
    console.error('Nansen CLI error:', err)
    return { success: false, error: err.message }
  }
}

// Specific command helpers
export const nansen = {
  smNetflow: (chain, timeframe = '24h', key) =>
    nansenCLI(['research', 'sm', 'netflow', '--chain', chain, '--timeframe', timeframe, '--limit', '20'], key),

  tokenScreener: (chain, limit = 20, key) =>
    nansenCLI(['research', 'token', 'screener', '--chain', chain, '--limit', String(limit)], key),

  smHoldings: (chain, limit = 15, key) =>
    nansenCLI(['research', 'sm', 'holdings', '--chain', chain, '--limit', String(limit)], key),

  smDexTrades: (chain, limit = 10, key) =>
    nansenCLI(['research', 'sm', 'dex-trades', '--chain', chain, '--limit', String(limit)], key),
}

// ── LLM AI (Multi-provider: Anthropic, OpenAI, Kimi, Ollama) ────────────────

import { getLLMConfig } from './nansenApi.js'

export async function callClaude(systemPrompt, userContent, anthropicKey, maxTokens = 1000) {
  const config = getLLMConfig()

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userContent,
        max_tokens: maxTokens,
        provider: config.provider,
        apiKey: config.apiKey || anthropicKey,
        model: config.model,
        baseUrl: config.baseUrl,
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.content || ''
  } catch (err) {
    console.error('LLM API error:', err)
    throw err
  }
}

// ── CLAUDE PROMPTS ────────────────────────────────────────────────────────────

export const prompts = {

  // Scanner AI summary
  scannerSummary: (data) => ({
    system: `You are SENTINEL, an elite on-chain intelligence analyst. You analyze Nansen smart money data and extract actionable alpha signals. Be direct, specific, and use concrete numbers. Max 3 sentences. No fluff.`,
    user: `Analyze this Nansen CLI smart money data and give a 3-sentence alpha summary with the top signal:

${JSON.stringify(data, null, 2)}

Format: Lead with the single biggest signal, name specific tokens and dollar amounts, end with a watchlist recommendation.`
  }),

  // ReAct agent observe
  agentObserve: (data) => ({
    system: `You are SENTINEL's autonomous observe module. You scan raw Nansen CLI data and identify the single most interesting signal. One sentence only. Be specific with token names and dollar amounts.`,
    user: `What is the single most interesting signal in this data? One sentence, specific numbers:

${JSON.stringify(data, null, 2)}`
  }),

  // ReAct agent report
  agentReport: (findings) => ({
    system: `You are SENTINEL's reporting module. Summarize findings into a crisp, actionable one-sentence alpha signal with confidence level.`,
    user: `Summarize these findings into one actionable signal:

${JSON.stringify(findings, null, 2)}

Format: "[ACTION]: [TOKEN] — [REASON]. Confidence: [HIGH/MEDIUM/LOW]"`
  }),
}

// ── MOCK DATA (for demo mode / free tier fallback) ─────────────────────────────

export const MOCK = {
  smNetflow: (chain) => ({
    success: true,
    data: {
      chain,
      timeframe: '24h',
      net_flow_usd: 142800000 + Math.random() * 20000000,
      sm_wallets_active: Math.floor(2400 + Math.random() * 800),
      tokens: [
        { symbol: 'SOL',  net_flow_usd:  48200000, inflow: 62000000, outflow: 13800000, sm_wallets: 412 },
        { symbol: 'JUP',  net_flow_usd:  12700000, inflow: 18000000, outflow: 5300000,  sm_wallets: 187 },
        { symbol: 'PYTH', net_flow_usd:   8100000, inflow: 10200000, outflow: 2100000,  sm_wallets: 93  },
        { symbol: 'WIF',  net_flow_usd:  -3400000, inflow: 2200000,  outflow: 5600000,  sm_wallets: 64  },
        { symbol: 'BONK', net_flow_usd:  -7200000, inflow: 4100000,  outflow: 11300000, sm_wallets: 201 },
        { symbol: 'JTO',  net_flow_usd:   5100000, inflow: 6800000,  outflow: 1700000,  sm_wallets: 71  },
        { symbol: 'DRIFT',net_flow_usd:   3800000, inflow: 4500000,  outflow: 700000,   sm_wallets: 44  },
        { symbol: 'RNDR', net_flow_usd:   2900000, inflow: 4100000,  outflow: 1200000,  sm_wallets: 38  },
      ]
    }
  }),

  tokenScreener: (chain) => ({
    success: true,
    data: {
      chain,
      tokens: [
        { symbol: 'SOL',   price: 142.80, change_24h: 4.2,  sm_score: 94, volume_usd: 2800000000 },
        { symbol: 'JUP',   price: 0.84,   change_24h: 8.7,  sm_score: 89, volume_usd: 420000000  },
        { symbol: 'PYTH',  price: 0.28,   change_24h: 12.4, sm_score: 91, volume_usd: 180000000  },
        { symbol: 'JTO',   price: 1.92,   change_24h: 6.1,  sm_score: 84, volume_usd: 140000000  },
        { symbol: 'DRIFT', price: 0.61,   change_24h: 18.2, sm_score: 87, volume_usd: 95000000   },
        { symbol: 'WIF',   price: 2.14,   change_24h: -2.8, sm_score: 61, volume_usd: 320000000  },
        { symbol: 'BONK',  price: 0.000024,change_24h: -4.1,sm_score: 48, volume_usd: 280000000  },
        { symbol: 'RNDR',  price: 6.82,   change_24h: 3.3,  sm_score: 76, volume_usd: 210000000  },
      ]
    }
  }),

  smDexTrades: (chain) => ({
    success: true,
    data: {
      chain,
      trades: [
        { wallet: '0x3f4a...9b2c', label: 'Smart Money',    action: 'BUY',  token: 'SOL',  amount_usd: 2400000, timestamp: '2m ago'  },
        { wallet: '8xKm...3pQr',   label: 'Whale',          action: 'BUY',  token: 'JUP',  amount_usd: 880000,  timestamp: '8m ago'  },
        { wallet: '0x7c1b...4d8e', label: 'Smart Money',    action: 'SELL', token: 'BONK', amount_usd: 1100000, timestamp: '14m ago' },
        { wallet: 'DeFi...7xLp',   label: 'VC Fund',        action: 'BUY',  token: 'PYTH', amount_usd: 340000,  timestamp: '21m ago' },
        { wallet: '0x2a9c...8f1d', label: 'Whale',          action: 'SELL', token: 'WIF',  amount_usd: 620000,  timestamp: '35m ago' },
        { wallet: 'Jump...9wQs',   label: 'Jump Crypto',    action: 'BUY',  token: 'PYTH', amount_usd: 1800000, timestamp: '41m ago' },
        { wallet: 'Wint...4mRt',   label: 'Wintermute',     action: 'BUY',  token: 'JUP',  amount_usd: 4200000, timestamp: '1h ago'  },
      ]
    }
  }),

  smHoldings: (chain) => ({
    success: true,
    data: {
      chain,
      wallets: [
        { address: '0x3f4a...9b2c', label: 'Wintermute',  top_token: 'JUP',  value_usd: 4200000, change_24h: 18.4  },
        { address: '8xKm...3pQr',   label: 'Jump Crypto', top_token: 'PYTH', value_usd: 1800000, change_24h: 12.1  },
        { address: '0x7c1b...4d8e', label: 'Smart Money', top_token: 'SOL',  value_usd: 2400000, change_24h: 4.2   },
        { address: 'DeFi...7xLp',   label: 'VC Fund',     top_token: 'JTO',  value_usd: 980000,  change_24h: 6.8   },
        { address: '0x2a9c...8f1d', label: 'Whale',       top_token: 'SOL',  value_usd: 6800000, change_24h: -1.2  },
      ]
    }
  }),
}

// Utility: format numbers (null/NaN safe)
export const fmt = {
  usd: (n) => {
    if (n == null || isNaN(n)) return '$—'
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    if (abs >= 1e9) return `${sign}$${(abs/1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${sign}$${(abs/1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$${(abs/1e3).toFixed(1)}K`
    return `${sign}$${abs.toFixed(2)}`
  },
  pct: (n) => {
    if (n == null || isNaN(n)) return '—'
    const sign = n >= 0 ? '+' : ''
    return `${sign}${Number(n).toFixed(1)}%`
  },
  num: (n) => {
    if (n == null || isNaN(n)) return '—'
    if (Math.abs(n) >= 1e9) return `${(n/1e9).toFixed(2)}B`
    if (Math.abs(n) >= 1e6) return `${(n/1e6).toFixed(2)}M`
    if (Math.abs(n) >= 1e3) return `${(n/1e3).toFixed(1)}K`
    return String(n)
  },
  addr: (a) => a ? `${a.slice(0,8)}...${a.slice(-4)}` : '—',
  time: () => {
    const d = new Date()
    return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`
  }
}
