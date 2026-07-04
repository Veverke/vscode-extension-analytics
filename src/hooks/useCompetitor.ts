import { useState, useEffect, useRef } from 'react'
import type { DataPoint, ReleaseEntry } from '../types/schema'
import { fetchCompetitorData } from '../utils/marketplaceApi'

export interface UseCompetitorResult {
  displayName: string | null
  data: DataPoint[]
  releases: ReleaseEntry[]
  loading: boolean
  error: string | null
}

/**
 * Fetches competitor data from the VS Marketplace API.
 * Results are cached in sessionStorage for the current session.
 * Pass null to skip fetching (e.g., when no ID is entered yet).
 */
export function useCompetitor(extensionId: string | null): UseCompetitorResult {
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [data, setData] = useState<DataPoint[]>([])
  const [releases, setReleases] = useState<ReleaseEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previousId = useRef<string | null>(null)

  useEffect(() => {
    if (!extensionId) {
      setDisplayName(null)
      setData([])
      setReleases([])
      setLoading(false)
      setError(null)
      previousId.current = null
      return
    }

    previousId.current = extensionId

    let cancelled = false

    const doFetch = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchCompetitorData(extensionId)
        if (cancelled) return
        setDisplayName(result.displayName)
        setData(result.data)
        setReleases(result.releases)
        setError(null)
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to fetch competitor data'
        setError(message)
        setDisplayName(null)
        setData([])
        setReleases([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    doFetch()

    return () => {
      cancelled = true
      previousId.current = null
    }
  }, [extensionId])

  return { displayName, data, releases, loading, error }
}