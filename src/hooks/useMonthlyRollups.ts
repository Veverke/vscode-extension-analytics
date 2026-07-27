import { useState, useEffect } from 'react'
import type { MonthlyRollup } from '../types/schema'
import { loadData, extensionMonthlyPath } from '../utils/dataLoader'

export interface UseMonthlyRollupsResult {
  rollups: MonthlyRollup[]
  loading: boolean
  error: string | null
}

export function useMonthlyRollups(extensionId: string): UseMonthlyRollupsResult {
  const [rollups, setRollups] = useState<MonthlyRollup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadData<MonthlyRollup[]>(extensionMonthlyPath(extensionId), { tolerate404: true })
      .then((raw) => {
        if (cancelled) return
        if (!raw || !Array.isArray(raw)) {
          setRollups([])
        } else {
          setRollups(raw)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Failed to load monthly rollups'
        setError(message)
        setRollups([])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [extensionId])

  return { rollups, loading, error }
}