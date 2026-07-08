import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchCompetitorStats, fetchCompetitorReleases, fetchCompetitorData } from '../../src/utils/marketplaceApi'

const mockFetch = vi.fn()
global.fetch = mockFetch

function createMockResponse(data: unknown): Response {
  return {
    ok: true,
    json: async () => data,
    text: async () => JSON.stringify(data),
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => createMockResponse(data),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response
}

function createErrorResponse(status: number, statusText: string): Response {
  return {
    ok: false,
    json: async () => ({}),
    text: async () => `Error ${status}`,
    status,
    statusText,
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => createErrorResponse(status, statusText),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response
}

describe('fetchCompetitorStats', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and returns marketplace stats', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            displayName: 'Test Extension',
            statistics: [
              { statisticName: 'install', value: 1000 },
              { statisticName: 'updateCount', value: 50 },
              { statisticName: 'averagerating', value: 4.5 },
              { statisticName: 'ratingcount', value: 100 },
              { statisticName: 'trendingweekly', value: 10 },
              { statisticName: 'trendingmonthly', value: 50 },
            ],
          }],
        }],
      })
    )

    const result = await fetchCompetitorStats('test.test-extension')
    expect(result).toEqual({
      displayName: 'Test Extension',
      installs: 1000,
      updates: 50,
      averageRating: 4.5,
      ratingCount: 100,
      trendingWeekly: 10,
      trendingMonthly: 50,
    })
  })

  it('returns undefined averageRating when it is 0', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            displayName: 'Test Extension',
            statistics: [
              { statisticName: 'install', value: 1000 },
              { statisticName: 'updateCount', value: 50 },
              { statisticName: 'averagerating', value: 0 },
              { statisticName: 'ratingcount', value: 0 },
              { statisticName: 'trendingweekly', value: 0 },
              { statisticName: 'trendingmonthly', value: 0 },
            ],
          }],
        }],
      })
    )

    const result = await fetchCompetitorStats('test.test-extension')
    expect(result.averageRating).toBeUndefined()
  })

  it('uses extensionId as displayName when displayName is missing', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            statistics: [
              { statisticName: 'install', value: 500 },
              { statisticName: 'updateCount', value: 10 },
              { statisticName: 'averagerating', value: 3.5 },
              { statisticName: 'ratingcount', value: 50 },
              { statisticName: 'trendingweekly', value: 5 },
              { statisticName: 'trendingmonthly', value: 20 },
            ],
          }],
        }],
      })
    )

    const result = await fetchCompetitorStats('no.name-extension')
    expect(result.displayName).toBe('no.name-extension')
  })

  it('throws when marketplace returns no results', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [],
      })
    )

    await expect(fetchCompetitorStats('test.test-extension')).rejects.toThrow(
      'No marketplace result for competitor test.test-extension'
    )
  })

  it('throws when marketplace returns no extensions', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{ extensions: [] }],
      })
    )

    await expect(fetchCompetitorStats('test.test-extension')).rejects.toThrow(
      'No marketplace result for competitor test.test-extension'
    )
  })

  it('throws when extension has no statistics', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{}],
        }],
      })
    )

    await expect(fetchCompetitorStats('test.test-extension')).rejects.toThrow(
      'No marketplace result for competitor test.test-extension'
    )
  })

  it('throws on network error', async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(404, 'Not Found'))

    await expect(fetchCompetitorStats('test.test-extension')).rejects.toThrow(
      'Failed to fetch competitor test.test-extension: 404 Not Found - Error 404'
    )
  })

  it('caches results in sessionStorage', async () => {
    const mockData = {
      results: [{
        extensions: [{
          displayName: 'Cached Ext',
          statistics: [
            { statisticName: 'install', value: 999 },
            { statisticName: 'updateCount', value: 5 },
            { statisticName: 'averagerating', value: 4.0 },
            { statisticName: 'ratingcount', value: 50 },
            { statisticName: 'trendingweekly', value: 2 },
            { statisticName: 'trendingmonthly', value: 10 },
          ],
        }],
      }],
    }

    mockFetch.mockResolvedValueOnce(createMockResponse(mockData))

    // First call fetches from API
    const result1 = await fetchCompetitorStats('cached.ext')
    expect(result1.installs).toBe(999)

    // Second call should use cache, not fetch
    mockFetch.mockClear()
    const result2 = await fetchCompetitorStats('cached.ext')
    expect(result2.installs).toBe(999)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles statistics with missing fields gracefully', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            displayName: 'Partial Ext',
            statistics: [
              { statisticName: 'install', value: 100 },
            ],
          }],
        }],
      })
    )

    const result = await fetchCompetitorStats('partial.ext')
    expect(result).toEqual({
      displayName: 'Partial Ext',
      installs: 100,
      updates: 0,
      averageRating: undefined,
      ratingCount: 0,
      trendingWeekly: 0,
      trendingMonthly: 0,
    })
  })
})

describe('fetchCompetitorReleases', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and returns releases', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            versions: [
              { version: '1.0.0', lastUpdated: '2025-01-01T00:00:00Z' },
              { version: '1.1.0', lastUpdated: '2025-02-01T00:00:00Z' },
            ],
          }],
        }],
      })
    )

    const result = await fetchCompetitorReleases('test.test-extension')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      version: '1.0.0',
      publishedAt: '2025-01-01T00:00:00Z',
      installsAtRelease: 0,
    })
    expect(result[1]).toEqual({
      version: '1.1.0',
      publishedAt: '2025-02-01T00:00:00Z',
      installsAtRelease: 0,
    })
  })

  it('returns empty array when no versions', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{}],
        }],
      })
    )

    const result = await fetchCompetitorReleases('test.test-extension')
    expect(result).toEqual([])
  })

  it('throws when marketplace returns no result', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [],
      })
    )

    await expect(fetchCompetitorReleases('test.test-extension')).rejects.toThrow(
      'No marketplace result for competitor test.test-extension'
    )
  })

  it('deduplicates versions keeping the earliest lastUpdated', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            versions: [
              { version: '1.0.0', lastUpdated: '2025-02-01T00:00:00Z' },
              { version: '1.0.0', lastUpdated: '2025-01-01T00:00:00Z' },
            ],
          }],
        }],
      })
    )

    const result = await fetchCompetitorReleases('test.test-extension')
    expect(result).toHaveLength(1)
    expect(result[0].publishedAt).toBe('2025-01-01T00:00:00Z')
  })

  it('sorts releases by publishedAt ascending', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            versions: [
              { version: '2.0.0', lastUpdated: '2025-03-01T00:00:00Z' },
              { version: '1.0.0', lastUpdated: '2025-01-01T00:00:00Z' },
            ],
          }],
        }],
      })
    )

    const result = await fetchCompetitorReleases('test.test-extension')
    expect(result[0].version).toBe('1.0.0')
    expect(result[1].version).toBe('2.0.0')
  })

  it('throws on network error', async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(500, 'Internal Server Error'))

    await expect(fetchCompetitorReleases('test.test-extension')).rejects.toThrow(
      'Failed to fetch competitor releases for test.test-extension: 500 Internal Server Error - Error 500'
    )
  })

  it('caches results in sessionStorage', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            versions: [{ version: '1.0.0', lastUpdated: '2025-01-01T00:00:00Z' }],
          }],
        }],
      })
    )

    const result1 = await fetchCompetitorReleases('cached-release.ext')
    expect(result1).toHaveLength(1)

    mockFetch.mockClear()
    const result2 = await fetchCompetitorReleases('cached-release.ext')
    expect(result2).toHaveLength(1)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('fetchCompetitorData', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and combines stats and releases', async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({
          results: [{
            extensions: [{
              displayName: 'Test Ext',
              statistics: [
                { statisticName: 'install', value: 500 },
                { statisticName: 'updateCount', value: 10 },
                { statisticName: 'averagerating', value: 4.0 },
                { statisticName: 'ratingcount', value: 50 },
                { statisticName: 'trendingweekly', value: 5 },
                { statisticName: 'trendingmonthly', value: 20 },
              ],
            }],
          }],
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          results: [{
            extensions: [{
              versions: [{ version: '1.0.0', lastUpdated: '2025-01-01T00:00:00Z' }],
            }],
          }],
        })
      )

    const result = await fetchCompetitorData('test.test-ext')
    expect(result.displayName).toBe('Test Ext')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].marketplace.installs).toBe(500)
    expect(result.data[0].marketplace.averageRating).toBe(4.0)
    expect(result.releases).toHaveLength(1)
    expect(result.releases[0].version).toBe('1.0.0')
  })

  it('caches combined result', async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({
          results: [{
            extensions: [{
              displayName: 'Cached Ext',
              statistics: [
                { statisticName: 'install', value: 100 },
                { statisticName: 'updateCount', value: 0 },
                { statisticName: 'averagerating', value: 3.0 },
                { statisticName: 'ratingcount', value: 10 },
                { statisticName: 'trendingweekly', value: 0 },
                { statisticName: 'trendingmonthly', value: 0 },
              ],
            }],
          }],
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          results: [{
            extensions: [{
              versions: [{ version: '1.0.0', lastUpdated: '2025-01-01T00:00:00Z' }],
            }],
          }],
        })
      )

    const result1 = await fetchCompetitorData('cached-comp.ext')
    expect(result1.displayName).toBe('Cached Ext')

    mockFetch.mockClear()
    const result2 = await fetchCompetitorData('cached-comp.ext')
    expect(result2.displayName).toBe('Cached Ext')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})