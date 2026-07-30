import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMonthlyRollups } from '../../src/hooks/useMonthlyRollups'

const mockData = [
  {
    yearMonth: '2026-05',
    installsEndOfMonth: 1380,
    installsGained: 0,
    avgRating: 4.19,
    ratingCountEndOfMonth: 14,
    openVsxDownloadsEndOfMonth: 645,
    dataPointsInMonth: 28,
  },
]

describe('useMonthlyRollups', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns rollups data on successful fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const { result } = renderHook(() => useMonthlyRollups('test.extension'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rollups).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('handles 404 gracefully (tolerate404)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('HTTP 404'))

    const { result } = renderHook(() => useMonthlyRollups('test.extension'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rollups).toEqual([])
  })

  it('handles fetch error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useMonthlyRollups('test.extension'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Network error')
    expect(result.current.rollups).toEqual([])
  })

  it('handles non-Error rejection with fallback message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce('string error')

    const { result } = renderHook(() => useMonthlyRollups('test.extension'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Failed to load monthly rollups')
    expect(result.current.rollups).toEqual([])
  })

  it('does not update state after unmount (cancelled flag in .then)', async () => {
    let resolvePromise!: (value: Response) => void
    const deferredPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(deferredPromise as unknown as Promise<Response>)

    const { result, unmount } = renderHook(() => useMonthlyRollups('test.extension'))

    // Wait for the useEffect to fire (loadData is now pending on the deferred promise)
    await new Promise<void>((r) => setTimeout(r, 10))

    // Unmount before fetch completes (sets cancelled = true)
    unmount()

    // Now resolve the promise (after unmount, so cancelled is true)
    resolvePromise({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    // Wait for the promise chain to complete
    await new Promise<void>((r) => setTimeout(r, 100))

    // After unmount, loading should still be true (cancelled prevented state update)
    expect(result.current.loading).toBe(true)
  })

  it('does not update state after unmount (cancelled flag in .catch)', async () => {
    let rejectPromise!: (reason: Error) => void
    const deferredPromise = new Promise<Response>((_resolve, reject) => {
      rejectPromise = reject
    })
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(deferredPromise as unknown as Promise<Response>)

    const { result, unmount } = renderHook(() => useMonthlyRollups('test.extension'))

    // Wait for the useEffect to fire (loadData is now pending on the deferred promise)
    await new Promise<void>((r) => setTimeout(r, 10))

    // Unmount before fetch completes (sets cancelled = true)
    unmount()

    // Now reject the promise (after unmount, so cancelled is true)
    rejectPromise(new Error('Network error'))

    // Wait for the promise chain to complete
    await new Promise<void>((r) => setTimeout(r, 100))

    // After unmount, loading should still be true (cancelled prevented state update)
    expect(result.current.loading).toBe(true)
  })
})