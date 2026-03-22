import React, { useState, useCallback, useEffect } from 'react'
import Header from './components/Header'
import MissionFeed from './components/MissionFeed'
import SmartMoneyScanner from './components/SmartMoneyScanner'
import WalletRoaster from './components/WalletRoaster'
import AgentArena from './components/AgentArena'
import AlphaBriefing from './components/AlphaBriefing'
import AlertsPanel from './components/AlertsPanel'
import CLIFeed from './components/CLIFeed'
import KeysModal from './components/KeysModal'
import { useCliLog } from './hooks/useCliLog'
import { useAgent } from './hooks/useAgent'
import { setLLMConfig, setNansenKey, setDemoMode } from './lib/nansenApi'

const TABS = [
  { id: 'mission',  label: 'MISSION FEED',   icon: '◆' },
  { id: 'scanner',  label: 'SM SCANNER',     icon: '⊙' },
  { id: 'wallet',   label: 'WALLET ROASTER', icon: '◇' },
  { id: 'arena',    label: 'AGENT ARENA',    icon: '⚔' },
  { id: 'briefing', label: 'ALPHA BRIEFING', icon: '✎' },
  { id: 'alerts',   label: 'ALERTS',         icon: '⚠', badge: true },
  { id: 'cli',      label: 'CLI FEED',       icon: '>_' },
]

export default function App() {
  const [tab, setTab]           = useState('mission')
  const [keysOpen, setKeysOpen] = useState(false)
  const [keys, setKeys]         = useState({ nansen: '', aiKey: '', provider: 'anthropic', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3.1', demoMode: true })

  // Sync LLM + Nansen + demo mode config whenever keys change
  useEffect(() => {
    setNansenKey(keys.nansen)
    setDemoMode(keys.demoMode)
    setLLMConfig({
      provider: keys.provider,
      apiKey: keys.aiKey,
      model: keys.provider === 'ollama' ? keys.ollamaModel : '',
      baseUrl: keys.provider === 'ollama' ? keys.ollamaUrl : '',
    })
  }, [keys])

  const { logs, callCount, addLog, clearLogs } = useCliLog()

  // For Ollama, no API key needed — use a truthy placeholder so components know AI is available
  const effectiveAiKey = keys.provider === 'ollama' ? 'ollama-local' : keys.aiKey

  const agent = useAgent({
    nansenKey:    keys.nansen,
    anthropicKey: effectiveAiKey,
    addLog,
    demoMode:     keys.demoMode,
  })

  const handleStalker = useCallback((address) => {
    agent.addAlert(
      `WHALE STALKER ACTIVATED — ${address.slice(0, 16)}...`,
      `Agent now monitoring every transaction from this wallet. Firing instant alerts on any move via nansen research profiler txs.`,
      'WATCH'
    )
    setTab('mission')
    if (!agent.running) agent.start()
  }, [agent])

  const handleSimulateAlert = useCallback(() => {
    const DEMOS = [
      { t: 'FRESH SIGNAL — JTO Accumulation', d: '3 VC-linked wallets entered JTO simultaneously. $1.2M total. Pattern matches pre-listing accumulation.', tok: 'JTO' },
      { t: 'WHALE MOVE — $8M ETH from Coinbase', d: 'Large wallet withdrew $8M ETH from exchange. Historically precedes DeFi deployment. Watch AAVE/Compound.', tok: 'ETH' },
      { t: 'PERP ALERT — SOL Funding Rate Spike', d: 'SOL perp funding rate jumped to 0.08%. Overleveraged longs. Squeeze risk if price drops 5%.', tok: 'SOL' },
      { t: 'DISTRIBUTION — BONK — SM Wallets Exiting', d: '$4.8M BONK sold by labeled SM wallets into retail strength. Classic exit liquidity setup.', tok: 'BONK' },
    ]
    const a = DEMOS[Math.floor(Math.random() * DEMOS.length)]
    agent.addAlert(a.t, a.d, a.tok)
    addLog('nansen research sm dex-trades --chain solana --smart-money --limit 5',
      { success: true, data: { alert: a.t } }, 132)
  }, [agent, addLog])

  return (
    <>
      <div className="grid-bg" />
      <div className="radial-bg" />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        <Header
          callCount={callCount}
          agentRunning={agent.running}
          demoMode={keys.demoMode}
          onKeysClick={() => setKeysOpen(true)}
        />

        {/* Nav */}
        <nav style={{
          display: 'flex', background: 'var(--s1)',
          borderBottom: '1px solid var(--bd)',
          overflowX: 'auto', flexShrink: 0,
          position: 'sticky', top: 52, zIndex: 190,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '11px 18px', fontFamily: 'var(--mono)',
              fontSize: 10, letterSpacing: '1.2px',
              color: tab === t.id ? 'var(--g)' : 'var(--tm)',
              cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.id ? 'var(--g)' : 'transparent'}`,
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              background: 'transparent',
              display: 'flex', alignItems: 'center', gap: 7,
              whiteSpace: 'nowrap', transition: 'color 0.15s',
            }}>
              <span style={{ fontSize: 13 }}>{t.icon}</span>
              {t.label}
              {t.badge && agent.alerts.length > 0 && (
                <span style={{
                  fontSize: 8, background: 'var(--r)', color: '#fff',
                  padding: '1px 5px', borderRadius: 1, fontWeight: 700,
                }}>
                  {agent.alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main style={{ flex: 1, padding: 18 }}>
          {tab === 'mission'  && <MissionFeed running={agent.running} feed={agent.feed} cycles={agent.cycles} signals={agent.signals} alerts={agent.alerts} topSignal={agent.topSignal} onStart={agent.start} onStop={agent.stop} />}
          {tab === 'scanner'  && <SmartMoneyScanner nansenKey={keys.nansen} anthropicKey={effectiveAiKey} addLog={addLog} demoMode={keys.demoMode} />}
          {tab === 'wallet'   && <WalletRoaster nansenKey={keys.nansen} anthropicKey={effectiveAiKey} addLog={addLog} demoMode={keys.demoMode} onStalker={handleStalker} />}
          {tab === 'arena'    && <AgentArena nansenKey={keys.nansen} anthropicKey={effectiveAiKey} addLog={addLog} demoMode={keys.demoMode} />}
          {tab === 'briefing' && <AlphaBriefing nansenKey={keys.nansen} anthropicKey={effectiveAiKey} addLog={addLog} demoMode={keys.demoMode} />}
          {tab === 'alerts'   && <AlertsPanel alerts={agent.alerts} onSimulate={handleSimulateAlert} />}
          {tab === 'cli'      && <CLIFeed logs={logs} callCount={callCount} onClear={clearLogs} />}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--bd)', padding: '8px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--s1)', flexShrink: 0,
          fontSize: 9, color: 'var(--tm)', letterSpacing: '0.5px',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span>NANSEN SENTINEL — Nansen CLI Build Challenge 2026 — #NansenCLI @nansen_ai</span>
          <span style={{ display: 'flex', gap: 12 }}>
            <span>Nansen CLI <span style={{ color: 'var(--g)' }}>+</span> Multi-LLM AI</span>
            <span style={{ color: 'var(--bd2)' }}>|</span>
            <span>{callCount} CLI calls this session</span>
          </span>
        </footer>
      </div>

      <KeysModal open={keysOpen} onClose={() => setKeysOpen(false)} keys={keys} onSave={setKeys} />
    </>
  )
}
