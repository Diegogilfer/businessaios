'use client'
import { useState, useCallback } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { getOpportunities } from '@/lib/api'
import type { ArbitrageOpportunity } from '@/lib/api'
import { RISK_COLORS } from '@/lib/constants'

export default function ArbitrageTable() {
  const fetcher = useCallback(() => getOpportunities(20), [])
  const { data, loading } = usePoll<{ opportunities: ArbitrageOpportunity[] }>(fetcher, 30000)
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const opps = data?.opportunities ?? []
  const filtered = filter === 'all' ? opps : opps.filter(o => o.risk_level === filter)

  const viableCount = opps.filter(o => o.viable !== false).length

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: '#eee' }}>Arbitrage Intelligence</h2>
          <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 3 }}>Amazon ↔ AliExpress · escaneo automático 2 AM UTC</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 9, color: '#333' }}>Oportunidades viables</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#c8f04a', fontFamily: 'DM Mono, monospace' }}>{viableCount}</p>
        </div>
      </div>

      {/* KPIs */}
      {opps.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {([
            ['ROI Promedio', `${Math.round(opps.reduce((a, o) => a + (o.roi_percent ?? 0), 0) / opps.length)}%`, '#c8f04a'],
            ['Oportunidades', opps.length, '#4af0c8'],
            ['Riesgo Bajo', opps.filter(o => o.risk_level === 'low').length, '#f0a44a'],
          ] as [string, string | number, string][]).map(([l, v, c]) => (
            <div key={l} style={{ background: '#0d0d0d', borderTop: `2px solid ${c}`, border: `1px solid ${c}18`, padding: '14px 18px', borderRadius: 2 }}>
              <p style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: c, fontFamily: 'DM Mono, monospace', marginTop: 6 }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['all', 'low', 'medium', 'high'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? '#141414' : 'transparent',
            border: filter === f ? '1px solid #1e1e1e' : '1px solid transparent',
            color: filter === f ? '#c8f04a' : '#444',
            padding: '4px 12px', borderRadius: 2, fontSize: 10,
            cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#222', fontSize: 11 }}>Cargando oportunidades...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 20, color: '#1a1a1a' }}>◇</p>
          <p style={{ fontSize: 12, color: '#333', marginTop: 10 }}>Sin oportunidades escaneadas aún</p>
          <p style={{ fontSize: 10, color: '#222', marginTop: 4 }}>Configura AMAZON_CLIENT_ID y ALIEXPRESS_APP_KEY en .env</p>
        </div>
      ) : (
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                {['ASIN', 'Amazon $', 'Supplier $', 'Margen', 'ROI %', 'Riesgo'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((opp, i) => {
                const rColor = RISK_COLORS[opp.risk_level?.toLowerCase() as keyof typeof RISK_COLORS] ?? '#888'
                return (
                  <tr key={opp.id} style={{ borderBottom: '1px solid #0e0e0e', background: i % 2 ? '#0a0a0a' : 'transparent', transition: 'background .15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#141414' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 ? '#0a0a0a' : 'transparent' }}
                  >
                    <td style={{ padding: '10px 12px', fontSize: 10, color: '#4af0c8', fontFamily: 'DM Mono, monospace' }}>{opp.amazon_asin}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#aaa' }}>${opp.amazon_price?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#666' }}>${opp.supplier_price?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#888' }}>${opp.net_margin?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#c8f04a', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>+{opp.roi_percent?.toFixed(0)}%</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${rColor}15`, color: rColor, border: `1px solid ${rColor}30`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{opp.risk_level}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
