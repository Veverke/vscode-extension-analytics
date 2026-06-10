import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAllExtensionsData } from '../../src/hooks/useAllExtensionsData'
import type { ExtensionEntry } from '../../src/types/schema'
import extensionsMulti from '../../fixtures/data/extensions-multi.json'
import chatwizardData from '../../fixtures/data/Veverke.chatwizard.json'
import fastGrowerData from '../../fixtures/data/Veverke.fast-grower.json'
import slowGrowerData from '../../fixtures/data/Veverke.slow-grower.json'

const multiExtensions = extensionsMulti as ExtensionEntry[]

function mockFetchForMulti() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('Veverke.chatwizard')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(chatwizardData),
        })
      }
      if (url.includes('Veverke.fast-grower')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(fastGrowerData),
        })
      }
      if (url.includes('Veverke.slow-grower')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(slowGrowerData),
        })
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) })
    })
  )
}

describe('useAllExtensionsData', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in loading state', () => {
    mockFetchForMulti()
    const { result, unmount } = renderHook(() => useAllExtensionsData(multiExtensions))
    expect(result.current.loading).toBe(true)
    unmount()
  })

  it('loads all 3 extensions successfully', async () => {
    mockFetchForMulti()
    const { result, unmount } = renderHook(() => useAllExtensionsData(multiExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.results).toHaveLength(3)
    expect(Object.keys(result.current.errors)).toHaveLength(0)
    unmount()
  })

  it('each summary has correct currentInstalls', async () => {
    mockFetchForMulti()
    const { result, unmount } = renderHook(() => useAllExtensionsData(multiExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const chatwizard = result.current.results.find(
      r => r.extension.id === 'Veverke.chatwizard'
    )!
    expect(chatwizard.currentInstalls).toBe(1380) // last point in chatwizard fixture

    const fastGrower = result.current.results.find(
      r => r.extension.id === 'Veverke.fast-grower'
    )!
    expect(fastGrower.currentInstalls).toBe(11750) // last point in fast-grower fixture

    const slowGrower = result.current.results.find(
      r => r.extension.id === 'Veverke.slow-grower'
    )!
    expect(slowGrower.currentInstalls).toBe(115) // last point in slow-grower fixture
    unmount()
  })

  it('sparklinePoints has at most 14 values', async () => {
    mockFetchForMulti()
    const { result, unmount } = renderHook(() => useAllExtensionsData(multiExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    for (const summary of result.current.results) {
      expect(summary.sparklinePoints.length).toBeLessThanOrEqual(14)
      expect(summary.sparklinePoints.length).toBeGreaterThan(0)
    }
    unmount()
  })

  it('partial failure — one extension returns 404, others succeed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('Veverke.chatwizard')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(chatwizardData),
          })
        }
        if (url.includes('Veverke.fast-grower')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(fastGrowerData),
          })
        }
        // slow-grower returns 404
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) })
      })
    )

    const { result, unmount } = renderHook(() => useAllExtensionsData(multiExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.results).toHaveLength(2)
    expect(result.current.errors).toHaveProperty('Veverke.slow-grower')
    expect(result.current.errors['Veverke.slow-grower']).toContain('404')
    unmount()
  })

  it('returns empty results for empty extensions list', async () => {
    const { result, unmount } = renderHook(() => useAllExtensionsData([]))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.results).toHaveLength(0)
    expect(Object.keys(result.current.errors)).toHaveLength(0)
    unmount()
  })

  it('each result has velocity (number) and momentum (number in 0-100)', async () => {
    mockFetchForMulti()
    const { result, unmount } = renderHook(() => useAllExtensionsData(multiExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    for (const summary of result.current.results) {
      expect(typeof summary.velocity).toBe('number')
      expect(typeof summary.momentum).toBe('number')
      expect(summary.momentum).toBeGreaterThanOrEqual(0)
      expect(summary.momentum).toBeLessThanOrEqual(100)
    }
    unmount()
  })

  it('non-Error rejection uses fallback message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('Veverke.chatwizard')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(chatwizardData),
          })
        }
        if (url.includes('Veverke.fast-grower')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(fastGrowerData),
          })
        }
        // throw non-Error
        return Promise.reject('string rejection')
      })
    )

    const { result, unmount } = renderHook(() => useAllExtensionsData(multiExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.errors['Veverke.slow-grower']).toBe('Failed to load')
    unmount()
  })
})
