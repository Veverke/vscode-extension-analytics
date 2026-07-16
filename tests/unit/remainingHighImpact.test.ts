import { describe, it, expect } from 'vitest'
import { formatVelocityTooltipValue, buildChartData as buildVelocityChartData } from '../../src/components/charts/VelocityChart'
import { formatInstallsTooltipValue, buildChartData as buildInstallsChartData } from '../../src/components/charts/InstallsChart'
import { formatTooltipValue, buildChartData as buildGitHubChartData } from '../../src/components/charts/GitHubChart'
import { formatMonthLabel } from '../../src/components/charts/MonthlyInstallsChart'
import { buildChartData as buildRatingChartData } from '../../src/components/charts/RatingChart'
import { computeProjection } from '../../src/metrics/projections'
import type { DataPoint } from '../../src/types/schema'

function makeData(installs: number[], tsBase = '2026-01-01T00:00:00Z'): DataPoint[] {
  return installs.map((count, i) => ({
    ts: new Date(new Date(tsBase).getTime() + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: { installs: count, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github: null,
  }))
}

describe('VelocityChart formatVelocityTooltipValue', () => {
  it('formats positive velocity', () => {
    const [label] = formatVelocityTooltipValue(5000)
    expect(label).toContain('+')
    expect(label).toContain('5,000')
  })

  it('formats negative velocity', () => {
    const [label] = formatVelocityTooltipValue(-100)
    expect(label).toContain('-')
  })

  it('formats zero velocity', () => {
    const [label] = formatVelocityTooltipValue(0)
    expect(label).toContain('+')
    expect(label).toContain('0')
  })

  it('handles non-number value', () => {
    const [label] = formatVelocityTooltipValue('invalid')
    expect(label).toContain('0')
  })
})

describe('VelocityChart buildChartData', () => {
  it('handles empty data', () => {
    expect(buildVelocityChartData([])).toEqual([])
  })

  it('handles single data point', () => {
    const result = buildVelocityChartData(makeData([100]))
    expect(result).toHaveLength(1)
  })

  it('computes correct velocities', () => {
    const result = buildVelocityChartData(makeData([100, 200, 300]))
    expect(result).toHaveLength(3)
    expect(result[0].velocity).toBeDefined()
    expect(typeof result[0].velocity).toBe('number')
  })
})

describe('InstallsChart formatInstallsTooltipValue', () => {
  it('formats null as N/A', () => {
    expect(formatInstallsTooltipValue(null, 'Installs')[0]).toBe('N/A')
  })

  it('formats undefined as N/A', () => {
    expect(formatInstallsTooltipValue(undefined, 'Installs')[0]).toBe('N/A')
  })

  it('formats number with locale', () => {
    expect(formatInstallsTooltipValue(5000, 'Installs')[0]).toBe('5,000')
  })
})

describe('InstallsChart buildChartData', () => {
  it('handles empty data', () => {
    expect(buildInstallsChartData([])).toEqual([])
  })

  it('handles single point data', () => {
    const result = buildInstallsChartData(makeData([100]))
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0].installs).toBe(100)
  })

  it('handles data with openVsx', () => {
    const data = makeData([100, 200])
    data[1] = { ...data[1], openVsx: { downloads: 50, averageRating: 4.0, ratingCount: 1 } }
    const result = buildInstallsChartData(data)
    expect(result[1].openVsxDownloads).toBe(50)
  })

  it('handles projections', () => {
    const data = makeData([100, 200, 300])
    const projection = computeProjection(data, 'linear', 30)
    const result = buildInstallsChartData(data, projection ? [projection] : [])
    expect(result.length).toBeGreaterThan(data.length)
  })

  it('handles projections with openVsx', () => {
    const data = makeData([100, 200, 300])
    const projection = computeProjection(data, 'linear', 30)
    const openVsxProjection = computeProjection(data, 'linear', 30, (p) => p.marketplace.installs)
    const result = buildInstallsChartData(data, projection ? [projection] : [], openVsxProjection ? [openVsxProjection] : [])
    expect(result.length).toBeGreaterThan(data.length)
  })
})

describe('GitHubChart formatTooltipValue', () => {
  it('formats null as N/A', () => {
    expect(formatTooltipValue(null, 'Stars')[0]).toBe('N/A')
  })

  it('formats number with locale', () => {
    expect(formatTooltipValue(5000, 'Stars')[0]).toBe('5,000')
  })
})

describe('GitHubChart buildChartData', () => {
  it('filters out null github data', () => {
    const data = makeData([100])
    const data2 = makeData([200])
    data2[0].github = { stars: 5, forks: 2, contributions: 1 }
    const mixed = [data[0], data2[0]]
    const result = buildGitHubChartData(mixed)
    expect(result).toHaveLength(1)
    expect(result[0].stars).toBe(5)
  })

  it('returns empty when all github null', () => {
    expect(buildGitHubChartData(makeData([100, 200]))).toHaveLength(0)
  })
})

describe('RatingChart buildChartData', () => {
  it('maps undefined rating to null', () => {
    const data = makeData([100])
    data[0].marketplace.averageRating = undefined
    const result = buildRatingChartData(data)
    expect(result[0].rating).toBeNull()
  })

  it('maps rating count correctly', () => {
    const data = makeData([100])
    const result = buildRatingChartData(data)
    expect(result[0].ratingCount).toBe(1)
  })
})

describe('MonthInstallsChart formatMonthLabel', () => {
  it('handles year-month boundary', () => {
    const result = formatMonthLabel('2026-01')
    expect(result).toContain('2026')
  })
})