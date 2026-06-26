'use client'
import { useState } from 'react'
import { AGENT_THEMES, AgentKey, useAgentTheme } from '@/contexts/AgentThemeContext'

export default function CompanionModal() {
  const { setAgent, showModal, closeModal } = useAgentTheme()
  const [selected, setSelected] = useState<AgentKey | null>(null)
  const [hovered, setHovered]   = useState<AgentKey | null>(null)
  // Safe localStorage check (client-only, 'use client' guarantees it)
  const hasExisting = typeof window !== 'undefined' && !!localStorage.getItem('baios_companion_agent')

  if (!showModal) return null

  const agents = Object.values(AGENT_THEMES)

  function confirm() {
    if (!selected) return
    setAgent(selected)
    closeModal()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(4, 9, 26, 0.98)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
      overflowY: 'auto',
    }}>

      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <p style={{
          fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
          letterSpacing: '0.35em', marginBottom: 20,
        }}>
          BusinessAIOS · Configuración inicial
        </p>
        <h1 style={{
          fontSize: 38, fontWeight: 300, color: '#fff',
          letterSpacing: '-0.03em', lineHeight: 1.18, marginBottom: 14,
        }}>
          Elige tu agente<br />acompañante
        </h1>
        <p style={{
          fontSize: 13, color: 'rgba(255,255,255,0.38)', fontWeight: 400,
          maxWidth: 400, margin: '0 auto', lineHeight: 1.75,
        }}>
          Coloreará toda tu experiencia, te guiará en cada paso
          y podrá ejecutar tareas directamente desde el chat.
          Podrás cambiarlo cuando quieras.
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        maxWidth: 800, width: '100%',
        marginBottom: 44,
      }}>
        {agents.map(t => {
          const isSel = selected === t.key
          const isHov = hovered === t.key
          return (
            <div
              key={t.key}
              onClick={() => setSelected(t.key)}
              onMouseEnter={() => setHovered(t.key)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '28px 24px 26px',
                borderRadius: 14,
                border: `1.5px solid ${isSel ? t.color + '55' : 'rgba(255,255,255,0.07)'}`,
                background: isSel
                  ? `linear-gradient(145deg, ${t.color}0c 0%, ${t.secondary}07 100%)`
                  : isHov ? 'rgba(255,255,255,0.025)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                transform: isSel ? 'translateY(-4px)' : isHov ? 'translateY(-2px)' : 'none',
                position: 'relative',
                userSelect: 'none',
              }}
            >
              {/* Selection dot */}
              {isSel && (
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  width: 8, height: 8, borderRadius: '50%',
                  background: t.color, boxShadow: `0 0 10px ${t.color}`,
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 50, height: 50, borderRadius: 13, marginBottom: 20,
                background: `${t.color}12`,
                border: `1px solid ${t.color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: t.color,
              }}>
                {t.icon}
              </div>

              {/* Name + role */}
              <div style={{
                fontSize: 16, fontWeight: 600, color: '#fff',
                letterSpacing: '-0.02em', marginBottom: 4,
              }}>
                {t.name}
              </div>
              <div style={{
                fontSize: 9, color: t.color, textTransform: 'uppercase',
                letterSpacing: '0.12em', fontWeight: 600, marginBottom: 12,
              }}>
                {t.role}
              </div>
              <p style={{
                fontSize: 11.5, color: 'rgba(255,255,255,0.42)',
                lineHeight: 1.7, margin: 0,
              }}>
                {t.personality}
              </p>
            </div>
          )
        })}
      </div>

      {/* Confirm */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <button
          onClick={confirm}
          disabled={!selected}
          style={{
            background: selected ? AGENT_THEMES[selected].color : 'rgba(255,255,255,0.06)',
            color: selected ? '#000' : 'rgba(255,255,255,0.2)',
            border: 'none',
            padding: '14px 52px',
            borderRadius: 10,
            fontSize: 12, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: selected ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            minWidth: 280,
          }}
        >
          {selected
            ? `Comenzar con ${AGENT_THEMES[selected].name} →`
            : 'Selecciona un agente'}
        </button>

        {/* Skip / change — only show if already have one set */}
        {hasExisting && (
          <button
            onClick={closeModal}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.22)', fontSize: 10,
              cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: '0.06em', padding: '4px 8px',
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
