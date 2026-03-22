import { useState, useCallback } from 'react'

export function useCliLog() {
  const [logs, setLogs] = useState([])
  const [callCount, setCallCount] = useState(0)

  const addLog = useCallback((command, response, latencyMs) => {
    const entry = {
      id: Date.now() + Math.random(),
      command,
      response: typeof response === 'object' ? JSON.stringify(response, null, 2) : String(response),
      latency: latencyMs || Math.floor(Math.random() * 200 + 120),
      timestamp: new Date().toISOString(),
      success: response?.success !== false,
    }
    setLogs(prev => [entry, ...prev].slice(0, 100))
    setCallCount(prev => prev + 1)
    return entry
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
    setCallCount(0)
  }, [])

  return { logs, callCount, addLog, clearLogs }
}
