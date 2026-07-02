import type { MarketplaceSnapshot, ReleaseEntry, DataPoint } from '../types/schema'

interface MarketplaceStat {
  statisticName: string
  value: number
}

interface MarketplaceVersion {
  version: string
  lastUpdated: string
  targetPlatform?: string
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

/** Detects whether the code is running inside a VS Code webview. */
function isWebview(): boolean {
  return typeof window !== 'undefined' && window.vscode !== undefined
}

const CACHE_PREFIX = 'competitor:'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const FETCH_TIMEOUT_MS = isWebview() ? 3_000 : 15_000 // shorter in webview (CORS blocks marketplace API)

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
}

/**
 * Fetches current marketplace stats for a competitor extension.
 * Results are cached in sessionStorage for 1 hour.
 */
/**
 * Returns a descriptive error message for webview environments where
 * the marketplace API is blocked by content security policy.
 */
function webviewCorsError(extensionId: string): never {
  throw new Error(
    `Cannot fetch competitor "${extensionId}" from VS Code webview. ` +
    'The Marketplace API is blocked by the webview content security policy. ' +
    'Competitor comparison works when running in a browser (via `npm run dev`).'
  )
}

export async function fetchCompetitorStats(
  extensionId: string
): Promise<MarketplaceSnapshotWithDisplayName> {
  const cached = getFromSessionCache<MarketplaceSnapshotWithDisplayName>(extensionId)
  if (cached) return cached

  // Marketplace API is blocked in webview — fail immediately
  if (isWebview()) {
    webviewCorsError(extensionId)
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
        flags: 914,
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

  const result: MarketplaceSnapshotWithDisplayName = {
    displayName: ext.displayName ?? extensionId,
    installs: getStat(statistics, 'install'),
    updates: getStat(statistics, 'updateCount'),
    averageRating: averageRating === 0 ? undefined : averageRating,
    ratingCount: getStat(statistics, 'ratingcount'),
    trendingWeekly: getStat(statistics, 'trendingweekly'),
    trendingMonthly: getStat(statistics, 'trendingmonthly'),
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
}

/**
 * Fetches competitor data and constructs a synthetic DataPoint[] with current stats.
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
  }

  const result: CompetitorData = {
    displayName: stats.displayName,
    data: [dataPoint],
    releases,
  }

  setSessionCache(COMPETITOR_CACHE_PREFIX + extensionId, result)
  return result
}