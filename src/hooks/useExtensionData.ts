import { useState, useEffect } from 'react'
import { DataPoint } from '../types/schema'

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

    fetch(`./data/${extensionId}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((raw: unknown) => {
        if (cancelled) return
        if (!Array.isArray(raw)) {
          setError('Invalid data: expected an array')
          setData([])
        } else {
          setData(raw as DataPoint[])
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load data'
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
