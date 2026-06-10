import type { MarketplaceSnapshot, ReleaseEntry } from '../src/types/schema.js';

interface MarketplaceStat {
  statisticName: string;
  value: number;
}

interface MarketplaceVersion {
  version: string;
  lastUpdated: string;
  targetPlatform?: string;
}

interface MarketplaceExtension {
  statistics?: MarketplaceStat[];
  versions?: MarketplaceVersion[];
}

interface MarketplaceResponse {
  results?: Array<{
    extensions?: MarketplaceExtension[];
  }>;
}

function getStat(statistics: MarketplaceStat[], name: string): number {
  const stat = statistics.find((s) => s.statisticName === name);
  return stat?.value ?? 0;
}

/**
 * Extracts unique release versions from the marketplace versions array.
 * The API may return multiple entries per version (one per target platform).
 * We deduplicate by version string, keeping the earliest lastUpdated date.
 */
export function extractUniqueVersions(versions: MarketplaceVersion[]): MarketplaceVersion[] {
  const seen = new Map<string, MarketplaceVersion>();
  for (const v of versions) {
    const existing = seen.get(v.version);
    if (!existing || v.lastUpdated < existing.lastUpdated) {
      seen.set(v.version, v);
    }
  }
  return Array.from(seen.values());
}

export async function fetchMarketplaceStats(
  extensionId: string
): Promise<MarketplaceSnapshot> {
  const response = await fetch(
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
    {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json;api-version=7.2-preview.1',
      },
      body: JSON.stringify({
        filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
        flags: 914,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `[marketplace] Failed to fetch ${extensionId}: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    );
  }

  const data = (await response.json()) as MarketplaceResponse;

  if (
    !data?.results ||
    data.results.length === 0 ||
    !data.results[0].extensions ||
    data.results[0].extensions.length === 0 ||
    !data.results[0].extensions[0].statistics
  ) {
    throw new Error(`[marketplace] No marketplace result for ${extensionId}`);
  }

  const statistics = data.results[0].extensions[0].statistics;
  const averageRating = getStat(statistics, 'averagerating');

  return {
    installs: getStat(statistics, 'install'),
    updates: getStat(statistics, 'updateCount'),
    averageRating: averageRating === 0 ? undefined : averageRating,
    ratingCount: getStat(statistics, 'ratingcount'),
    trendingWeekly: getStat(statistics, 'trendingweekly'),
    trendingMonthly: getStat(statistics, 'trendingmonthly'),
  };
}

/**
 * Fetches the release history for an extension from the VS Marketplace.
 * Uses flags bitmask 914 | 512 = 1022 to include version history.
 * Returns deduplicated ReleaseEntry[] sorted by publishedAt ascending.
 * installsAtRelease is set to 0 here — the caller populates it on first detection.
 */
export async function fetchReleaseHistory(
  extensionId: string
): Promise<ReleaseEntry[]> {
  const response = await fetch(
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
    {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json;api-version=7.2-preview.1',
      },
      body: JSON.stringify({
        filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
        flags: 1022, // 914 | 512 — includes version history
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `[marketplace] Failed to fetch release history for ${extensionId}: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    );
  }

  const data = (await response.json()) as MarketplaceResponse;

  if (
    !data?.results ||
    data.results.length === 0 ||
    !data.results[0].extensions ||
    data.results[0].extensions.length === 0
  ) {
    throw new Error(`[marketplace] No marketplace result for ${extensionId}`);
  }

  const ext = data.results[0].extensions[0];
  const versions = ext.versions ?? [];

  const unique = extractUniqueVersions(versions);

  return unique
    .map((v): ReleaseEntry => ({
      version: v.version,
      publishedAt: v.lastUpdated,
      installsAtRelease: 0, // populated by caller on first detection
    }))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
}