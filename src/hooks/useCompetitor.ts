import { useState, useEffect, useRef } from 'react'
import type { DataPoint, ReleaseEntry } from '../types/schema'
import { fetchCompetitorData } from '../utils/marketplaceApi'

export interface UseCompetitorResult {
  displayName: string | null
  data: DataPoint[]
  releases: ReleaseEntry[]
  loading: boolean
  error: string | null
  githubStars: number | null
  githubForks: number | null
  githubRepo: string | null
}

/**
 * Fetches competitor data from the VS Marketplace API.
 * Results are cached in sessionStorage for the current session.
 * Pass null to skip fetching (e.g., when no ID is entered yet).
 */
export function useCompetitor(extensionId: string | null, bypassCache = false): UseCompetitorResult {
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [data, setData] = useState<DataPoint[]>([])
  const [releases, setReleases] = useState<ReleaseEntry[]>([])
  const [githubStars, setGithubStars] = useState<number | null>(null)
  const [githubForks, setGithubForks] = useState<number | null>(null)
  const [githubRepo, setGithubRepo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previousId = useRef<string | null>(null)

  useEffect(() => {
    if (!extensionId) {
      setDisplayName(null)
      setData([])
      setReleases([])
      setGithubStars(null)
      setGithubForks(null)
      setGithubRepo(null)
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
        // If bypassCache is requested, clear the session cache for this extension
        const cacheKey = 'competitor-data:' + extensionId
        try { sessionStorage.removeItem(cacheKey) } catch { /* ignore */ }
        try { sessionStorage.removeItem('competitor:' + extensionId) } catch { /* ignore */ }
        try { sessionStorage.removeItem('competitor:' + extensionId + ':releases') } catch { /* ignore */ }

        const result = await fetchCompetitorData(extensionId)
        if (cancelled) return
        setDisplayName(result.displayName)
        setData(result.data)
        setReleases(result.releases)
        setGithubStars(result.githubStars ?? null)
        setGithubForks(result.githubForks ?? null)
        setGithubRepo(result.githubRepo ?? null)
        setError(null)
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to fetch competitor data'
        setError(message)
        setDisplayName(null)
        setData([])
        setReleases([])
        setGithubStars(null)
        setGithubForks(null)
        setGithubRepo(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    doFetch()

    return () => {
      cancelled = true
      previousId.current = null
    }
  }, [extensionId, bypassCache])

  return { displayName, data, releases, loading, error, githubStars, githubForks, githubRepo }
}
