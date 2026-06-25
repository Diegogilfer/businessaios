'use client'
import { useWebSocket, WSEvent } from '@/hooks/useWebSocket'
import { EVENT_COLORS } from '@/lib/constants'

function EventRow({ ev, full = false }: { ev: WSEvent; full?: boolean }) {
  const color = EVENT_COLORS[ev.event] ?? '#555'
  const age   = Math.round((Date.now() - ev._ts) / 1000)
  if (full) return (
    <div style={{
      display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 14,
      padding: '11px 0', borderBottom: '1px solid #111', animation: 'fadeIn .3s ease',
    }}>
      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color }}>{ev.event}</span>
      <pre style={{ margin: 0, fontSize: 10, color: '#444', fontFamily: 'DM Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(ev.data ?? {}, null, 2)}
      </pre>
      <span style={{ fontSize: 10, color: '#2a2a2a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {new Date(ev._ts).toLocaleTimeString()}
      </span>
    </div>
  )
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '7px 0', borderBottom: '1px solid #0e0e0e', animation: 'fadeIn .3s ease',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0, boxShadow: `0 0 5px ${color}`, display: 'inline-block' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10, color, fontFamily: 'monospace' }}>{ev.event}</p>
        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {JSON.stringify(ev.data ?? {}).slice(0, 55)}
        </p>
      </div>
      <span style={{ fontSize: 9, color: '#2a2a2a', fontFamily: 'monospace', flexShrink: 0 }}>{age}s</span>
    </div>
  )
}

export function LiveFeedMini() {
  const { events, connected } = useWebSocket()
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 22, overflow: 'hidden', height: '100%' }}>
      <p style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        Live Events
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? '#c8f04a' : '#333', boxShadow: connected ? '0 0 6px #c8f04a' : 'none', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
      </p>
      {events.length === 0
        ? <p style={{ fontSize: 11, color: '#222', marginTop: 16 }}>Esperando eventos del sistema...</p>
        : events.slice(0, 8).map((ev, i) => <EventRow key={i} ev={ev} />)
      }
    </div>
  )
}

export function LiveFeedFull() {
  const { events, connected, clear } = useWebSocket()
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: '#eee' }}>Live Event Feed</h2>
          <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 3 }}>
            WebSocket ws://localhost:8000/ws ·{' '}
            <span style={{ color: connected ? '#c8f04a' : '#f04a6c' }}>
              {connected ? 'conectado' : 'desconectado'}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#2a2a2a', fontFamily: 'monospace' }}>{events.length} eventos</span>
          <button onClick={clear} style={{ background: 'transparent', border: '1px solid #222', color: '#444', padding: '5px 12px', borderRadius: 2, fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
            Limpiar
          </button>
        </div>
      </div>
      <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 22, maxHeight: 560, overflowY: 'auto' }}>
        {events.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <span style={{ fontSize: 24, color: '#1a1a1a', display: 'block', animation: 'pulse-dot 2s infinite' }}>◌</span>
              <p style={{ fontSize: 11, color: '#222', marginTop: 14 }}>Esperando eventos... Ejecuta una tarea para ver el flujo en tiempo real.</p>
            </div>
          )
          : events.map((ev, i) => <EventRow key={i} ev={ev} full />)
        }
      </div>
    </div>
  )
}
