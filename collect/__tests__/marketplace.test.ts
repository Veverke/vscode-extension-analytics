// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMarketplaceStats, fetchReleaseHistory, extractUniqueVersions } from '../marketplace.js';
import { mergeReleases } from '../index.js';
import marketplaceFixture from '../../fixtures/data/marketplace-response.json';

describe('marketplace', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parseMarketplaceResponse — maps all fields correctly', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(marketplaceFixture),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    const result = await fetchMarketplaceStats('Veverke.chatwizard');

    expect(result.installs).toBe(85);
    expect(result.averageRating).toBe(5);
    expect(result.ratingCount).toBe(1);
    expect(result.trendingWeekly).toBe(0);
    expect(result.trendingMonthly).toBe(0);
    expect(result.updates).toBe(67);
  });

  it('parseMarketplaceResponse — missing stat returns 0 not a crash', async () => {
    const modifiedFixture = JSON.parse(
      JSON.stringify(marketplaceFixture)
    ) as typeof marketplaceFixture;
    modifiedFixture.results[0].extensions[0].statistics =
      modifiedFixture.results[0].extensions[0].statistics.filter(
        (s: { statisticName: string }) => s.statisticName !== 'trendingmonthly'
      );

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(modifiedFixture),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    const result = await fetchMarketplaceStats('Veverke.chatwizard');
    expect(result.trendingMonthly).toBe(0);
    expect(result.trendingMonthly).not.toBeNaN();
  });

  it('parseMarketplaceResponse — averageRating absent returns undefined (not 0)', async () => {
    const modifiedFixture = JSON.parse(
      JSON.stringify(marketplaceFixture)
    ) as typeof marketplaceFixture;
    modifiedFixture.results[0].extensions[0].statistics =
      modifiedFixture.results[0].extensions[0].statistics.filter(
        (s: { statisticName: string }) => s.statisticName !== 'averagerating'
      );

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(modifiedFixture),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    const result = await fetchMarketplaceStats('Veverke.chatwizard');
    expect(result.averageRating).toBeUndefined();
  });

  it('fetchMarketplaceStats — throws on non-ok HTTP response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('Service down'),
    } as unknown as typeof fetch);

    await expect(fetchMarketplaceStats('Veverke.chatwizard')).rejects.toThrow('503');
  });

  it('fetchMarketplaceStats — throws when extension not found in response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    await expect(fetchMarketplaceStats('Veverke.chatwizard')).rejects.toThrow(
      'No marketplace result',
    );
  });
});

describe('fetchReleaseHistory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses versions — returns deduplicated entries sorted ascending', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(marketplaceFixture),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    const result = await fetchReleaseHistory('Veverke.chatwizard');

    // Fixture has 1.1.2 and 1.5.0 (3 platform entries for 1.5.0 → deduped to 1)
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe('1.1.2');
    expect(result[1].version).toBe('1.5.0');
    // publishedAt is the lastUpdated from the fixture
    expect(result[0].publishedAt).toBe('2026-03-22T09:23:39.78Z');
    // installsAtRelease is 0 — caller populates it
    expect(result[0].installsAtRelease).toBe(0);
    expect(result[1].installsAtRelease).toBe(0);
  });

  it('returns empty array when extension has no versions field', async () => {
    const noVersionsFixture = {
      results: [{ extensions: [{ statistics: marketplaceFixture.results[0].extensions[0].statistics }] }],
    };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(noVersionsFixture),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    const result = await fetchReleaseHistory('Veverke.chatwizard');
    expect(result).toHaveLength(0);
  });

  it('throws on non-ok HTTP response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    await expect(fetchReleaseHistory('Veverke.chatwizard')).rejects.toThrow('503');
  });

  it('throws when no results returned', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    await expect(fetchReleaseHistory('Veverke.chatwizard')).rejects.toThrow(
      'No marketplace result',
    );
  });
});

describe('extractUniqueVersions', () => {
  it('deduplicates by version string keeping earliest lastUpdated', () => {
    const versions = [
      { version: '1.5.0', lastUpdated: '2026-05-26T13:16:38.947Z', targetPlatform: 'darwin-arm64' },
      { version: '1.5.0', lastUpdated: '2026-05-26T13:16:07.57Z', targetPlatform: 'win32-x64' },
      { version: '1.5.0', lastUpdated: '2026-05-26T13:16:00.543Z', targetPlatform: 'linux-x64' },
      { version: '1.1.2', lastUpdated: '2026-03-22T09:23:39.78Z' },
    ];
    const result = extractUniqueVersions(versions);
    expect(result).toHaveLength(2);
    const v150 = result.find(v => v.version === '1.5.0')!;
    // Earliest lastUpdated for 1.5.0 is linux-x64
    expect(v150.lastUpdated).toBe('2026-05-26T13:16:00.543Z');
  });

  it('returns single entry unchanged', () => {
    const versions = [{ version: '1.0.0', lastUpdated: '2026-01-01T00:00:00.000Z' }];
    const result = extractUniqueVersions(versions);
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe('1.0.0');
  });
});

describe('mergeReleases', () => {
  it('new version detection — only appends versions not already stored', () => {
    const stored = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 50 },
    ];
    const fetched = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 0 },
      { version: '1.1.0', publishedAt: '2026-04-01T00:00:00.000Z', installsAtRelease: 0 },
    ];
    const result = mergeReleases(stored, fetched, 120);

    expect(result).toHaveLength(2);
    // Existing entry kept with original installsAtRelease
    expect(result[0].installsAtRelease).toBe(50);
    // New entry gets current installs
    expect(result[1].version).toBe('1.1.0');
    expect(result[1].installsAtRelease).toBe(120);
  });

  it('no new versions — returns stored unchanged', () => {
    const stored = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 50 },
    ];
    const fetched = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 0 },
    ];
    const result = mergeReleases(stored, fetched, 120);
    expect(result).toHaveLength(1);
    expect(result[0].installsAtRelease).toBe(50);
  });

  it('empty stored — all fetched are new with currentInstalls', () => {
    const stored: import('../../src/types/schema.js').ReleaseEntry[] = [];
    const fetched = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 0 },
      { version: '1.1.0', publishedAt: '2026-04-01T00:00:00.000Z', installsAtRelease: 0 },
    ];
    const result = mergeReleases(stored, fetched, 200);
    expect(result).toHaveLength(2);
    expect(result[0].installsAtRelease).toBe(200);
    expect(result[1].installsAtRelease).toBe(200);
  });
});
