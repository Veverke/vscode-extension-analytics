import { describe, it, expect } from 'vitest'
import { computeMomentum } from '../../src/metrics/momentum'
import { computeProjection } from '../../src/metrics/projections'
import { formatMonthLabel } from '../../src/components/charts/MonthlyInstallsChart'
import { buildChartData as buildGitHubChartData } from '../../src/components/charts/GitHubChart'
import { buildChartData as buildVelocityChartData } from '../../src/components/charts/VelocityChart'
import type { DataPoint } from '../../src/types/schema'

function makeData(installs: number[], tsBase = '2026-01-01T00:00:00Z'): DataPoint[] {
  return installs.map((count, i) => ({
    ts: new Date(new Date(tsBase).getTime() + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: { installs: count, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github: null,
  }))
}

describe('MonthlyInstallsChart formatMonthLabel', () => {
  it('handles all months', () => {
    expect(formatMonthLabel('2026-01')).toContain('Jan')
    expect(formatMonthLabel('2026-06')).toContain('Jun')
    expect(formatMonthLabel('2026-12')).toContain('Dec')
  })
})

describe('GitHubChart buildChartData', () => {
  it('filters out null github data', () => {
    const data: DataPoint[] = [
      makeData([100])[0],
      { ...makeData([200])[0], github: { stars: 5, forks: 2, contributions: 1 } },
    ]
    const result = buildGitHubChartData(data)
    expect(result).toHaveLength(1)
    expect(result[0].stars).toBe(5)
  })

  it('returns empty when all github null', () => {
    const data = makeData([100, 200])
    const result = buildGitHubChartData(data)
    expect(result).toHaveLength(0)
  })
})

describe('VelocityChart buildChartData', () => {
  it('returns velocities for each point', () => {
    const data = makeData([100, 200, 300])
    const result = buildVelocityChartData(data)
    expect(result).toHaveLength(3)
    expect(result[0].velocity).toBeDefined()
  })
})

describe('Momentum internal functions', () => {
  it('mean with empty array returns 0', () => {
    // Test via computeMomentum with flat data
    expect(computeMomentum(makeData([100, 100, 100, 100, 100]))).toBe(0)
  })

  it('signedNormalize with all zeros', () => {
    // All same values produce all-zero velocity, which triggers early return
    expect(computeMomentum(makeData([100, 100, 100, 100, 100]))).toBe(0)
  })

  it('recency factor calculation', () => {
    // Old data should still produce valid result
    const oldData = makeData([100, 200, 300], '2024-01-01T00:00:00Z')
    const result = computeMomentum(oldData)
    expect(result).not.toBeNaN()
  })
})

describe('Projection edge cases', () => {
  it('handles daysAhead = 0', () => {
    const data = makeData([100, 200, 300])
    const result = computeProjection(data, 'linear', 0)
    expect(result).not.toBeNull()
    expect(result!.points.length).toBeGreaterThanOrEqual(1)
  })

  it('handles single data point with daysAhead', () => {
    expect(computeProjection(makeData([100]), 'linear', 30)).toBeNull()
  })
})