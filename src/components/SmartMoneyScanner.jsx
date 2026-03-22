import React, { useState, useCallback } from 'react'
import {
  Btn, Card, CardHeader, ChainTabs, Table, TR, TD, Tag,
  StatCard, AIInsight, SkeletonRows, InputGroup, Select
} from './UI'
import { nansen, callClaude, prompts, MOCK, fmt } from '../lib/api'

const CHAINS = ['ethereum','solana','base','bnb','arbitrum']

function tagType(label='') {
  const l = label.toLowerCase()
  if (l.includes('smart')) return 'sm'
  if (l.includes('whale')) return 'whale'
  if (l.includes('vc') || l.includes('fund')) return 'vc'
  if (l.includes('jump') || l.includes('winter')) return 'fund'
  return 'sm'
}

export default function SmartMoneyScanner({ nansenKey, anthropicKey, addLog, demoMode }) {
  const [chain, setChain]         = useState('solana')
  const [timeframe, setTimeframe] = useState('24h')
  const [loading, setLoading]     = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [flowData, setFlowData]   = useState(null)
  const [tradeData, setTradeData] = useState(null)
  const [holdData, setHoldData]   = useState(null)
  const [aiSummary, setAiSummary] = useState('')
  const [scanned, setScanned]     = useState(false)

  const runScan = useCallback(async () => {
    setLoading(true)
    setAiLoading(true)
    setScanned(true)

    const t0 = Date.now()

    try {
      // Call 1: SM Netflow
      let flow, trades, hold
      if (demoMode || !nansenKey) {
        flow   = MOCK.smNetflow(chain)
        trades = MOCK.smDexTrades(chain)
        hold   = MOCK.smHoldings(chain)
        addLog(`nansen research sm netflow --chain ${chain} --timeframe ${timeframe} --limit 20`, flow, 148)
        addLog(`nansen research sm dex-trades --chain ${chain} --limit 10`, trades, 132)
        addLog(`nansen research sm holdings --chain ${chain} --limit 10`, hold, 155)
      } else {
        const [r1, r2, r3] = await Promise.all([
          nansen.smNetflow(chain, timeframe, nansenKey),
          nansen.smDexTrades(chain, 10, nansenKey),
          nansen.smHoldings(chain, 10, nansenKey)
        ])
        flow = r1; trades = r2; hold = r3
        addLog(`nansen research sm netflow --chain ${chain} --timeframe ${timeframe}`, flow, Date.now()-t0)
        addLog(`nansen research sm dex-trades --chain ${chain} --limit 10`, trades, 140)
        addLog(`nansen research sm holdings --chain ${chain} --limit 10`, hold, 155)
      }

      setFlowData(flow?.data)
      setTradeData(trades?.data)
      setHoldData(hold?.data)
      setLoading(false)

      // Call 4: Token screener
      let screener
      if (demoMode || !nansenKey) {
        screener = MOCK.tokenScreener(chain)
        addLog(`nansen research token screener --chain ${chain} --limit 20`, screener, 161)
      } else {
        screener = await nansen.tokenScreener(chain, 20, nansenKey)
        addLog(`nansen research token screener --chain ${chain} --limit 20`, screener, 160)
      }

      // Claude AI summary
      if (anthropicKey) {
        try {
          const { system, user } = prompts.scannerSummary({
            chain, timeframe,
            flows: flow?.data,
            trades: trades?.data,
            screener: screener?.data
          })
          const text = await callClaude(system, user, anthropicKey, 200)
          setAiSummary(text)
        } catch (e) {
          setAiSummary(fallbackSummary(flow?.data, chain))
        }
      } else {
        setAiSummary(fallbackSummary(flow?.data, chain))
      }
      setAiLoading(false)

    } catch (err) {
      setLoading(false)
      setAiLoading(false)
      console.error(err)
    }
  }, [chain, timeframe, nansenKey, anthropicKey, addLog, demoMode])

  const tokens = flowData?.tokens || []
  const trades = tradeData?.trades || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <ChainTabs chains={CHAINS} active={chain} onChange={setChain} />
        <div style={{ flex: 1 }} />
        <InputGroup label="TIMEFRAME">
          <Select value={timeframe} onChange={setTimeframe}>
            <option value="1h">1H</option>
            <option value="6h">6H</option>
            <option value="24h">24H</option>
            <option value="7d">7D</option>
          </Select>
        </InputGroup>
        <Btn variant="primary" onClick={runScan} disabled={loading}>
          {loading ? '⟳ SCANNING...' : '⟳ SCAN NOW'}
        </Btn>
      </div>

      {/* Stats */}
      {scanned && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <StatCard
            label="Net SM Flow"
            value={loading ? '...' : fmt.usd(flowData?.net_flow_usd)}
            sub={`into SM tokens on ${chain}`}
            color="var(--g)"
          />
          <StatCard
            label="Top Inflow"
            value={loading ? '...' : (tokens[0]?.symbol || '—')}
            sub={loading ? '' : fmt.usd(tokens[0]?.net_flow_usd)}
            color="var(--c)"
          />
          <StatCard
            label="SM Wallets Active"
            value={loading ? '...' : fmt.num(flowData?.sm_wallets_active)}
            sub="last 24h"
            color="var(--a)"
          />
          <StatCard
            label="Top Outflow"
            value={loading ? '...' : (tokens.filter(t=>t.net_flow_usd<0)[0]?.symbol || '—')}
            sub="distribution signal"
            color="var(--r)"
          />
        </div>
      )}

      {/* AI Insight */}
      {scanned && <AIInsight text={aiSummary} loading={aiLoading} />}

      {/* Token Hunt Banner */}
      {scanned && !loading && tokens.length > 0 && (
        <div style={{
          background: 'rgba(255,183,0,0.04)',
          border: '1px solid rgba(255,183,0,0.2)',
          borderLeft: '3px solid var(--a)',
          padding: '10px 14px', borderRadius: 1,
          display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: 9, color: 'var(--a)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 1 }}>
            ★ TOKEN HUNT — 10x CANDIDATES
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
            {tokens.filter(t => t.net_flow_usd > 0).slice(0,3).map(t => (
              <span key={t.symbol} style={{ fontSize: 11, color: 'var(--t2)' }}>
                <span style={{ color: 'var(--g)' }}>↑</span>{' '}
                <span style={{ color: 'var(--c)' }}>{t.symbol}</span> — SM inflow {fmt.usd(t.net_flow_usd)}, {t.sm_wallets} wallets
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Two panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Netflow table */}
        <Card>
          <CardHeader title="SM NET FLOWS — TOP MOVERS" dotColor="var(--g)" />
          <Table headers={['TOKEN','NET FLOW','SM WALLETS','SIGNAL']}>
            {loading ? <SkeletonRows cols={4} rows={6} /> :
              tokens.slice(0,8).map(t => (
                <TR key={t.symbol}>
                  <TD><span style={{ color: 'var(--c)', fontWeight: 700 }}>{t.symbol}</span></TD>
                  <TD><span className={t.net_flow_usd >= 0 ? 'pos' : 'neg'}>{fmt.usd(t.net_flow_usd)}</span></TD>
                  <TD>{t.sm_wallets || '—'}</TD>
                  <TD>
                    <Tag type={t.net_flow_usd > 5000000 ? 'sm' : t.net_flow_usd > 0 ? 'vc' : 'degen'}>
                      {t.net_flow_usd > 5000000 ? 'ACCUMULATE' : t.net_flow_usd > 0 ? 'WATCH' : 'EXIT'}
                    </Tag>
                  </TD>
                </TR>
              ))
            }
          </Table>
        </Card>

        {/* DEX Trades */}
        <Card>
          <CardHeader title="LIVE SM DEX TRADES" dotColor="var(--c)" />
          <Table headers={['WALLET','ACTION','AMOUNT','LABEL']}>
            {loading ? <SkeletonRows cols={4} rows={6} /> :
              trades.slice(0,7).map((t, i) => (
                <TR key={i}>
                  <TD><span style={{ color: 'var(--c)', fontFamily: 'var(--mono)' }}>{t.wallet}</span></TD>
                  <TD><span className={t.action?.toLowerCase() === 'buy' ? 'pos' : 'neg'}>{t.action} {t.token}</span></TD>
                  <TD>{fmt.usd(t.amount_usd)}</TD>
                  <TD><Tag type={tagType(t.label)}>{t.label}</Tag></TD>
                </TR>
              ))
            }
          </Table>
        </Card>
      </div>

      {/* SM Holdings */}
      {scanned && (
        <Card>
          <CardHeader title="TOP SM WALLET HOLDINGS" dotColor="var(--p)" />
          <Table headers={['WALLET','LABEL','TOP TOKEN','VALUE','24H CHG']}>
            {loading ? <SkeletonRows cols={5} rows={5} /> :
              (holdData?.wallets || []).map((w, i) => (
                <TR key={i}>
                  <TD><span style={{ color: 'var(--c)' }}>{w.address}</span></TD>
                  <TD><Tag type={tagType(w.label)}>{w.label}</Tag></TD>
                  <TD><span style={{ color: 'var(--c)', fontWeight: 700 }}>{w.top_token}</span></TD>
                  <TD>{fmt.usd(w.value_usd)}</TD>
                  <TD><span className={w.change_24h >= 0 ? 'pos' : 'neg'}>{fmt.pct(w.change_24h)}</span></TD>
                </TR>
              ))
            }
          </Table>
        </Card>
      )}

    </div>
  )
}

function fallbackSummary(data, chain) {
  if (!data?.tokens?.length) return `Scanning ${chain} smart money activity...`
  const top = data.tokens[0]
  const bear = data.tokens.filter(t => t.net_flow_usd < 0)[0]
  return `Smart money is actively accumulating ${top.symbol} on ${chain} with ${fmt.usd(top.net_flow_usd)} net inflow from ${top.sm_wallets} labeled wallets. ${bear ? `Distribution signal active on ${bear.symbol} (${fmt.usd(bear.net_flow_usd)} outflow) — possible exit liquidity trap.` : ''} Watch the top 3 inflow tokens for breakout setups in the next 12-48h.`
}
