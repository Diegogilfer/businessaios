'use client'
import { useState, useCallback } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { AGENTS } from '@/lib/constants'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const key = typeof window !== 'undefined' ? localStorage.getItem('baios_access_key') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) headers['Authorization'] = `Bearer ${key}`
  const r = await fetch(`${API}${path}`, { headers, ...options })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

type Alert = { severity: string; type: string; message: string; action: string }
type Prediction = { agent_role: string; predicted_quality: number; confidence: number; trend: string; recommendation: string; sample_size: number }
type Segment = { category: string; total_tasks: number; completion_rate: number; performance: string; failure_rate?: number }
type Briefing = { briefing: string; metrics: Record<string, unknown>; generated_at: string }

const SEV_COLORS: Record<string, string> = {
  high: '#f04a6c', medium: '#f0a44a', low: '#4af0c8', info: '#4a9cf0',
}
const SEV_ICONS: Record<string, string> = {
  high: '⚠', medium: '◆', low: '◇', info: '◈',
}
const TREND_COLORS: Record<string, string> = {
  improving: '#c8f04a', stable: '#4af0c8', declining: '#f04a6c',
  unstable: '#f0a44a', unknown: '#555',
}

function AlertCard({ a }: { a: Alert }) {
  const c = SEV_COLORS[a.severity] ?? '#555'
  return (
    <div style={{ padding: '14px 16px', background: `${c}08`, border: `1px solid ${c}22`, borderLeft: `3px solid ${c}`, borderRadius: 2, marginBottom: 10, animation: 'fadeIn .3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: c, fontSize: 14 }}>{SEV_ICONS[a.severity]}</span>
        <span style={{ fontSize: 11, color: c, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{a.severity}</span>
        <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace' }}>{a.type}</span>
      </div>
      <p style={{ fontSize: 12, color: '#bbb', marginBottom: 6 }}>{a.message}</p>
      <p style={{ fontSize: 11, color: '#555', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
        <span style={{ color: c, flexShrink: 0 }}>→</span> {a.action}
      </p>
    </div>
  )
}

function PredCard({ role, pred }: { role: string; pred: Prediction }) {
  const ag    = AGENTS[role as keyof typeof AGENTS]
  const color = ag?.color ?? '#888'
  const tc    = TREND_COLORS[pred.trend] ?? '#555'
  const pct   = Math.round(pred.predicted_quality * 100)
  return (
    <div style={{ background: '#0d0d0d', border: `1px solid ${color}18`, borderTop: `2px solid ${color}`, borderRadius: 2, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, color }}>{ag?.icon}</span>
          <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600 }}>{ag?.label}</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: '#141414', borderRadius: 2, marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}44`, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: '#333' }}>Confianza: {Math.round(pred.confidence * 100)}%</span>
        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}>
          {pred.trend}
        </span>
      </div>
      <p style={{ fontSize: 10, color: '#444', lineHeight: 1.5, margin: 0 }}>{pred.recommendation}</p>
      {pred.sample_size === 0 && (
        <p style={{ fontSize: 9, color: '#2a2a2a', marginTop: 6 }}>Sin datos históricos aún</p>
      )}
    </div>
  )
}

function OptimizerPanel() {
  const [running,  setRunning]  = useState<string | null>(null)
  const [result,   setResult]   = useState<Record<string, unknown> | null>(null)
  const [error,    setError]    = useState('')
  const statusFetcher = useCallback(() => apiFetch<Record<string, unknown>>('/neuro/optimizer/status'), [])
  const { data: status } = usePoll(statusFetcher, 30000)

  async function run(endpoint: string, label: string, body?: object) {
    setRunning(label); setResult(null); setError('')
    try {
      const r = await apiFetch<Record<string, unknown>>(endpoint, body ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      } : undefined)
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    }
    setRunning(null)
  }

  const actions = [
    { label: 'Self-Heal',         endpoint: '/neuro/optimizer/self-heal',        color: '#f04a6c', desc: 'Detecta y repara degradación automáticamente' },
    { label: 'Tune Thresholds',   endpoint: '/neuro/optimizer/tune-thresholds',  color: '#f0a44a', desc: 'Recalibra umbrales con datos reales' },
    { label: 'Optimize Prompts',  endpoint: '/neuro/optimizer/optimize-prompts', color: '#4af0c8', desc: 'Reescribe prompts de bajo rendimiento (modo propuesta)', body: { dry_run: true } },
    { label: 'Apply Prompts',     endpoint: '/neuro/optimizer/optimize-prompts', color: '#c44af0', desc: 'Aplica optimizaciones automáticamente', body: { dry_run: false } },
    { label: '★ Full Cycle',      endpoint: '/neuro/optimizer/full-cycle',       color: '#c8f04a', desc: 'Ciclo completo: tune → heal → optimize. El más poderoso.' },
  ]

  const st = status as Record<string, unknown> | null

  return (
    <div className="animate-fade-in">
      <p style={{ fontSize: 11, color: '#333', marginBottom: 20 }}>
        Auto-Optimization Engine — el sistema se diagnóstica, repara y mejora solo
      </p>

      {st && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            ['Ciclos recientes', st.recent_cycles, '#c8f04a'],
            ['Último ciclo', st.last_cycle ? new Date(st.last_cycle as string).toLocaleDateString() : '—', '#4af0c8'],
            ['Auto-apply en', `>${Math.round(Number((st.thresholds as Record<string, number>)?.auto_apply_confidence ?? 0) * 100)}% confianza`, '#f0a44a'],
          ].map(([l, v, c]) => (
            <div key={l as string} style={{ background: '#0d0d0d', borderTop: `2px solid ${c as string}`, border: `1px solid ${(c as string)}18`, padding: '14px 18px', borderRadius: 2 }}>
              <p style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l as string}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: c as string, fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>{v as string}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        {actions.map(a => (
          <div key={a.label} style={{ background: '#0d0d0d', border: `1px solid ${a.color}18`, borderLeft: `3px solid ${a.color}`, borderRadius: 2, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#ddd', margin: '0 0 3px' }}>{a.label}</p>
              <p style={{ fontSize: 10, color: '#444', margin: 0 }}>{a.desc}</p>
            </div>
            <button onClick={() => run(a.endpoint, a.label, a.body)} disabled={!!running} style={{
              background: running === a.label ? '#141414' : `${a.color}18`,
              border: `1px solid ${a.color}40`, color: a.color,
              padding: '8px 18px', borderRadius: 2, fontSize: 10,
              fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              {running === a.label
                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Ejecutando...</>
                : `▶ ${a.label}`
              }
            </button>
          </div>
        ))}
      </div>

      {error && <p style={{ fontSize: 11, color: '#f04a6c', fontFamily: 'monospace', marginBottom: 12 }}>{error}</p>}

      {result && (
        <div style={{ background: '#0d0d0d', border: '1px solid #c8f04a18', borderLeft: '3px solid #c8f04a', borderRadius: 2, padding: 20, animation: 'fadeIn .4s ease' }}>
          <p style={{ fontSize: 10, color: '#c8f04a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>⚡ Resultado</p>
          <pre style={{ fontSize: 11, color: '#666', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 320, overflowY: 'auto', margin: 0 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function NeuroDashboard() {
  const [tab,          setTab]         = useState<'briefing' | 'alerts' | 'predictions' | 'segments' | 'analyze' | 'optimizer'>('briefing')
  const [analyzeArea,  setAnalyzeArea] = useState('general')
  const [analysisData, setAnalysisData] = useState<Record<string, unknown> | null>(null)
  const [analyzing,    setAnalyzing]   = useState(false)

  const briefingFetcher = useCallback(() => apiFetch<Briefing>('/neuro/briefing'), [])
  const alertsFetcher   = useCallback(() => apiFetch<Alert[]>('/neuro/alerts'), [])
  const predsFetcher    = useCallback(() => apiFetch<{ predictions: Record<string, Prediction> }>('/neuro/predict/all'), [])
  const segsFetcher     = useCallback(() => apiFetch<{ segments: Segment[]; insights: string[] }>('/neuro/segments'), [])

  const { data: briefing, loading: bLoading } = usePoll(briefingFetcher, 300000, tab === 'briefing')
  const { data: alerts,   loading: aLoading } = usePoll(alertsFetcher,  60000,  tab === 'alerts')
  const { data: preds,    loading: pLoading } = usePoll(predsFetcher,   30000,  tab === 'predictions')
  const { data: segs,     loading: sLoading } = usePoll(segsFetcher,    60000,  tab === 'segments')

  const briefData  = briefing  as Briefing | null
  const alertList  = (alerts   as Alert[] | null)  ?? []
  const predsMap   = (preds    as { predictions: Record<string, Prediction> } | null)?.predictions ?? {}
  const segData    = segs      as { segments: Segment[]; insights: string[] } | null

  async function runAnalysis() {
    setAnalyzing(true)
    try {
      const r = await apiFetch<Record<string, unknown>>(`/neuro/analyze?focus=${analyzeArea}`)
      setAnalysisData(r)
    } catch (_) {}
    setAnalyzing(false)
  }

  const TABS = [
    { id: 'briefing',     label: '📋 Briefing' },
    { id: 'alerts',       label: '⚠ Alertas' },
    { id: 'predictions',  label: '◈ Predicciones' },
    { id: 'segments',     label: '◆ Segmentos' },
    { id: 'analyze',      label: '⬡ Análisis IA' },
    { id: 'optimizer',    label: '⚡ Optimizer' },
  ] as const

  const SEG_COLORS = ['#c8f04a', '#4af0c8', '#f0a44a', '#c44af0', '#4a9cf0', '#f04a6c', '#888']

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: 'var(--text-1)' }}>NeuroIA — Fase 12</h2>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>Executive Copilot · Predicción · Segmentación · Análisis profundo</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? 'rgba(0,229,204,0.08)' : 'transparent',
              border: tab === t.id ? '1px solid rgba(0,229,204,0.2)' : '1px solid transparent',
              color: tab === t.id ? 'var(--primary)' : 'var(--text-3)',
              padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 10,
              cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'inherit',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'briefing' && (
        <div>
          {bLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <span style={{ fontSize: 20, color: 'var(--primary)', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>◌</span>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>Generando briefing ejecutivo con IA...</p>
            </div>
          ) : briefData ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  ['Completadas 7d', briefData.metrics?.completed_7d, 'var(--primary)'],
                  ['Quality Score', `${Math.round(Number(briefData.metrics?.avg_quality ?? 0) * 100)}%`, 'var(--secondary)'],
                  ['Opps Viables', briefData.metrics?.viable_opps, 'var(--amber)'],
                  ['Grade del Sistema', briefData.metrics?.growth_grade, 'var(--accent)'],
                ].map(([l, v, c]) => (
                  <div key={l as string} className="glass" style={{ borderTop: `2px solid ${c as string}`, padding: '14px 18px', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l as string}</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: c as string, fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>{(v as string) ?? '—'}</p>
                  </div>
                ))}
              </div>
              <div className="glass" style={{ borderLeft: '3px solid var(--primary)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 10, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>⬡ Executive Copilot</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>{new Date(briefData.generated_at).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{briefData.briefing}</p>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>Error generando briefing — verifica que el backend está corriendo</p>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Monitoreo proactivo — el sistema detecta situaciones sin que preguntes</p>
            <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-3)' }}>{alertList.length} alertas activas</span>
          </div>
          {aLoading ? (
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>Escaneando sistema...</p>
          ) : alertList.length === 0 ? (
            <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 20, color: 'var(--primary)', marginBottom: 8 }}>✓</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin alertas críticas — sistema en buen estado</p>
            </div>
          ) : (
            alertList.map((a, i) => <AlertCard key={i} a={a} />)
          )}
        </div>
      )}

      {tab === 'predictions' && (
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 16 }}>Calidad predicha basada en historial real · media móvil ponderada</p>
          {pLoading ? (
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>Calculando predicciones...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {Object.entries(predsMap).map(([role, pred]) => (
                <PredCard key={role} role={role} pred={pred} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'segments' && (
        <div>
          {sLoading ? (
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>Analizando segmentos...</p>
          ) : segData ? (
            <div>
              {segData.insights?.length > 0 && (
                <div className="glass" style={{ borderLeft: '3px solid var(--primary)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
                  <p style={{ fontSize: 10, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>◈ Insights automáticos</p>
                  {segData.insights.map((ins, i) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4, display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--primary)', flexShrink: 0 }}>→</span> {ins}
                    </p>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {(segData.segments ?? []).map((s, i) => {
                  const c = SEG_COLORS[i % SEG_COLORS.length]
                  const pc = { strong: '#c8f04a', moderate: '#f0a44a', weak: '#f04a6c' }[s.performance] ?? '#555'
                  return (
                    <div key={s.category} className="glass" style={{ borderTop: `2px solid ${c}`, borderRadius: 'var(--radius-md)', padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: c, fontWeight: 600 }}>{s.category}</span>
                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${pc}15`, color: pc, border: `1px solid ${pc}30` }}>{s.performance}</span>
                      </div>
                      <p style={{ fontSize: 20, fontWeight: 700, color: c, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{s.completion_rate}%</p>
                      <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.total_tasks} tareas · {s.failure_rate ?? 0}% fallos</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'analyze' && (
        <div style={{ maxWidth: 700 }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 18 }}>Análisis estratégico profundo generado por IA con tus datos reales</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {['general', 'growth', 'cost', 'quality', 'arbitrage'].map(area => (
              <button key={area} onClick={() => setAnalyzeArea(area)} style={{
                background: analyzeArea === area ? 'rgba(0,229,204,0.08)' : 'transparent',
                border: analyzeArea === area ? '1px solid rgba(0,229,204,0.2)' : '1px solid var(--glass-border)',
                color: analyzeArea === area ? 'var(--primary)' : 'var(--text-3)',
                padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 10,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'inherit',
              }}>{area}</button>
            ))}
          </div>
          <button onClick={runAnalysis} disabled={analyzing} style={{
            background: analyzing ? 'rgba(255,255,255,0.04)' : 'var(--primary)',
            color: analyzing ? 'var(--text-3)' : '#000', border: 'none',
            padding: '11px 24px', borderRadius: 'var(--radius-sm)', fontSize: 12,
            fontWeight: 700, cursor: analyzing ? 'not-allowed' : 'pointer',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'inherit', marginBottom: 20, transition: 'all .2s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {analyzing
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Analizando con IA...</>
              : `⬡ Analizar: ${analyzeArea}`
            }
          </button>

          {analysisData && (
            <div className="glass" style={{ borderLeft: '3px solid var(--primary)', borderRadius: 'var(--radius-md)', padding: 24, animation: 'fadeIn .4s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 10, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>⬡ Análisis: {analysisData.focus_area as string}</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>
                  {new Date(analysisData.generated_at as string).toLocaleString()}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {analysisData.analysis as string}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'optimizer' && <OptimizerPanel />}
    </div>
  )
}
