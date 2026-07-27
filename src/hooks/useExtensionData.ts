import { useState, useEffect } from 'react'
import { DataPoint } from '../types/schema'
import { loadData, extensionDataPath } from '../utils/dataLoader'

export interface UseExtensionDataResult {
  data: DataPoint[]
  loading: boolean
  error: string | null
}

export function useExtensionData(extensionId: string): UseExtensionDataResult {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadData<DataPoint[]>(extensionDataPath(extensionId))
      .then((raw) => {
        if (cancelled) return
        if (!raw || !Array.isArray(raw)) {
          setError('Invalid data: expected an array')
          setData([])
        } else {
          setData(raw)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Failed to load data'
        setError(message)
        setData([])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [extensionId])

  return { data, loading, error }
}
