import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAllExtensionsData } from '../../src/hooks/useAllExtensionsData';
import type { ExtensionEntry } from '../../src/types/schema';

const testExtensions: ExtensionEntry[] = [
  {
    id: 'Veverke.chatwizard',
    namespace: 'Veverke',
    name: 'chatwizard',
    displayName: 'Chat Wizard',
    githubRepo: 'Veverke/ChatWizard',
    trackedSince: '2026-05-28T11:04:43.476Z',
  },
];

describe('useAllExtensionsData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles empty extensions list — no fetch needed, no OOM risk', async () => {
    const { result, unmount } = renderHook(() => useAllExtensionsData([]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.results).toHaveLength(0)
    expect(Object.keys(result.current.errors)).toHaveLength(0)
    unmount()
  });

  it('loads extension data and computes summary fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    );

    const { result } = renderHook(() => useAllExtensionsData(testExtensions));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].extension.id).toBe('Veverke.chatwizard');
    expect(typeof result.current.results[0].velocity).toBe('number');
    expect(typeof result.current.results[0].momentum).toBe('number');
    expect(result.current.results[0].currentInstalls).toBe(0);
    expect(result.current.results[0].sparklinePoints).toEqual([]);
    expect(Object.keys(result.current.errors)).toHaveLength(0);
  });

  it('handles fetch failure for an extension — records error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Failed to load extension data')),
    );

    const { result } = renderHook(() => useAllExtensionsData(testExtensions));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.results).toHaveLength(0);
    expect(result.current.errors).toHaveProperty('Veverke.chatwizard');
    expect(result.current.errors['Veverke.chatwizard']).toBe(
      'Failed to load extension data',
    );
  });

  it('handles non-Error rejection — uses fallback message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string rejection'));

    const { result } = renderHook(() => useAllExtensionsData(testExtensions));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.results).toHaveLength(0);
    expect(result.current.errors['Veverke.chatwizard']).toBe('Failed to load');
  });
});