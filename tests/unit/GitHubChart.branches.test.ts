import { describe, it, expect } from 'vitest'
import { buildChartData, formatTooltipValue, EMPTY_DATA_MESSAGE } from '../../src/components/charts/GitHubChart'
import type { DataPoint } from '../../src/types/schema'

function makePoint(github: { stars: number; forks: number; contributions: number } | null, ts = '2026-01-01T00:00:00Z'): DataPoint {
  return {
    ts,
    marketplace: { installs: 100, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github,
  }
}

describe('GitHubChart internal functions', () => {
  it('buildChartData - filters out points without github data', () => {
    const data: DataPoint[] = [
      makePoint(null),
      makePoint({ stars: 10, forks: 3, contributions: 5 }),
    ]
    const result = buildChartData(data)
    expect(result).toHaveLength(1)
    expect(result[0].stars).toBe(10)
  })

  it('buildChartData - returns empty when no github data', () => {
    const data: DataPoint[] = [makePoint(null), makePoint(null)]
    const result = buildChartData(data)
    expect(result).toHaveLength(0)
  })

  it('buildChartData - maps all fields correctly', () => {
    const data: DataPoint[] = [
      makePoint({ stars: 5, forks: 2, contributions: 1 }, '2026-01-01T00:00:00Z'),
      makePoint({ stars: 10, forks: 4, contributions: 3 }, '2026-01-02T00:00:00Z'),
    ]
    const result = buildChartData(data)
    expect(result).toHaveLength(2)
    expect(result[0].stars).toBe(5)
    expect(result[0].forks).toBe(2)
    expect(result[0].contributions).toBe(1)
    expect(result[1].stars).toBe(10)
  })

  it('formatTooltipValue - formats number with locale', () => {
    const [label] = formatTooltipValue(1000, 'Stars')
    expect(label).toBe('1,000')
  })

  it('formatTooltipValue - returns N/A for null', () => {
    const [label] = formatTooltipValue(null, 'Stars')
    expect(label).toBe('N/A')
  })

  it('formatTooltipValue - returns N/A for undefined', () => {
    const [label] = formatTooltipValue(undefined, 'Stars')
    expect(label).toBe('N/A')
  })

  it('EMPTY_DATA_MESSAGE is exported', () => {
    expect(EMPTY_DATA_MESSAGE).toBeTruthy()
  })
})