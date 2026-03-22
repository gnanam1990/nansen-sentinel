import React, { useRef } from 'react'

const STEP_COLORS = {
  observe: 'var(--c)',
  reason:  'var(--p)',
  act:     'var(--a)',
  report:  'var(--g)',
  alert:   'var(--r)'
}

const STEP_ICONS = {
  observe: '◈',
  reason:  '◉',
  act:     '◆',
  report:  '◎',
  alert:   '⚠'
}

export default function MissionFeed({ running, feed = [], cycles = 0, signals = 0, alerts = [], topSignal, onStart, onStop }) {
  const feedRef = useRef(null)

  function fmtTime(ts) {
    if (!ts) return ''
    const d = new Date(typeof ts === 'string' ? ts : ts)
    return d.getUTCHours().toString().padStart(2,'0') + ':' + d.getUTCMinutes().toString().padStart(2,'0') + ':' + d.getUTCSeconds().toString().padStart(2,'0') + ' UTC'
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Controls */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <button
          onClick={running ? onStop : onStart}
          style={{
            padding:'0 18px', height:34,
            background: running ? 'rgba(255,51,85,0.1)' : 'var(--g)',
            border: running ? '1px solid var(--r)' : '1px solid var(--g)',
            color: running ? 'var(--r)' : '#000',
            fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
            borderRadius:2, cursor:'pointer', letterSpacing:1,
            display:'flex', alignItems:'center', gap:8
          }}
        >
          <span>{running ? '■' : '▶'}</span>
          {running ? 'STOP AGENT' : 'START AUTONOMOUS AGENT'}
        </button>

        {topSignal && (
          <span style={{ fontSize:10, color:'var(--g)', letterSpacing:1 }}>
            TOP SIGNAL: {topSignal}
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'AGENT CYCLES',  val: cycles,        color:'var(--g)',  sub:'autonomous loops' },
          { label:'SIGNALS FOUND', val: signals,       color:'var(--a)',  sub:'alpha events detected' },
          { label:'ALERTS FIRED',  val: alerts.length, color:'var(--r)',  sub:'high-confidence triggers' },
          { label:'CLI CALLS',     val: feed.length,   color:'var(--c)',  sub:'total feed entries' },
        ].map(({ label, val, color, sub }) => (
          <div key={label} style={{
            background:'var(--s2)', border:'1px solid var(--bd)', padding:14, borderRadius:2,
            position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.5 }} />
            <div style={{ fontSize:9, color:'var(--tm)', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
            <div style={{ fontFamily:'var(--orb)', fontSize:26, fontWeight:700, letterSpacing:1, color }}>{val}</div>
            <div style={{ fontSize:10, color:'var(--tm)', marginTop:2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div style={{ background:'var(--s2)', border:'1px solid var(--bd)', borderRadius:2, overflow:'hidden' }}>
        <div style={{
          background:'var(--s1)', borderBottom:'1px solid var(--bd)',
          padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between'
        }}>
          <div style={{ fontSize:10, letterSpacing:2, color:'var(--tm)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--g)', animation: running ? 'pulse 1s infinite' : 'none' }} />
            AUTONOMOUS MISSION FEED — REACT LOOP
          </div>
          <span style={{ fontSize:9, color:'var(--tm)' }}>observe → reason → act → report</span>
        </div>

        <div ref={feedRef} style={{ maxHeight:480, overflowY:'auto', padding:10 }}>
          {feed.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--tm)', fontSize:11 }}>
              <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>◎</div>
              Press START AUTONOMOUS AGENT to launch the ReAct loop.<br />
              <span style={{ color:'var(--g)', opacity:0.5 }}>The agent will observe → reason → act → report in real time using live Nansen CLI data.</span>
            </div>
          ) : feed.map((step) => (
            <div key={step.id} style={{
              display:'flex', gap:10, padding:'10px 12px', marginBottom:6,
              background:'var(--s1)', border:'1px solid var(--bd)',
              borderLeft:`3px solid ${STEP_COLORS[step.type] || 'var(--bd)'}`,
              borderRadius:2, animation:'slideIn 0.3s ease'
            }}>
              <div style={{ fontSize:14, minWidth:18, color: STEP_COLORS[step.type], marginTop:1 }}>
                {STEP_ICONS[step.type] || '○'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, letterSpacing:2, textTransform:'uppercase', color: STEP_COLORS[step.type], marginBottom:3 }}>
                  {step.type?.toUpperCase()} — {step.title}
                </div>
                <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.55 }}>{step.text}</div>
                <div style={{ fontSize:9, color:'var(--tm)', marginTop:3 }}>{step.time || fmtTime(step.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
