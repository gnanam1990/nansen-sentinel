import React from 'react'

export default function Header({ callCount, agentRunning, demoMode, onKeysClick }) {
  const agentStatus = agentRunning ? 'RUNNING' : 'IDLE'

  return (
    <header style={{
      position:'sticky', top:0, zIndex:200,
      background:'rgba(6,7,8,0.97)',
      borderBottom:'1px solid var(--bd)',
      backdropFilter:'blur(12px)',
      padding:'0 20px', height:52,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      flexShrink:0
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontFamily:'var(--orb)', fontWeight:900, fontSize:15, color:'var(--g)', letterSpacing:3, textShadow:'0 0 20px rgba(0,255,136,0.4)' }}>
          SENTINEL
        </div>
        <div style={{ fontSize:9, background:'var(--g3)', border:'1px solid var(--g2)', color:'var(--g2)', padding:'2px 8px', borderRadius:2, letterSpacing:2 }}>
          AUTONOMOUS AGENT
        </div>
        <div style={{ fontSize:9, color:'var(--tm)', letterSpacing:1 }}>
          powered by Nansen CLI + Claude AI
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {demoMode && (
          <span style={{ fontSize:9, color:'var(--a)', letterSpacing:1, border:'1px solid rgba(255,183,0,0.25)', background:'rgba(255,183,0,0.06)', padding:'2px 8px', borderRadius:2 }}>
            DEMO MODE
          </span>
        )}
        <div style={{ width:6, height:6, borderRadius:'50%', background: agentRunning ? 'var(--g)' : 'var(--tm)',
          boxShadow: agentRunning ? '0 0 8px var(--g)' : 'none',
          animation: agentRunning ? 'pulse 1.8s infinite' : 'none'
        }}/>
        <span style={{ fontSize:10, color:'var(--tm)', letterSpacing:1 }}>AGENT {agentStatus}</span>
        <div style={{ fontSize:10, background:'var(--s2)', border:'1px solid var(--bd)', padding:'3px 10px', borderRadius:2, color:'var(--g)' }}>
          {callCount} CLI CALLS
        </div>
        <button onClick={onKeysClick} style={{
          padding:'0 10px', height:26, background:'transparent',
          border:'1px solid var(--bd)', color:'var(--tm)', fontSize:10,
          borderRadius:2, letterSpacing:1,
          cursor:'pointer'
        }}>
          ⚙ API KEYS
        </button>
      </div>
    </header>
  )
}
