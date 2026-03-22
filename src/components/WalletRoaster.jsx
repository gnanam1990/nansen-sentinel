import React, { useState } from 'react'
import { nansenCli, claudeStream } from '../lib/nansenApi.js'

// Safe formatters — never return NaN or undefined
const safe = {
  usd: (n) => {
    if (n == null || isNaN(n)) return '$—'
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    if (abs >= 1e9) return `${sign}$${(abs/1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${sign}$${(abs/1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$${(abs/1e3).toFixed(1)}K`
    return `${sign}$${abs.toFixed(2)}`
  },
  pct: (n) => (n != null && !isNaN(n)) ? `${(n * 100).toFixed(0)}%` : '—',
  num: (n) => (n != null && !isNaN(n)) ? n.toLocaleString() : '—',
  val: (n, fallback = '—') => (n != null && n !== undefined) ? String(n) : fallback,
}

export default function WalletRoaster({ nansenKey, anthropicKey, addLog, demoMode, onStalker }) {
  const [address, setAddress] = useState('')
  const [mode,    setMode]    = useState('roast')
  const [loading, setLoading] = useState(false)
  const [data,    setData]    = useState(null)
  const [aiText,  setAiText]  = useState('')
  const [streaming,setStreaming]= useState(false)
  const [stalkerOn,setStalkerOn]= useState(false)

  async function run() {
    if (!address.trim()) return
    setLoading(true); setAiText(''); setData(null)

    const addr = address.trim()
    const cmds = [
      ['profiler-balance',   { address: addr }, `nansen research profiler balance --address ${addr}`],
      ['profiler-pnl',       { address: addr }, `nansen research profiler pnl --address ${addr}`],
      ['profiler-txs',       { address: addr }, `nansen research profiler txs --address ${addr} --limit 30`],
      ['profiler-tags',      { address: addr }, `nansen research profiler tags --address ${addr}`],
      ['profiler-connected', { address: addr }, `nansen research profiler connected-wallets --address ${addr}`],
    ]

    let results
    try {
      results = await Promise.all(cmds.map(([c, p]) => nansenCli(c, p)))
    } catch (e) {
      setLoading(false)
      setAiText(`Error fetching wallet data: ${e.message}. Check your Nansen API key or enable Demo Mode.`)
      return
    }
    cmds.forEach(([,, cmd], i) => addLog(cmd, results[i], Math.floor(Math.random()*160+80)))

    // Safely extract data — handle both {data: {...}} and direct response formats
    const bal   = results[0]?.data || results[0] || {}
    const pnl   = results[1]?.data || results[1] || {}
    const txs   = results[2]?.data || results[2] || {}
    const tags  = results[3]?.data || results[3] || {}
    const conn  = results[4]?.data || results[4] || {}

    const profile = { bal, pnl, tags, conn, txs }
    setData(profile)
    setLoading(false)

    // Score
    const score = calcScore(pnl, tags, bal)

    // Claude stream
    setStreaming(true)
    const sys = mode === 'roast'
      ? `You are a brutally honest, savage but funny crypto comedian. Roast this wallet based on its on-chain data. Be specific. Name exact numbers, call out bad trades, mock poor decisions. End with a punchy one-line "Reputation Score: X/100 — [funny title]".`
      : `You are a senior on-chain analyst at a quant fund. Write a concise professional wallet analysis. Cover: portfolio composition, PnL quality, trading patterns, risk profile, Nansen labels, connected wallet quality. End with a recommendation.`

    // Build user message with safe values
    const connCount = Array.isArray(conn?.connected_wallets) ? conn.connected_wallets.length
      : (conn?.connected_wallets != null ? conn.connected_wallets : '—')

    const userMsg = `Address: ${addr}
Portfolio: ${safe.usd(bal?.balance_usd)}
30D PnL: ${safe.usd(pnl?.pnl_30d)} (${safe.pct(pnl?.win_rate)} win rate)
All-time PnL: ${safe.usd(pnl?.pnl_all_time)}
Total trades: ${safe.num(pnl?.total_trades)}
Best trade: ${safe.val(pnl?.best_trade, 'N/A')}
Worst trade: ${safe.val(pnl?.worst_trade, 'N/A')}
Avg hold: ${safe.val(pnl?.avg_hold_days, 'N/A')} days
Nansen labels: ${tags?.labels?.join?.(', ') || safe.val(tags?.labels, 'None')}
Connected wallets: ${connCount}
Risk score: ${safe.val(tags?.risk_score, 'N/A')}/100`

    let full = ''
    try {
      await claudeStream(sys, userMsg, (chunk) => { full += chunk; setAiText(full) }, { mock_key: mode, max_tokens: 300 })
    } catch (e) {
      if (!full) setAiText(`AI analysis failed: ${e.message}. Check your AI API key or enable Demo Mode.`)
    }
    setStreaming(false)
  }

  function calcScore(pnl, tags, bal) {
    let s = 0
    const wr = pnl?.win_rate
    if (wr != null && !isNaN(wr)) {
      if (wr > 0.6) s += 28; else if (wr > 0.5) s += 18; else s += 8
    } else s += 8
    if (tags?.labels?.some?.(l => typeof l === 'string' && l.includes('Smart'))) s += 25
    const busd = bal?.balance_usd
    if (busd != null && !isNaN(busd)) {
      if (busd > 1e6) s += 18; else if (busd > 100e3) s += 10; else s += 5
    } else s += 5
    if (bal?.chain_count > 3) s += 12; else s += 6
    if (pnl?.avg_hold_days > 30) s += 10; else s += 5
    return Math.min(s, 100)
  }

  const score = data ? calcScore(data.pnl, data.tags, data.bal) : 0
  const scoreTitle = score > 85 ? 'Enlightened On-Chain Sage' : score > 70 ? 'Above-Average Degen' : score > 55 ? 'Mediocre Ape' : 'Absolute Gambler'

  // Safe display values
  function getMetrics() {
    if (!data) return null
    const { bal, pnl, tags, conn } = data

    const connCount = Array.isArray(conn?.connected_wallets) ? conn.connected_wallets.length
      : (typeof conn?.connected_wallets === 'number' ? conn.connected_wallets : null)

    return [
      { lbl:'PORTFOLIO VALUE', val: safe.usd(bal?.balance_usd), c:'var(--g)' },
      { lbl:'30D PnL',         val: safe.usd(pnl?.pnl_30d),    c:'var(--g)' },
      { lbl:'WIN RATE',        val: safe.pct(pnl?.win_rate),    c:'var(--a)' },
      { lbl:'TOTAL TXS',       val: safe.num(pnl?.total_trades), c:'var(--t2)' },
      { lbl:'NANSEN LABEL',    val: (Array.isArray(tags?.labels) ? tags.labels[0] : tags?.labels) || '—', c:'var(--c)', small:true },
      { lbl:'CONNECTED',       val: connCount != null ? `${connCount} wallets` : '—', c:'var(--t2)' },
    ]
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Input Row */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', background:'var(--s1)', border:'1px solid var(--bd)', borderRadius:2, overflow:'hidden', minWidth:280 }}>
          <span style={{ fontSize:10, color:'var(--tm)', padding:'0 10px', borderRight:'1px solid var(--bd)', height:34, display:'flex', alignItems:'center', whiteSpace:'nowrap' }}>WALLET / ENS</span>
          <input
            value={address} onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="0x... or vitalik.eth or any wallet address"
            style={{ flex:1, background:'transparent', border:'none', color:'var(--t2)', fontFamily:'var(--mono)', fontSize:12, padding:'0 12px', height:34, outline:'none' }}
          />
        </div>
        <div style={{ display:'flex', alignItems:'center', background:'var(--s1)', border:'1px solid var(--bd)', borderRadius:2, overflow:'hidden' }}>
          <span style={{ fontSize:10, color:'var(--tm)', padding:'0 10px', borderRight:'1px solid var(--bd)', height:34, display:'flex', alignItems:'center' }}>MODE</span>
          <select value={mode} onChange={e => setMode(e.target.value)}
            style={{ background:'transparent', border:'none', color:'var(--t2)', fontFamily:'var(--mono)', fontSize:12, outline:'none', padding:'0 10px', height:34 }}>
            <option value="roast">ROAST MODE</option>
            <option value="analyst">ANALYST MODE</option>
          </select>
        </div>
        <button onClick={run} disabled={loading || !address.trim()} style={{
          padding:'0 18px', height:34, background:'var(--g)', border:'1px solid var(--g)',
          color:'#000', fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
          borderRadius:2, cursor:'pointer', letterSpacing:1, opacity: loading ? 0.6 : 1
        }}>{loading ? 'PROFILING...' : 'PROFILE WALLET'}</button>
      </div>

      {/* Stalker Banner */}
      <div style={{ background:'var(--s1)', border:'1px solid var(--bd)', borderLeft:`3px solid ${stalkerOn ? 'var(--r)' : 'var(--p)'}`, padding:'10px 14px', borderRadius:2, display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:9, color: stalkerOn ? 'var(--r)' : 'var(--p)', letterSpacing:2, textTransform:'uppercase', whiteSpace:'nowrap' }}>
          {stalkerOn ? 'STALKER ACTIVE' : 'WHALE STALKER MODE'}
        </span>
        <span style={{ fontSize:11, color:'var(--tm)', flex:1 }}>
          {stalkerOn ? `Tracking ${address.slice(0,14)}... — agent will alert on every transaction.` : 'Enter a whale address and enable stalker mode. The agent will monitor every move they make.'}
        </span>
        <button onClick={() => { if(!address.trim()) return; setStalkerOn(!stalkerOn); if(!stalkerOn && onStalker) onStalker(address.trim()) }}
          style={{ padding:'0 12px', height:26, background:'transparent', border:`1px solid ${stalkerOn ? 'var(--r)' : 'var(--p)'}`, color: stalkerOn ? 'var(--r)' : 'var(--p)', fontFamily:'var(--mono)', fontSize:10, borderRadius:2, cursor:'pointer', whiteSpace:'nowrap' }}>
          {stalkerOn ? 'DISABLE' : 'ENABLE STALKER'}
        </button>
      </div>

      {/* Results */}
      {(loading || data) && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {(getMetrics() || [
              { lbl:'PORTFOLIO VALUE', val:'—', c:'var(--g)' },
              { lbl:'30D PnL', val:'—', c:'var(--g)' },
              { lbl:'WIN RATE', val:'—', c:'var(--a)' },
              { lbl:'TOTAL TXS', val:'—', c:'var(--t2)' },
              { lbl:'NANSEN LABEL', val:'—', c:'var(--c)', small:true },
              { lbl:'CONNECTED', val:'—', c:'var(--t2)' },
            ]).map(({ lbl, val, c, small }) => (
              <div key={lbl} style={{ background:'var(--s1)', border:'1px solid var(--bd)', padding:'10px 12px', borderRadius:2 }}>
                <div style={{ fontSize:9, color:'var(--tm)', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{lbl}</div>
                {loading ? <div style={{ background:'linear-gradient(90deg,var(--s2) 25%,var(--s3) 50%,var(--s2) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite', height:20, borderRadius:2, marginTop:4 }}/> :
                  <div style={{ fontFamily:'var(--orb)', fontSize: small ? 12 : 18, fontWeight:700, color:c, letterSpacing:1 }}>{val}</div>}
              </div>
            ))}
          </div>

          {/* AI Output */}
          {(aiText || streaming) && (
            <>
              <div style={{ fontSize:9, color: mode==='roast' ? 'var(--r)' : 'var(--g)', letterSpacing:2, textTransform:'uppercase' }}>
                {mode==='roast' ? 'AI ROAST' : 'AI ANALYST REPORT'}
              </div>
              <div style={{ background:'var(--g4)', border:'1px solid var(--g3)', borderLeft:'3px solid var(--g)', padding:14, borderRadius:2, fontSize:12, lineHeight:1.75, color:'var(--t2)', fontStyle: mode==='roast' ? 'italic' : 'normal' }}>
                "{aiText}"
                {streaming && <span style={{ display:'inline-block', width:6, height:13, background:'var(--g)', marginLeft:3, animation:'blink 1s step-end infinite', verticalAlign:'text-bottom' }}/>}
              </div>
            </>
          )}

          {/* Score */}
          {data && aiText && (
            <div style={{ display:'flex', alignItems:'center', gap:20, background:'var(--s1)', border:'1px solid var(--bd)', padding:16, borderRadius:2 }}>
              <div>
                <div style={{ fontSize:9, color:'var(--tm)', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>REPUTATION SCORE</div>
                <div style={{ fontFamily:'var(--orb)', fontSize:40, fontWeight:900, color:'var(--g)', lineHeight:1 }}>{score}</div>
                <div style={{ fontSize:10, color:'var(--g)', marginTop:4 }}>{scoreTitle}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ height:6, background:'var(--bd)', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', width:`${score}%`, borderRadius:3, background:'linear-gradient(90deg,var(--r),var(--a),var(--g))', transition:'width 1s ease' }}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
                  {[
                    { lbl:'PnL Quality', val: Math.floor(score*0.3) + '/30' },
                    { lbl:'SM Label',    val: data.tags?.labels?.some?.(l => typeof l === 'string' && l.includes('Smart')) ? '25/25' : '0/25' },
                    { lbl:'Portfolio',   val: Math.floor(score*0.18) + '/20' },
                    { lbl:'Diversity',   val: Math.floor(score*0.14) + '/15' },
                    { lbl:'Network',     val: Math.floor(score*0.1) + '/10' },
                  ].map(({ lbl, val }) => (
                    <div key={lbl} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'var(--tm)' }}>{lbl}</div>
                      <div style={{ fontSize:10, color:'var(--t2)', fontWeight:700 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--tm)', fontSize:11 }}>
          <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>◉</div>
          Enter any wallet address or ENS name above.<br/>
          <span style={{ color:'var(--g)', opacity:0.5 }}>5 Nansen CLI calls will fire automatically. AI writes the analysis.</span>
        </div>
      )}
    </div>
  )
}
