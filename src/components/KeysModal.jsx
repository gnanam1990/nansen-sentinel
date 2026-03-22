import React, { useState } from 'react'
import { Modal, Btn, InputGroup, TextInput } from './UI'

const PROVIDERS = [
  { id: 'anthropic', label: 'Claude (Anthropic)', placeholder: 'sk-ant-...', help: 'console.anthropic.com' },
  { id: 'openai',    label: 'OpenAI (GPT-4o)',    placeholder: 'sk-...', help: 'platform.openai.com' },
  { id: 'kimi',      label: 'Kimi (Moonshot)',     placeholder: 'sk-...', help: 'platform.moonshot.cn' },
  { id: 'ollama',    label: 'Ollama (Local)',       placeholder: 'No key needed', help: 'localhost:11434' },
]

export default function KeysModal({ open, onClose, keys, onSave }) {
  const [nansenKey, setNansenKey]     = useState(keys.nansen || '')
  const [aiKey, setAiKey]             = useState(keys.aiKey || '')
  const [provider, setProvider]       = useState(keys.provider || 'anthropic')
  const [ollamaUrl, setOllamaUrl]     = useState(keys.ollamaUrl || 'http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState(keys.ollamaModel || 'llama3.1')
  const [demoMode, setDemoMode]       = useState(keys.demoMode ?? true)

  const currentProvider = PROVIDERS.find(p => p.id === provider)
  const needsKey = provider !== 'ollama'

  const handleSave = () => {
    onSave({
      nansen: nansenKey.trim(),
      aiKey: aiKey.trim(),
      provider,
      ollamaUrl: ollamaUrl.trim(),
      ollamaModel: ollamaModel.trim(),
      demoMode,
    })
    onClose()
  }

  const hasAiKey = demoMode || (provider === 'ollama' ? true : !!aiKey)

  return (
    <Modal open={open} onClose={onClose} title="API KEYS -- CONFIGURATION">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Demo mode toggle */}
        <div style={{
          background: demoMode ? 'rgba(255,183,0,0.06)' : 'rgba(0,255,136,0.06)',
          border: `1px solid ${demoMode ? 'rgba(255,183,0,0.25)' : 'rgba(0,255,136,0.25)'}`,
          borderLeft: `3px solid ${demoMode ? 'var(--a)' : 'var(--g)'}`,
          padding: '10px 14px', borderRadius: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', color: demoMode ? 'var(--a)' : 'var(--g)', marginBottom: 3 }}>
              {demoMode ? 'DEMO MODE -- REALISTIC MOCK DATA' : 'LIVE MODE -- REAL API DATA'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--tm)' }}>
              {demoMode
                ? 'No API keys needed. Realistic mock data for judging. Toggle off for live on-chain data.'
                : 'LIVE MODE active — each action uses Nansen API credits. Free tier has limited credits, use sparingly.'}
            </div>
          </div>
          <button
            onClick={() => setDemoMode(d => !d)}
            style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
              background: demoMode ? 'var(--bd2)' : 'var(--g)',
              border: 'none', position: 'relative', flexShrink: 0,
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: demoMode ? 3 : 23,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s'
            }} />
          </button>
        </div>

        {/* Nansen API Key */}
        <div>
          <div style={{ fontSize: 9, color: 'var(--tm)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
            NANSEN API KEY
          </div>
          <InputGroup>
            <TextInput
              type="password"
              value={nansenKey}
              onChange={setNansenKey}
              placeholder="Get from app.nansen.ai/api"
              style={{ width: '100%', minWidth: 280 }}
            />
          </InputGroup>
          <div style={{ fontSize: 10, color: 'var(--tm)', marginTop: 4 }}>
            Free tier available at{' '}
            <a href="https://app.nansen.ai/api" target="_blank" rel="noreferrer"
              style={{ color: 'var(--g)' }}>app.nansen.ai/api</a>
          </div>
        </div>

        {/* AI Provider Selection */}
        <div>
          <div style={{ fontSize: 9, color: 'var(--tm)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
            AI PROVIDER
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                style={{
                  padding: '6px 12px', fontFamily: 'var(--mono)',
                  fontSize: 10, letterSpacing: '0.8px', cursor: 'pointer',
                  background: provider === p.id ? 'rgba(0,255,136,0.1)' : 'var(--s1)',
                  border: `1px solid ${provider === p.id ? 'var(--g)' : 'var(--bd)'}`,
                  color: provider === p.id ? 'var(--g)' : 'var(--tm)',
                  borderRadius: 1, transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI API Key (not needed for Ollama) */}
        {needsKey && (
          <div>
            <div style={{ fontSize: 9, color: 'var(--tm)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
              {currentProvider.label} API KEY
            </div>
            <InputGroup>
              <TextInput
                type="password"
                value={aiKey}
                onChange={setAiKey}
                placeholder={currentProvider.placeholder}
                style={{ width: '100%', minWidth: 280 }}
              />
            </InputGroup>
            <div style={{ fontSize: 10, color: 'var(--tm)', marginTop: 4 }}>
              Get from{' '}
              <span style={{ color: 'var(--g)' }}>{currentProvider.help}</span>
              {' '}-- powers AI Roast, Agent Arena, and Alpha Briefing
            </div>
          </div>
        )}

        {/* Ollama Settings */}
        {provider === 'ollama' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 9, color: 'var(--tm)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                OLLAMA URL
              </div>
              <InputGroup>
                <TextInput
                  value={ollamaUrl}
                  onChange={setOllamaUrl}
                  placeholder="http://localhost:11434"
                  style={{ width: '100%' }}
                />
              </InputGroup>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'var(--tm)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                MODEL
              </div>
              <InputGroup>
                <TextInput
                  value={ollamaModel}
                  onChange={setOllamaModel}
                  placeholder="llama3.1"
                  style={{ width: '100%' }}
                />
              </InputGroup>
            </div>
          </div>
        )}

        {/* Feature availability */}
        <div style={{
          background: 'var(--s1)', border: '1px solid var(--bd)',
          padding: '10px 14px', borderRadius: 1, fontSize: 10
        }}>
          <div style={{ color: 'var(--tm)', marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>
            FEATURE AVAILABILITY
          </div>
          {[
            { label: 'Smart Money Scanner', needs: 'Nansen Key', available: demoMode || !!nansenKey },
            { label: 'Wallet Roaster (data)', needs: 'Nansen Key', available: demoMode || !!nansenKey },
            { label: `Wallet Roaster (${currentProvider.label})`, needs: 'AI Key', available: hasAiKey },
            { label: 'Agent Arena', needs: 'Both keys', available: demoMode || ((!!nansenKey) && hasAiKey) },
            { label: 'Alpha Briefing', needs: 'Both keys', available: demoMode || ((!!nansenKey) && hasAiKey) },
            { label: 'Autonomous Agent', needs: 'Both keys', available: demoMode || ((!!nansenKey) && hasAiKey) },
          ].map(f => (
            <div key={f.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 5
            }}>
              <span style={{ color: 'var(--t2)' }}>{f.label}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--tm)' }}>{f.needs}</span>
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 1,
                  background: f.available ? 'rgba(0,255,136,0.1)' : 'rgba(255,51,85,0.1)',
                  border: `1px solid ${f.available ? 'rgba(0,255,136,0.25)' : 'rgba(255,51,85,0.25)'}`,
                  color: f.available ? 'var(--g)' : 'var(--r)'
                }}>
                  {f.available ? 'AVAILABLE' : 'NEEDS KEY'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Security note */}
        <div style={{ fontSize: 10, color: 'var(--tm)', lineHeight: 1.6 }}>
          Keys are stored in browser memory only and never persisted.
          All LLM calls route through the local server proxy.
          {provider === 'ollama' && ' Ollama runs entirely on your machine — no data leaves your network.'}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onClose}>CANCEL</Btn>
          <Btn variant="primary" onClick={handleSave}>SAVE CONFIGURATION</Btn>
        </div>
      </div>
    </Modal>
  )
}
