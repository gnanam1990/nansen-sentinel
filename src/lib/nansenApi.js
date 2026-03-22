// Nansen CLI API Bridge + Multi-LLM Provider Support
// Calls local dev server which proxies to Nansen CLI + LLM providers
// Falls back to rich mock data when API key not configured

const BASE = '/api'

// Global Nansen config — set via setNansenKey()
let nansenApiKey = ''
let _demoMode = true
let _creditsExhausted = false

export function setNansenKey(key) {
  nansenApiKey = key || ''
  // Reset credit flag when key changes (user may have topped up)
  _creditsExhausted = false
}

export function setDemoMode(val) {
  _demoMode = !!val
}

export function isDemoMode() {
  return _demoMode
}

export function isCreditsExhausted() {
  return _creditsExhausted
}

// Global LLM config — set by KeysModal via setLLMConfig()
let llmConfig = {
  provider: 'anthropic',
  apiKey: '',
  model: '',
  baseUrl: '',
}

export function setLLMConfig(config) {
  llmConfig = { ...llmConfig, ...config }
}

export function getLLMConfig() {
  return { ...llmConfig }
}

export async function nansenCli(command, params = {}) {
  // If demo mode or no API key, return mock data immediately
  if (_demoMode || !nansenApiKey) {
    return getMockData(command, params)
  }

  // Stop calling if credits are already exhausted
  if (_creditsExhausted) {
    throw new Error('Nansen API credits exhausted. Top up at app.nansen.ai or switch to Demo Mode.')
  }

  try {
    const res = await fetch(`${BASE}/nansen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, params, apiKey: nansenApiKey })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.success === false) {
      // Detect credit exhaustion and stop all future calls
      if (data.code === 'NO_CREDITS' || data.error?.includes('Insufficient credits')) {
        _creditsExhausted = true
        throw new Error('Nansen API credits exhausted. Top up at app.nansen.ai or switch to Demo Mode.')
      }
      if (data.code === 'RATE_LIMITED') {
        throw new Error('Nansen API rate limited. Please wait a moment and try again.')
      }
      console.warn('[nansenApi] API returned error:', command, data.error)
      throw new Error(data.error || 'Nansen API error')
    }
    return data
  } catch (e) {
    console.warn('[nansenApi] Error:', command, e.message)
    throw e
  }
}

export async function claudeStream(systemPrompt, userContent, onChunk, options = {}) {
  // If demo mode or no AI key (and not ollama), use mock
  const hasKey = llmConfig.provider === 'ollama' || !!llmConfig.apiKey
  if (_demoMode || !hasKey) {
    await mockStream(getMockAiResponse(systemPrompt, options.mock_key), onChunk)
    return
  }

  try {
    const res = await fetch(`${BASE}/claude-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userContent,
        provider: llmConfig.provider,
        apiKey: llmConfig.apiKey,
        model: llmConfig.model,
        baseUrl: llmConfig.baseUrl,
        ...options
      })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let gotText = false
    let streamError = null
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) { onChunk(data.text); gotText = true }
            if (data.error) { streamError = data.error }
          } catch {}
        }
      }
    }
    if (!gotText && streamError) {
      throw new Error(streamError)
    }
  } catch (e) {
    console.error('[claudeStream] Error:', e.message)
    throw e
  }
}

async function mockStream(text, onChunk) {
  const words = text.split(' ')
  for (const word of words) {
    await sleep(30 + Math.random() * 40)
    onChunk(word + ' ')
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── MOCK DATA ────────────────────────────────────────────────────────────────

// Simple hash from address string to generate per-wallet variation
function addrSeed(addr) {
  if (!addr) return 0.5
  let h = 0
  for (let i = 0; i < addr.length; i++) h = ((h << 5) - h + addr.charCodeAt(i)) | 0
  return (Math.abs(h) % 1000) / 1000  // 0.0 - 0.999
}

function getMockData(command, params) {
  const chain = params.chain || 'ethereum'
  const s = addrSeed(params.address)  // wallet-specific seed
  const mocks = {
    'sm-netflow': {
      success: true,
      data: {
        chain,
        timeframe: params.timeframe || '24h',
        net_flow_usd: 142_800_000,
        inflow_usd: 289_400_000,
        outflow_usd: 146_600_000,
        sm_wallets_active: 2847,
        tokens: [
          { symbol: 'SOL',  address: 'So1111...111112', net_flow_usd:  48_200_000, inflow: 62_000_000, outflow: 13_800_000, sm_wallets: 412, change_pct: 4.2 },
          { symbol: 'JUP',  address: 'JUPyiw...piFsk',  net_flow_usd:  12_700_000, inflow: 18_400_000, outflow:  5_700_000, sm_wallets: 187, change_pct: 8.7 },
          { symbol: 'PYTH', address: 'HZ1JovN...oze5Q',  net_flow_usd:   8_100_000, inflow: 10_200_000, outflow:  2_100_000, sm_wallets:  93, change_pct: 3.1 },
          { symbol: 'JTO',  address: 'jtojtom...8Nrgh',  net_flow_usd:   5_400_000, inflow:  6_800_000, outflow:  1_400_000, sm_wallets:  61, change_pct: 6.9 },
          { symbol: 'WIF',  address: 'EKpQGS...8DNBM',   net_flow_usd:  -3_400_000, inflow:  2_100_000, outflow:  5_500_000, sm_wallets:  64, change_pct: -2.4 },
          { symbol: 'BONK', address: 'DezXAZ...2L2KqW',  net_flow_usd:  -7_200_000, inflow:  4_300_000, outflow: 11_500_000, sm_wallets: 201, change_pct: -5.1 },
          { symbol: 'RNDR', address: '7iSSy1...iPvyJr',  net_flow_usd:   5_900_000, inflow:  8_100_000, outflow:  2_200_000, sm_wallets:  78, change_pct: 2.8 },
          { symbol: 'DRIFT','address': 'DRIFT1...xPqRs',  net_flow_usd:   3_800_000, inflow:  4_900_000, outflow:  1_100_000, sm_wallets:  45, change_pct: 11.2 },
        ]
      }
    },
    'token-screener': {
      success: true,
      data: {
        chain,
        tokens: [
          { symbol: 'SOL',   price_usd: 148.42, change_24h: 4.2,  sm_score: 94, volume_usd: 2_840_000_000, holder_count: 8_420_000 },
          { symbol: 'JUP',   price_usd:   0.84,  change_24h: 8.7,  sm_score: 89, volume_usd:   480_000_000, holder_count:   920_000 },
          { symbol: 'PYTH',  price_usd:   0.31,  change_24h: 3.1,  sm_score: 87, volume_usd:   124_000_000, holder_count:   440_000 },
          { symbol: 'JTO',   price_usd:   2.14,  change_24h: 6.9,  sm_score: 82, volume_usd:    92_000_000, holder_count:   280_000 },
          { symbol: 'DRIFT', price_usd:   0.58,  change_24h: 11.2, sm_score: 79, volume_usd:    48_000_000, holder_count:   140_000 },
          { symbol: 'WIF',   price_usd:   1.82,  change_24h: -2.4, sm_score: 61, volume_usd:   320_000_000, holder_count:   680_000 },
          { symbol: 'BONK',  price_usd: 0.000018, change_24h: -5.1, sm_score: 44, volume_usd:  182_000_000, holder_count: 1_200_000 },
        ]
      }
    },
    'sm-dex-trades': {
      success: true,
      data: {
        chain,
        trades: [
          { wallet: '0x3f4a...9b2c', label: 'Smart Money',    action: 'buy',  token: 'SOL',  amount_usd: 2_400_000, timestamp: Date.now() - 180000 },
          { wallet: '8xKm...3pQr',   label: 'Whale',          action: 'buy',  token: 'JUP',  amount_usd:   880_000, timestamp: Date.now() - 420000 },
          { wallet: '0x7c1b...4d8e', label: 'Smart Money',    action: 'sell', token: 'BONK', amount_usd: 1_100_000, timestamp: Date.now() - 600000 },
          { wallet: 'DeFi...7xLp',   label: 'VC Fund',        action: 'buy',  token: 'PYTH', amount_usd:   340_000, timestamp: Date.now() - 720000 },
          { wallet: '0x2a9c...8f1d', label: 'Whale',          action: 'sell', token: 'WIF',  amount_usd:   620_000, timestamp: Date.now() - 900000 },
          { wallet: 'WMute...3kPq',  label: 'Wintermute',     action: 'buy',  token: 'JUP',  amount_usd: 4_200_000, timestamp: Date.now() - 1200000 },
          { wallet: 'Jump...9xRt',   label: 'Jump Crypto',    action: 'buy',  token: 'PYTH', amount_usd:   920_000, timestamp: Date.now() - 1800000 },
        ]
      }
    },
    'sm-holdings': {
      success: true,
      data: {
        chain,
        wallets: [
          { address: '0x3f4a...9b2c', label: 'Smart Money',  top_token: 'SOL',  value_usd: 4_800_000,  change_24h: 4.2 },
          { address: 'WMute...3kPq',  label: 'Wintermute',   top_token: 'JUP',  value_usd: 48_000_000, change_24h: 18.4 },
          { address: 'Jump...9xRt',   label: 'Jump Crypto',  top_token: 'PYTH', value_usd: 92_000_000, change_24h: 12.1 },
          { address: '8xKm...3pQr',   label: 'Whale',        top_token: 'SOL',  value_usd: 12_400_000, change_24h: -1.2 },
          { address: 'DeFi...7xLp',   label: 'VC Fund',      top_token: 'PYTH', value_usd: 24_000_000, change_24h: 6.9 },
        ]
      }
    },
    'profiler-balance': {
      success: true,
      data: {
        address: params.address || '0xd8dA...96045',
        balance_usd: Math.floor(200_000 + s * 18_000_000),
        eth_balance: Math.floor(20 + s * 4800),
        token_count: Math.floor(3 + s * 24),
        chain_count: Math.floor(1 + s * 6),
        labels: s > 0.7 ? ['Smart Money', 'ETH Early Adopter'] : s > 0.4 ? ['Active Trader', 'DeFi User'] : ['Retail Trader'],
        top_tokens: [
          { symbol: 'ETH',  value_usd: Math.floor(100_000 + s * 8_000_000), pct: Math.floor(40 + s * 30) },
          { symbol: s > 0.5 ? 'USDC' : 'USDT', value_usd: Math.floor(50_000 + s * 2_000_000), pct: Math.floor(10 + s * 15) },
          { symbol: s > 0.6 ? 'UNI' : 'LINK', value_usd: Math.floor(20_000 + s * 800_000), pct: Math.floor(5 + s * 12) },
        ]
      }
    },
    'profiler-pnl': {
      success: true,
      data: {
        address: params.address,
        pnl_30d:      Math.floor(-200_000 + s * 3_000_000),
        pnl_all_time: Math.floor(-500_000 + s * 60_000_000),
        win_rate:     +(0.35 + s * 0.35).toFixed(2),
        total_trades: Math.floor(50 + s * 15000),
        best_trade:   s > 0.5 ? 'ETH 2020 — +$12M' : 'SOL 2023 — +$840K',
        worst_trade:  s > 0.5 ? 'LUNA 2022 — -$180K' : 'FTT 2022 — -$42K',
        avg_hold_days: Math.floor(2 + s * 90)
      }
    },
    'profiler-txs': {
      success: true,
      data: {
        address: params.address,
        total_count: 8847,
        transactions: [
          { hash: '0x3f4a...', type: 'swap',     token_in: 'USDC', token_out: 'ETH',  amount_usd: 240000, timestamp: Date.now() - 86400000 },
          { hash: '0x8b2c...', type: 'transfer', token_in: 'ETH',  token_out: null,   amount_usd: 50000,  timestamp: Date.now() - 172800000 },
          { hash: '0x1d4e...', type: 'swap',     token_in: 'ETH',  token_out: 'UNI',  amount_usd: 120000, timestamp: Date.now() - 259200000 },
        ]
      }
    },
    'profiler-tags': {
      success: true,
      data: {
        address: params.address,
        labels: s > 0.7 ? ['Smart Money', 'ETH Early Adopter', 'DeFi Power User']
              : s > 0.4 ? ['Active Trader', 'NFT Collector']
              : ['Retail', 'Low Activity'],
        risk_score: Math.floor(10 + s * 60),
        entity_name: null
      }
    },
    'profiler-connected': {
      success: true,
      data: {
        address: params.address,
        connected_wallets: s > 0.6
          ? [
              { address: '0xab12...', label: 'Smart Money',  relationship: 'sent_from', amount_usd: Math.floor(500_000 + s * 5_000_000) },
              { address: '0xcd34...', label: 'DeFi Protocol', relationship: 'sent_to',   amount_usd: Math.floor(50_000 + s * 1_000_000) },
              { address: '0xef56...', label: 'CEX Deposit',   relationship: 'sent_to',   amount_usd: Math.floor(100_000 + s * 800_000)  },
            ]
          : [
              { address: '0x1234...', label: 'CEX Withdrawal', relationship: 'sent_from', amount_usd: Math.floor(10_000 + s * 200_000) },
            ]
      }
    },
    'perp': {
      success: true,
      data: {
        symbol: params.symbol || 'SOL',
        exchange: 'Hyperliquid',
        open_interest_usd: 892_000_000,
        funding_rate: 0.0042,
        long_ratio: 0.62,
        short_ratio: 0.38,
        volume_24h: 2_840_000_000,
        price: params.symbol === 'BTC' ? 67420 : params.symbol === 'ETH' ? 3840 : 148.42
      }
    },
    'token-holders': {
      success: true,
      data: {
        token: params.address || 'PYTH',
        total_holders: 440000,
        top_holders: [
          { rank: 1, address: 'Jump...9xRt',  label: 'Jump Crypto',  pct: 8.2, change_24h: +2.1 },
          { rank: 2, address: 'DeFi...7xLp',  label: 'VC Fund',      pct: 4.8, change_24h: +1.4 },
          { rank: 3, address: '0x3f4a...9b2c', label: 'Smart Money', pct: 2.1, change_24h: +0.8 },
        ]
      }
    }
  }

  return mocks[command] || { success: true, data: { message: 'Mock data for: ' + command } }
}

function getMockAiResponse(systemPrompt, mock_key) {
  const isRoast = systemPrompt?.toLowerCase().includes('roast') || mock_key === 'roast'
  const isAnalyst = mock_key === 'analyst'
  const isBull = mock_key === 'bull'
  const isBear = mock_key === 'bear'
  const isDegen = mock_key === 'degen'
  const isVerdict = mock_key === 'verdict'
  const isBriefing = mock_key === 'briefing'
  const isSignal = mock_key === 'signal'
  const isStalker = mock_key === 'stalker'

  if (isRoast) return `Congratulations on having a wallet. With a 61% win rate and $4.82M portfolio, you've somehow managed to be simultaneously impressive and deeply mediocre. You've panic-sold the bottom not once, not twice, but on multiple occasions documented on-chain for all eternity. You're labeled "Smart Money" by Nansen, which is generous — Nansen clearly has a generous definition. Your connected wallets suggest you at least know people who know what they're doing, which is the most important skill in crypto. Reputation Score: 74/100 — Accidental Genius Who Survived Their Own Decisions.`

  if (isAnalyst) return `Portfolio Analysis: Total value $4.82M (+$1.2M 30D PnL). Win rate 61% — above SM benchmark of 54%. Nansen classification: Smart Money. Portfolio allocation: ETH 66%, USDC 17%, UNI 10%, other 7%. Risk profile: MEDIUM. Concentration in ETH ecosystem creates correlated drawdown risk. 14 connected wallets suggest institutional network access. Recommendation: Consider rotating 15-20% into Solana ecosystem given current SM signal strength. Hold core ETH position.`

  if (isBull) return `Smart money accumulation signal is CONFIRMED. Net inflows of $48M+ from 400+ labeled SM wallets in 24h. Wintermute opened their first ever position in this token at scale — when MM desks take directional bets, follow them. VC fund wallets quietly averaging in across 14 separate transactions (stealth mode). Hyperliquid OI building bullishly with funding positive but not extreme. This is the pre-pump phase. Institutional rotation is real. Strong conviction: accumulate before CT discovers this.`

  if (isBear) return `Every exit ramp looks like accumulation until it isn't. This token has already run significantly from lows — latecomers are providing exit liquidity for early smart money. The "Wintermute entry" narrative is exactly the kind of signal they want circulating before they dump into retail FOMO. Funding rate positive = longs getting squeezed risk. Multiple whale wallets showing distribution into retail strength on correlated tokens. Risk is ELEVATED. Wait for -20% pullback or clear re-accumulation base before entry.`

  if (isDegen) return `bro the number go up. volume spike = green candle incoming. nansen green = we're all gonna make it. already aped my entire portfolio in. not selling til 10x or i'm eating ramen. fundamentals are for people who don't have enough risk tolerance. gm ser. this is definitely financial advice. lfg`

  if (isVerdict) return `After weighing all arguments: Bull case wins on data quality — 400+ SM wallets accumulating is a hard signal that outweighs narrative concerns. Bear case correctly identifies distribution risk in related tokens. Degen case was entertaining. VERDICT: CAUTIOUS BUY with 68% confidence. Suggested sizing: 3-5% of portfolio. Hard stop loss at -15%. Take partial profits at +25%. Do not FOMO in above current price if it runs 10%+ before you can enter.`

  if (isBriefing) return `SENTINEL ALPHA BRIEFING — ${new Date().toUTCString()}\n\nMARKET PULSE\nOn-chain conditions: RISK-ON. Net SM inflow $212M in 24h — highest in 18 days. Solana ecosystem seeing most concentrated institutional activity. ETH mainnet quiet as capital rotates to Solana DeFi.\n\nTOP SMART MONEY MOVES\n> Wintermute opened $4.2M JUP position at $0.84 — first ever JUP entry\n> Jump Crypto wallets accumulated 280K PYTH across 14 stealth transactions\n> 3 fresh wallets funded from known VC address deployed into DRIFT pools\n\nTOKENS TO WATCH\nPYTH — SM accumulation 5x above baseline, zero CT coverage, low float\nJTO — Quiet VC accumulation 4 days, setup mirrors pre-JUP-pump pattern\nDRIFT — Fresh wallet clustering + volume spike, possible announcement incoming\n\nRISK FLAGS\nBONK/WIF: Heavy SM distribution into retail buyers. Classic exit liquidity.\nETH perp OI: $12.4B with rising funding — leveraged long squeeze risk if ETH -8%\n3 whale wallets received stables but haven't deployed — sell pressure pending\n\nDEGEN PLAYS (HIGH RISK)\nSOL perpetual on Hyperliquid — momentum + funding still favorable\nDRIFT spot — if the pattern holds, 48-72h window before CT discovers\n\nONE-LINE SUMMARY\nSolana smart money is in full accumulation mode on SOL/JUP/PYTH/JTO. Institutional rotation confirmed. Size into strength, exit BONK/WIF, watch PYTH for the first big move.`

  if (isSignal) return `Latest Nansen CLI scan identified 3 high-confidence signals: (1) PYTH showing 5x SM accumulation above 30-day baseline with zero CT coverage — optimal entry window; (2) Wintermute entered JUP for the first time — smart money degen play confirmed; (3) BONK/WIF SM wallets distributing into retail strength — avoid these entirely.`

  if (isStalker) return `Whale Stalker activated. Target wallet is currently holding $48M across 8 tokens. Primary exposure: SOL (68%), ETH (22%). Last active 4 hours ago — USDC withdrawal of $2.4M to unknown address. Monitoring for deployment. Historical pattern: this wallet deploys within 24-48h of large USDC withdrawals. Alert threshold set.`

  return `Analysis complete. Signal identified with high confidence based on Nansen CLI data across ${Math.floor(Math.random()*3)+3} chains. Smart money activity elevated. Recommend monitoring closely in the next 12-24 hours.`
}
