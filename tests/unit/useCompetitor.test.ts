import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCompetitor } from '../../src/hooks/useCompetitor'
import * as marketplaceApi from '../../src/utils/marketplaceApi'
import type { CompetitorData } from '../../src/utils/marketplaceApi'

vi.mock('../../src/utils/marketplaceApi')

const mockFetchCompetitorData = vi.mocked(marketplaceApi.fetchCompetitorData)

describe('useCompetitor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns loading state initially then data', async () => {
    mockFetchCompetitorData.mockResolvedValueOnce({
      displayName: 'Test Ext',
      data: [{ ts: '2025-01-01', marketplace: { installs: 100, updates: 5, averageRating: 4.0, ratingCount: 10, trendingWeekly: 0, trendingMonthly: 0 }, openVsx: null, github: null }],
      releases: [{ version: '1.0.0', publishedAt: '2025-01-01T00:00:00Z', installsAtRelease: 0 }],
    })

    const { result } = renderHook(() => useCompetitor('test.test-ext'))

    expect(result.current.loading).toBe(true)
    expect(result.current.displayName).toBeNull()
    expect(result.current.error).toBeNull()

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.displayName).toBe('Test Ext')
    expect(result.current.data).toHaveLength(1)
    expect(result.current.releases).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('returns error state when fetch fails', async () => {
    mockFetchCompetitorData.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCompetitor('test.test-ext'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.displayName).toBeNull()
    expect(result.current.data).toEqual([])
    expect(result.current.releases).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('handles non-Error rejection', async () => {
    mockFetchCompetitorData.mockRejectedValueOnce('string error')

    const { result } = renderHook(() => useCompetitor('test.test-ext'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to fetch competitor data')
  })

  it('resets state when extensionId is null', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useCompetitor(id),
      { initialProps: { id: 'test.test-ext' as string | null } }
    )

    // Wait for initial fetch to complete
    mockFetchCompetitorData.mockResolvedValueOnce({
      displayName: 'Test Ext',
      data: [{ ts: '2025-01-01', marketplace: { installs: 100, updates: 5, averageRating: 4.0, ratingCount: 10, trendingWeekly: 0, trendingMonthly: 0 }, openVsx: null, github: null }],
      releases: [{ version: '1.0.0', publishedAt: '2025-01-01T00:00:00Z', installsAtRelease: 0 }],
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Now set extensionId to null
    rerender({ id: null })

    expect(result.current.displayName).toBeNull()
    expect(result.current.data).toEqual([])
    expect(result.current.releases).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('cancels fetch on unmount', async () => {
    mockFetchCompetitorData.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)))

    const { result, unmount } = renderHook(() => useCompetitor('test.test-ext'))

    expect(result.current.loading).toBe(true)

    unmount()

    // Should not throw after unmount
    await new Promise((resolve) => setTimeout(resolve, 1500))
  })

  it('cancels fetch when extensionId changes rapidly', async () => {
    let resolveFirst: (value: CompetitorData) => void = () => {}
    const firstPromise = new Promise<CompetitorData>((resolve) => { resolveFirst = resolve })

    mockFetchCompetitorData
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce({
        displayName: 'Second Ext',
        data: [{ ts: '2025-02-01', marketplace: { installs: 200, updates: 10, averageRating: 4.5, ratingCount: 20, trendingWeekly: 0, trendingMonthly: 0 }, openVsx: null, github: null }],
        releases: [{ version: '2.0.0', publishedAt: '2025-02-01T00:00:00Z', installsAtRelease: 0 }],
      })

    const { result, rerender } = renderHook(
      ({ id }) => useCompetitor(id),
      { initialProps: { id: 'first.ext' as string | null } }
    )

    // Change extensionId before first resolves
    rerender({ id: 'second.ext' })

    // Resolve first, should be ignored
    resolveFirst({
      displayName: 'First Ext',
      data: [{ ts: '2025-01-01', marketplace: { installs: 100, updates: 5, averageRating: 4.0, ratingCount: 10, trendingWeekly: 0, trendingMonthly: 0 }, openVsx: null, github: null }],
      releases: [{ version: '1.0.0', publishedAt: '2025-01-01T00:00:00Z', installsAtRelease: 0 }],
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.displayName).toBe('Second Ext')
  })
})