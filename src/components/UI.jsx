import React from 'react'

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--bd)',
      borderRadius: 'var(--radius)', overflow: 'hidden', ...style
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, dotColor, children }) {
  return (
    <div style={{
      background: 'var(--s1)', borderBottom: '1px solid var(--bd)',
      padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: dotColor || 'var(--g)'
        }} />
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          letterSpacing: '1.5px', color: 'var(--tm)', textTransform: 'uppercase'
        }}>{title}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{children}</div>
    </div>
  )
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'default', disabled, style }) {
  const base = {
    padding: '0 14px', height: 30,
    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.5px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 1, transition: 'all 0.15s',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    whiteSpace: 'nowrap', opacity: disabled ? 0.38 : 1,
  }
  const variants = {
    default: { background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tm)' },
    primary: { background: 'var(--g)',  border: '1px solid var(--g)',  color: '#000', fontWeight: 700 },
    danger:  { background: 'rgba(255,51,85,0.08)', border: '1px solid var(--r)', color: 'var(--r)' },
    cyan:    { background: 'rgba(0,229,255,0.06)', border: '1px solid var(--c)', color: 'var(--c)' },
    amber:   { background: 'rgba(255,183,0,0.08)', border: '1px solid var(--a)', color: 'var(--a)' },
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

// ── INPUT GROUP ───────────────────────────────────────────────────────────────
export function InputGroup({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--s1)', border: '1px solid var(--bd)',
      borderRadius: 1, overflow: 'hidden'
    }}>
      {label && (
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.5px',
          color: 'var(--tm)', padding: '0 10px', height: 30,
          display: 'flex', alignItems: 'center',
          borderRight: '1px solid var(--bd)', background: 'var(--bg)',
          whiteSpace: 'nowrap'
        }}>{label}</span>
      )}
      {children}
    </div>
  )
}

export function Select({ value, onChange, children, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: 'transparent', border: 'none',
      color: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 12,
      padding: '0 10px', height: 30, outline: 'none', cursor: 'pointer',
      minWidth: 80, ...style
    }}>
      {children}
    </select>
  )
}

export function TextInput({ value, onChange, placeholder, style, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: 'transparent', border: 'none',
        color: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 12,
        padding: '0 10px', height: 30, outline: 'none',
        minWidth: 120, ...style
      }}
    />
  )
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, style }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--bd)',
      borderRadius: 'var(--radius)', padding: '14px',
      position: 'relative', overflow: 'hidden',
      animation: 'fadeUp 0.4s ease both',
      ...style
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, var(--g), transparent)',
        opacity: 0.35
      }} />
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '2px',
        color: 'var(--tm)', textTransform: 'uppercase', marginBottom: 7
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--orb)', fontSize: 22, fontWeight: 700,
        letterSpacing: 1, color: color || 'var(--t2)', lineHeight: 1
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--tm)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

// ── TABLE ─────────────────────────────────────────────────────────────────────
export function Table({ headers, children }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{
              padding: '8px 12px', textAlign: 'left',
              fontSize: 9, letterSpacing: '1.5px', color: 'var(--tm)',
              borderBottom: '1px solid var(--bd)', background: 'var(--s1)',
              fontWeight: 400, textTransform: 'uppercase', whiteSpace: 'nowrap'
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function TR({ children, onClick }) {
  return (
    <tr onClick={onClick} style={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background 0.1s',
      animation: 'slideInLeft 0.25s ease both'
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,136,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </tr>
  )
}

export function TD({ children, style }) {
  return (
    <td style={{
      padding: '9px 12px',
      borderBottom: '1px solid rgba(26,42,28,0.4)',
      whiteSpace: 'nowrap', ...style
    }}>
      {children}
    </td>
  )
}

// ── TAG ───────────────────────────────────────────────────────────────────────
const TAG_STYLES = {
  sm:     { bg: 'rgba(0,255,136,0.1)',    border: 'rgba(0,255,136,0.25)',   color: 'var(--g)' },
  whale:  { bg: 'rgba(0,229,255,0.1)',    border: 'rgba(0,229,255,0.25)',   color: 'var(--c)' },
  degen:  { bg: 'rgba(255,51,85,0.1)',    border: 'rgba(255,51,85,0.25)',   color: 'var(--r)' },
  vc:     { bg: 'rgba(255,183,0,0.1)',    border: 'rgba(255,183,0,0.25)',   color: 'var(--a)' },
  fund:   { bg: 'rgba(170,102,255,0.1)',  border: 'rgba(170,102,255,0.25)', color: 'var(--p)' },
}

export function Tag({ type, children }) {
  const s = TAG_STYLES[type] || TAG_STYLES.sm
  return (
    <span style={{
      display: 'inline-block', fontSize: 8,
      padding: '2px 5px', borderRadius: 1,
      letterSpacing: '0.5px', textTransform: 'uppercase',
      background: s.bg, border: `1px solid ${s.border}`, color: s.color
    }}>
      {children}
    </span>
  )
}

// ── CHAIN TABS ────────────────────────────────────────────────────────────────
export function ChainTabs({ chains, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {chains.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.5px',
          padding: '4px 10px', borderRadius: 1, cursor: 'pointer',
          border: `1px solid ${active === c ? 'var(--g)' : 'var(--bd)'}`,
          background: active === c ? 'rgba(0,255,136,0.07)' : 'transparent',
          color: active === c ? 'var(--g)' : 'var(--tm)',
          transition: 'all 0.15s'
        }}>
          {c.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ── AI INSIGHT BOX ────────────────────────────────────────────────────────────
export function AIInsight({ text, loading }) {
  return (
    <div style={{
      background: 'rgba(0,255,136,0.03)',
      border: '1px solid rgba(0,255,136,0.15)',
      borderLeft: '3px solid var(--g)',
      padding: '12px 14px', borderRadius: 1
    }}>
      <div style={{
        fontSize: 9, color: 'var(--g)', letterSpacing: '2px',
        textTransform: 'uppercase', marginBottom: 6
      }}>◆ CLAUDE AI SIGNAL ANALYSIS</div>
      {loading ? (
        <div>
          <span className="skel" style={{ width: '80%', marginBottom: 6 }} />
          <span className="skel" style={{ width: '60%' }} />
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.65 }}>{text}</div>
      )}
    </div>
  )
}

// ── LOADING SKELETON ROW ──────────────────────────────────────────────────────
export function SkeletonRows({ cols = 4, rows = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} style={{ padding: '12px' }}>
          <span className="skel" style={{ width: `${40 + Math.random() * 50}%` }} />
        </td>
      ))}
    </tr>
  ))
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--s1)', border: '1px solid var(--bd)',
        borderRadius: 2, width: '100%', maxWidth: 520,
        animation: 'fadeUp 0.25s ease'
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--bd)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontFamily: 'var(--orb)', fontSize: 12, color: 'var(--g)', letterSpacing: 2 }}>{title}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--tm)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1
          }}>✕</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  )
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div style={{ height: 4, background: 'var(--bd)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 2,
        background: color || 'var(--g)',
        transition: 'width 1s ease'
      }} />
    </div>
  )
}
