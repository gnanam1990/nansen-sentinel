// Local development server — Express backend on port 3001
// Replaces Vercel serverless functions for local dev
// Supports: Nansen REST API v1 proxy + Multi-LLM streaming (Claude, OpenAI, Kimi, Ollama)

import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001
const NANSEN_BASE = 'https://api.nansen.ai/api/v1'

// Quote/settlement assets — when one side of a DEX trade is one of these, the
// "interesting" token is the other side, and the trade direction is determined
// relative to it (bought the token => BUY, sold the token => SELL).
const QUOTE_TOKENS = new Set([
  'USDC', 'USDT', 'DAI', 'TUSD', 'USDE', 'FDUSD', 'BUSD', 'USDP', 'PYUSD', 'GUSD',
  'ETH', 'WETH', 'BTC', 'WBTC', 'CBBTC', 'SOL', 'WSOL', 'BNB', 'WBNB', 'MATIC', 'WMATIC',
])

// Classify a DEX trade into a direction + the token of interest.
// The Nansen dex-trades schema always populates both token_bought_symbol and
// token_sold_symbol and provides no explicit buy/sell field, so we derive it.
function classifyDexTrade(t) {
  const bought = t.token_bought_symbol || ''
  const sold = t.token_sold_symbol || ''
  const boughtIsQuote = QUOTE_TOKENS.has(bought.toUpperCase())
  const soldIsQuote = QUOTE_TOKENS.has(sold.toUpperCase())

  // Bought a real token using a quote asset => accumulation (BUY of `bought`).
  if (soldIsQuote && !boughtIsQuote) return { action: 'BUY', token: bought }
  // Sold a real token for a quote asset => distribution (SELL of `sold`).
  if (boughtIsQuote && !soldIsQuote) return { action: 'SELL', token: sold }
  // Token-for-token (or quote-for-quote): treat the bought side as the position
  // being entered, which matches how the trade is conventionally read.
  return { action: 'BUY', token: bought || sold }
}

app.use(cors())
app.use(express.json())

// ── NANSEN REST API v1 PROXY ──────────────────────────────────────────────

// Helper: call Nansen REST API
async function nansenFetch(endpoint, body, apiKey) {
  console.log(`[nansen] POST ${endpoint}`, JSON.stringify(body).slice(0, 200))
  const response = await fetch(`${NANSEN_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
    body: JSON.stringify(body),
  })
  const creditsUsed = response.headers.get('x-nansen-credits-used')
  const creditsRemaining = response.headers.get('x-nansen-credits-remaining')
  if (creditsUsed) console.log(`[nansen] Credits used: ${creditsUsed}, remaining: ${creditsRemaining}`)
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Nansen API ${response.status}: ${errText}`)
  }
  return response.json()
}

// Build Nansen API request from command + params
function buildNansenRequest(command, params) {
  const chain = params.chain || 'ethereum'
  const limit = params.limit ? parseInt(params.limit) : 10
  const timeframe = params.timeframe || '24h'

  switch (command) {
    case 'sm-netflow':
      return {
        endpoint: '/smart-money/netflow',
        body: {
          chains: [chain],
          filters: { include_native_tokens: true, include_stablecoins: false },
          pagination: { page: 1, per_page: limit },
          order_by: [{ field: 'net_flow_24h_usd', direction: 'DESC' }],
        },
      }

    case 'token-screener':
      return {
        endpoint: '/token-screener',
        body: {
          chains: [chain],
          timeframe,
          pagination: { page: 1, per_page: limit },
          order_by: [{ field: 'volume', direction: 'DESC' }],
        },
      }

    case 'sm-dex-trades':
      return {
        endpoint: '/smart-money/dex-trades',
        body: {
          chains: [chain],
          pagination: { page: 1, per_page: limit },
          order_by: [{ field: 'block_timestamp', direction: 'DESC' }],
        },
      }

    case 'sm-holdings':
      return {
        endpoint: '/smart-money/holdings',
        body: {
          chains: [chain],
          pagination: { page: 1, per_page: limit },
          order_by: [{ field: 'value_usd', direction: 'DESC' }],
        },
      }

    case 'profiler-balance':
      return {
        endpoint: '/profiler/address/current-balance',
        body: {
          address: params.address,
          chain: chain === 'all' ? 'all' : chain,
          hide_spam_token: true,
          pagination: { page: 1, per_page: 20 },
          order_by: [{ field: 'value_usd', direction: 'DESC' }],
        },
      }

    case 'profiler-pnl': {
      const now = new Date()
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return {
        endpoint: '/profiler/address/pnl-summary',
        body: {
          address: params.address,
          chain: chain === 'all' ? 'all' : chain,
          date: {
            from: from.toISOString().split('T')[0],
            to: now.toISOString().split('T')[0],
          },
        },
      }
    }

    case 'profiler-txs': {
      const now2 = new Date()
      const from2 = new Date(now2)
      from2.setDate(from2.getDate() - 30)
      return {
        endpoint: '/profiler/address/transactions',
        body: {
          address: params.address,
          chain: chain === 'all' ? 'all' : chain,
          date: {
            from: from2.toISOString().split('T')[0],
            to: now2.toISOString().split('T')[0],
          },
          pagination: { page: 1, per_page: limit },
          order_by: [{ field: 'block_timestamp', direction: 'DESC' }],
        },
      }
    }

    case 'profiler-tags':
      return {
        endpoint: '/profiler/address/labels',
        body: {
          address: params.address,
          chain: chain === 'all' ? 'all' : chain,
          pagination: { page: 1, per_page: 50 },
        },
      }

    case 'profiler-connected':
      return {
        endpoint: '/profiler/address/related-wallets',
        body: {
          address: params.address,
          chain: chain === 'all' ? 'ethereum' : chain,
          pagination: { page: 1, per_page: limit },
        },
      }

    case 'perp':
      return {
        endpoint: '/smart-money/perp-trades',
        body: {
          filters: params.symbol ? { token_symbol: params.symbol } : {},
          pagination: { page: 1, per_page: limit },
          order_by: [{ field: 'block_timestamp', direction: 'DESC' }],
        },
      }

    case 'token-holders':
      return {
        endpoint: '/tgm/token-information',
        body: {
          chain: chain,
          token_address: params.address || params.symbol || '',
          timeframe: '1d',
        },
      }

    default:
      return null
  }
}

// Transform Nansen API response to match what frontend components expect
function transformResponse(command, apiData, params) {
  const chain = params.chain || 'ethereum'

  switch (command) {
    case 'sm-netflow': {
      const tokens = (apiData.data || []).map(t => ({
        symbol: t.token_symbol,
        address: t.token_address,
        net_flow_usd: t.net_flow_24h_usd || 0,
        net_flow_7d: t.net_flow_7d_usd || 0,
        net_flow_1h: t.net_flow_1h_usd || 0,
        sm_wallets: t.trader_count || 0,
        market_cap_usd: t.market_cap_usd || 0,
        chain: t.chain || chain,
      }))
      const netFlowTotal = tokens.reduce((sum, t) => sum + t.net_flow_usd, 0)
      const smWalletsTotal = tokens.reduce((sum, t) => sum + t.sm_wallets, 0)
      return {
        success: true,
        data: {
          chain,
          timeframe: params.timeframe || '24h',
          net_flow_usd: netFlowTotal,
          sm_wallets_active: smWalletsTotal,
          tokens,
        },
      }
    }

    case 'token-screener':
      return {
        success: true,
        data: {
          chain,
          tokens: (apiData.data || []).map(t => ({
            symbol: t.token_symbol,
            price_usd: t.price_usd || 0,
            change_24h: t.price_change || 0,
            volume_usd: t.volume || 0,
            market_cap_usd: t.market_cap_usd || 0,
            liquidity: t.liquidity || 0,
            nof_traders: t.nof_traders || 0,
            nof_buyers: t.nof_buyers || 0,
            nof_sellers: t.nof_sellers || 0,
            netflow: t.netflow || 0,
            chain: t.chain || chain,
          })),
        },
      }

    case 'sm-dex-trades':
      return {
        success: true,
        data: {
          chain,
          trades: (apiData.data || []).map(t => {
            const { action, token } = classifyDexTrade(t)
            return {
              wallet: t.trader_address,
              label: t.trader_address_label || 'Smart Money',
              action,
              token,
              token_bought: t.token_bought_symbol,
              token_sold: t.token_sold_symbol,
              amount_usd: t.trade_value_usd || 0,
              timestamp: t.block_timestamp,
              chain: t.chain || chain,
            }
          }),
        },
      }

    case 'sm-holdings':
      return {
        success: true,
        data: {
          chain,
          wallets: (apiData.data || []).map(t => ({
            address: t.wallet_address || t.token_address,
            label: t.wallet_label || t.token_symbol || 'Smart Money',
            top_token: t.token_symbol,
            value_usd: t.value_usd || 0,
            change_24h: t.balance_24h_percent_change || 0,
            holders_count: t.holders_count || 0,
            share_pct: t.share_of_holdings_percent || 0,
            market_cap_usd: t.market_cap_usd || 0,
            chain: t.chain || chain,
          })),
        },
      }

    case 'profiler-balance': {
      const tokens = apiData.data || []
      const totalUsd = tokens.reduce((sum, t) => sum + (t.value_usd || 0), 0)
      return {
        success: true,
        data: {
          address: params.address,
          balance_usd: totalUsd,
          token_count: tokens.length,
          top_tokens: tokens.slice(0, 10).map(t => ({
            symbol: t.token_symbol,
            name: t.token_name,
            value_usd: t.value_usd || 0,
            amount: t.token_amount || 0,
            price_usd: t.price_usd || 0,
            pct: totalUsd > 0 ? ((t.value_usd || 0) / totalUsd * 100) : 0,
            chain: t.chain || chain,
          })),
        },
      }
    }

    case 'profiler-pnl':
      return {
        success: true,
        data: {
          address: params.address,
          realized_pnl_usd: apiData.realized_pnl_usd || 0,
          realized_pnl_percent: apiData.realized_pnl_percent || 0,
          win_rate: apiData.win_rate || 0,
          traded_times: apiData.traded_times || 0,
          traded_token_count: apiData.traded_token_count || 0,
          top5_tokens: (apiData.top5_tokens || []).map(t => ({
            symbol: t.token_symbol,
            realized_pnl: t.realized_pnl || 0,
            realized_roi: t.realized_roi || 0,
            chain: t.chain || chain,
          })),
        },
      }

    case 'profiler-txs':
      return {
        success: true,
        data: {
          address: params.address,
          transactions: (apiData.data || []).map(t => ({
            hash: t.transaction_hash,
            method: t.method,
            volume_usd: t.volume_usd || 0,
            timestamp: t.block_timestamp,
            source_type: t.source_type,
            tokens_sent: t.tokens_sent || [],
            tokens_received: t.tokens_received || [],
            chain: t.chain || chain,
          })),
        },
      }

    case 'profiler-tags':
      return {
        success: true,
        data: {
          address: params.address,
          labels: (apiData.data || []).map(l => l.label || l),
          categories: (apiData.data || []).map(l => ({ label: l.label, category: l.category })),
        },
      }

    case 'profiler-connected':
      return {
        success: true,
        data: {
          address: params.address,
          connected_wallets: (apiData.data || []).map(w => ({
            address: w.address,
            label: w.address_label || null,
            relation: w.relation,
            chain: w.chain || chain,
          })),
        },
      }

    case 'perp':
      return {
        success: true,
        data: {
          trades: (apiData.data || []).map(t => ({
            trader: t.trader_address,
            label: t.trader_address_label || 'Smart Money',
            symbol: t.token_symbol,
            side: t.side,
            action: t.action,
            value_usd: t.value_usd || 0,
            price_usd: t.price_usd || 0,
            timestamp: t.block_timestamp,
          })),
        },
      }

    case 'token-holders':
      return {
        success: true,
        data: apiData.data || apiData,
      }

    default:
      return { success: true, data: apiData.data || apiData }
  }
}

// Convert legacy CLI args array to command + params
function parseArgsToCommand(args) {
  // args like ['research', 'sm', 'netflow', '--chain', 'solana', '--limit', '20']
  const ARGS_MAP = {
    'research sm netflow':            'sm-netflow',
    'research token screener':        'token-screener',
    'research sm dex-trades':         'sm-dex-trades',
    'research sm holdings':           'sm-holdings',
    'research profiler balance':      'profiler-balance',
    'research profiler pnl':          'profiler-pnl',
    'research profiler txs':          'profiler-txs',
    'research profiler tags':         'profiler-tags',
    'research profiler connected-wallets': 'profiler-connected',
    'research perp':                  'perp',
    'research token holders':         'token-holders',
  }

  // Extract command parts (before any --flags)
  const cmdParts = []
  const params = {}
  let i = 0
  while (i < args.length && !args[i].startsWith('--')) {
    cmdParts.push(args[i])
    i++
  }
  // Parse --key value pairs
  while (i < args.length) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      params[args[i].slice(2)] = args[i + 1]
      i += 2
    } else {
      i++
    }
  }

  const cmdStr = cmdParts.join(' ')
  const command = ARGS_MAP[cmdStr]
  return { command, params }
}

app.post('/api/nansen', async (req, res) => {
  let { command, params = {}, args, apiKey } = req.body
  const nansenKey = apiKey || process.env.NANSEN_API_KEY

  if (!nansenKey) {
    return res.json({ success: false, error: 'NANSEN_API_KEY not configured', code: 'NO_KEY' })
  }

  // Convert legacy args format to command + params
  if (args && !command) {
    const parsed = parseArgsToCommand(args)
    command = parsed.command
    params = { ...parsed.params, ...params }
  }

  if (!command) {
    return res.status(400).json({ success: false, error: 'Missing command' })
  }

  const request = buildNansenRequest(command, params)
  if (!request) {
    return res.status(400).json({ success: false, error: `Unknown command: ${command}` })
  }

  try {
    const apiData = await nansenFetch(request.endpoint, request.body, nansenKey)
    const transformed = transformResponse(command, apiData, params)
    res.json(transformed)
  } catch (err) {
    console.error(`[nansen ${command} error]`, err.message)
    const code = err.message.includes('403') ? 'NO_CREDITS'
               : err.message.includes('429') ? 'RATE_LIMITED'
               : 'API_ERROR'
    res.json({ success: false, error: err.message, code })
  }
})

// ── LLM PROVIDER HELPERS ────────────────────────────────────────────────────

async function callAnthropicStream(apiKey, systemPrompt, userContent, maxTokens, res) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API ${response.status}: ${err}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'content_block_delta' && data.delta?.text) {
            res.write(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`)
          }
        } catch {}
      }
    }
  }
}

async function callOpenAIStream(apiKey, systemPrompt, userContent, maxTokens, res, baseUrl = 'https://api.openai.com/v1') {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: baseUrl.includes('moonshot') ? 'moonshot-v1-8k' : 'gpt-4o',
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI-compatible API ${response.status}: ${err}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

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
          const text = data.choices?.[0]?.delta?.content
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`)
          }
        } catch {}
      }
    }
  }
}

async function callOllamaStream(systemPrompt, userContent, maxTokens, res, baseUrl = 'http://localhost:11434') {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1',
      stream: true,
      options: { num_predict: maxTokens },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Ollama API ${response.status}: ${err}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (line.trim()) {
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            res.write(`data: ${JSON.stringify({ text: data.message.content })}\n\n`)
          }
        } catch {}
      }
    }
  }
}

// ── LLM STREAMING ENDPOINT ─────────────────────────────────────────────────

app.post('/api/claude-stream', async (req, res) => {
  const { systemPrompt, userContent, max_tokens = 1000, provider = 'anthropic', apiKey, model, baseUrl } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Resolve API key from request or env vars
  const resolvedKey = apiKey
    || (provider === 'openai' ? process.env.OPENAI_API_KEY : null)
    || (provider === 'kimi' ? process.env.KIMI_API_KEY : null)
    || process.env.ANTHROPIC_API_KEY

  if (provider !== 'ollama' && !resolvedKey) {
    res.write(`data: ${JSON.stringify({ error: `No API key configured for ${provider}. Enter your key in API Keys settings.` })}\n\n`)
    res.write('data: [DONE]\n\n')
    return res.end()
  }

  try {
    switch (provider) {
      case 'openai':
        await callOpenAIStream(resolvedKey, systemPrompt, userContent, max_tokens, res)
        break
      case 'kimi':
        await callOpenAIStream(resolvedKey, systemPrompt, userContent, max_tokens, res, 'https://api.moonshot.cn/v1')
        break
      case 'ollama':
        await callOllamaStream(systemPrompt, userContent, max_tokens, res, baseUrl || 'http://localhost:11434')
        break
      case 'anthropic':
      default:
        await callAnthropicStream(resolvedKey, systemPrompt, userContent, max_tokens, res)
        break
    }
  } catch (err) {
    console.error(`[${provider} stream error]`, err.message)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  }

  res.write('data: [DONE]\n\n')
  res.end()
})

// ── LLM NON-STREAMING ENDPOINT ─────────────────────────────────────────────

app.post('/api/claude', async (req, res) => {
  const { systemPrompt, userContent, max_tokens = 1000, provider = 'anthropic', apiKey, model, baseUrl } = req.body

  // Resolve API key from request or env vars
  const resolvedKey = apiKey
    || (provider === 'openai' ? process.env.OPENAI_API_KEY : null)
    || (provider === 'kimi' ? process.env.KIMI_API_KEY : null)
    || process.env.ANTHROPIC_API_KEY

  if (provider !== 'ollama' && !resolvedKey) {
    return res.status(400).json({ error: `No API key configured for ${provider}. Enter your key in API Keys settings.` })
  }

  try {
    let content = ''

    switch (provider) {
      case 'openai':
      case 'kimi': {
        const url = provider === 'kimi' ? 'https://api.moonshot.cn/v1' : 'https://api.openai.com/v1'
        const modelName = provider === 'kimi' ? 'moonshot-v1-8k' : (model || 'gpt-4o')
        const response = await fetch(`${url}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resolvedKey}`
          },
          body: JSON.stringify({
            model: modelName,
            max_tokens: max_tokens,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent }
            ]
          })
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
        content = data.choices?.[0]?.message?.content || ''
        break
      }

      case 'ollama': {
        const url = baseUrl || 'http://localhost:11434'
        const response = await fetch(`${url}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'llama3.1',
            stream: false,
            options: { num_predict: max_tokens },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent }
            ]
          })
        })
        const data = await response.json()
        content = data.message?.content || ''
        break
      }

      case 'anthropic':
      default: {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': resolvedKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model || 'claude-sonnet-4-20250514',
            max_tokens: max_tokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: userContent }]
          })
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error.message)
        content = data.content?.[0]?.text || ''
        break
      }
    }

    res.json({ content })
  } catch (err) {
    console.error(`[${req.body.provider || 'anthropic'} error]`, err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── START ────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`\n  SENTINEL API server running on http://localhost:${PORT}`)
  console.log(`  Endpoints:`)
  console.log(`    POST /api/nansen        — Nansen REST API v1 proxy`)
  console.log(`    POST /api/claude        — LLM (non-streaming)`)
  console.log(`    POST /api/claude-stream  — LLM (streaming SSE)`)
  console.log(`  Providers: Anthropic, OpenAI, Kimi, Ollama\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use.`)
    console.error(`  Kill the other process or run: npx kill-port ${PORT}\n`)
    process.exit(1)
  }
  throw err
})
