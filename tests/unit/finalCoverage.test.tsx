import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import { sortSummaries } from '../../src/routes/Overview'
import { buildChartData as buildInstallsChartData } from '../../src/components/charts/InstallsChart'
import { buildChartData as buildGitHubChartData } from '../../src/components/charts/GitHubChart'
import Layout from '../../src/components/Layout'
import fixtureExtensions from '../../fixtures/data/extensions.json'
import type { DataPoint, ExtensionEntry } from '../../src/types/schema'
import type { ExtensionSummary } from '../../src/hooks/useAllExtensionsData'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePoint(installs: number, ts: string, overrides?: Partial<DataPoint>): DataPoint {
  return {
    ts,
    marketplace: {
      installs,
      updates: 0,
      averageRating: 4.0,
      ratingCount: 1,
      trendingWeekly: 0,
      trendingMonthly: 0,
    },
    openVsx: null,
    github: null,
    ...overrides,
  }
}

// ─── Overview: sortSummaries momentum sort (default case) ─────────────────────

describe('sortSummaries — momentum sort (default case)', () => {
  const baseExt: ExtensionEntry = {
    id: 'test.ext',
    namespace: 'test',
    name: 'ext',
    displayName: 'Test',
    githubRepo: '',
    trackedSince: '2026-01-01T00:00:00Z',
  }

  const makeSummary = (displayName: string, momentum: number, currentInstalls = 0, velocity = 0): ExtensionSummary => ({
    extension: { ...baseExt, id: displayName.toLowerCase().replace(/\s/g, '.'), displayName },
    data: [],
    currentInstalls,
    velocity,
    momentum,
    sparklinePoints: [],
  })

  it('sorts descending by momentum when asc is false', () => {
    const summaries = [
      makeSummary('Alpha', 10),
      makeSummary('Beta', 50),
      makeSummary('Gamma', 30),
    ]
    const sorted = sortSummaries(summaries, 'momentum', false)
    expect(sorted[0].extension.displayName).toBe('Beta')   // momentum 50
    expect(sorted[1].extension.displayName).toBe('Gamma')  // momentum 30
    expect(sorted[2].extension.displayName).toBe('Alpha')  // momentum 10
  })

  it('sorts ascending by momentum when asc is true', () => {
    const summaries = [
      makeSummary('Alpha', 50),
      makeSummary('Beta', 10),
      makeSummary('Gamma', 30),
    ]
    const sorted = sortSummaries(summaries, 'momentum', true)
    expect(sorted[0].extension.displayName).toBe('Beta')   // momentum 10
    expect(sorted[1].extension.displayName).toBe('Gamma')  // momentum 30
    expect(sorted[2].extension.displayName).toBe('Alpha')  // momentum 50
  })

  it('handles equal momentum values', () => {
    const summaries = [
      makeSummary('Alpha', 30),
      makeSummary('Beta', 30),
    ]
    const sorted = sortSummaries(summaries, 'momentum', false)
    // Should not throw; order of equal values is undefined
    expect(sorted).toHaveLength(2)
  })
})

// ─── GitHubChart: buildChartData with contributionsBreakdown ──────────────────

describe('GitHubChart buildChartData — contributionsBreakdown', () => {
  it('maps contributionsBreakdown fields correctly', () => {
    const data: DataPoint[] = [
      makePoint(100, '2026-01-01T00:00:00Z', {
        github: {
          stars: 100,
          forks: 20,
          contributions: 50,
          contributionsBreakdown: {
            commits: 30,
            issues: 10,
            prs: 5,
            reviews: 5,
          },
        },
      }),
      makePoint(200, '2026-01-02T00:00:00Z', {
        github: {
          stars: 150,
          forks: 25,
          contributions: 60,
          contributionsBreakdown: {
            commits: 35,
            issues: 12,
            prs: 8,
            reviews: 5,
          },
        },
      }),
    ]
    const result = buildGitHubChartData(data)
    expect(result).toHaveLength(2)
    expect(result[0].contributionsCommits).toBe(30)
    expect(result[0].contributionsIssues).toBe(10)
    expect(result[0].contributionsPrs).toBe(5)
    expect(result[0].contributionsReviews).toBe(5)
    expect(result[1].contributionsCommits).toBe(35)
    expect(result[1].contributionsIssues).toBe(12)
    expect(result[1].contributionsPrs).toBe(8)
    expect(result[1].contributionsReviews).toBe(5)
  })

  it('handles missing contributionsBreakdown by setting fields to null', () => {
    const data: DataPoint[] = [
      makePoint(100, '2026-01-01T00:00:00Z', {
        github: { stars: 10, forks: 3, contributions: 5 },
      }),
    ]
    const result = buildGitHubChartData(data)
    expect(result).toHaveLength(1)
    expect(result[0].contributionsCommits).toBeNull()
    expect(result[0].contributionsIssues).toBeNull()
    expect(result[0].contributionsPrs).toBeNull()
    expect(result[0].contributionsReviews).toBeNull()
  })
})

// ─── InstallsChart: buildChartData with OpenVSX projections ───────────────────

describe('InstallsChart buildChartData — OpenVSX projections', () => {
  it('handles openVsxProjections with overlapping timestamps', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z', { openVsx: { downloads: 50, averageRating: null, ratingCount: 0 } }),
      makePoint(200, '2026-01-02T00:00:00Z', { openVsx: { downloads: 75, averageRating: null, ratingCount: 0 } }),
      makePoint(300, '2026-01-03T00:00:00Z', { openVsx: { downloads: 100, averageRating: null, ratingCount: 0 } }),
    ]
    const projections = [{
      model: 'linear' as const,
      r2: 0.95,
      points: [{ ts: Date.UTC(2026, 0, 10), value: 400 }],
      equation: 'y = 50x + 100',
    }]
    const openVsxProjections = [{
      model: 'linear' as const,
      r2: 0.90,
      points: [{ ts: Date.UTC(2026, 0, 10), value: 150 }],
      equation: 'y = 25x + 50',
    }]
    const result = buildInstallsChartData(data, projections, openVsxProjections)
    // Should have real points + projection points
    expect(result.length).toBeGreaterThan(data.length)
    // Should have both proj_linear and proj_openVsx_linear keys
    const hasProj = result.some(p => p.proj_linear !== null && p.proj_linear !== undefined)
    const hasOpenVsxProj = result.some(p => p.proj_openVsx_linear !== null && p.proj_openVsx_linear !== undefined)
    expect(hasProj).toBe(true)
    expect(hasOpenVsxProj).toBe(true)
  })

  it('handles openVsxProjections without regular projections (returns only real points)', () => {
    // buildChartData returns early when projections is empty (line 78),
    // so OpenVSX projection keys are not added in this case.
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z', { openVsx: { downloads: 50, averageRating: null, ratingCount: 0 } }),
      makePoint(200, '2026-01-02T00:00:00Z', { openVsx: { downloads: 75, averageRating: null, ratingCount: 0 } }),
      makePoint(300, '2026-01-03T00:00:00Z', { openVsx: { downloads: 100, averageRating: null, ratingCount: 0 } }),
    ]
    const openVsxProjections = [{
      model: 'linear' as const,
      r2: 0.90,
      points: [{ ts: Date.UTC(2026, 0, 10), value: 150 }],
      equation: 'y = 25x + 50',
    }]
    const result = buildInstallsChartData(data, [], openVsxProjections)
    // When projections is empty, the function returns early with just real points
    expect(result.length).toBeGreaterThanOrEqual(data.length)
    // OpenVSX projection keys are NOT added (they require non-empty projections)
    const hasOpenVsxProj = result.some(p => p.proj_openVsx_linear !== null && p.proj_openVsx_linear !== undefined)
    expect(hasOpenVsxProj).toBe(false)
  })
})

// ─── Layout: icon error handler in sidebar ────────────────────────────────────

describe('Layout — sidebar icon error handler', () => {
  it('hides icon on image error in sidebar', () => {
    render(
      <ExtensionsContext.Provider value={fixtureExtensions}>
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      </ExtensionsContext.Provider>,
    )

    // Find all images in the sidebar (they have alt="")
    const sidebarImages = document.querySelectorAll('.sidebar__link-icon img')
    expect(sidebarImages.length).toBeGreaterThan(0)

    // Trigger error on the first icon
    const firstImg = sidebarImages[0] as HTMLImageElement
    fireEvent.error(firstImg)
    expect(firstImg.style.display).toBe('none')
  })
})

// ─── marketplaceApi: fetchCompetitorData with GitHub repo extraction ──────────

describe('marketplaceApi — fetchCompetitorData with GitHub repo extraction', () => {
  const mockFetch = vi.fn()
  global.fetch = mockFetch

  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

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

  it('extracts GitHub repo from version properties and fetches GitHub stats', async () => {
    // Mock 3 calls: fetchCompetitorStats, fetchCompetitorReleases, fetchCompetitorGitHubStats
    mockFetch
      // Call 1: fetchCompetitorStats — marketplace stats with version properties containing GitHub repo
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
              versions: [{
                version: '1.0.0',
                lastUpdated: '2026-01-01T00:00:00Z',
                properties: [{
                  key: 'Microsoft.VisualStudio.Services.Links.Repository',
                  value: 'https://github.com/owner/repo.git',
                }],
              }],
            }],
          }],
        })
      )
      // Call 2: fetchCompetitorReleases
      .mockResolvedValueOnce(
        createMockResponse({
          results: [{
            extensions: [{
              versions: [{ version: '1.0.0', lastUpdated: '2026-01-01T00:00:00Z' }],
            }],
          }],
        })
      )
      // Call 3: fetchCompetitorGitHubStats
      .mockResolvedValueOnce(
        createMockResponse({
          stargazers_count: 100,
          forks_count: 20,
          pushed_at: '2026-06-01T00:00:00Z',
        })
      )

    const { fetchCompetitorData } = await import('../../src/utils/marketplaceApi')
    const result = await fetchCompetitorData('test.ext')

    expect(result.githubRepo).toBe('owner/repo')
    expect(result.githubStars).toBe(100)
    expect(result.githubForks).toBe(20)
    expect(result.lastCommit).toBe('2026-06-01T00:00:00Z')
    expect(result.displayName).toBe('Test Ext')
    expect(result.data[0].github).toEqual({ stars: 100, forks: 20, contributions: 0 })
  })

  it('handles GitHub stats fetch failure gracefully', async () => {
    mockFetch
      // Call 1: fetchCompetitorStats with repo
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
              versions: [{
                version: '1.0.0',
                lastUpdated: '2026-01-01T00:00:00Z',
                properties: [{
                  key: 'Microsoft.VisualStudio.Services.Links.Repository',
                  value: 'https://github.com/owner/repo.git',
                }],
              }],
            }],
          }],
        })
      )
      // Call 2: fetchCompetitorReleases
      .mockResolvedValueOnce(
        createMockResponse({
          results: [{
            extensions: [{
              versions: [{ version: '1.0.0', lastUpdated: '2026-01-01T00:00:00Z' }],
            }],
          }],
        })
      )
      // Call 3: fetchCompetitorGitHubStats fails
      .mockRejectedValueOnce(new Error('Network error'))

    const { fetchCompetitorData } = await import('../../src/utils/marketplaceApi')
    const result = await fetchCompetitorData('test.ext')

    // Should still return the data without GitHub stats
    expect(result.githubRepo).toBe('owner/repo')
    expect(result.githubStars).toBeUndefined()
    expect(result.githubForks).toBeUndefined()
    expect(result.lastCommit).toBe('2026-01-01T00:00:00Z') // falls back to latest release date
  })

  it('ignores expired sessionStorage cache and fetches fresh data', async () => {
    // Pre-populate sessionStorage with an expired cache entry for fetchCompetitorStats
    // (CACHE_PREFIX = 'competitor:', key = 'competitor:test.ext')
    const expiredTimestamp = Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
    const expiredEntry = JSON.stringify({
      data: { installs: 999, updates: 0, averageRating: undefined, ratingCount: 0, trendingWeekly: 0, trendingMonthly: 0, githubRepo: 'old/repo' },
      timestamp: expiredTimestamp,
    })
    sessionStorage.setItem('competitor:test.ext', expiredEntry)

    mockFetch
      // Call 1: fetchCompetitorStats (should ignore expired cache and fetch)
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
              versions: [{
                version: '1.0.0',
                lastUpdated: '2026-01-01T00:00:00Z',
              }],
            }],
          }],
        })
      )
      // Call 2: fetchCompetitorReleases
      .mockResolvedValueOnce(
        createMockResponse({
          results: [{
            extensions: [{
              versions: [{ version: '1.0.0', lastUpdated: '2026-01-01T00:00:00Z' }],
            }],
          }],
        })
      )

    const { fetchCompetitorData } = await import('../../src/utils/marketplaceApi')
    const result = await fetchCompetitorData('test.ext')

    // Should have fetched fresh data (not used expired cache)
    expect(result.data[0].marketplace.installs).toBe(500)
    expect(result.githubRepo).toBeUndefined() // no repo in the new data
    // The expired cache entry should have been removed and replaced with fresh data
    const newCache = sessionStorage.getItem('competitor:test.ext')
    expect(newCache).not.toBeNull()
    if (newCache) {
      const parsed = JSON.parse(newCache)
      expect(parsed.data.installs).toBe(500) // fresh data, not the expired 999
    }
  })

  it('handles invalid JSON in sessionStorage cache gracefully', async () => {
    // Store invalid JSON in sessionStorage for fetchCompetitorStats
    sessionStorage.setItem('competitor:test.ext', 'not-valid-json{{{')

    mockFetch
      // Call 1: fetchCompetitorStats (should handle parse error and fetch)
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
              versions: [{
                version: '1.0.0',
                lastUpdated: '2026-01-01T00:00:00Z',
              }],
            }],
          }],
        })
      )
      // Call 2: fetchCompetitorReleases
      .mockResolvedValueOnce(
        createMockResponse({
          results: [{
            extensions: [{
              versions: [{ version: '1.0.0', lastUpdated: '2026-01-01T00:00:00Z' }],
            }],
          }],
        })
      )

    const { fetchCompetitorData } = await import('../../src/utils/marketplaceApi')
    const result = await fetchCompetitorData('test.ext')

    // Should have fetched fresh data despite invalid cache
    expect(result.data[0].marketplace.installs).toBe(500)
  })
})

// ─── marketplaceApi: webview path ────────────────────────────────────────────

describe('marketplaceApi — webview path', () => {
  let originalVscode: unknown

  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
    originalVscode = (window as Record<string, unknown>).vscode
    // Mock the vscode API to simulate webview environment
    ;(window as Record<string, unknown>).vscode = {
      postMessage: vi.fn().mockImplementation((msg: { command: string; requestId: string }) => {
        // Simulate extension host responding to each proxy request
        setTimeout(() => {
          let result: unknown
          if (msg.command === 'fetchCompetitorStats') {
            result = { displayName: 'Test Ext', installs: 500, updates: 10, averageRating: 4.0, ratingCount: 50, trendingWeekly: 5, trendingMonthly: 20 }
          } else if (msg.command === 'fetchCompetitorReleases') {
            result = []
          } else if (msg.command === 'fetchCompetitorGitHubStats') {
            result = null
          }
          window.dispatchEvent(new MessageEvent('message', {
            data: { requestId: msg.requestId, result },
          }))
        }, 0)
      }),
    }
  })

  afterEach(() => {
    ;(window as Record<string, unknown>).vscode = originalVscode
  })

  it('uses proxyViaExtensionHost in webview context for fetchCompetitorData', async () => {
    const { fetchCompetitorData } = await import('../../src/utils/marketplaceApi')
    const result = await fetchCompetitorData('test.ext')

    expect(result.displayName).toBe('Test Ext')
    expect(result.data[0].marketplace.installs).toBe(500)
    expect(result.data[0].marketplace.updates).toBe(10)
  })

  it('uses proxyViaExtensionHost for fetchCompetitorStats directly', async () => {
    const { fetchCompetitorStats } = await import('../../src/utils/marketplaceApi')
    const result = await fetchCompetitorStats('test.ext')

    expect(result.displayName).toBe('Test Ext')
    expect(result.installs).toBe(500)
  })

  it('uses proxyViaExtensionHost for fetchCompetitorReleases directly', async () => {
    const { fetchCompetitorReleases } = await import('../../src/utils/marketplaceApi')
    const result = await fetchCompetitorReleases('test.ext')

    expect(result).toEqual([])
  })

  it('uses proxyViaExtensionHost for fetchCompetitorGitHubStats when repo is found', async () => {
    // Override the postMessage mock to return stats with a githubRepo
    ;(window as Record<string, unknown>).vscode = {
      postMessage: vi.fn().mockImplementation((msg: { command: string; requestId: string }) => {
        setTimeout(() => {
          let result: unknown
          if (msg.command === 'fetchCompetitorStats') {
            result = { displayName: 'Test Ext', installs: 500, updates: 10, averageRating: 4.0, ratingCount: 50, trendingWeekly: 5, trendingMonthly: 20, githubRepo: 'owner/repo' }
          } else if (msg.command === 'fetchCompetitorReleases') {
            result = [{ version: '1.0.0', publishedAt: '2026-01-01T00:00:00Z', installsAtRelease: 0 }]
          } else if (msg.command === 'fetchCompetitorGitHubStats') {
            result = { stars: 100, forks: 20, pushedAt: '2026-06-01T00:00:00Z' }
          }
          window.dispatchEvent(new MessageEvent('message', {
            data: { requestId: msg.requestId, result },
          }))
        }, 0)
      }),
    }

    const { fetchCompetitorData } = await import('../../src/utils/marketplaceApi')
    const result = await fetchCompetitorData('test.ext')

    expect(result.githubRepo).toBe('owner/repo')
    expect(result.githubStars).toBe(100)
    expect(result.githubForks).toBe(20)
    expect(result.lastCommit).toBe('2026-06-01T00:00:00Z')
  })

  it('handles proxyViaExtensionHost error response', async () => {
    ;(window as Record<string, unknown>).vscode = {
      postMessage: vi.fn().mockImplementation((msg: { command: string; requestId: string }) => {
        setTimeout(() => {
          // Return an error response for fetchCompetitorStats
          window.dispatchEvent(new MessageEvent('message', {
            data: { requestId: msg.requestId, error: 'Extension host error' },
          }))
        }, 0)
      }),
    }

    const { fetchCompetitorStats } = await import('../../src/utils/marketplaceApi')
    await expect(fetchCompetitorStats('test.ext')).rejects.toThrow('Extension host error')
  })
})
