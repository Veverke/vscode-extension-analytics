// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { fetchMarketplaceStats } from '../marketplace.js';

const isIntegration = process.env.INTEGRATION === 'true';

describe.skipIf(!isIntegration)('marketplace integration', () => {
  it('fetchMarketplaceStats — live call returns valid MarketplaceSnapshot', async () => {
    const result = await fetchMarketplaceStats('Veverke.chatwizard');

    expect(result.installs).toBeGreaterThan(0);
    expect(typeof result.installs).toBe('number');
    expect(typeof result.updates).toBe('number');
    expect(typeof result.ratingCount).toBe('number');
    expect(typeof result.trendingWeekly).toBe('number');
    expect(typeof result.trendingMonthly).toBe('number');
    expect(result.installs).not.toBeNaN();
    expect(result.updates).not.toBeNaN();
    expect(result.ratingCount).not.toBeNaN();
  }, 30000);
});
