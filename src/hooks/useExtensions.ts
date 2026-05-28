import { useState, useEffect } from 'react'
import { ExtensionEntry, ExtensionRegistry } from '../types/schema'

export interface UseExtensionsResult {
  extensions: ExtensionEntry[]
  loading: boolean
  error: string | null
}

export function useExtensions(): UseExtensionsResult {
  const [extensions, setExtensions] = useState<ExtensionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('./data/extensions.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: unknown) => {
        if (cancelled) return
        if (!Array.isArray(data)) {
          setError('Invalid extensions data: expected an array')
          setExtensions([])
        } else {
          setExtensions(data as ExtensionRegistry)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load extensions'
        setError(message)
        setExtensions([])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { extensions, loading, error }
}
