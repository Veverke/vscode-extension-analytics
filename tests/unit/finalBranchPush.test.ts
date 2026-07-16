import { describe, it, expect } from 'vitest'
import { computeProjection } from '../../src/metrics/projections'
import { buildChartData as buildInstallsChartData } from '../../src/components/charts/InstallsChart'
import { buildChartData as buildGitHubChartData } from '../../src/components/charts/GitHubChart'
import { buildChartData as buildVelocityChartData } from '../../src/components/charts/VelocityChart'
import { extractUniqueVersions } from '../../collect/marketplace'
import type { DataPoint } from '../../src/types/schema'

function makeData(installs: number[], tsBase = '2026-01-01T00:00:00Z'): DataPoint[] {
  return installs.map((count, i) => ({
    ts: new Date(new Date(tsBase).getTime() + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: { installs: count, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github: null,
  }))
}

describe('InstallsChart buildChartData - null projection values', () => {
  it('handles projections with overlapping timestamps', () => {
    const data = makeData([100, 200, 300])
    const proj = computeProjection(data, 'linear', 30)
    const proj2 = computeProjection(data, 'exponential', 30)
    const projections = [proj!, proj2!]
    const result = buildInstallsChartData(data, projections)
    expect(result.length).toBeGreaterThan(data.length)
  })

  it('handles null projections gracefully', () => {
    const data = makeData([100, 200, 300])
    const result = buildInstallsChartData(data, null as any)
    expect(result.length).toBeGreaterThanOrEqual(data.length)
  })

  it('handles empty projections array', () => {
    const data = makeData([100, 200, 300])
    const result = buildInstallsChartData(data, [])
    expect(result.length).toBeGreaterThanOrEqual(data.length)
  })
})

describe('InstallsChart buildChartData - extension to today', () => {
  it('extends to today when last point is in past', () => {
    const oldData = makeData([100, 200], '2025-01-01T00:00:00Z')
    const result = buildInstallsChartData(oldData)
    // Should have the original points plus today extension
    expect(result.length).toBeGreaterThan(oldData.length)
  })

  it('does not extend when last point is today', () => {
    const today = new Date()
    const data = makeData([100, 200], today.toISOString())
    const result = buildInstallsChartData(data)
    expect(result.length).toBe(2) // Original 2 points only
  })
})

describe('GitHubChart buildChartData - edge cases', () => {
  it('returns empty for no github data', () => {
    const data = makeData([100, 200])
    expect(buildGitHubChartData(data)).toEqual([])
  })

  it('filters mixed github/null data', () => {
    const data = [
      makeData([100])[0],
      { ...makeData([200])[0], github: { stars: 10, forks: 5, contributions: 2 } },
      makeData([300])[0],
    ]
    const result = buildGitHubChartData(data)
    expect(result).toHaveLength(1)
  })
})

describe('VelocityChart buildChartData', () => {
  it('computes velocity for multiple points', () => {
    const result = buildVelocityChartData(makeData([100, 200, 300, 400]))
    expect(result).toHaveLength(4)
    expect(result[0].velocity).toBeDefined()
    expect(result[1].velocity).toBeDefined()
  })
})

describe('extractUniqueVersions - branch coverage', () => {
  it('keeps version with earlier lastUpdated when existing is newer', () => {
    const v1 = { version: '1.0.0', lastUpdated: '2026-02-01T00:00:00Z' }
    const v2 = { version: '1.0.0', lastUpdated: '2026-01-01T00:00:00Z' }
    // v1 comes first, then v2 with earlier date should replace it
    const result = extractUniqueVersions([v1 as any, v2 as any])
    expect(result).toHaveLength(1)
    expect(result[0].lastUpdated).toBe('2026-01-01T00:00:00Z')
  })

  it('keeps first version when existing is earlier', () => {
    const v1 = { version: '1.0.0', lastUpdated: '2026-01-01T00:00:00Z' }
    const v2 = { version: '1.0.0', lastUpdated: '2026-02-01T00:00:00Z' }
    // v1 comes first with earlier date, v2 should be skipped
    const result = extractUniqueVersions([v1 as any, v2 as any])
    expect(result).toHaveLength(1)
    expect(result[0].lastUpdated).toBe('2026-01-01T00:00:00Z')
  })
})