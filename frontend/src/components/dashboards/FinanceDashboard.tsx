'use client'
import { useState } from 'react'

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </p>
  )
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
const INCOME = [4200, 4800, 3900, 5600, 6100, 8420]
const EXPENSES = [1800, 2100, 1700, 2400, 2600, 3180]

const CATEGORIES_EXP = [
  { name: 'Infraestructura', color: '#6366F1', pct: 42 },
  { name: 'Marketing',       color: '#EC4899', pct: 28 },
  { name: 'Herramientas',    color: '#F59E0B', pct: 18 },
  { name: 'Varios',          color: '#64748B', pct: 12 },
]

const SCENARIOS = [
  { label: 'Conservador', val: '$6,800', color: '#64748B', sub: '-20% crecimiento' },
  { label: 'Base',        val: '$9,200', color: '#10B981', sub: 'tendencia actual',  best: true },
  { label: 'Optimista',   val: '$14,400', color: '#6366F1', sub: '+55% crecimiento' },
]

export default function FinanceDashboard({ accent }: { accent: string }) {
  const [view, setView] = useState<'personal' | 'empresa'>('empresa')
  const maxVal = Math.max(...INCOME, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Toggle personal/empresa */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['empresa', 'personal'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '6px 16px', borderRadius: 7,
              border: `1px solid ${view === v ? `${accent}60` : 'var(--glass-border)'}`,
              background: view === v ? `${accent}14` : 'transparent',
              color: view === v ? accent : 'var(--text-2)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'var(--transition)', textTransform: 'capitalize',
            }}
          >{v === 'empresa' ? 'Empresa' : 'Personal'}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--text-3)', alignSelf: 'center' }}>Período: Junio 2026</span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { l: 'Ingresos mes', v: '$8,420', sub: '↑ 23% vs may', color: accent },
          { l: 'Gastos mes',   v: '$3,180', sub: '38% de ingresos', color: 'var(--text-1)' },
          { l: 'Ganancia neta', v: '$5,240', sub: 'Margen 62%', color: accent },
          { l: 'Flujo de caja', v: '$12,800', sub: 'Runway 4 meses', color: '#10B981' },
        ].map(k => (
          <div key={k.l} style={{
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)', padding: '18px 20px',
            transition: 'var(--transition)',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${accent}35` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)' }}
          >
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{k.l}</p>
            <p style={{ fontSize: 24, fontWeight: 600, color: k.color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{k.v}</p>
            <p style={{ fontSize: 11, color: '#10B981' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        {/* Bar chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
          <SLabel>Ingresos vs gastos — 6 meses</SLabel>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80, marginBottom: 8 }}>
            {MONTHS.map((m, i) => (
              <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2 }}>
                  <div style={{
                    height: `${(EXPENSES[i] / maxVal) * 100}%`,
                    background: 'rgba(239,68,68,0.4)', borderRadius: '2px 2px 0 0', minHeight: 2,
                  }} />
                  <div style={{
                    height: `${(INCOME[i] / maxVal) * 100}%`,
                    background: i === 5 ? accent : `${accent}55`,
                    borderRadius: '2px 2px 0 0', minHeight: 3,
                    boxShadow: i === 5 ? `0 0 12px ${accent}60` : 'none',
                  }} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{m}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: accent }} />
              <span style={{ fontSize: 10, color: 'var(--text-2)' }}>Ingresos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239,68,68,0.4)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-2)' }}>Gastos</span>
            </div>
          </div>
        </div>

        {/* Expense breakdown */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
          <SLabel>Categorías de gasto</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CATEGORIES_EXP.map(c => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-1)' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.pct}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 99, transition: 'width 0.8s var(--ease)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3-scenario projection */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <SLabel>Proyección próximo mes — 3 escenarios</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {SCENARIOS.map(s => (
            <div key={s.label} style={{
              borderLeft: `3px solid ${s.color}`,
              padding: '12px 16px',
              background: s.best ? `${s.color}06` : 'rgba(255,255,255,0.02)',
              borderRadius: '0 8px 8px 0',
              border: `1px solid ${s.color}25`,
              borderLeft: `3px solid ${s.color}` as any,
              position: 'relative',
            }}>
              {s.best && (
                <span style={{
                  position: 'absolute', top: -10, right: 10,
                  fontSize: 8, fontWeight: 700, padding: '2px 7px',
                  background: s.color, color: '#fff', borderRadius: 4,
                }}>PROBABLE</span>
              )}
              <p style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 600, color: s.color, letterSpacing: '-0.03em', marginBottom: 4 }}>{s.val}</p>
              <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
