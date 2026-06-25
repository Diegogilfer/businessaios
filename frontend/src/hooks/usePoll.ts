// ============================================================
// BusinessAIOS - src/hooks/usePoll.ts
// Hook genérico para polling de endpoints
// ============================================================
'use client'
import { useEffect, useState, useCallback } from 'react'

export function usePoll<T>(
  fetcher: () => Promise<T>,
  interval = 10000,
  immediate = true
) {
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const run = useCallback(async () => {
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    if (immediate) run()
    const id = setInterval(run, interval)
    return () => clearInterval(id)
  }, [run, interval, immediate])

  return { data, loading, error, refetch: run }
}
