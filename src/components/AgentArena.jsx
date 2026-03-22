import React, { useState, useRef } from 'react'
import { nansenCli, claudeStream } from '../lib/nansenApi.js'

export default function AgentArena({ nansenKey, anthropicKey, addLog, demoMode }) {
  const [token,   setToken]   = useState('SOL')
  const [chain,   setChain]   = useState('solana')
  const [loading, setLoading] = useState(false)
  const [round,   setRound]   = useState(0)
  const [bull,    setBull]    = useState('')
  const [bear,    setBear]    = useState('')
  const [degen,   setDegen]   = useState('')
  const [verdict, setVerdict] = useState(null)
  const [phase,   setPhase]   = useState('idle')  // idle | fetching | debating | verdict
  const bullRef  = useRef('')
  const bearRef  = useRef('')
  const degenRef = useRef('')

  async function runArena() {
    const sym = token.trim().toUpperCase() || 'SOL'
    setPhase('fetching'); setRound(r => r + 1)
    setBull(''); setBear(''); setDegen(''); setVerdict(null)

    // Fetch data
    let flowRes, tradeRes, screenRes, perpRes
    try {
      ;[flowRes, tradeRes, screenRes, perpRes] = await Promise.all([
        nansenCli('sm-netflow',     { chain, timeframe:'24h' }),
        nansenCli('sm-dex-trades',  { chain }),
        nansenCli('token-screener', { chain }),
        nansenCli('perp',           { symbol: sym }),
      ])
    } catch (e) {
      setBull(`Error fetching data: ${e.message}. Check your Nansen API key or enable Demo Mode.`)
      setPhase('idle')
      return
    }

    ;[
      { cmd:`nansen research sm netflow --chain ${chain} --timeframe 24h`, result:flowRes },
      { cmd:`nansen research sm dex-trades --chain ${chain} --limit 20`,   result:tradeRes },
      { cmd:`nansen research token screener --chain ${chain}`,              result:screenRes },
      { cmd:`nansen research perp --symbol ${sym}`,                         result:perpRes },
    ].forEach(e => addLog(e.cmd, e.result, Math.floor(Math.random()*160+80)))

    const topFlow   = flowRes.data?.tokens?.[0]
    const topTrade  = tradeRes.data?.trades?.[0]
    const tokenData = screenRes.data?.tokens?.find(t => t.symbol === sym) || screenRes.data?.tokens?.[0]
    const perp      = perpRes.data

    const dataCtx = `
Token: ${sym} on ${chain}
Price: $${tokenData?.price_usd || '?'} (${tokenData?.change_24h > 0 ? '+' : ''}${tokenData?.change_24h || 0}% 24h)
SM Score: ${tokenData?.sm_score || 0}/100
SM Net Flow 24h: $${((topFlow?.net_flow_usd||0)/1e6).toFixed(1)}M
Top SM token by flow: ${topFlow?.symbol} with ${topFlow?.sm_wallets} SM wallets active
Recent large trade: ${topTrade?.label} ${topTrade?.action} $${((topTrade?.amount_usd||0)/1e3).toFixed(0)}K ${topTrade?.token}
Perp OI: $${((perp?.open_interest_usd||0)/1e6).toFixed(0)}M | Funding: ${((perp?.funding_rate||0)*100).toFixed(3)}% | Long/Short: ${Math.floor((perp?.long_ratio||0.5)*100)}/${Math.floor((1-(perp?.long_ratio||0.5))*100)}
`

    setPhase('debating')

    // Stream all 3 agents simultaneously
    bullRef.current = ''; bearRef.current = ''; degenRef.current = ''
    const streams = [
      { key:'bull', set:setBull, ref:bullRef, sys:`You are an aggressive, conviction-driven crypto bull agent named BULL. You ONLY look for bullish signals. Ignore all negatives. Be direct, bold, specific. Use the data provided. Max 3 sentences.` },
      { key:'bear', set:setBear, ref:bearRef, sys:`You are a paranoid risk-management bear agent named BEAR. You ONLY look for red flags, distribution signals, and risk factors. Be specific and alarming. Max 3 sentences.` },
      { key:'degen', set:setDegen, ref:degenRef, sys:`You are an irresponsible, YOLO degen agent named DEGEN. You only care about momentum and vibes. Ignore all fundamentals and risk. Be enthusiastic and unhinged. Max 2 sentences.` },
    ]

    await Promise.all(streams.map(({ key, set, ref, sys }) => {
      let full = ''
      return claudeStream(sys, `Analyze this token data and give your argument:\n${dataCtx}`, (chunk) => {
        full += chunk; ref.current = full; set(full)
      }, { mock_key: key, max_tokens: 150 }).catch(e => {
        set(`AI error: ${e.message}`)
        ref.current = `AI error: ${e.message}`
      })
    }))

    // Verdict
    setPhase('verdict')
    let verdictText = ''
    const bullArg = bullRef.current
    const bearArg = bearRef.current
    const degenArg = degenRef.current

    const verdictSys = `You are SENTINEL, an impartial AI judge. Given three agents' arguments, render a final verdict with: (1) who wins the debate, (2) a VERDICT label (STRONG BUY/CAUTIOUS BUY/HOLD/CAUTIOUS SELL/STRONG SELL), (3) confidence %, (4) one actionable sentence. Be decisive.`
    const verdictCtx = `Token: ${sym}\nBull: [${bullArg.slice(0,200) || 'bull argument pending'}]\nBear: [${bearArg.slice(0,200) || 'bear argument pending'}]\nDegen: [${degenArg.slice(0,150) || 'degen argument pending'}]\nMarket data: ${dataCtx}`

    try {
      await claudeStream(verdictSys, verdictCtx, (chunk) => {
        verdictText += chunk
        const conf = (verdictText.match(/(\d+)%/) || [])[1]
        const label = ['STRONG BUY','CAUTIOUS BUY','HOLD','CAUTIOUS SELL','STRONG SELL'].find(l => verdictText.toUpperCase().includes(l))
        setVerdict({ text: verdictText, label: label || 'DELIBERATING', confidence: conf ? parseInt(conf) : null })
      }, { mock_key:'verdict', max_tokens:200 })
    } catch (e) {
      setVerdict({ text: `Verdict failed: ${e.message}`, label: 'ERROR', confidence: null })
    }

    setPhase('idle')
  }

  const agentCards = [
    { key:'bull',  name:'BULL AGENT',  icon:'🐂', color:'var(--g)', sub:'Accumulation signals only', text:bull,  placeholder:'Waiting for data to analyze...' },
    { key:'bear',  name:'BEAR AGENT',  icon:'🐻', color:'var(--r)', sub:'Risk flags only',            text:bear,  placeholder:'Waiting for data to analyze...' },
    { key:'degen', name:'DEGEN AGENT', icon:'🎰', color:'var(--a)', sub:'Pure momentum & vibes',      text:degen, placeholder:'Waiting for data to analyze...' },
  ]

  const verdictColors = { 'STRONG BUY':'var(--g)', 'CAUTIOUS BUY':'#88ff44', 'HOLD':'var(--a)', 'CAUTIOUS SELL':'#ff8844', 'STRONG SELL':'var(--r)', 'DELIBERATING':'var(--tm)' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Controls */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', background:'var(--s1)', border:'1px solid var(--bd)', borderRadius:2, overflow:'hidden' }}>
          <span style={{ fontSize:10, color:'var(--tm)', padding:'0 10px', borderRight:'1px solid var(--bd)', height:34, display:'flex', alignItems:'center' }}>TOKEN</span>
          <input value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => e.key==='Enter' && runArena()}
            placeholder="SOL, JUP, WIF..."
            style={{ background:'transparent', border:'none', color:'var(--t2)', fontFamily:'var(--mono)', fontSize:13, padding:'0 12px', height:34, outline:'none', width:100, textTransform:'uppercase' }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', background:'var(--s1)', border:'1px solid var(--bd)', borderRadius:2, overflow:'hidden' }}>
          <span style={{ fontSize:10, color:'var(--tm)', padding:'0 10px', borderRight:'1px solid var(--bd)', height:34, display:'flex', alignItems:'center' }}>CHAIN</span>
          <select value={chain} onChange={e => setChain(e.target.value)}
            style={{ background:'transparent', border:'none', color:'var(--t2)', fontFamily:'var(--mono)', fontSize:12, outline:'none', padding:'0 10px', height:34 }}>
            <option value="solana">Solana</option>
            <option value="ethereum">Ethereum</option>
            <option value="base">Base</option>
          </select>
        </div>
        <button onClick={runArena} disabled={loading || phase==='debating' || phase==='fetching'} style={{
          padding:'0 18px', height:34, background:'var(--g)', border:'1px solid var(--g)',
          color:'#000', fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
          borderRadius:2, cursor:'pointer', letterSpacing:1,
          opacity: (loading || phase==='debating') ? 0.6 : 1
        }}>
          {phase === 'fetching' ? '◌ FETCHING DATA...' : phase === 'debating' ? '◌ AGENTS DEBATING...' : phase === 'verdict' ? '◌ DELIBERATING...' : '⚔ START DEBATE'}
        </button>
        <span style={{ fontSize:10, color:'var(--tm)' }}>4 Nansen CLI calls → 3 Claude AI agents → 1 final verdict</span>
      </div>

      {/* Phase indicator */}
      {phase !== 'idle' && (
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:10 }}>
          {['fetching','debating','verdict'].map((p, i) => (
            <React.Fragment key={p}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: phase === p ? 'var(--g)' : ['fetching','debating','verdict'].indexOf(phase) > i ? 'var(--g2)' : 'var(--bd)', animation: phase === p ? 'pulse 1s infinite' : 'none' }}/>
                <span style={{ color: phase === p ? 'var(--g)' : 'var(--tm)', textTransform:'uppercase', letterSpacing:1 }}>{p}</span>
              </div>
              {i < 2 && <span style={{ color:'var(--bd)' }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Agent Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {agentCards.map(({ key, name, icon, color, sub, text, placeholder }) => (
          <div key={key} style={{ background:'var(--s2)', border:'1px solid var(--bd)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--bd)', display:'flex', alignItems:'center', gap:8, background:'var(--s1)' }}>
              <span style={{ fontSize:20 }}>{icon}</span>
              <div>
                <div style={{ fontFamily:'var(--orb)', fontSize:11, fontWeight:700, color, letterSpacing:1 }}>{name}</div>
                <div style={{ fontSize:9, color:'var(--tm)' }}>{sub}</div>
              </div>
              {phase === 'debating' && !text && (
                <div style={{ marginLeft:'auto', display:'flex', gap:2 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:4, height:4, borderRadius:'50%', background:color, animation:`blink ${1+i*0.3}s infinite` }}/>)}
                </div>
              )}
            </div>
            <div style={{ padding:14, minHeight:130, fontSize:11, lineHeight:1.65, color: text ? 'var(--t2)' : 'var(--tm)', fontStyle: text ? 'normal' : 'italic' }}>
              {text || (phase !== 'idle' ? 'Analyzing data...' : placeholder)}
              {phase === 'debating' && text && <span style={{ display:'inline-block', width:6, height:12, background:color, marginLeft:3, animation:'blink 1s step-end infinite', verticalAlign:'text-bottom' }}/>}
            </div>
          </div>
        ))}
      </div>

      {/* Verdict */}
      <div style={{
        background:'var(--s1)', border:`1px solid ${verdict ? (verdictColors[verdict.label] || 'var(--g)') : 'var(--bd)'}`,
        borderRadius:2, padding:20, textAlign:'center',
        boxShadow: verdict ? `0 0 30px rgba(0,255,136,0.05)` : 'none'
      }}>
        <div style={{ fontSize:9, color: verdict ? (verdictColors[verdict.label] || 'var(--g)') : 'var(--tm)', letterSpacing:3, textTransform:'uppercase', marginBottom:10 }}>
          ◆ SENTINEL VERDICT{token ? ` — ${token.toUpperCase()}` : ''}
        </div>

        {!verdict ? (
          <div style={{ color:'var(--tm)', fontSize:12, padding:'16px 0' }}>
            {phase === 'idle' ? 'Start a debate to see the verdict.' : 'Agents are building their cases...'}
          </div>
        ) : (
          <>
            <div style={{ fontFamily:'var(--orb)', fontSize:28, fontWeight:900, color: verdictColors[verdict.label] || 'var(--g)', letterSpacing:2, marginBottom:12 }}>
              {verdict.label}
            </div>
            {verdict.confidence && (
              <>
                <div style={{ height:4, background:'var(--bd)', borderRadius:2, overflow:'hidden', margin:'0 auto 8px', maxWidth:400 }}>
                  <div style={{ height:'100%', width:`${verdict.confidence}%`, background:`linear-gradient(90deg,var(--r),var(--a),var(--g))`, borderRadius:2, transition:'width 1.5s ease' }}/>
                </div>
                <div style={{ fontSize:10, color:'var(--tm)', marginBottom:12 }}>{verdict.confidence}% confidence</div>
              </>
            )}
            <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.7, maxWidth:600, margin:'0 auto', textAlign:'left' }}>
              {verdict.text}
              {phase === 'verdict' && <span style={{ display:'inline-block', width:6, height:13, background:'var(--g)', marginLeft:3, animation:'blink 1s step-end infinite', verticalAlign:'text-bottom' }}/>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
