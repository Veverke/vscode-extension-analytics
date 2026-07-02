import { describe, it, expect } from 'vitest'
import { computeMonthlyRollup } from '../monthly.js'
import type { DataPoint } from '../../src/types/schema.js'

function makePoint(ts: string, installs: number, rating?: number, ratingCount?: number, openVsxDownloads?: number): DataPoint {
  return {
    ts,
    marketplace: {
      installs,
      updates: 0,
      averageRating: rating ?? 4.0,
      ratingCount: ratingCount ?? 1,
      trendingWeekly: 0,
      trendingMonthly: 0,
    },
    openVsx: openVsxDownloads !== undefined
      ? { downloads: openVsxDownloads, averageRating: null, ratingCount: 0 }
      : null,
  }
}

describe('computeMonthlyRollup', () => {
  it('returns empty array for empty data', () => {
    expect(computeMonthlyRollup([])).toEqual([])
  })

  it('groups data points by calendar month (UTC)', () => {
    const data = [
      makePoint('2026-05-20T12:00:00Z', 500),
      makePoint('2026-05-25T12:00:00Z', 1000),
      makePoint('2026-06-01T00:00:00Z', 1200),
    ]
    const result = computeMonthlyRollup(data)
    expect(result).toHaveLength(2)
    expect(result[0].yearMonth).toBe('2026-05')
    expect(result[1].yearMonth).toBe('2026-06')
  })

  it('computes installsEndOfMonth from last data point in month', () => {
    const data = [
      makePoint('2026-05-20T12:00:00Z', 500),
      makePoint('2026-05-25T12:00:00Z', 1000),
    ]
    const result = computeMonthlyRollup(data)
    expect(result[0].installsEndOfMonth).toBe(1000)
  })

  it('computes installsGained as difference from previous month', () => {
    const data = [
      makePoint('2026-05-20T12:00:00Z', 500),
      makePoint('2026-05-25T12:00:00Z', 1000),
      makePoint('2026-06-01T00:00:00Z', 1200),
      makePoint('2026-06-05T00:00:00Z', 1500),
    ]
    const result = computeMonthlyRollup(data)
    expect(result[0].installsGained).toBe(0) // first month has no previous
    expect(result[1].installsGained).toBe(500) // 1500 - 1000
  })

  it('computes avgRating as average across all points in month', () => {
    const data = [
      makePoint('2026-05-20T12:00:00Z', 500, 4.0),
      makePoint('2026-05-25T12:00:00Z', 1000, 4.5),
    ]
    const result = computeMonthlyRollup(data)
    expect(result[0].avgRating).toBe(4.25)
  })

  it('handles undefined ratings by excluding them from average', () => {
    const data = [
      makePoint('2026-05-20T12:00:00Z', 500, undefined),
      makePoint('2026-05-25T12:00:00Z', 1000, 4.5),
    ]
    const result = computeMonthlyRollup(data)
    expect(result[0].avgRating).toBe(4.5)
  })

  it('sets avgRating to 0 when no ratings available', () => {
    const data = [
      makePoint('2026-05-20T12:00:00Z', 500, undefined),
    ]
    const result = computeMonthlyRollup(data)
    expect(result[0].avgRating).toBe(0)
  })

  it('captures ratingCountEndOfMonth and openVsxDownloadsEndOfMonth', () => {
    const data = [
      makePoint('2026-05-20T12:00:00Z', 500, 4.0, 5, 200),
      makePoint('2026-05-25T12:00:00Z', 1000, 4.5, 10, 300),
    ]
    const result = computeMonthlyRollup(data)
    expect(result[0].ratingCountEndOfMonth).toBe(10)
    expect(result[0].openVsxDownloadsEndOfMonth).toBe(300)
  })

  it('counts dataPointsInMonth correctly', () => {
    const data = [
      makePoint('2026-05-20T12:00:00Z', 500),
      makePoint('2026-05-21T12:00:00Z', 600),
      makePoint('2026-05-22T12:00:00Z', 700),
      makePoint('2026-06-01T00:00:00Z', 800),
    ]
    const result = computeMonthlyRollup(data)
    expect(result[0].dataPointsInMonth).toBe(3)
    expect(result[1].dataPointsInMonth).toBe(1)
  })

  it('sorts months chronologically', () => {
    const data = [
      makePoint('2026-06-01T00:00:00Z', 1200),
      makePoint('2026-05-20T12:00:00Z', 500),
      makePoint('2026-07-01T00:00:00Z', 1500),
    ]
    const result = computeMonthlyRollup(data)
    expect(result.map(r => r.yearMonth)).toEqual(['2026-05', '2026-06', '2026-07'])
  })

  it('handles real fixture data', () => {
    const fixture: DataPoint[] = [
      { ts: '2026-05-20T12:00:00Z', marketplace: { installs: 500, updates: 389, averageRating: 4.1, ratingCount: 2, trendingWeekly: 0, trendingMonthly: 0 }, openVsx: { downloads: 233, averageRating: null, ratingCount: 0 } },
      { ts: '2026-05-27T18:00:00Z', marketplace: { installs: 1380, updates: 1073, averageRating: 4.29, ratingCount: 14, trendingWeekly: 0.072464, trendingMonthly: 0.304349 }, openVsx: { downloads: 645, averageRating: 4.1, ratingCount: 5 } },
    ]
    const result = computeMonthlyRollup(fixture)
    expect(result).toHaveLength(1)
    expect(result[0].yearMonth).toBe('2026-05')
    expect(result[0].installsEndOfMonth).toBe(1380)
    expect(result[0].installsGained).toBe(0)
    expect(result[0].dataPointsInMonth).toBe(2)
  })
})