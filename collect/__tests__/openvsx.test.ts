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
      ok: true,
      json: () => Promise.resolve(openvsxFixture),
      text: () => Promise.resolve(''),
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
      ok: false,
      json: () => Promise.resolve({ error: 'Not Found' }),
      text: () => Promise.resolve('Not Found'),
    } as unknown as typeof fetch);

    const result = await fetchOpenVsxStats('Unknown', 'notfound');
    expect(result).toBeNull();
  });

  it('parseOpenVsxResponse — missing fields fall back to defaults', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    const result = await fetchOpenVsxStats('Veverke', 'chatwizard');
    expect(result).not.toBeNull();
    expect(result!.downloads).toBe(0);
    expect(result!.averageRating).toBeNull();
    expect(result!.ratingCount).toBe(0);
  });

  it('fetchOpenVsxStats — non-404 error response returns null', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 503,
      ok: false,
      statusText: 'Service Unavailable',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    } as unknown as typeof fetch);

    const result = await fetchOpenVsxStats('Veverke', 'chatwizard');
    expect(result).toBeNull();
  });

  it('fetchOpenVsxStats — non-404 with non-empty body logs details', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 429,
      ok: false,
      statusText: 'Too Many Requests',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('Rate limited'),
    } as unknown as typeof fetch);

    const result = await fetchOpenVsxStats('Veverke', 'chatwizard');
    expect(result).toBeNull();
  });

  it('fetchOpenVsxStats — text() rejection in error handler does not crash', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 502,
      ok: false,
      statusText: 'Bad Gateway',
      json: () => Promise.resolve({}),
      text: () => Promise.reject(new Error('stream error')),
    } as unknown as typeof fetch);

    const result = await fetchOpenVsxStats('Veverke', 'chatwizard');
    expect(result).toBeNull();
  });
});
