'use client'
import { useState, useRef, useEffect } from 'react'
import { useAgentTheme } from '@/contexts/AgentThemeContext'
import { createConversation, sendChatMessage, createTask, executeTask } from '@/lib/api'

type Msg = { id: string; role: 'user' | 'assistant'; text: string }

const TAB_SUGGESTIONS: Record<string, string[]> = {
  overview:  [
    '¿Quieres que ejecute una tarea ahora?',
    'Puedo analizar tu negocio en este momento.',
    '¿Exploramos oportunidades de arbitraje juntos?',
  ],
  execute:   [
    '¿Tienes una idea en mente? Escríbela y la ejecuto.',
    'Puedo sugerirte qué analizar según el mercado actual.',
  ],
  projects:  [
    '¿Quieres retomar algún proyecto anterior?',
    '¿Revisamos los resultados de tu última ejecución?',
  ],
  agents:    ['¿Te explico qué hace cada agente y cuándo usarlo?'],
  arbitrage: [
    '¿Ejecuto un escaneo de arbitraje ahora?',
    'Puedo buscar oportunidades en Electronics o Fashion.',
  ],
  knowledge: ['¿Buscamos algo específico en la base de conocimiento?'],
  neuro:     ['¿Quieres una predicción para tu categoría de negocio?'],
  saas:      ['¿Necesitas ayuda para elegir el plan correcto?'],
  security:  ['¿Revisamos el estado de seguridad juntos?'],
}

export default function CompanionPanel({ currentTab }: { currentTab: string }) {
  const { theme, agent, openModal } = useAgentTheme()
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [listening, setListening] = useState(false)
  const [convId, setConvId]     = useState<string | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const inactivity = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Greeting on open
  useEffect(() => {
    if (!open) return
    if (messages.length === 0) {
      const opts = TAB_SUGGESTIONS[currentTab] ?? ['¿En qué te ayudo?']
      const hint = opts[Math.floor(Math.random() * opts.length)]
      push('assistant', `Hola, soy ${theme.name}. ${theme.personality} ${hint}`)
    }
    inputRef.current?.focus()
  }, [open])

  // Proactive inactivity nudge — only when panel is open
  useEffect(() => {
    if (!open) return
    function reset() {
      if (inactivity.current) clearTimeout(inactivity.current)
      inactivity.current = setTimeout(() => {
        const opts = TAB_SUGGESTIONS[currentTab] ?? ['¿Puedo ayudarte con algo?']
        push('assistant', opts[Math.floor(Math.random() * opts.length)])
      }, 3 * 60 * 1000)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    reset()
    return () => {
      if (inactivity.current) clearTimeout(inactivity.current)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [open, currentTab])

  function push(role: 'user' | 'assistant', text: string) {
    setMessages(p => [...p, { id: `${Date.now()}-${Math.random()}`, role, text }])
  }

  async function send(text: string) {
    const t = text.trim()
    if (!t || loading) return
    push('user', t)
    setInput('')
    setLoading(true)

    try {
      // Execute command pattern
      const execM = t.match(/^(?:ejecuta|analiza|crea|run|execute)\s+(.+)/i)
      if (execM) {
        const title = execM[1]
        push('assistant', `Creando tarea: "${title}"...\nTrabajando con los agentes.`)
        try {
          const task = await createTask({
            title, description: title, category: 'general', priority: 1,
          }) as { id: string }
          const res = await executeTask(task.id, true) as Record<string, unknown>
          const txt  = String(res.final_result ?? res.result ?? 'Completado')
          push('assistant', `✓ Completado en ${res.execution_time_seconds ?? '?'}s\n\n${txt.slice(0, 500)}${txt.length > 500 ? '…' : ''}`)
        } catch (e) {
          push('assistant', `Error ejecutando la tarea. ${e instanceof Error ? e.message : 'Verifica el backend.'}`)
        }
      } else {
        // Regular chat with companion agent
        let cid = convId
        if (!cid) {
          try {
            const conv = await createConversation(agent, 'Companion') as Record<string, unknown>
            cid = conv.conversation_id as string
            setConvId(cid)
          } catch (e) {
            push('assistant', `No pude iniciar la conversación. ${e instanceof Error ? e.message : 'Backend no disponible.'}`)
            setLoading(false)
            return
          }
        }
        try {
          const rep = await sendChatMessage(cid, agent, t) as Record<string, unknown>
          push('assistant', rep.response as string)
        } catch (e) {
          push('assistant', `${e instanceof Error ? e.message : 'Error al responder. Verifica que el backend esté activo.'}`)
        }
      }
    } catch (e) {
      push('assistant', `Error inesperado. ${e instanceof Error ? e.message : 'Intenta de nuevo.'}`)
    }
    setLoading(false)
  }

  function startVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Rec) { push('assistant', 'Reconocimiento de voz disponible solo en Chrome.'); return }
    const rec = new Rec()
    rec.lang = 'es-ES'
    rec.continuous = false
    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onresult = (e: { results: { 0: { 0: { transcript: string } } }[] }) =>
      send(e.results[0][0].transcript)
    rec.start()
  }

  const quickCmds = ['Ejecuta una tarea', '¿Cómo funciono?', '¿Qué puedo hacer aquí?']

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        title={`${theme.name} — tu agente acompañante`}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 600,
          width: 50, height: 50, borderRadius: '50%',
          background: open
            ? `${theme.color}22`
            : `linear-gradient(135deg, ${theme.color}cc, ${theme.secondary}aa)`,
          border: `1.5px solid ${theme.color}${open ? '55' : '00'}`,
          boxShadow: open
            ? `0 0 0 1px ${theme.color}25`
            : `0 4px 20px ${theme.dim}, 0 2px 8px rgba(0,0,0,0.4)`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.22s',
          fontSize: open ? 20 : 18,
          color: open ? theme.color : '#000',
          fontWeight: 700,
        }}
      >
        {open ? '×' : theme.icon}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 28, zIndex: 599,
          width: 340, height: 520,
          background: '#07091C',
          border: `1px solid ${theme.color}1a`,
          borderRadius: 14,
          boxShadow: `0 12px 56px rgba(0,0,0,0.6), 0 0 0 1px ${theme.color}0c`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeUp 0.2s ease',
        }}>

          {/* Header — minimalist */}
          <div style={{
            padding: '11px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: theme.color }}>{theme.icon}</span>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.color, lineHeight: 1.2 }}>
                Tu especialista en<br /><span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-2)' }}>{theme.role}</span>
              </div>
            </div>
            <button
              onClick={openModal}
              title="Cambiar agente"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'inherit',
                letterSpacing: '0.05em', padding: '2px 4px',
                transition: 'color 0.15s', textTransform: 'uppercase',
              }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = theme.color)}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.2)')}
            >
              cambiar
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '84%', padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: m.role === 'user' ? `${theme.color}15` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${m.role === 'user' ? theme.color + '28' : 'rgba(255,255,255,0.07)'}`,
                  fontSize: 11.5, color: m.role === 'user' ? '#ddd' : '#b8c0cc',
                  lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '9px 14px', borderRadius: '12px 12px 12px 3px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                  fontSize: 13, color: theme.color,
                }}>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick commands — only on first view */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
              {quickCmds.map(q => (
                <button key={q} onClick={() => send(q)} style={{
                  padding: '5px 10px', borderRadius: 20,
                  background: `${theme.color}0c`, border: `1px solid ${theme.color}22`,
                  color: theme.color, fontSize: 9, cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.03em', transition: 'background 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${theme.color}1a`)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = `${theme.color}0c`)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(input) }}
              placeholder={`Pregunta o di "ejecuta…"`}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, color: '#ccc', padding: '8px 11px',
                fontSize: 11, outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = `${theme.color}50`)}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />

            {/* Voice */}
            <button
              onClick={startVoice}
              title="Hablar por voz"
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: listening ? `${theme.color}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${listening ? theme.color + '50' : 'rgba(255,255,255,0.08)'}`,
                color: listening ? theme.color : 'rgba(255,255,255,0.3)',
                cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {listening ? '◉' : '○'}
            </button>

            {/* Send */}
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: input.trim() ? theme.color : 'rgba(255,255,255,0.04)',
                border: 'none',
                color: input.trim() ? '#000' : 'rgba(255,255,255,0.2)',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
