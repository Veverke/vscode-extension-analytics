import type { MarketplaceSnapshot, ReleaseEntry, DataPoint } from '../types/schema'

interface MarketplaceStat {
  statisticName: string
  value: number
}

interface MarketplaceProperty {
  key: string
  value: string
}

interface MarketplaceVersion {
  version: string
  lastUpdated: string
  targetPlatform?: string
  properties?: MarketplaceProperty[]
}

interface MarketplaceExtension {
  displayName?: string
  statistics?: MarketplaceStat[]
  versions?: MarketplaceVersion[]
}

interface MarketplaceResponse {
  results?: Array<{
    extensions?: MarketplaceExtension[]
  }>
}

/** Minimal VS Code webview API interface */
interface VsCodeApi {
  postMessage(message: Record<string, unknown>): void
  getState(): unknown
  setState(state: unknown): void
}

/** Detects whether the code is running inside a VS Code webview. */
function isWebview(): boolean {
  return typeof window !== 'undefined' && (window as { vscode?: VsCodeApi }).vscode !== undefined
}

function getWebviewApi(): VsCodeApi {
  return (window as { vscode: VsCodeApi }).vscode
}

/**
 * Proxy a request through the VS Code extension host (which has no CORS restrictions).
 * Sends a postMessage and waits for the extension host to respond.
 */
function proxyViaExtensionHost<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2) + Date.now().toString(36)

    const handler = (event: MessageEvent) => {
      const msg = event.data as Record<string, unknown>
      if (msg?.requestId === requestId) {
        window.removeEventListener('message', handler)
        if (msg.error) {
          reject(new Error(msg.error as string))
        } else {
          resolve(msg.result as T)
        }
      }
    }

    window.addEventListener('message', handler)

    // Send the request to the extension host
    getWebviewApi().postMessage({
      command,
      requestId,
      args,
    })

    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('message', handler)
      reject(new Error(`Proxy request "${command}" timed out`))
    }, 15_000)
  })
}

const CACHE_PREFIX = 'competitor:'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const FETCH_TIMEOUT_MS = 15_000

function getStat(statistics: MarketplaceStat[], name: string): number {
  const stat = statistics.find((s) => s.statisticName === name)
  return stat?.value ?? 0
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

function getFromSessionCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function setSessionCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // sessionStorage may be full or unavailable
  }
}

export interface MarketplaceSnapshotWithDisplayName extends MarketplaceSnapshot {
  displayName: string
  githubRepo?: string
}

/**
 * Fetches current marketplace stats for a competitor extension.
 * Results are cached in sessionStorage for 1 hour.
 */

/** Extract GitHub repo full name from a repository URL string */
function extractGitHubRepo(url: string): string | null {
  if (!url) return null
  const match = url.match(/github\.com\/([^/]+\/[^/\s?#]+)/i)
  return match ? match[1].replace(/\.git$/, '') : null
}

/** Try to extract the GitHub repo from marketplace extension version properties */
function findGitHubRepoFromProperties(ext: MarketplaceExtension): string | null {
  const versions = ext.versions ?? []
  for (const v of versions) {
    const props = v.properties ?? []
    for (const p of props) {
      if (
        p.key === 'Microsoft.VisualStudio.Services.Links.Repository' ||
        p.key === 'Microsoft.VisualStudio.Code.GitHubRepo' ||
        p.key === 'Microsoft.VisualStudio.Services.Links.Source'
      ) {
        const repo = extractGitHubRepo(p.value)
        if (repo) return repo
      }
    }
  }
  return null
}

/**
 * Fetches GitHub stats (stars, forks, last push date) for a given repo.
 * Uses unauthenticated API (60 req/hr). Returns null on failure.
 */
interface CompetitorGitHubInfo {
  stars: number
  forks: number
  pushedAt: string | null
}

async function fetchCompetitorGitHubStats(repoFullName: string): Promise<CompetitorGitHubInfo | null> {
  // In webview, proxy through the extension host
  if (isWebview()) {
    return proxyViaExtensionHost<CompetitorGitHubInfo | null>('fetchCompetitorGitHubStats', { repoFullName })
  }
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}`,
      { signal: AbortSignal.timeout(10_000) }
    )
    if (!response.ok) return null
    const data = await response.json() as { stargazers_count: number; forks_count: number; pushed_at: string }
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      pushedAt: data.pushed_at ?? null,
    }
  } catch {
    return null
  }
}

export async function fetchCompetitorStats(
  extensionId: string
): Promise<MarketplaceSnapshotWithDisplayName> {
  const cached = getFromSessionCache<MarketplaceSnapshotWithDisplayName>(extensionId)
  if (cached) return cached

  // In webview, proxy through the extension host (no CORS restrictions)
  if (isWebview()) {
    return proxyViaExtensionHost<MarketplaceSnapshotWithDisplayName>('fetchCompetitorStats', { extensionId })
  }

  // Flags: 2 (categories) + 8 (versionProperties) + 128 (statistics) + 256 (latestVersionOnly) + 512 (unpublished) = 906
  const flags = 906

  const response = await fetch(
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
    {
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json;api-version=7.2-preview.1',
      },
      body: JSON.stringify({
        filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
        flags,
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Failed to fetch competitor ${extensionId}: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    )
  }

  const data = (await response.json()) as MarketplaceResponse

  if (
    !data?.results ||
    data.results.length === 0 ||
    !data.results[0].extensions ||
    data.results[0].extensions.length === 0 ||
    !data.results[0].extensions[0].statistics
  ) {
    throw new Error(`No marketplace result for competitor ${extensionId}`)
  }

  const ext = data.results[0].extensions[0]
  const statistics: MarketplaceStat[] = ext.statistics!
  const averageRating = getStat(statistics, 'averagerating')

  // Try to extract GitHub repo from version properties
  const githubRepo = findGitHubRepoFromProperties(ext)

  const result: MarketplaceSnapshotWithDisplayName = {
    displayName: ext.displayName ?? extensionId,
    installs: getStat(statistics, 'install'),
    updates: getStat(statistics, 'updateCount'),
    averageRating: averageRating === 0 ? undefined : averageRating,
    ratingCount: getStat(statistics, 'ratingcount'),
    trendingWeekly: getStat(statistics, 'trendingweekly'),
    trendingMonthly: getStat(statistics, 'trendingmonthly'),
    githubRepo: githubRepo ?? undefined,
  }

  setSessionCache(extensionId, result)
  return result
}

/**
 * Fetches release history for a competitor extension.
 */
export async function fetchCompetitorReleases(
  extensionId: string
): Promise<ReleaseEntry[]> {
  const cached = getFromSessionCache<ReleaseEntry[]>(extensionId + ':releases')
  if (cached) return cached

  // In webview, proxy through the extension host
  if (isWebview()) {
    return proxyViaExtensionHost<ReleaseEntry[]>('fetchCompetitorReleases', { extensionId })
  }

  const response = await fetch(
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
    {
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json;api-version=7.2-preview.1',
      },
      body: JSON.stringify({
        filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
        flags: 1022,
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Failed to fetch competitor releases for ${extensionId}: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    )
  }

  const data = (await response.json()) as MarketplaceResponse

  if (
    !data?.results ||
    data.results.length === 0 ||
    !data.results[0].extensions ||
    data.results[0].extensions.length === 0
  ) {
    throw new Error(`No marketplace result for competitor ${extensionId}`)
  }

  const ext = data.results[0].extensions[0]
  const versions = ext.versions ?? []

  // Deduplicate by version
  const seen = new Map<string, MarketplaceVersion>()
  for (const v of versions) {
    const existing = seen.get(v.version)
    if (!existing || v.lastUpdated < existing.lastUpdated) {
      seen.set(v.version, v)
    }
  }

  const releases: ReleaseEntry[] = Array.from(seen.values())
    .map((v): ReleaseEntry => ({
      version: v.version,
      publishedAt: v.lastUpdated,
      installsAtRelease: 0,
    }))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))

  setSessionCache(extensionId + ':releases', releases)
  return releases
}

const COMPETITOR_CACHE_PREFIX = 'competitor-data:'

export interface CompetitorData {
  displayName: string
  data: DataPoint[]
  releases: ReleaseEntry[]
  /** GitHub repo full name if found, null otherwise */
  githubRepo?: string
  /** GitHub stars info if repo was found */
  githubStars?: number
  githubForks?: number
  /** ISO date of last push to the GitHub repo */
  lastCommit?: string | null
}

/**
 * Fetches competitor data and constructs a synthetic DataPoint[] with current stats.
 * Also attempts to fetch GitHub stars for the competitor if a GitHub repo is found.
 */
export async function fetchCompetitorData(extensionId: string): Promise<CompetitorData> {
  const cached = getFromSessionCache<CompetitorData>(COMPETITOR_CACHE_PREFIX + extensionId)
  if (cached) return cached

  const [stats, releases] = await Promise.all([
    fetchCompetitorStats(extensionId),
    fetchCompetitorReleases(extensionId),
  ])

  const dataPoint: DataPoint = {
    ts: new Date().toISOString(),
    marketplace: {
      installs: stats.installs,
      updates: stats.updates,
      averageRating: stats.averageRating,
      ratingCount: stats.ratingCount,
      trendingWeekly: stats.trendingWeekly,
      trendingMonthly: stats.trendingMonthly,
    },
    openVsx: null,
    github: null,
  }

  // Use the latest release date as the "last commit" / last updated date
  // Prefer GitHub pushed_at if available (more accurate), fall back to marketplace latest release
  const latestRelease = releases.length > 0 ? releases[releases.length - 1] : null

  const result: CompetitorData = {
    displayName: stats.displayName,
    data: [dataPoint],
    releases,
    githubRepo: stats.githubRepo,
    lastCommit: latestRelease?.publishedAt ?? null,
  }

  // Try to fetch GitHub stats if we have a repo (may override lastCommit with more accurate pushed_at)
  if (stats.githubRepo) {
    const ghStats = await fetchCompetitorGitHubStats(stats.githubRepo)
    if (ghStats) {
      result.githubStars = ghStats.stars
      result.githubForks = ghStats.forks
      if (ghStats.pushedAt) {
        result.lastCommit = ghStats.pushedAt
      }
      // Also attach to the data point
      dataPoint.github = { stars: ghStats.stars, forks: ghStats.forks, contributions: 0 }
    }
  }

  setSessionCache(COMPETITOR_CACHE_PREFIX + extensionId, result)
  return result
}