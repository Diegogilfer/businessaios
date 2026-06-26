// ============================================================
// BusinessAIOS - src/hooks/useWebSocket.ts
// Hook para WebSocket con auto-reconnect robusto
// (resistente a React StrictMode double-mount en desarrollo)
// ============================================================
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type WSEvent = {
  event: string
  data?: Record<string, unknown>
  _ts: number
}

export function useWebSocket(taskId?: string) {
  const [events, setEvents]       = useState<WSEvent[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef        = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closedRef    = useRef(false)   // true = desmontado intencionalmente

  useEffect(() => {
    closedRef.current = false

    const base = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000').replace(/\/$/, '')
    const url  = taskId ? `${base}/ws/${taskId}` : `${base}/ws`

    function open() {
      if (closedRef.current) return
      let ws: WebSocket
      try {
        ws = new WebSocket(url)
      } catch (_) {
        return
      }
      wsRef.current = ws

      ws.onopen = () => { if (!closedRef.current) setConnected(true) }

      ws.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data) as Omit<WSEvent, '_ts'>
          setEvents(prev => [{ ...ev, _ts: Date.now() }, ...prev].slice(0, 50))
        } catch (_) {}
      }

      ws.onclose = () => {
        setConnected(false)
        // Solo reconectar si NO fue un cierre intencional (desmontaje)
        if (!closedRef.current) {
          reconnectRef.current = setTimeout(open, 3000)
        }
      }

      // onerror: dejamos que onclose maneje la reconexión (evita doble disparo)
      ws.onerror = () => {}
    }

    open()

    return () => {
      closedRef.current = true
      if (reconnectRef.current) clearTimeout(reconnectRef.current)

      const ws = wsRef.current
      if (!ws) return

      // Quitamos los handlers ANTES de cerrar para que onclose no reprograme reconnect
      ws.onmessage = null
      ws.onerror   = null
      ws.onclose   = null

      if (ws.readyState === WebSocket.OPEN) {
        ws.onopen = null
        ws.close()
      } else if (ws.readyState === WebSocket.CONNECTING) {
        // Cerrar un socket en CONNECTING lanza el warning "closed before established".
        // En su lugar, esperamos a que abra y lo cerramos limpiamente.
        ws.onopen = () => ws.close()
      }
    }
  }, [taskId])

  const clear = useCallback(() => setEvents([]), [])
  return { events, connected, clear }
}
