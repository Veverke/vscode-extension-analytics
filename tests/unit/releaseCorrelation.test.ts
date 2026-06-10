import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  computeReleaseImpact,
  type ReleaseImpact,
} from '../../src/metrics/releaseCorrelation';
import type { ReleaseEntry } from '../../src/types/schema';
import releasesFixture from '../../fixtures/data/Veverke.chatwizard.releases.json';

// Fixture: 3 releases
// v1.0.0 installsAtRelease: 450
// v1.1.0 installsAtRelease: 620
// v1.2.0 installsAtRelease: 980
// currentInstalls: 1380

const CURRENT_INSTALLS = 1380;

describe('computeReleaseImpact', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty array for empty releases', () => {
    expect(computeReleaseImpact([], CURRENT_INSTALLS)).toEqual([]);
  });

  it('correct installsGained — each entry gains from next release installsAtRelease', () => {
    const result = computeReleaseImpact(
      releasesFixture as ReleaseEntry[],
      CURRENT_INSTALLS
    );

    // Find each version's impact
    const v100 = result.find((r) => r.version === '1.0.0')!;
    const v110 = result.find((r) => r.version === '1.1.0')!;
    const v120 = result.find((r) => r.version === '1.2.0')!;

    expect(v100).toBeDefined();
    expect(v110).toBeDefined();
    expect(v120).toBeDefined();

    // v1.0.0: gained = 1.1.0.installsAtRelease - 1.0.0.installsAtRelease = 620 - 450 = 170
    expect(v100.installsGained).toBe(170);
    // v1.1.0: gained = 1.2.0.installsAtRelease - 1.1.0.installsAtRelease = 980 - 620 = 360
    expect(v110.installsGained).toBe(360);
    // v1.2.0: gained = currentInstalls - 1.2.0.installsAtRelease = 1380 - 980 = 400
    expect(v120.installsGained).toBe(400);
  });

  it('last release uses currentInstalls for installsGained', () => {
    const result = computeReleaseImpact(
      releasesFixture as ReleaseEntry[],
      CURRENT_INSTALLS
    );
    // Last by date is v1.2.0 (publishedAt: 2026-05-24)
    const v120 = result.find((r) => r.version === '1.2.0')!;
    expect(v120.installsGained).toBe(CURRENT_INSTALLS - 980);
  });

  it('installsPerDay is approximately installsGained / daysElapsed', () => {
    // Fix "now" so daysElapsed is deterministic
    const now = new Date('2026-06-05T00:00:00.000Z').getTime();
    vi.setSystemTime(now);

    const result = computeReleaseImpact(
      releasesFixture as ReleaseEntry[],
      CURRENT_INSTALLS
    );

    for (const impact of result) {
      const expected = impact.installsGained / impact.daysElapsed;
      expect(impact.installsPerDay).toBeCloseTo(expected, 5);
    }
  });

  it('sorted descending by installsGained', () => {
    const result = computeReleaseImpact(
      releasesFixture as ReleaseEntry[],
      CURRENT_INSTALLS
    );
    expect(result.length).toBeGreaterThan(1);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].installsGained).toBeGreaterThanOrEqual(
        result[i + 1].installsGained
      );
    }
  });

  it('installsCurrent is always set to currentInstalls', () => {
    const result = computeReleaseImpact(
      releasesFixture as ReleaseEntry[],
      CURRENT_INSTALLS
    );
    for (const impact of result) {
      expect(impact.installsCurrent).toBe(CURRENT_INSTALLS);
    }
  });

  it('daysElapsed is at least 1 for any release', () => {
    const result = computeReleaseImpact(
      releasesFixture as ReleaseEntry[],
      CURRENT_INSTALLS
    );
    for (const impact of result) {
      expect(impact.daysElapsed).toBeGreaterThanOrEqual(1);
    }
  });

  it('handles single release — uses currentInstalls', () => {
    const single: ReleaseEntry[] = [
      {
        version: '1.0.0',
        publishedAt: '2026-05-01T00:00:00.000Z',
        installsAtRelease: 100,
      },
    ];
    const result = computeReleaseImpact(single, 300);
    expect(result).toHaveLength(1);
    expect(result[0].installsGained).toBe(200);
    expect(result[0].installsCurrent).toBe(300);
  });

  it('preserves installsAtRelease from the release entry', () => {
    const result: ReleaseImpact[] = computeReleaseImpact(
      releasesFixture as ReleaseEntry[],
      CURRENT_INSTALLS
    );
    const v100 = result.find((r) => r.version === '1.0.0')!;
    expect(v100.installsAtRelease).toBe(450);
  });
});