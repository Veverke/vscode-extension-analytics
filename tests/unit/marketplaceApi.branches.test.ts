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

describe('marketplaceApi branch coverage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchCompetitorStats - text() rejection in error handler does not crash', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
      text: async () => { throw new Error('stream error') },
    } as unknown as Response)

    await expect(fetchCompetitorStats('test.ext')).rejects.toThrow('500')
  })

  it('fetchCompetitorReleases - text() rejection in error handler does not crash', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
      text: async () => { throw new Error('stream error') },
    } as unknown as Response)

    await expect(fetchCompetitorReleases('test.ext')).rejects.toThrow('500')
  })

  it('fetchCompetitorReleases - handles empty results gracefully', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{ extensions: [{}] }],
      })
    )

    const result = await fetchCompetitorReleases('test.ext')
    expect(result).toEqual([])
  })

  it('fetchCompetitorData - handles fetch failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(fetchCompetitorData('test.ext')).rejects.toThrow('Network error')
  })

  it('fetchCompetitorStats - handles missing statistics gracefully', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        results: [{
          extensions: [{
            displayName: 'Test',
            statistics: [
              { statisticName: 'install', value: 100 },
            ],
          }],
        }],
      })
    )

    const result = await fetchCompetitorStats('test.ext')
    expect(result.installs).toBe(100)
    expect(result.updates).toBe(0)
    expect(result.averageRating).toBeUndefined()
    expect(result.ratingCount).toBe(0)
    expect(result.trendingWeekly).toBe(0)
    expect(result.trendingMonthly).toBe(0)
  })

  it('fetchCompetitorReleases - handles non-ok response with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({}),
      text: async () => 'Rate limited',
    } as unknown as Response)

    await expect(fetchCompetitorReleases('test.ext')).rejects.toThrow('Rate limited')
  })
})