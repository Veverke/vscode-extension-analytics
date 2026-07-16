import { describe, it, expect } from 'vitest'
import { buildChartData } from '../../src/components/charts/InstallsChart'
import type { DataPoint } from '../../src/types/schema'

function makePoint(installs: number, ts: string, openVsx?: number): DataPoint {
  return {
    ts,
    marketplace: { installs, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: openVsx !== undefined ? { downloads: openVsx, averageRating: null, ratingCount: 0 } : null,
    github: null,
  }
}

describe('buildChartData', () => {
  it('returns empty array for empty data', () => {
    const result = buildChartData([])
    expect(result).toEqual([])
  })

  it('creates a point for each data entry', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z'), makePoint(200, '2026-01-02T00:00:00Z')]
    const result = buildChartData(data)
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0].installs).toBe(100)
    expect(result[1].installs).toBe(200)
  })

  it('maps openVsxDownloads correctly', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z', 50)]
    const result = buildChartData(data)
    expect(result[0].openVsxDownloads).toBe(50)
  })

  it('sets openVsxDownloads to null when not present', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z')]
    const result = buildChartData(data)
    expect(result[0].openVsxDownloads).toBeNull()
  })

  it('includes projection data when provided', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z')]
    const projections = [{
      model: 'linear' as const,
      r2: 0.95,
      points: [{ ts: Date.UTC(2026, 0, 10), value: 150 }],
      equation: 'y = 5x + 100',
    }]
    // buildChartData now adds a "today" continuation point, so we may have more points
    const result = buildChartData(data, projections)
    // Should have real points + projection points
    expect(result.length).toBeGreaterThanOrEqual(2)
    // The last point should have the proj_linear key
    const projKeys = result.filter(p => p.proj_linear !== null && p.proj_linear !== undefined)
    expect(projKeys.length).toBeGreaterThanOrEqual(1)
  })

  it('returns only real points when projections array is empty', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z')]
    const result = buildChartData(data, [])
    expect(result.length).toBeGreaterThanOrEqual(1)
  })

  it('includes openVsx projection data when provided', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z', 50)]
    const projections = [{
      model: 'linear' as const,
      r2: 0.95,
      points: [{ ts: Date.UTC(2026, 0, 10), value: 150 }],
      equation: 'y = 5x + 100',
    }]
    const openVsxProjections = [{
      model: 'linear' as const,
      r2: 0.90,
      points: [{ ts: Date.UTC(2026, 0, 10), value: 75 }],
      equation: 'y = 2.5x + 50',
    }]
    const result = buildChartData(data, projections, openVsxProjections)
    const projKeys = result.filter(p => p.proj_openVsx_linear !== null && p.proj_openVsx_linear !== undefined)
    expect(projKeys.length).toBeGreaterThanOrEqual(1)
  })
})