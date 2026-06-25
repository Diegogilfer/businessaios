'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type AgentKey = 'ceo' | 'research' | 'commercial' | 'content' | 'finance' | 'operations'

export type AgentTheme = {
  key: AgentKey
  name: string
  label: string
  role: string
  personality: string
  color: string
  secondary: string
  dim: string
  glow: string
  icon: string
}

// Colors synchronized with constants.ts
export const AGENT_THEMES: Record<AgentKey, AgentTheme> = {
  ceo: {
    key: 'ceo', name: 'CEO', label: 'CEO',
    role: 'Estrategia y liderazgo',
    personality: 'Visión global. Consolida cada resultado y dirige la estrategia.',
    color: '#c8f04a', secondary: '#a8d030',
    dim: 'rgba(200,240,74,0.10)', glow: 'rgba(200,240,74,0.22)',
    icon: '⬡',
  },
  research: {
    key: 'research', name: 'Research', label: 'Research',
    role: 'Análisis e investigación',
    personality: 'Análisis profundo. Encuentra lo que otros no ven.',
    color: '#4af0c8', secondary: '#20d0a8',
    dim: 'rgba(74,240,200,0.10)', glow: 'rgba(74,240,200,0.22)',
    icon: '◈',
  },
  commercial: {
    key: 'commercial', name: 'Commercial', label: 'Commercial',
    role: 'Ventas y crecimiento',
    personality: 'Convierte oportunidades en ingresos reales.',
    color: '#f0a44a', secondary: '#d08030',
    dim: 'rgba(240,164,74,0.10)', glow: 'rgba(240,164,74,0.22)',
    icon: '◆',
  },
  content: {
    key: 'content', name: 'Content', label: 'Content',
    role: 'Creación y narrativa',
    personality: 'Tu voz, amplificada. Narrativa que conecta y convierte.',
    color: '#c44af0', secondary: '#a020d0',
    dim: 'rgba(196,74,240,0.10)', glow: 'rgba(196,74,240,0.22)',
    icon: '◉',
  },
  finance: {
    key: 'finance', name: 'Finance', label: 'Finance',
    role: 'Finanzas y proyecciones',
    personality: 'Números claros. Decisiones seguras y rentables.',
    color: '#4a9cf0', secondary: '#2070d0',
    dim: 'rgba(74,156,240,0.10)', glow: 'rgba(74,156,240,0.22)',
    icon: '◇',
  },
  operations: {
    key: 'operations', name: 'Operations', label: 'Operations',
    role: 'Ejecución y operaciones',
    personality: 'Sin errores. Cada paso ejecutado con precisión.',
    color: '#f04a6c', secondary: '#d02048',
    dim: 'rgba(240,74,108,0.10)', glow: 'rgba(240,74,108,0.22)',
    icon: '◎',
  },
}

type ThemeCtx = {
  agent: AgentKey
  theme: AgentTheme
  setAgent: (key: AgentKey) => void
  showModal: boolean
  openModal: () => void
  closeModal: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

function applyTheme(t: AgentTheme) {
  const r = document.documentElement
  r.style.setProperty('--primary',      t.color)
  r.style.setProperty('--primary-dim',  t.dim)
  r.style.setProperty('--primary-glow', t.glow)
  r.style.setProperty('--secondary',    t.secondary)
  r.style.setProperty('--teal',         t.color)
}

export function AgentThemeProvider({ children }: { children: ReactNode }) {
  const [agent, setAgentState] = useState<AgentKey>('ceo')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('baios_companion_agent') as AgentKey | null
    if (saved && AGENT_THEMES[saved]) {
      setAgentState(saved)
      applyTheme(AGENT_THEMES[saved])
    } else {
      setShowModal(true)
    }
  }, [])

  function setAgent(key: AgentKey) {
    setAgentState(key)
    localStorage.setItem('baios_companion_agent', key)
    applyTheme(AGENT_THEMES[key])
  }

  return (
    <Ctx.Provider value={{
      agent, theme: AGENT_THEMES[agent],
      setAgent,
      showModal, openModal: () => setShowModal(true), closeModal: () => setShowModal(false),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAgentTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAgentTheme must be inside AgentThemeProvider')
  return ctx
}
