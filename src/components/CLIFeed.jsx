import React, { useRef, useEffect } from 'react'

function highlight(json) {
  try {
    const str = typeof json === 'string' ? json : JSON.stringify(json, null, 2)
    return str
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"([^"]+)":/g, '<span style="color:var(--c)">"$1"</span>:')
      .replace(/: "(.*?)"/g, ': <span style="color:var(--g2)">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span style="color:var(--a)">$1</span>')
      .replace(/: (true|false)/g, (_, b) => `: <span style="color:${b==='true'?'var(--g)':'var(--r)'};">${b}</span>`)
  } catch { return String(json) }
}

function fmtCmd(cmd) {
  // Escape HTML entities first to prevent XSS
  const escaped = cmd.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return escaped
    .replace(/^nansen/, '<span style="color:var(--g);font-weight:bold">nansen</span>')
    .replace(/\b(research|trade|wallet|schema)\b/g, '<span style="color:var(--c)">$1</span>')
    .replace(/--([\w-]+)/g, '<span style="color:var(--p)">--$1</span>')
    .replace(/\b(ethereum|solana|base|bnb|arbitrum)\b/g, '<span style="color:var(--a)">$1</span>')
}

export default function CliFeed({ logs = [], callCount = 0, onClear }) {
  const entries = logs.map(l => ({
    cmd: l.command || l.cmd || '',
    result: l.response || l.result || '',
    latency: l.latency || 0,
    ts: l.timestamp || l.ts || Date.now(),
  }))
  const totalCalls = callCount
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [logs])

  const CLI_INVENTORY = [
    { n:'01', mod:'SCANNER',  mod_c:'var(--c)', cmd:'nansen research sm netflow --chain ethereum --timeframe 24h --pretty',              purpose:'ETH SM net flows' },
    { n:'02', mod:'SCANNER',  mod_c:'var(--c)', cmd:'nansen research sm netflow --chain solana --timeframe 24h --pretty',               purpose:'SOL SM net flows' },
    { n:'03', mod:'SCANNER',  mod_c:'var(--c)', cmd:'nansen research token screener --chain solana --limit 20',                         purpose:'Top trending tokens' },
    { n:'04', mod:'SCANNER',  mod_c:'var(--c)', cmd:'nansen research sm holdings --chain ethereum --limit 15',                          purpose:'Whale positions' },
    { n:'05', mod:'SCANNER',  mod_c:'var(--c)', cmd:'nansen research sm dex-trades --chain base --limit 10',                            purpose:'DEX trade feed' },
    { n:'06', mod:'WALLET',   mod_c:'var(--a)', cmd:'nansen research profiler balance --address <addr> --chain ethereum',               purpose:'Wallet balance' },
    { n:'07', mod:'WALLET',   mod_c:'var(--a)', cmd:'nansen research profiler pnl --address <addr>',                                    purpose:'PnL history' },
    { n:'08', mod:'WALLET',   mod_c:'var(--a)', cmd:'nansen research profiler txs --address <addr> --limit 30',                         purpose:'Transaction history' },
    { n:'09', mod:'WALLET',   mod_c:'var(--a)', cmd:'nansen research profiler tags --address <addr>',                                   purpose:'Nansen labels' },
    { n:'10', mod:'WALLET',   mod_c:'var(--a)', cmd:'nansen research profiler connected-wallets --address <addr>',                      purpose:'Connected wallets' },
    { n:'11', mod:'ARENA',    mod_c:'var(--p)', cmd:'nansen research token screener --chain solana',                                    purpose:'Token base data for debate' },
    { n:'12', mod:'ARENA',    mod_c:'var(--p)', cmd:'nansen research sm netflow --chain solana --timeframe 24h',                        purpose:'Flow data for agents' },
    { n:'13', mod:'ARENA',    mod_c:'var(--p)', cmd:'nansen research sm dex-trades --chain solana --limit 20',                          purpose:'Trade signals for debate' },
    { n:'14', mod:'ARENA',    mod_c:'var(--p)', cmd:'nansen research perp --symbol SOL',                                               purpose:'Perp OI for debate' },
    { n:'15', mod:'BRIEFING', mod_c:'var(--g)', cmd:'nansen research sm netflow --chain ethereum --timeframe 24h',                      purpose:'Morning ETH flow' },
    { n:'16', mod:'BRIEFING', mod_c:'var(--g)', cmd:'nansen research sm netflow --chain solana --timeframe 24h',                        purpose:'Morning SOL flow' },
    { n:'17', mod:'BRIEFING', mod_c:'var(--g)', cmd:'nansen research sm holdings --chain ethereum --limit 10',                          purpose:'Whale positions' },
    { n:'18', mod:'BRIEFING', mod_c:'var(--g)', cmd:'nansen research token screener --chain solana --limit 10',                         purpose:'Top movers' },
    { n:'19', mod:'BRIEFING', mod_c:'var(--g)', cmd:'nansen research perp --symbol BTC',                                               purpose:'BTC perp OI' },
    { n:'20', mod:'BRIEFING', mod_c:'var(--g)', cmd:'nansen research perp --symbol ETH',                                               purpose:'ETH perp OI' },
    { n:'21', mod:'AGENT',    mod_c:'var(--c)', cmd:'nansen research sm netflow --chain solana --fields token_symbol,net_flow_usd --limit 10', purpose:'Agent observe loop' },
    { n:'22', mod:'AGENT',    mod_c:'var(--c)', cmd:'nansen research sm dex-trades --chain ethereum --smart-money --limit 5',           purpose:'Agent act step' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <span style={{ fontSize:10, color:'var(--tm)' }}>All CLI calls from this session logged below in real time.</span>
        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--g)' }}>{totalCalls} CALLS THIS SESSION</span>
      </div>

      {/* Live Terminal */}
      <div style={{ background:'#030504', border:'1px solid var(--bd)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ background:'var(--s1)', borderBottom:'1px solid var(--bd)', padding:'7px 12px', display:'flex', alignItems:'center', gap:7 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c }}/>)}
          <span style={{ fontSize:10, color:'var(--tm)', marginLeft:6, letterSpacing:1 }}>SENTINEL — NANSEN CLI LIVE FEED</span>
          <span style={{ marginLeft:'auto', fontSize:9, color:'var(--tm)' }}>nansen-cli@1.12.0</span>
        </div>

        <div ref={bodyRef} style={{ padding:14, maxHeight:360, overflowY:'auto', lineHeight:1.8, fontFamily:'var(--mono)', fontSize:11 }}>
          <span style={{ color:'var(--tm)' }}>SENTINEL v1.0 — Nansen CLI Build Challenge Entry — {new Date().toUTCString()}</span><br/>
          <span style={{ color:'var(--tm)' }}>All Nansen CLI calls logged here in real time. Use any module to see commands execute.</span><br/><br/>

          {entries.map((entry, i) => (
            <React.Fragment key={i}>
              <span style={{ color:'var(--g)' }}>sentinel@nansen</span>
              <span style={{ color:'var(--tm)' }}>:</span>
              <span style={{ color:'var(--c)' }}>~</span>
              <span style={{ color:'var(--tm)' }}> $ </span>
              <span dangerouslySetInnerHTML={{ __html: fmtCmd(entry.cmd) }}/><br/>

              <span style={{ color:'var(--tm)', fontSize:10 }}>
                {'// latency: '}{entry.latency}ms{' | ts: '}{new Date(entry.ts).toISOString()}
              </span><br/>

              <span style={{ color:'var(--tm)', fontSize:10 }}
                dangerouslySetInnerHTML={{ __html: highlight(entry.result).slice(0, 300) + (JSON.stringify(entry.result).length > 300 ? '...' : '') }}
              /><br/><br/>
            </React.Fragment>
          ))}

          {entries.length === 0 && (
            <><span style={{ color:'var(--tm)' }}>Waiting for CLI commands...</span><br/></>
          )}

          <span style={{ display:'inline-block', width:6, height:13, background:'var(--g)', animation:'blink 1s step-end infinite', verticalAlign:'text-bottom' }}/>
        </div>
      </div>

      {/* Command Inventory */}
      <div style={{ background:'var(--s2)', border:'1px solid var(--bd)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ background:'var(--s1)', borderBottom:'1px solid var(--bd)', padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--c)' }}/>
          <span style={{ fontSize:10, letterSpacing:2, color:'var(--tm)', textTransform:'uppercase' }}>CLI COMMAND INVENTORY — 22 DOCUMENTED CALLS</span>
          <span style={{ marginLeft:'auto', fontSize:9, color:'var(--g)' }}>{totalCalls} / 22+ executed this session</span>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr>
                {['#','MODULE','COMMAND','PURPOSE','STATUS'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:9, letterSpacing:1.5, color:'var(--tm)', borderBottom:'1px solid var(--bd)', background:'var(--s1)', fontWeight:400, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLI_INVENTORY.map((row, i) => {
                const executed = entries.some(e => e.cmd.includes(row.cmd.split(' ').slice(1,4).join(' ').replace(/<addr>/,'').trim()))
                return (
                  <tr key={i}>
                    <td style={{ padding:'8px 12px', color:'var(--tm)', borderBottom:'1px solid rgba(24,32,24,0.5)', whiteSpace:'nowrap' }}>{row.n}</td>
                    <td style={{ padding:'8px 12px', borderBottom:'1px solid rgba(24,32,24,0.5)', whiteSpace:'nowrap' }}>
                      <span style={{ fontSize:8, color:row.mod_c, border:`1px solid ${row.mod_c}30`, background:`${row.mod_c}15`, padding:'1px 5px', borderRadius:1 }}>{row.mod}</span>
                    </td>
                    <td style={{ padding:'8px 12px', color:'var(--t2)', borderBottom:'1px solid rgba(24,32,24,0.5)', fontFamily:'var(--mono)', fontSize:10, maxWidth:360 }}>{row.cmd}</td>
                    <td style={{ padding:'8px 12px', color:'var(--tm)', borderBottom:'1px solid rgba(24,32,24,0.5)', whiteSpace:'nowrap' }}>{row.purpose}</td>
                    <td style={{ padding:'8px 12px', borderBottom:'1px solid rgba(24,32,24,0.5)', whiteSpace:'nowrap' }}>
                      <span style={{ fontSize:8, color: executed ? 'var(--g)' : 'var(--tm)', letterSpacing:1 }}>{executed ? '✓ EXECUTED' : '○ READY'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
