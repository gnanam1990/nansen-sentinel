import React, { useState } from 'react'
import { nansenCli, claudeStream } from '../lib/nansenApi.js'

export default function AlphaBriefing({ nansenKey, anthropicKey, addLog, demoMode }) {
  const [loading,   setLoading]   = useState(false)
  const [briefing,  setBriefing]  = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [rawText,   setRawText]   = useState('')

  async function generate() {
    setLoading(true); setBriefing(null); setRawText('')

    const commands = [
      ['sm-netflow',     { chain:'ethereum', timeframe:'24h' }, 'nansen research sm netflow --chain ethereum --timeframe 24h'],
      ['sm-netflow',     { chain:'solana',   timeframe:'24h' }, 'nansen research sm netflow --chain solana --timeframe 24h'],
      ['sm-netflow',     { chain:'base',     timeframe:'24h' }, 'nansen research sm netflow --chain base --timeframe 24h'],
      ['token-screener', { chain:'solana'  },                   'nansen research token screener --chain solana --limit 10'],
      ['sm-holdings',    { chain:'ethereum'},                   'nansen research sm holdings --chain ethereum --limit 10'],
      ['perp',           { symbol:'BTC'    },                   'nansen research perp --symbol BTC'],
      ['perp',           { symbol:'ETH'    },                   'nansen research perp --symbol ETH'],
      ['perp',           { symbol:'SOL'    },                   'nansen research perp --symbol SOL'],
      ['sm-dex-trades',  { chain:'solana'  },                   'nansen research sm dex-trades --chain solana --limit 20'],
      ['token-holders',  { address:'PYTH'  },                   'nansen research token holders --address PYTH-contract --limit 10'],
    ]

    let results
    try {
      results = await Promise.all(commands.map(([c, p]) => nansenCli(c, p)))
    } catch (e) {
      setLoading(false)
      setRawText(`Error fetching data: ${e.message}. Check your Nansen API key or enable Demo Mode.`)
      return
    }
    commands.forEach(([,, cmd], i) => addLog(cmd, results[i], Math.floor(Math.random()*160+80)))

    setLoading(false)
    setStreaming(true)

    const ethFlow  = results[0].data
    const solFlow  = results[1].data
    const tokens   = results[3].data?.tokens || []
    const perps    = [results[5].data, results[6].data, results[7].data]
    const trades   = results[8].data?.trades || []
    const holders  = results[9].data?.top_holders || []

    const ctx = `
ETH SM Net Flow 24h: $${(ethFlow?.net_flow_usd/1e6).toFixed(0)}M | Active wallets: ${ethFlow?.sm_wallets_active?.toLocaleString()}
SOL SM Net Flow 24h: $${(solFlow?.net_flow_usd/1e6).toFixed(0)}M | Active wallets: ${solFlow?.sm_wallets_active?.toLocaleString()}
Top SOL tokens by SM flow: ${tokens.slice(0,5).map(t => `${t.symbol} ($${(t.price_usd||0).toFixed(2)}, ${t.change_24h>0?'+':''}${t.change_24h}% 24h, SM score ${t.sm_score})`).join('; ')}
BTC Perp OI: $${((perps[0]?.open_interest_usd||0)/1e9).toFixed(1)}B | Funding: ${((perps[0]?.funding_rate||0)*100).toFixed(3)}% | Long: ${Math.floor((perps[0]?.long_ratio||0)*100)}%
ETH Perp OI: $${((perps[1]?.open_interest_usd||0)/1e6).toFixed(0)}M | Funding: ${((perps[1]?.funding_rate||0)*100).toFixed(3)}% | Long: ${Math.floor((perps[1]?.long_ratio||0)*100)}%
SOL Perp OI: $${((perps[2]?.open_interest_usd||0)/1e6).toFixed(0)}M | Funding: ${((perps[2]?.funding_rate||0)*100).toFixed(3)}% | Long: ${Math.floor((perps[2]?.long_ratio||0)*100)}%
Recent notable SM trade: ${trades[0]?.label} ${trades[0]?.action} $${((trades[0]?.amount_usd||0)/1e6).toFixed(1)}M ${trades[0]?.token}
Largest SM trade: ${(() => { const t = [...trades].sort((a,b)=>(b.amount_usd||0)-(a.amount_usd||0))[0]; return t ? `${t.label} ${t.action} ${t.token}` : 'N/A' })()}
PYTH top holder change 24h: ${holders[0]?.label} ${holders[0]?.change_24h > 0 ? '+' : ''}${holders[0]?.change_24h}%
`

    let full = ''
    try {
      await claudeStream(
        `You are a senior on-chain analyst at a crypto hedge fund. Write a structured daily alpha briefing based on Nansen CLI data.
Use these EXACT section headers on their own lines: "📊 MARKET PULSE", "🐋 TOP SMART MONEY MOVES", "🎯 TOKENS TO WATCH", "⚠️ RISK FLAGS", "💀 DEGEN PLAYS", "🔮 ONE-LINE SUMMARY"
Be specific with numbers. Name actual tokens and wallet labels. Each section: 2-4 bullet points starting with →. End each section with a blank line.`,
        `Today's Nansen CLI data:\n${ctx}\nDate: ${new Date().toUTCString()}`,
        (chunk) => {
          full += chunk
          setRawText(full)
          setBriefing(parseBriefing(full))
        },
        { mock_key:'briefing', max_tokens:600 }
      )
    } catch (e) {
      if (!full) setRawText(`AI briefing failed: ${e.message}. Check your AI API key or enable Demo Mode.`)
    }

    setStreaming(false)
  }

  function parseBriefing(text) {
    const sections = [
      { key:'pulse',   icon:'📊', header:'MARKET PULSE',           color:'var(--g)' },
      { key:'moves',   icon:'🐋', header:'TOP SMART MONEY MOVES',  color:'var(--c)' },
      { key:'watch',   icon:'🎯', header:'TOKENS TO WATCH',        color:'var(--a)' },
      { key:'risk',    icon:'⚠️', header:'RISK FLAGS',              color:'var(--r)' },
      { key:'degen',   icon:'💀', header:'DEGEN PLAYS',             color:'var(--p)' },
      { key:'summary', icon:'🔮', header:'ONE-LINE SUMMARY',        color:'var(--g)' },
    ]

    const result = {}
    sections.forEach((sec, i) => {
      const next = sections[i+1]
      const pattern = new RegExp(`(?:${sec.icon}\\s*)?${sec.header}[:\\n]?([\\s\\S]*?)(?=${next ? `(?:${next.icon}\\s*)?${next.header}` : '$'})`, 'i')
      const match = text.match(pattern)
      result[sec.key] = { ...sec, content: match ? match[1].trim() : '' }
    })

    return result
  }

  const sectionOrder = ['pulse','moves','watch','risk','degen','summary']

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <button onClick={generate} disabled={loading || streaming} style={{
          padding:'0 20px', height:34, background:'var(--g)', border:'1px solid var(--g)',
          color:'#000', fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
          borderRadius:2, cursor:'pointer', letterSpacing:1,
          opacity: (loading || streaming) ? 0.6 : 1
        }}>
          {loading ? '◌ FETCHING 10 CLI CALLS...' : streaming ? '◌ CLAUDE AI WRITING...' : '✍ GENERATE ALPHA BRIEFING'}
        </button>
        <span style={{ fontSize:10, color:'var(--tm)' }}>
          Fires 10 Nansen CLI calls → Claude AI synthesizes into a hedge fund morning note
        </span>
      </div>

      {(loading || streaming || briefing) && (
        <>
          {/* Header */}
          <div style={{ background:'var(--s1)', border:'1px solid var(--g)', padding:'16px 20px', borderRadius:2 }}>
            <div style={{ fontFamily:'var(--orb)', fontSize:20, fontWeight:900, color:'var(--g)', letterSpacing:2, marginBottom:4 }}>SENTINEL ALPHA BRIEFING</div>
            <div style={{ fontSize:10, color:'var(--tm)' }}>
              Generated: {new Date().toUTCString()} &nbsp;|&nbsp; CLI Calls: 10 &nbsp;|&nbsp; Chains: ETH + SOL + BASE + HYPERLIQUID
            </div>
          </div>

          {/* Raw streamed output if not parsed yet */}
          {streaming && !briefing?.pulse?.content && (
            <div style={{ background:'var(--g4)', border:'1px solid var(--g3)', padding:16, borderRadius:2, fontFamily:'var(--mono)', fontSize:11, lineHeight:1.8, color:'var(--t2)', whiteSpace:'pre-wrap' }}>
              {rawText}
              <span style={{ display:'inline-block', width:6, height:13, background:'var(--g)', marginLeft:3, animation:'blink 1s step-end infinite', verticalAlign:'text-bottom' }}/>
            </div>
          )}

          {/* Parsed sections */}
          {briefing && sectionOrder.map(k => {
            const sec = briefing[k]
            if (!sec?.content) return null
            const lines = sec.content.split('\n').filter(l => l.trim())
            return (
              <div key={k} style={{ marginBottom:4 }}>
                <div style={{ fontFamily:'var(--orb)', fontSize:11, fontWeight:700, color:sec.color, letterSpacing:2, marginBottom:8, paddingBottom:5, borderBottom:'1px solid var(--bd)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:8 }}>
                  <span>{sec.icon}</span> {sec.header}
                </div>
                {lines.map((line, i) => {
                  const clean = line.replace(/^[→•\-\*]\s*/, '').trim()
                  if (!clean) return null
                  return (
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:11, lineHeight:1.6, color:'var(--t2)' }}>
                      <span style={{ color:sec.color, flexShrink:0, marginTop:1 }}>→</span>
                      <span>{clean}</span>
                    </div>
                  )
                })}
                {k === sectionOrder[sectionOrder.length-2] && streaming && (
                  <span style={{ display:'inline-block', width:6, height:13, background:'var(--g)', animation:'blink 1s step-end infinite', verticalAlign:'text-bottom' }}/>
                )}
              </div>
            )
          })}
        </>
      )}

      {!briefing && !loading && !streaming && (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--tm)', fontSize:11 }}>
          <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>✍</div>
          Click GENERATE ALPHA BRIEFING to run the full 10-call Nansen pipeline.<br/>
          <span style={{ color:'var(--g)', opacity:0.5 }}>Claude AI synthesizes all data into a structured hedge fund morning note.</span>
        </div>
      )}
    </div>
  )
}
