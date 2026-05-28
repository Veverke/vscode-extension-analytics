// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMarketplaceStats } from '../marketplace.js';
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
