import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAllExtensionsData, type ExtensionSummary } from '../../src/hooks/useAllExtensionsData'
import type { ExtensionEntry, DataPoint } from '../../src/types/schema'
import extensionsMulti from '../../fixtures/data/extensions-multi.json'

const multiExtensions = extensionsMulti as ExtensionEntry[]

// Tiny 2-point fixture to prevent OOM from 30-point data × 3 ext × 5 tests
const tinyData: DataPoint[] = [
  { ts: '2026-05-20T12:00:00Z', marketplace: { installs: 500, updates: 400, averageRating: 4.0, ratingCount: 10, trendingWeekly: 0, trendingMonthly: 0 }, openVsx: null },
  { ts: '2026-05-21T12:00:00Z', marketplace: { installs: 1380, updates: 900, averageRating: 4.5, ratingCount: 15, trendingWeekly: 5, trendingMonthly: 10 }, openVsx: null },
]

function makeMockResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as Response)
}

function mockFetchForMulti() {
  return ((url: string) => {
    if (url.includes('Veverke.chatwizard')) return makeMockResponse(tinyData)
    if (url.includes('Veverke.fast-grower')) return makeMockResponse(tinyData)
    if (url.includes('Veverke.slow-grower')) return makeMockResponse(tinyData)
    return makeMockResponse(null, false, 404)
  }) as unknown as typeof globalThis.fetch
}

function mockPartialFailure() {
  return ((url: string) => {
    if (url.includes('Veverke.chatwizard')) return makeMockResponse(tinyData)
    if (url.includes('Veverke.fast-grower')) return makeMockResponse(tinyData)
    return makeMockResponse(null, false, 404)
  }) as unknown as typeof globalThis.fetch
}

function mockNonErrorRejection() {
  return ((url: string) => {
    if (url.includes('Veverke.chatwizard')) return makeMockResponse(tinyData)
    if (url.includes('Veverke.fast-grower')) return makeMockResponse(tinyData)
    return Promise.reject('string rejection')
  }) as unknown as typeof globalThis.fetch
}

describe('useAllExtensionsData', () => {
  it('success path — loading state, installs, sparkline, velocity & momentum', async () => {
    globalThis.fetch = mockFetchForMulti()
    const { result, unmount } = renderHook(() => useAllExtensionsData(multiExtensions))

    // Check loading state before resolution
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.results).toHaveLength(3)
    expect(Object.keys(result.current.errors)).toHaveLength(0)

    for (const summary of result.current.results) {
      expect(summary.currentInstalls).toBe(1380)
      expect(summary.sparklinePoints.length).toBeLessThanOrEqual(14)
      expect(summary.sparklinePoints.length).toBeGreaterThan(0)
      expect(typeof summary.velocity).toBe('number')
      expect(typeof summary.momentum).toBe('number')
      expect(summary.momentum).toBeGreaterThanOrEqual(0)
      expect(summary.momentum).toBeLessThanOrEqual(100)
    }
    unmount()
  })

  it('error isolation — partial 404 and non-Error rejection', async () => {
    globalThis.fetch = mockPartialFailure()
    let result: { current: { results: ExtensionSummary[]; errors: Record<string, string>; loading: boolean } }
    let unmount: () => void

    // Test partial failure
    const h1 = renderHook(() => useAllExtensionsData(multiExtensions))
    result = h1.result
    unmount = h1.unmount
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.results).toHaveLength(2)
    expect(result.current.errors).toHaveProperty('Veverke.slow-grower')
    expect(result.current.errors['Veverke.slow-grower']).toContain('404')
    unmount()

    // Test non-Error rejection
    globalThis.fetch = mockNonErrorRejection()
    const h2 = renderHook(() => useAllExtensionsData(multiExtensions))
    result = h2.result
    unmount = h2.unmount
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.errors['Veverke.slow-grower']).toBe('Failed to load')
    unmount()
  })

  it('returns empty results for empty extensions list', async () => {
    const { result, unmount } = renderHook(() => useAllExtensionsData([]))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.results).toHaveLength(0)
    expect(Object.keys(result.current.errors)).toHaveLength(0)
    unmount()
  })
})