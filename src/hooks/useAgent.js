import { useState, useRef, useCallback } from 'react'
import { nansen, callClaude, prompts, MOCK, fmt } from '../lib/api'

const OBSERVE_CHAINS = ['ethereum', 'solana', 'base']

export function useAgent({ nansenKey, anthropicKey, addLog, demoMode }) {

  const [running, setRunning]     = useState(false)
  const [feed, setFeed]           = useState([])
  const [cycles, setCycles]       = useState(0)
  const [signals, setSignals]     = useState(0)
  const [alerts, setAlerts]       = useState([])
  const [topSignal, setTopSignal] = useState(null)
  const timerRef                  = useRef(null)
  const runningRef                = useRef(false)

  const addFeedItem = useCallback((type, title, text, extra = {}) => {
    setFeed(prev => [{
      id: Date.now() + Math.random(),
      type,   // observe | reason | act | report | alert
      title,
      text,
      time: fmt.time(),
      ...extra
    }, ...prev].slice(0, 80))
  }, [])

  const addAlert = useCallback((title, detail, token) => {
    const a = { id: Date.now(), title, detail, token, time: fmt.time() }
    setAlerts(prev => [a, ...prev].slice(0, 50))
    addFeedItem('alert', '⚠ ALERT FIRED — ' + title, detail, { token })
  }, [addFeedItem])

  // ── Single ReAct cycle ──────────────────────────────────────────────────────
  const runCycle = useCallback(async () => {
    if (!runningRef.current) return

    const chain = OBSERVE_CHAINS[Math.floor(Math.random() * OBSERVE_CHAINS.length)]
    const t0 = Date.now()

    try {
      // ─ OBSERVE ─
      addFeedItem('observe', `Scanning ${chain.toUpperCase()} smart money netflows...`,
        `nansen research sm netflow --chain ${chain} --timeframe 24h`)

      const cmd1 = `nansen research sm netflow --chain ${chain} --timeframe 24h`
      let flowData
      if (demoMode || !nansenKey) {
        flowData = MOCK.smNetflow(chain)
        addLog(cmd1, flowData, Date.now() - t0)
      } else {
        const t1 = Date.now()
        flowData = await nansen.smNetflow(chain, '24h', nansenKey)
        addLog(cmd1, flowData, Date.now() - t1)
        if (flowData?._fatal) {
          addFeedItem('alert', 'NANSEN CREDITS EXHAUSTED', flowData.error + ' — Agent stopped. Switch to Demo Mode or top up credits.')
          stop()
          return
        }
      }

      if (!runningRef.current) return

      // ─ OBSERVE (2nd call — dex trades) ─
      const cmd2 = `nansen research sm dex-trades --chain ${chain} --limit 10`
      let tradeData
      if (demoMode || !nansenKey) {
        tradeData = MOCK.smDexTrades(chain)
        addLog(cmd2, tradeData, 145)
      } else {
        const t2 = Date.now()
        tradeData = await nansen.smDexTrades(chain, 10, nansenKey)
        addLog(cmd2, tradeData, Date.now() - t2)
        if (tradeData?._fatal) {
          addFeedItem('alert', 'NANSEN CREDITS EXHAUSTED', tradeData.error + ' — Agent stopped.')
          stop()
          return
        }
      }

      if (!runningRef.current) return

      // ─ REASON ─
      addFeedItem('reason', 'Reasoning about observed patterns...',
        'Analyzing smart money signals across flows and DEX trades...')

      let observation = ''
      if (anthropicKey) {
        try {
          const { system, user } = prompts.agentObserve({ flows: flowData?.data, trades: tradeData?.data })
          observation = await callClaude(system, user, anthropicKey, 150)
        } catch (e) {
          observation = generateFallbackObservation(flowData?.data, chain)
        }
      } else {
        observation = generateFallbackObservation(flowData?.data, chain)
      }

      addFeedItem('reason', 'Pattern analysis complete', observation)

      if (!runningRef.current) return

      // ─ ACT ─ (deep dive on top token)
      const topToken = flowData?.data?.tokens?.[0]?.symbol || 'SOL'
      addFeedItem('act', `Deep dive: ${topToken} signal detected`,
        `nansen research token screener --chain ${chain} (investigating ${topToken})`)

      const cmd3 = `nansen research token screener --chain ${chain} --limit 10`
      let screenerData
      if (demoMode || !nansenKey) {
        screenerData = MOCK.tokenScreener(chain)
        addLog(cmd3, screenerData, 168)
      } else {
        const t3 = Date.now()
        screenerData = await nansen.tokenScreener(chain, 10, nansenKey)
        addLog(cmd3, screenerData, Date.now() - t3)
        if (screenerData?._fatal) {
          addFeedItem('alert', 'NANSEN CREDITS EXHAUSTED', screenerData.error + ' — Agent stopped.')
          stop()
          return
        }
      }

      if (!runningRef.current) return

      // ─ REPORT ─
      let reportText = ''
      if (anthropicKey) {
        try {
          const { system, user } = prompts.agentReport({
            observation,
            flowData: flowData?.data,
            screenerData: screenerData?.data,
            chain
          })
          reportText = await callClaude(system, user, anthropicKey, 120)
        } catch (e) {
          reportText = generateFallbackReport(topToken, flowData?.data)
        }
      } else {
        reportText = generateFallbackReport(topToken, flowData?.data)
      }

      addFeedItem('report', `Cycle complete — signal: ${topToken}`, reportText)

      // ─ Maybe fire alert ─
      const topFlow = flowData?.data?.tokens?.[0]
      if (topFlow && Math.abs(topFlow.net_flow_usd) > 5000000) {
        const isInflow = topFlow.net_flow_usd > 0
        addAlert(
          `${isInflow ? 'ACCUMULATION' : 'DISTRIBUTION'} — ${topFlow.symbol} — ${fmt.usd(Math.abs(topFlow.net_flow_usd))}`,
          `Smart money ${isInflow ? 'buying' : 'selling'} ${topFlow.symbol} with ${fmt.usd(Math.abs(topFlow.net_flow_usd))} net ${isInflow ? 'inflow' : 'outflow'} on ${chain}. ${topFlow.sm_wallets || 0} SM wallets active.`,
          topFlow.symbol
        )
      }

      setCycles(c => c + 1)
      setSignals(s => s + 1)
      setTopSignal(topToken)

    } catch (err) {
      addFeedItem('observe', 'Cycle error — retrying', err.message)
    }

    // Schedule next cycle — longer interval in live mode to conserve API credits
    if (runningRef.current) {
      const interval = demoMode ? 18000 : 60000
      timerRef.current = setTimeout(runCycle, interval)
    }
  }, [nansenKey, anthropicKey, addLog, demoMode, addFeedItem, addAlert])

  const start = useCallback(() => {
    runningRef.current = true
    setRunning(true)
    setFeed([])
    addFeedItem('observe', 'SENTINEL initialized — ReAct loop online',
      'Autonomous agent starting. Observe → Reason → Act → Report cycle active across Ethereum, Solana, Base.')
    runCycle()
  }, [runCycle, addFeedItem])

  const stop = useCallback(() => {
    runningRef.current = false
    setRunning(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    addFeedItem('report', 'Agent stopped by user', `Session summary: ${cycles} cycles, ${signals} signals, ${alerts.length} alerts.`)
  }, [cycles, signals, alerts.length, addFeedItem])

  return { running, feed, cycles, signals, alerts, topSignal, start, stop, addAlert }
}

// Fallback text generators (when no API keys)
function generateFallbackObservation(data, chain) {
  if (!data?.tokens?.length) return `Scanning ${chain} — awaiting data.`
  const top = data.tokens[0]
  const dir = top.net_flow_usd > 0 ? 'accumulating' : 'distributing'
  return `Smart money is ${dir} ${top.symbol} with ${fmt.usd(Math.abs(top.net_flow_usd))} net flow on ${chain}. ${data.sm_wallets_active || 0} active SM wallets detected this cycle.`
}

function generateFallbackReport(token, data) {
  const wallets = data?.sm_wallets_active || 0
  return `ACCUMULATE: ${token} — Smart money positioning detected across ${wallets} labeled wallets. Signal consistent with pre-move accumulation pattern. Confidence: MEDIUM`
}
