import type { DataPoint } from '../src/types/schema.js';
import { fileURLToPath } from 'node:url';
import {
  readExtensionRegistry,
  appendDataPoint,
  ensureDataDir,
  readReleases,
  writeReleases,
  readTimeSeries,
} from './storage.js';
import { fetchMarketplaceStats, fetchReleaseHistory } from './marketplace.js';
import { fetchOpenVsxStats } from './openvsx.js';
import { fetchGitHubStats } from './github-stats.js';
import { computeMonthlyRollup, writeMonthlyRollup } from './monthly.js';

/**
 * Merges newly fetched release entries with the stored ones.
 * Only adds versions not already present. Sets installsAtRelease
 * and downloadsAtRelease on first detection.
 * Returns the updated list (does not mutate stored array in place).
 */
export function mergeReleases(
  stored: import('../src/types/schema.js').ReleaseEntry[],
  fetched: import('../src/types/schema.js').ReleaseEntry[],
  currentInstalls: number,
  currentDownloads: number | null | undefined
): import('../src/types/schema.js').ReleaseEntry[] {
  const storedVersions = new Set(stored.map((r) => r.version));
  const newEntries = fetched
    .filter((r) => !storedVersions.has(r.version))
    .map((r) => ({
      ...r,
      installsAtRelease: currentInstalls,
      downloadsAtRelease: currentDownloads ?? null,
    }));
  return [...stored, ...newEntries];
}

export async function runCollector(): Promise<number> {
  ensureDataDir();
  const registry = readExtensionRegistry();

  if (registry.length === 0) {
    console.warn('[collector] No extensions in registry. Run discover first.');
    return 0;
  }

  const githubToken = process.env.GITHUB_TOKEN ?? '';

  const results = await Promise.allSettled(
    registry.map(async (entry) => {
      const [marketplace, openVsx, fetchedReleases, github] = await Promise.all([
        fetchMarketplaceStats(entry.id),
        fetchOpenVsxStats(entry.namespace, entry.name),
        fetchReleaseHistory(entry.id),
        fetchGitHubStats(entry.githubRepo, githubToken).catch((err) => {
          console.warn(
            `[collector] Failed to fetch GitHub stats for ${entry.id}: ${err instanceof Error ? err.message : String(err)}`
          );
          return null;
        }),
      ]);

      // Marketplace API sometimes returns stale install counts that are lower
      // than previously recorded values. Since installs are cumulative, clamp
      // to the last known maximum to prevent impossible decreases.
      const storedPoints = readTimeSeries(entry.id);
      const lastInstalls =
        storedPoints.length > 0
          ? storedPoints[storedPoints.length - 1].marketplace.installs
          : 0;
      if (marketplace.installs < lastInstalls) {
        console.warn(
          `[collector] Install count decreased for ${entry.id}: ${lastInstalls} → ${marketplace.installs}. Using last known max: ${lastInstalls}.`
        );
        marketplace.installs = lastInstalls;
      }

      const point: DataPoint = {
        ts: new Date().toISOString(),
        marketplace,
        openVsx,
        github,
      };

      appendDataPoint(entry.id, point);

      // Merge and persist release history
      const storedReleases = readReleases(entry.id);
      const mergedReleases = mergeReleases(
        storedReleases,
        fetchedReleases,
        marketplace.installs,
        openVsx?.downloads
      );
      if (mergedReleases.length !== storedReleases.length) {
        writeReleases(entry.id, mergedReleases);
        console.log(
          `[collector] Updated releases for ${entry.id}: ${mergedReleases.length} versions`
        );
      }

      // Re-compute and persist monthly rollups
      const allData = readTimeSeries(entry.id);
      const rollups = computeMonthlyRollup(allData);
      writeMonthlyRollup(entry.id, rollups);

      console.log(`[collector] Collected data for ${entry.id}`);
      return entry.id;
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `[collector] Summary: ${succeeded} succeeded, ${failed} failed out of ${registry.length} extensions.`
  );

  results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .forEach((r) => console.error('[collector] Error:', r.reason));

  return succeeded === 0 ? 1 : 0;
}

/* v8 ignore next 7 */
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runCollector()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err: unknown) => {
      console.error('[collector] Fatal error:', err);
      process.exitCode = 1;
    });
}