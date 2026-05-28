import type { MarketplaceSnapshot } from '../src/types/schema.js';

interface MarketplaceStat {
  statisticName: string;
  value: number;
}

function getStat(statistics: MarketplaceStat[], name: string): number {
  const stat = statistics.find((s) => s.statisticName === name);
  return stat?.value ?? 0;
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

  const data = (await response.json()) as {
    results: Array<{
      extensions: Array<{
        statistics: MarketplaceStat[];
      }>;
    }>;
  };

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
