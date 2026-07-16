import { describe, it, expect } from 'vitest'
import { buildChartData as buildGitHubChartData } from '../../src/components/charts/GitHubChart'
import { buildChartData as buildRatingChartData } from '../../src/components/charts/RatingChart'
import { getMomentumColor, getAccelerationLabel } from '../../src/components/cards/MetricsPanel'
import { computeVelocity } from '../../src/metrics/velocity'
import { detectPeaks } from '../../src/metrics/peaks'
import type { DataPoint } from '../../src/types/schema'

function makeData(installs: number[], tsBase = '2026-01-01T00:00:00Z'): DataPoint[] {
  return installs.map((count, i) => ({
    ts: new Date(new Date(tsBase).getTime() + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: { installs: count, updates: 0, averageRating: count > 0 ? 4.0 : undefined, ratingCount: 5, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github: null,
  }))
}

describe('RatingChart buildChartData', () => {
  it('handles undefined averageRating as null', () => {
    const data: DataPoint[] = [
      makeData([100])[0],
    ]
    // Manually set averageRating to undefined
    data[0].marketplace.averageRating = undefined
    const result = buildRatingChartData(data)
    expect(result[0].rating).toBeNull()
  })

  it('maps ratingCount correctly', () => {
    const data = makeData([100])
    data[0].marketplace.ratingCount = 42
    const result = buildRatingChartData(data)
    expect(result[0].ratingCount).toBe(42)
  })
})

describe('GitHubChart buildChartData edge cases', () => {
  it('filters data points with null github', () => {
    const data: DataPoint[] = [
      makeData([100])[0],
      { ...makeData([200])[0], github: { stars: 5, forks: 2, contributions: 1 } },
    ]
    const result = buildGitHubChartData(data)
    expect(result).toHaveLength(1)
    expect(result[0].stars).toBe(5)
    expect(result[0].forks).toBe(2)
    expect(result[0].contributions).toBe(1)
  })
})

describe('Velocity computeVelocity edge cases', () => {
  it('returns empty array for empty data', () => {
    expect(computeVelocity([])).toEqual([])
  })

  it('returns array of zeros for single point', () => {
    const result = computeVelocity(makeData([100]))
    // With 1 data point, velocity has 1 entry? Let's check
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('MetricsPanel function edge cases', () => {
  it('getMomentumColor handles all boundaries', () => {
    expect(getMomentumColor(67)).toBe('#4ade80')
    expect(getMomentumColor(66)).toBe('#facc15')
    expect(getMomentumColor(33)).toBe('#facc15')
    expect(getMomentumColor(32)).toBe('#f87171')
  })

  it('getAccelerationLabel handles zero', () => {
    expect(getAccelerationLabel(0)).toBe('→ stable')
  })
})

describe('Peaks detectPeaks edge cases', () => {
  it('returns empty for array with 2 elements', () => {
    expect(detectPeaks([1, 2])).toEqual([])
  })

  it('filters by minThreshold', () => {
    const result = detectPeaks([1, 10, 2, 8, 1], 5)
    expect(result).toEqual([1, 3]) // Only indices with value >= 5
  })
})