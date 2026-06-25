// ============================================================
// BusinessAIOS - src/hooks/useWebSocket.ts
// Hook para WebSocket con auto-reconnect
// ============================================================
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type WSEvent = {
  event: string
  data?: Record<string, unknown>
  _ts: number
}

export function useWebSocket(taskId?: string) {
  const [events, setEvents]     = useState<WSEvent[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    const base = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000').replace(/\/$/, '')
    const url = taskId ? `${base}/ws/${taskId}` : `${base}/ws`
    try {
      const ws = new WebSocket(url)
      ws.onopen    = () => setConnected(true)
      ws.onclose   = () => { setConnected(false); setTimeout(connect, 3000) }
      ws.onerror   = () => ws.close()
      ws.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data) as Omit<WSEvent, '_ts'>
          setEvents(prev => [{ ...ev, _ts: Date.now() }, ...prev].slice(0, 50))
        } catch (_) {}
      }
      wsRef.current = ws
    } catch (_) {}
  }, [taskId])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])

  const clear = () => setEvents([])
  return { events, connected, clear }
}
