'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AGENTS } from '@/lib/constants'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent_role?: string
  timestamp: number
}
type Conv = { id: string; agent_role: string; agent_name: string; title: string; last_msg?: string }

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

function AgentSelector({ onSelect }: { onSelect: (role: string) => void }) {
  return (
    <div style={{ padding: '24px 20px' }}>
      <p style={{ fontSize: 11, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
        ¿Con qué agente quieres hablar?
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {Object.entries(AGENTS).map(([role, ag]) => (
          <button key={role} onClick={() => onSelect(role)} style={{
            background: '#0a0a0a', border: `1px solid ${ag.color}20`, color: '#ccc',
            padding: '13px 16px', borderRadius: 2, cursor: 'pointer', textAlign: 'left',
            transition: 'all .2s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 12,
          }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = `${ag.color}10`; el.style.borderColor = `${ag.color}44` }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#0a0a0a'; el.style.borderColor = `${ag.color}20` }}
          >
            <span style={{ fontSize: 20, color: ag.color, width: 28, textAlign: 'center' }}>{ag.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#ddd' }}>{ag.label} Agent</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#444' }}>{ag.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MsgBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const ag     = AGENTS[msg.agent_role as keyof typeof AGENTS]
  const color  = ag?.color ?? '#4af0c8'
  if (msg.role === 'system') return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <span style={{ fontSize: 10, color: '#2a2a2a', fontFamily: 'monospace' }}>{msg.content}</span>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 10, marginBottom: 18, animation: 'fadeIn .25s ease' }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color }}>
          {ag?.icon ?? '◈'}
        </div>
      )}
      <div style={{ maxWidth: '75%' }}>
        {!isUser && <p style={{ fontSize: 10, color, marginBottom: 4, fontFamily: 'monospace' }}>{ag?.label ?? msg.agent_role} Agent</p>}
        <div style={{ background: isUser ? '#141414' : '#0d0d0d', border: isUser ? '1px solid #222' : `1px solid ${color}18`, borderRadius: isUser ? '12px 12px 2px 12px' : '2px 12px 12px 12px', padding: '11px 14px' }}>
          <p style={{ margin: 0, fontSize: 13, color: isUser ? '#bbb' : '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 9, color: '#2a2a2a', textAlign: isUser ? 'right' : 'left' }}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  )
}

function Thinking({ role }: { role: string }) {
  const ag = AGENTS[role as keyof typeof AGENTS]
  const c  = ag?.color ?? '#4af0c8'
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `${c}18`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: c }}>{ag?.icon}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', background: '#0d0d0d', border: `1px solid ${c}18`, borderRadius: '2px 12px 12px 12px' }}>
        {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: c, display: 'inline-block', animation: `pulse-dot 1.2s ease ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  )
}

const SUGGESTIONS: Record<string, string[]> = {
  ceo:        ['Analiza mi negocio actual', 'Plan estratégico a 6 meses', 'Mis 3 mayores riesgos'],
  research:   ['Mercado SaaS B2B en LATAM', 'Análisis de competidores', 'Tendencias e-commerce Colombia'],
  commercial: ['Diseña un funnel de ventas', 'Mejorar tasa de conversión', 'Script cold outreach'],
  content:    ['Plan de contenido mensual', 'Post LinkedIn viral', 'Estrategia Instagram'],
  finance:    ['Proyección financiera 12 meses', 'Punto de equilibrio', 'Estructura costos SaaS'],
  operations: ['Optimizar onboarding', 'KPIs clave', 'Automatizaciones prioritarias'],
}

export default function AgentChat() {
  const [selectedRole,  setSelectedRole]  = useState<string | null>(null)
  const [convId,        setConvId]        = useState<string | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [thinking,      setThinking]      = useState(false)
  const [convList,      setConvList]      = useState<Conv[]>([])
  const [sidebar,       setSidebar]       = useState(true)
  const wsRef     = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const loadConvList = useCallback(async () => {
    try { setConvList(await apiFetch<Conv[]>('/chat/conversations')) } catch (_) {}
  }, [])

  useEffect(() => { loadConvList() }, [loadConvList])

  useEffect(() => {
    if (!convId) return
    const ws = new WebSocket(`ws://localhost:8000/chat/ws/${convId}`)
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.type === 'thinking') { setThinking(true) }
        else if (d.type === 'response') {
          setThinking(false)
          setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: d.response, agent_role: d.agent_role, timestamp: Date.now() }])
          loadConvList()
        } else if (d.type === 'error') {
          setThinking(false)
          setMessages(p => [...p, { id: Date.now().toString(), role: 'system', content: `⚠ ${d.message}`, timestamp: Date.now() }])
        }
      } catch (_) {}
    }
    wsRef.current = ws
    return () => ws.close()
  }, [convId, loadConvList])

  async function startConversation(role: string) {
    const ag   = AGENTS[role as keyof typeof AGENTS]
    const conv = await apiFetch<{ id: string }>('/chat/conversations', {
      method: 'POST', body: JSON.stringify({ agent_role: role, title: `Chat con ${ag.label} Agent` }),
    })
    setSelectedRole(role); setConvId(conv.id)
    setMessages([{ id: 'w', role: 'system', content: `Conversación iniciada con ${ag.label} Agent`, timestamp: Date.now() }])
    loadConvList()
  }

  async function loadConversation(conv: Conv) {
    setSelectedRole(conv.agent_role); setConvId(conv.id)
    try {
      const msgs = await apiFetch<Array<{ id: string; role: string; content: string; agent_role: string; created_at: string }>>(`/chat/conversations/${conv.id}/messages`)
      setMessages(msgs.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content, agent_role: m.agent_role, timestamp: new Date(m.created_at).getTime() })))
    } catch (_) {}
  }

  function send() {
    if (!input.trim() || !wsRef.current || !selectedRole || thinking) return
    const text = input.trim(); setInput('')
    setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() }])
    wsRef.current.send(JSON.stringify({ agent_role: selectedRole, message: text }))
    setThinking(true); inputRef.current?.focus()
  }

  const ag      = selectedRole ? AGENTS[selectedRole as keyof typeof AGENTS] : null
  const agColor = ag?.color ?? '#4af0c8'

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      {sidebar && (
        <div style={{ width: 240, flexShrink: 0, background: '#080808', borderRight: '1px solid #111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Conversaciones</span>
            <button onClick={() => { setSelectedRole(null); setConvId(null); setMessages([]) }} style={{ background: '#141414', border: '1px solid #1e1e1e', color: '#c8f04a', padding: '3px 9px', borderRadius: 2, fontSize: 9, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit' }}>+ Nueva</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {convList.length === 0
              ? <p style={{ fontSize: 11, color: '#222', padding: '16px', textAlign: 'center' }}>Sin conversaciones aún</p>
              : convList.map(c => {
                const cag    = AGENTS[c.agent_role as keyof typeof AGENTS]
                const active = c.id === convId
                return (
                  <div key={c.id} onClick={() => loadConversation(c)} style={{ padding: '10px 14px', cursor: 'pointer', background: active ? '#0f0f0f' : 'transparent', borderLeft: active ? `2px solid ${cag?.color ?? '#888'}` : '2px solid transparent', transition: 'background .15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: cag?.color ?? '#888' }}>{cag?.icon ?? '○'}</span>
                      <span style={{ fontSize: 11, color: active ? '#ddd' : '#888', fontWeight: active ? 600 : 400 }}>{cag?.label} Agent</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 10, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last_msg ?? c.title}</p>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #111', background: '#060606', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setSidebar(s => !s)} style={{ background: 'transparent', border: 'none', color: '#333', cursor: 'pointer', fontSize: 16, padding: 0 }}>☰</button>
            {ag ? (
              <>
                <span style={{ fontSize: 16, color: agColor }}>{ag.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#ddd' }}>{ag.label} Agent</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#333' }}>{ag.desc}</p>
                </div>
              </>
            ) : <span style={{ fontSize: 12, color: '#333' }}>Selecciona un agente para comenzar</span>}
          </div>
          {ag && <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, background: `${agColor}12`, color: agColor, border: `1px solid ${agColor}25` }}>{thinking ? '● pensando...' : '● conectado'}</span>}
        </div>

        {/* Mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
          {!convId ? <AgentSelector onSelect={startConversation} />
            : messages.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <span style={{ fontSize: 32, color: agColor }}>{ag?.icon}</span>
                <p style={{ fontSize: 13, color: '#444', marginTop: 12 }}>Hola, soy el {ag?.label} Agent</p>
                <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 4 }}>{ag?.desc}</p>
              </div>
            ) : (
              <>
                {messages.map(m => <MsgBubble key={m.id} msg={m} />)}
                {thinking && selectedRole && <Thinking role={selectedRole} />}
                <div ref={bottomRef} />
              </>
            )
          }
        </div>

        {/* Input */}
        {convId && (
          <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #111', flexShrink: 0 }}>
            {messages.length <= 1 && selectedRole && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {(SUGGESTIONS[selectedRole] ?? []).map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); inputRef.current?.focus() }} style={{ background: '#0a0a0a', border: `1px solid ${agColor}20`, color: '#555', padding: '4px 10px', borderRadius: 20, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.color = agColor; el.style.borderColor = `${agColor}44` }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.color = '#555'; el.style.borderColor = `${agColor}20` }}
                  >{s}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea ref={inputRef} rows={1} disabled={thinking}
                style={{ flex: 1, background: '#0a0a0a', border: `1px solid ${agColor}30`, color: '#ccc', padding: '10px 14px', borderRadius: 2, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, minHeight: 44, transition: 'border-color .2s' }}
                placeholder={`Escríbele al ${ag?.label} Agent... (Enter envía)`}
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                onFocus={e => (e.target.style.borderColor = agColor)}
                onBlur={e => (e.target.style.borderColor = `${agColor}30`)}
              />
              <button onClick={send} disabled={!input.trim() || thinking} style={{ background: (!input.trim() || thinking) ? '#111' : agColor, color: (!input.trim() || thinking) ? '#333' : '#000', border: 'none', width: 44, height: 44, borderRadius: 2, fontSize: 16, cursor: (!input.trim() || thinking) ? 'not-allowed' : 'pointer', transition: 'all .2s', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {thinking ? <span style={{ fontSize: 14, animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> : '↑'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
