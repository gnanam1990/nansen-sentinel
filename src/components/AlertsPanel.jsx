import React from 'react'
import { Btn, Card, CardHeader, InputGroup, Select } from './UI'

export default function AlertsPanel({ alerts, onSimulate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn variant="primary" onClick={onSimulate}>+ SIMULATE ALERT</Btn>
        <InputGroup label="THRESHOLD">
          <Select value="high" onChange={() => {}}>
            <option value="any">Any SM Activity</option>
            <option value="high">High Confidence Only</option>
            <option value="whale">Whales Only ($1M+)</option>
          </Select>
        </InputGroup>
        <span style={{ fontSize: 10, color: 'var(--tm)' }}>
          Agent fires alerts automatically when thresholds are breached
        </span>
      </div>

      {/* Alert info box */}
      <div style={{
        background: 'rgba(255,51,85,0.04)',
        border: '1px solid rgba(255,51,85,0.15)',
        borderLeft: '3px solid var(--r)',
        padding: '10px 14px', borderRadius: 1,
        fontSize: 11, color: 'var(--t2)', lineHeight: 1.6
      }}>
        <span style={{ color: 'var(--r)', letterSpacing: '1px' }}>⚠ ALERT SYSTEM</span>
        {' '}— Alerts fire automatically from the autonomous agent (Mission Feed tab). Start the agent to enable real-time whale tracking, accumulation detection, and distribution warnings.
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--tm)', fontSize: 11 }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.2 }}>⚠</div>
            No alerts yet. Start the autonomous agent in Mission Feed to generate real-time alerts.
          </div>
        ) : (
          alerts.map(a => (
            <div key={a.id} style={{
              display: 'flex', gap: 10, padding: '12px 14px',
              background: 'rgba(255,51,85,0.06)',
              border: '1px solid rgba(255,51,85,0.18)',
              borderRadius: 1, animation: 'slideInLeft 0.3s ease'
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--r)', fontWeight: 700, marginBottom: 3 }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.55 }}>
                  {a.detail}
                </div>
                {a.token && (
                  <span style={{
                    display: 'inline-block', marginTop: 4,
                    fontSize: 9, padding: '1px 6px', borderRadius: 1,
                    background: 'rgba(0,229,255,0.08)',
                    border: '1px solid rgba(0,229,255,0.2)',
                    color: 'var(--c)', letterSpacing: '0.5px'
                  }}>{a.token}</span>
                )}
              </div>
              <div style={{ fontSize: 9, color: 'var(--tm)', whiteSpace: 'nowrap' }}>
                {a.time}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
