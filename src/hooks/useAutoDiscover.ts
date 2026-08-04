import { useState, useCallback, useRef } from 'react'
import type { ExtensionEntry } from '../types/schema'
import {
  parseRateLimitFromHeaders,
  formatRateLimitMessage,
} from '../utils/githubApi'

export interface DiscoveredExtension {
  extensionId: string
  namespace: string
  name: string
  displayName: string
  githubRepo: string
}

export interface UseAutoDiscoverResult {
  discover: (username: string) => Promise<void>
  results: DiscoveredExtension[]
  loading: boolean
  error: string | null
  rateLimitRemaining: number | null
}

interface GitHubRepo {
  name: string
  full_name: string
}

interface GitHubFileContent {
  content: string
  encoding: string
}

interface PackageJson {
  name?: string
  publisher?: string
  displayName?: string
  engines?: { vscode?: string }
}

/**
 * Fetches the raw content of a file from a GitHub repo via the Contents API.
 * Returns null if the file does not exist or cannot be decoded.
 */
async function fetchRepoFile(
  repoFullName: string,
  filePath: string,
  headers: Record<string, string>
): Promise<string | null> {
  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/contents/${filePath}`,
    { headers, signal: AbortSignal.timeout(10_000) }
  )

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`GitHub Contents API error: HTTP ${response.status}`)
  }

  const data = (await response.json()) as GitHubFileContent
  if (data.encoding !== 'base64' || typeof data.content !== 'string') {
    return null
  }

  return atob(data.content.replace(/\s/g, ''))
}

/**
 * Fetches a package.json from a given path in a repo and parses it.
 * Returns null if the file doesn't exist or can't be parsed.
 */
async function tryFetchPackageJson(
  repoFullName: string,
  filePath: string,
  headers: Record<string, string>
): Promise<PackageJson | null> {
  const raw = await fetchRepoFile(repoFullName, filePath, headers)
  if (!raw) return null

  const pkg = parsePackageJson(raw)
  if (!pkg) return null

  return pkg
}

/**
 * Parses a `package.json` string and returns structured info.
 */
function parsePackageJson(raw: string): PackageJson | null {
  try {
    return JSON.parse(raw) as PackageJson
  } catch {
    return null
  }
}

/**
 * Checks whether a parsed `package.json` is a VS Code extension.
 */
function isVSCodeExtension(pkg: PackageJson): boolean {
  return !!pkg.engines?.vscode
}

/**
 * React hook that discovers VS Code extensions authored by a GitHub user.
 *
 * Fetches all public repos for the given user, checks each for a `package.json`
 * with an `engines.vscode` field, and returns the list of discovered extensions.
 */
export function useAutoDiscover(): UseAutoDiscoverResult {
  const [results, setResults] = useState<DiscoveredExtension[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const discover = useCallback(async (username: string) => {
    // Cancel any in-flight discovery
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setResults([])
    setRateLimitRemaining(null)

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
    }

    try {
      // ── Step 1: Fetch all public repos for the user ──
      const reposResponse = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=public&page=1`,
        { headers, signal: controller.signal }
      )

      const rateLimit = parseRateLimitFromHeaders(reposResponse.headers)
      setRateLimitRemaining(rateLimit.remaining)

      if (reposResponse.status === 403 && rateLimit.remaining === 0) {
        throw new Error(formatRateLimitMessage(rateLimit))
      }

      if (reposResponse.status === 404) {
        throw new Error(`GitHub user "${username}" not found.`)
      }

      if (!reposResponse.ok) {
        throw new Error(`GitHub API error: HTTP ${reposResponse.status}`)
      }

      const repos = (await reposResponse.json()) as GitHubRepo[]
      if (!Array.isArray(repos) || repos.length === 0) {
        setResults([])
        setLoading(false)
        return
      }

      // ── Step 2: Check each repo for a VS Code extension package.json ──
      const repoChecks = repos.map(async (repo): Promise<DiscoveredExtension | null> => {
        try {
          // Try root package.json first, then extension/package.json for monorepos
          const pkg = await tryFetchPackageJson(repo.full_name, 'package.json', headers)
            ?? await tryFetchPackageJson(repo.full_name, 'extension/package.json', headers);
          if (!pkg) return null;

          if (!isVSCodeExtension(pkg)) return null;

          const namespace = pkg.publisher ?? ''
          const name = pkg.name ?? ''
          const displayName = pkg.displayName ?? name

          if (!namespace || !name) return null

          return {
            extensionId: `${namespace}.${name}`,
            namespace,
            name,
            displayName,
            githubRepo: repo.full_name,
          }
        } catch {
          // Silently skip repos that fail (network issues, etc.)
          return null
        }
      })

      const settled = await Promise.allSettled(repoChecks)
      const discovered: DiscoveredExtension[] = []
      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value !== null) {
          discovered.push(s.value)
        }
      }

      if (controller.signal.aborted) return

      setResults(discovered)
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const message = err instanceof Error ? err.message : 'Failed to discover extensions'
      setError(message)
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  return { discover, results, loading, error, rateLimitRemaining }
}

/**
 * Determines whether a discovered extension is already tracked in the registry.
 */
export function isExtensionTracked(
  extensionId: string,
  trackedExtensions: ExtensionEntry[]
): boolean {
  return trackedExtensions.some((e) => e.id === extensionId)
}

/**
 * Filters the registry to only include extensions that match the given user.
 */
export function filterExtensionsByUser(
  extensions: ExtensionEntry[],
  username: string | null
): ExtensionEntry[] {
  if (!username) return extensions
  return extensions.filter(
    (e) => !e.requestedBy || e.requestedBy === username
  )
}