// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchOpenVsxStats } from '../openvsx.js';
import openvsxFixture from '../../fixtures/data/openvsx-response.json';

describe('openvsx', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parseOpenVsxResponse — maps all fields correctly from fixture', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(openvsxFixture),
    } as unknown as typeof fetch);

    const result = await fetchOpenVsxStats('Veverke', 'chatwizard');

    expect(result).not.toBeNull();
    expect(result!.downloads).toBe(1582);
    expect(result!.ratingCount).toBe(0);
    expect(typeof result!.downloads).toBe('number');
  });

  it('fetchOpenVsxStats — 404 returns null without throwing', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 404,
      json: () => Promise.resolve({ error: 'Not Found' }),
    } as unknown as typeof fetch);

    const result = await fetchOpenVsxStats('Unknown', 'notfound');
    expect(result).toBeNull();
  });

  it('parseOpenVsxResponse — missing fields fall back to defaults', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({}),
    } as unknown as typeof fetch);

    const result = await fetchOpenVsxStats('Veverke', 'chatwizard');
    expect(result).not.toBeNull();
    expect(result!.downloads).toBe(0);
    expect(result!.averageRating).toBeNull();
    expect(result!.ratingCount).toBe(0);
  });
});
