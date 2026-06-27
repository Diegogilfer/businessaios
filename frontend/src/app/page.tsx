'use client'
import { useState, useCallback, useEffect } from 'react'
import LoginGate from '@/components/auth/LoginGate'
import { useWebSocket } from '@/hooks/useWebSocket'
import CompanionModal from '@/components/companion/CompanionModal'
import CompanionPanel from '@/components/companion/CompanionPanel'
import { AgentThemeProvider } from '@/contexts/AgentThemeContext'
import EcommerceDashboard from '@/components/dashboards/EcommerceDashboard'
import MarketingDashboard from '@/components/dashboards/MarketingDashboard'
import FinanceDashboard from '@/components/dashboards/FinanceDashboard'
import CeoDashboard from '@/components/dashboards/CeoDashboard'
import SecurityDashboard from '@/components/security/SecurityDashboard'
import CreationHub from '@/components/tools/CreationHub'
import MemoryPanel from '@/components/memory/MemoryPanel'
import SkillsPanel from '@/components/skills/SkillsPanel'

// ── Category config ───────────────────────────────────────────
type Cat = 'ecommerce' | 'marketing' | 'finance' | 'ceo' | 'security' | 'tools'

const CATS: {
  id: Cat
  label: string
  sub: string
  accent: string
  icon: React.ReactNode
  cta?: string
}[] = [
  {
    id: 'ecommerce', label: 'E-commerce', sub: 'Ventas, productos y oportunidades',
    accent: 'var(--ecom)',
    cta: 'Escanear tendencias',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    id: 'marketing', label: 'Marketing', sub: 'Publicidad, viral y monetización',
    accent: 'var(--mkt)',
    cta: 'Generar contenido',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    id: 'finance', label: 'Finanzas', sub: 'Contador inteligente personal y empresarial',
    accent: 'var(--fin)',
    cta: 'Generar reporte',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    id: 'ceo', label: 'CEO', sub: 'Centro de comando — todo, con todos',
    accent: 'var(--ceo)',
    cta: 'Ejecutar tarea estratégica',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    id: 'security', label: 'Seguridad', sub: 'Monitoreo autónomo 24/7',
    accent: 'var(--sec)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    id: 'tools', label: 'Crear', sub: 'CRM · Web Pages · Quick Design',
    accent: 'var(--tools)',
    cta: 'Nuevo proyecto',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
]

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ cat, setCat, connected, onMemory, onSkills }: { cat: Cat; setCat: (c: Cat) => void; connected: boolean; onMemory: () => void; onSkills: () => void }) {
  const [hovered, setHovered] = useState<Cat | null>(null)
  const active = CATS.find(c => c.id === cat)!

  return (
    <aside style={{
      width: 72,
      minHeight: '100vh',
      background: 'rgba(2, 6, 23, 0.95)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '18px 0',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Brand */}
      <div style={{
        width: 38, height: 38,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${active.accent} 0%, rgba(255,255,255,0.1) 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 700, color: '#fff',
        marginBottom: 24,
        transition: 'background 0.4s var(--ease)',
        flexShrink: 0,
        boxShadow: `0 4px 20px ${active.accent}40`,
      }}>B</div>

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px' }}>
        {CATS.map(c => {
          const isActive = c.id === cat
          const isHov = hovered === c.id
          return (
            <div key={c.id} style={{ position: 'relative' }}>
              {/* Active bar */}
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '15%', bottom: '15%',
                  width: 2.5, background: c.accent,
                  borderRadius: '0 2px 2px 0',
                  boxShadow: `0 0 8px ${c.accent}`,
                }} />
              )}
              <button
                onClick={() => setCat(c.id)}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                title={c.label}
                aria-label={c.label}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  background: isActive
                    ? `${c.accent}14`
                    : isHov ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: isActive ? c.accent : isHov ? 'rgba(241,245,255,0.75)' : 'var(--text-3)',
                  transition: 'all 0.18s var(--ease)',
                  fontFamily: 'inherit',
                }}
              >
                {c.id === 'security' && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#10B981',
                    animation: 'pulse-dot 2.2s ease infinite',
                  }} />
                )}
                {c.icon}
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em' }}>{c.label}</span>
              </button>
            </div>
          )
        })}
      </nav>

      {/* Skills button */}
      <button
        onClick={onSkills}
        title="Skills & Prompts (S)"
        aria-label="Abrir panel de skills"
        style={{
          width: 38, height: 38, borderRadius: 9,
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          color: '#6366F1', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 6, transition: 'var(--transition)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.2)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.25)'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>

      {/* Memory button */}
      <button
        onClick={onMemory}
        title="Memoria en vivo (M)"
        aria-label="Abrir panel de memoria"
        style={{
          width: 38, height: 38, borderRadius: 9,
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.25)',
          color: '#8B5CF6', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 10, transition: 'var(--transition)',
          position: 'relative',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.2)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.5)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.1)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)'
        }}
      >
        {/* Live dot */}
        <div style={{
          position: 'absolute', top: 5, right: 5,
          width: 5, height: 5, borderRadius: '50%',
          background: '#10B981', boxShadow: '0 0 5px #10B981',
          animation: 'pulse-dot 2.2s ease infinite',
        }} />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
      </button>

      {/* Connection status */}
      <div style={{ padding: '4px 0 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: connected ? '#10B981' : '#EF4444',
          boxShadow: connected ? '0 0 6px #10B981' : 'none',
          animation: connected ? 'pulse-dot 2.2s ease infinite' : 'none',
        }} />
        <span style={{ fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.05em' }}>
          {connected ? 'LIVE' : 'OFF'}
        </span>
      </div>
    </aside>
  )
}

// ── Top Bar ───────────────────────────────────────────────────
function TopBar({ cat, onCta }: { cat: typeof CATS[0]; onCta: () => void }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      padding: '20px 40px 18px',
      background: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div className="animate-slide-right" key={cat.id}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 5 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `${cat.accent}18`,
            border: `1px solid ${cat.accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cat.accent,
          }}>
            {cat.icon}
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 600,
            color: 'var(--text-1)', letterSpacing: '-0.03em',
          }}>
            {cat.label}
          </h1>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 40 }}>{cat.sub}</p>
      </div>

      {cat.cta && cat.id !== 'security' && (
        <button
          onClick={onCta}
          style={{
            padding: '9px 20px',
            background: cat.accent,
            border: 'none',
            borderRadius: 9,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.01em',
            transition: 'opacity 0.15s, transform 0.15s',
            boxShadow: `0 4px 16px ${cat.accent}40`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.opacity = '0.88'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.opacity = '1'
            ;(e.currentTarget as HTMLElement).style.transform = 'none'
          }}
        >
          {cat.cta} →
        </button>
      )}

      {cat.id === 'security' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 8,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 8px #10B981',
            animation: 'pulse-dot 2.2s ease infinite',
          }} />
          <span style={{ fontSize: 11, color: '#10B981', fontWeight: 500 }}>Sistema protegido · Autónomo</span>
        </div>
      )}
    </div>
  )
}

// ── Dashboard shell ───────────────────────────────────────────
function Dashboard({ accessKey }: { accessKey: string }) {
  const [cat, setCat] = useState<Cat>('ecommerce')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const { connected } = useWebSocket()
  const current = CATS.find(c => c.id === cat)!

  // Keyboard shortcuts: 1-6 categories, M = memory panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx < CATS.length) setCat(CATS[idx].id)
      if (e.key.toLowerCase() === 'm') setMemoryOpen(o => !o)
      if (e.key.toLowerCase() === 's') setSkillsOpen(o => !o)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCta = useCallback(() => {
    const ev = new CustomEvent('baios:open-companion', { detail: { cat } })
    window.dispatchEvent(ev)
  }, [cat])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <CompanionModal />
      <Sidebar cat={cat} setCat={setCat} connected={connected} onMemory={() => setMemoryOpen(true)} onSkills={() => setSkillsOpen(true)} />

      <main style={{ marginLeft: 72, flex: 1, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <TopBar cat={current} onCta={handleCta} />

        <div
          key={cat}
          className="animate-fade-in"
          style={{ padding: '32px 40px', maxWidth: 1200 }}
        >
          {cat === 'ecommerce'  && <EcommerceDashboard accent={current.accent} />}
          {cat === 'marketing'  && <MarketingDashboard accent={current.accent} />}
          {cat === 'finance'    && <FinanceDashboard   accent={current.accent} />}
          {cat === 'ceo'        && <CeoDashboard       accent={current.accent} />}
          {cat === 'security'   && <SecurityDashboard />}
          {cat === 'tools'      && <CreationHub        accent={current.accent} />}
        </div>
      </main>

      <CompanionPanel currentTab={cat} />
      <MemoryPanel open={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <SkillsPanel open={skillsOpen} onClose={() => setSkillsOpen(false)} accent="var(--tools)" />
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const [accessKey, setAccessKey] = useState<string | null>(null)
  if (!accessKey) return <LoginGate onAuth={setAccessKey} />
  return (
    <AgentThemeProvider>
      <Dashboard accessKey={accessKey} />
    </AgentThemeProvider>
  )
}
