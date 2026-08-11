import { useState, useEffect } from 'react'
import { ExtensionEntry, ExtensionRegistry } from '../types/schema'
import { loadData } from '../utils/dataLoader'

export interface UseExtensionsResult {
  extensions: ExtensionEntry[]
  loading: boolean
  error: string | null
}

/**
 * Loads the extension registry.
 *
 * When a username is provided, filters the registry to only include
 * extensions requested by that user. When no username is given, returns
 * all extensions.
 */
export function useExtensions(username?: string): UseExtensionsResult {
  const [extensions, setExtensions] = useState<ExtensionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // Reset state immediately when the username changes so stale
    // extensions from a previous user are never shown while the
    // new user's data is being fetched.
    setLoading(true)
    setError(null)
    setExtensions([])

    loadData<ExtensionRegistry>('./data/extensions.json')
      .then((data) => {
        if (cancelled) return
        if (!data || !Array.isArray(data)) {
          setError('Invalid extensions data: expected an array')
          setExtensions([])
        } else {
          const filtered = username
            ? data.filter((e) => e.requestedBy === username)
            : data
          setExtensions(filtered)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Failed to load extensions'
        setError(message)
        setExtensions([])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [username])

  return { extensions, loading, error }
}
