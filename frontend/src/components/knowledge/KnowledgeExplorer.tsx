'use client'
import { useState, useCallback } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { getAnalyticsKnowledge, semanticSearch } from '@/lib/api'
import { CATEGORIES } from '@/lib/constants'

const CAT_COLORS = ['#c8f04a','#4af0c8','#c44af0','#f0a44a','#4a9cf0','#f04a6c','#888']

type SearchResult = { id: string; title: string; content: string; category: string; similarity: number }

export default function KnowledgeExplorer() {
  const fetcher = useCallback(() => getAnalyticsKnowledge(), [])
  const { data } = usePoll(fetcher, 20000)
  const kd = data as Record<string, unknown> | null
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await semanticSearch(query, 6) as { results: SearchResult[] }
      setResults(r.results ?? [])
    } catch (_) {
      setResults([])
    }
    setSearching(false)
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 300, color: '#eee' }}>Knowledge Base</h2>
        <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 3 }}>Conocimiento generado por los agentes · búsqueda semántica via pgvector</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {([
          ['Total entradas', kd?.total_entries ?? 0, '#c44af0'],
          ['Esta semana',    kd?.new_this_week ?? 0,  '#c8f04a'],
          ['Estado',         kd?.growth_rate ?? '—',  '#f0a44a'],
        ] as [string, unknown, string][]).map(([l, v, c]) => (
          <div key={l as string} style={{ background: '#0d0d0d', borderTop: `2px solid ${c as string}`, border: `1px solid ${(c as string)}18`, padding: '14px 18px', borderRadius: 2 }}>
            <p style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l as string}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: c as string, fontFamily: 'DM Mono, monospace', marginTop: 6 }}>{v as string}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda semántica */}
      <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 22, marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Búsqueda Semántica</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            style={{ flex: 1, background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#ccc', padding: '10px 12px', borderRadius: 2, fontSize: 12, outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s' }}
            placeholder="ej: cómo aumentar conversiones de ventas..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            onFocus={e => (e.target.style.borderColor = '#c44af0')}
            onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
          />
          <button onClick={handleSearch} disabled={searching} style={{
            background: '#c44af0', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 2, fontSize: 11,
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
            textTransform: 'uppercase', fontFamily: 'inherit', transition: 'opacity .2s',
          }}>
            {searching ? '◌' : 'Buscar'}
          </button>
        </div>
        {results.length > 0 && (
          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {results.map(r => (
              <div key={r.id} style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 2, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#ccc' }}>{r.title}</span>
                  <span style={{ fontSize: 10, color: '#c44af0', fontFamily: 'DM Mono, monospace' }}>{(r.similarity * 100).toFixed(0)}%</span>
                </div>
                <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, margin: 0 }}>{r.content?.slice(0, 160)}...</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categorías */}
      <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 22 }}>
        <p style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Categorías de conocimiento</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat, i) => {
            const c = CAT_COLORS[i % CAT_COLORS.length]
            return (
              <div key={cat} style={{ padding: '10px 16px', background: `${c}0a`, border: `1px solid ${c}22`, borderRadius: 2, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${c}18`; el.style.borderColor = `${c}44` }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${c}0a`; el.style.borderColor = `${c}22` }}
                onClick={() => setQuery(cat)}
              >
                <p style={{ fontSize: 11, color: c }}>{cat}</p>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 10, color: '#1e1e1e', marginTop: 16 }}>
          Búsqueda vectorial via RPC vector_search_knowledge · embeddings vector(768) en Supabase
        </p>
      </div>
    </div>
  )
}
