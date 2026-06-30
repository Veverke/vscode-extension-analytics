import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEvents } from '../../src/hooks/useEvents';
import eventsFixture from '../../fixtures/data/events.json';

describe('useEvents', () => {
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

    const { result } = renderHook(() => useEvents());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.events).toEqual([]);
  });

  it('success — returns fixture events correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(eventsFixture),
      })
    );

    const { result } = renderHook(() => useEvents());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0].label).toBe('Blog post on Dev.to');
    expect(result.current.events[0].type).toBe('blog');
    expect(result.current.events[1].label).toBe('Posted on Hacker News');
    expect(result.current.events[1].type).toBe('social');
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

    const { result } = renderHook(() => useEvents());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('HTTP 500');
    expect(result.current.events).toEqual([]);
  });

  it('network error sets error and returns empty events', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network failure'))
    );

    const { result } = renderHook(() => useEvents());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network failure');
    expect(result.current.events).toEqual([]);
  });

  it('non-Error thrown uses fallback message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string error'));

    const { result } = renderHook(() => useEvents());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load events');
  });

  it('non-array response returns empty events', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ not: 'an array' }),
      })
    );

    const { result } = renderHook(() => useEvents());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.events).toEqual([]);
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

    const { result, unmount } = renderHook(() => useEvents());
    unmount();

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: () => Promise.resolve(eventsFixture),
      });
      await new Promise<void>((r) => setTimeout(r, 0));
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);
  });

  it('does not set error after unmount when fetch rejects (cancelled in catch)', async () => {
    let rejectFetch!: (err: Error) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((_resolve, reject) => {
          rejectFetch = reject;
        })
      )
    );

    const { result, unmount } = renderHook(() => useEvents());
    unmount();

    await act(async () => {
      rejectFetch(new Error('Late error after unmount'));
      await new Promise<void>((r) => setTimeout(r, 0));
    });

    // State should not have changed after unmount
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});