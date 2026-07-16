import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useExtensionData } from '../../src/hooks/useExtensionData'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'

describe('useExtensionData', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('success — returns data points matching fixture', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fixtureData),
      }),
    )

    const { result } = renderHook(() => useExtensionData('Veverke.chatwizard'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toHaveLength(fixtureData.length)
    expect(result.current.data[0].marketplace.installs).toBe(fixtureData[0].marketplace.installs)
  })

  it('404 — sets error and returns empty data array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve(null),
      }),
    )

    const { result } = renderHook(() => useExtensionData('Veverke.chatwizard'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('HTTP 404')
    expect(result.current.data).toEqual([])
  })

  it('empty array response — returns empty data without crash', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    )

    const { result } = renderHook(() => useExtensionData('Veverke.chatwizard'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual([])
  })

  it('non-array response — sets error and returns empty data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ not: 'an array' }),
      }),
    )

    const { result } = renderHook(() => useExtensionData('Veverke.chatwizard'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).not.toBeNull()
    expect(result.current.data).toEqual([])
  })

  it('does not update state after unmount (cancelled branch)', async () => {
    let resolveFetch!: (res: object) => void
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(resolve => { resolveFetch = resolve })),
    )

    const { result, unmount } = renderHook(() => useExtensionData('Veverke.chatwizard'))
    unmount()

    await act(async () => {
      resolveFetch({ ok: true, json: () => Promise.resolve(fixtureData) })
      await new Promise<void>(r => setTimeout(r, 0))
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toEqual([])
  })

  it('non-Error thrown in catch — uses fallback message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string error'))

    const { result } = renderHook(() => useExtensionData('Veverke.chatwizard'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to load data')
  })

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

    const { result, unmount } = renderHook(() =>
      useExtensionData('Veverke.chatwizard')
    );
    unmount();

    await act(async () => {
      rejectFetch(new Error('Late error after unmount'));
      await new Promise<void>((r) => setTimeout(r, 0));
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  })
})
