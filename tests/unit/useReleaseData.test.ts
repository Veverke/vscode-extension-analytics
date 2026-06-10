import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useReleaseData } from '../../src/hooks/useReleaseData';
import releasesFixture from '../../fixtures/data/Veverke.chatwizard.releases.json';

describe('useReleaseData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('404 returns empty array with no error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve(null),
      })
    );

    const { result } = renderHook(() => useReleaseData('Veverke.chatwizard'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.releases).toEqual([]);
  });

  it('success — returns all 3 releases with correct fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(releasesFixture),
      })
    );

    const { result } = renderHook(() => useReleaseData('Veverke.chatwizard'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.releases).toHaveLength(3);
    expect(result.current.releases[0].version).toBe('1.0.0');
    expect(result.current.releases[0].installsAtRelease).toBe(450);
    expect(result.current.releases[1].version).toBe('1.1.0');
    expect(result.current.releases[2].version).toBe('1.2.0');
  });

  it('non-404 HTTP error sets error state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve(null),
      })
    );

    const { result } = renderHook(() => useReleaseData('Veverke.chatwizard'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('HTTP 500');
    expect(result.current.releases).toEqual([]);
  });

  it('network error sets error and returns empty releases', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const { result } = renderHook(() => useReleaseData('Veverke.chatwizard'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network failure');
    expect(result.current.releases).toEqual([]);
  });

  it('non-Error thrown uses fallback message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string error'));

    const { result } = renderHook(() => useReleaseData('Veverke.chatwizard'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load releases');
  });

  it('non-array response returns empty releases', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ not: 'an array' }),
      })
    );

    const { result } = renderHook(() => useReleaseData('Veverke.chatwizard'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.releases).toEqual([]);
  });

  it('does not update state after unmount (cancelled branch)', async () => {
    let resolveFetch!: (res: object) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      )
    );

    const { result, unmount } = renderHook(() =>
      useReleaseData('Veverke.chatwizard')
    );
    unmount();

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: () => Promise.resolve(releasesFixture),
      });
      await new Promise<void>((r) => setTimeout(r, 0));
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.releases).toEqual([]);
  });
});