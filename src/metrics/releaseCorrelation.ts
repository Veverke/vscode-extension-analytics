import type { ReleaseEntry } from '../types/schema';

export interface ReleaseImpact {
  version: string;
  publishedAt: string;
  installsAtRelease: number;
  installsCurrent: number;
  installsGained: number; // installsCurrent - installsAtRelease
  daysElapsed: number; // days since release
  installsPerDay: number; // installsGained / daysElapsed
}

/**
 * Computes the impact of each release using the current install count and
 * the install count recorded at the time of each release.
 *
 * For each release, installsGained is:
 *   - The difference between the next release's installsAtRelease and this release's installsAtRelease
 *     (if a next release exists)
 *   - Or currentInstalls - this release's installsAtRelease (for the last release)
 *
 * Returns results sorted descending by installsGained.
 */
export function computeReleaseImpact(
  releases: ReleaseEntry[],
  currentInstalls: number
): ReleaseImpact[] {
  if (releases.length === 0) return [];

  // Sort ascending by publishedAt to determine next-release boundaries
  const sorted = [...releases].sort((a, b) =>
    a.publishedAt.localeCompare(b.publishedAt)
  );

  const now = Date.now();

  const impacts: ReleaseImpact[] = sorted.map((release, index) => {
    const nextRelease = sorted[index + 1];
    const installsAtNext = nextRelease
      ? nextRelease.installsAtRelease
      : currentInstalls;

    const installsGained = installsAtNext - release.installsAtRelease;

    const releaseMs = new Date(release.publishedAt).getTime();
    const daysElapsed = Math.max(
      1,
      Math.round((now - releaseMs) / (1000 * 60 * 60 * 24))
    );

    const installsPerDay = installsGained / daysElapsed;

    return {
      version: release.version,
      publishedAt: release.publishedAt,
      installsAtRelease: release.installsAtRelease,
      installsCurrent: currentInstalls,
      installsGained,
      daysElapsed,
      installsPerDay,
    };
  });

  // Sort descending by installsGained
  return impacts.sort((a, b) => b.installsGained - a.installsGained);
}