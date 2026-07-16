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
})