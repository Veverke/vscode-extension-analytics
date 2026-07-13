import { describe, it, expect } from 'vitest'
import { computeProjection } from '../../src/metrics/projections'
import type { DataPoint } from '../../src/types/schema'

function makePoint(installs: number, ts: string): DataPoint {
  return {
    ts,
    marketplace: { installs, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github: null,
  }
}

describe('computeProjection branch coverage', () => {
  it('returns null for insufficient data (less than 3 points)', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z'), makePoint(200, '2026-01-02T00:00:00Z')]
    expect(computeProjection(data, 'linear', 30)).toBeNull()
  })

  it('returns null for single data point', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z')]
    expect(computeProjection(data, 'linear', 30)).toBeNull()
  })

  it('computes linear projection with 3+ data points', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(200, '2026-01-02T00:00:00Z'),
      makePoint(300, '2026-01-03T00:00:00Z'),
    ]
    const result = computeProjection(data, 'linear', 30)
    expect(result).not.toBeNull()
    expect(result!.model).toBe('linear')
    expect(result!.points.length).toBeGreaterThan(0)
  })

  it('computes exponential projection', () => {
    const data = [
      makePoint(10, '2026-01-01T00:00:00Z'),
      makePoint(100, '2026-01-02T00:00:00Z'),
      makePoint(1000, '2026-01-03T00:00:00Z'),
    ]
    const result = computeProjection(data, 'exponential', 30)
    expect(result).not.toBeNull()
    expect(result!.model).toBe('exponential')
  })

  it('computes polynomial projection', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(200, '2026-01-02T00:00:00Z'),
      makePoint(300, '2026-01-03T00:00:00Z'),
    ]
    const result = computeProjection(data, 'polynomial', 30)
    expect(result).not.toBeNull()
    expect(result!.model).toBe('polynomial')
  })

  it('handles NaN r2 by returning 1', () => {
    // Constant values produce NaN R²
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(100, '2026-01-02T00:00:00Z'),
      makePoint(100, '2026-01-03T00:00:00Z'),
    ]
    const result = computeProjection(data, 'linear', 30)
    expect(result).not.toBeNull()
    expect(result!.r2).toBe(1)
  })

  it('projected values are clamped to minimum 0', () => {
    // Data that would project negative
    const data = [
      makePoint(10, '2026-01-01T00:00:00Z'),
      makePoint(5, '2026-01-02T00:00:00Z'),
      makePoint(0, '2026-01-03T00:00:00Z'),
    ]
    const result = computeProjection(data, 'linear', 30)
    expect(result).not.toBeNull()
    result!.points.forEach(point => {
      expect(point.value).toBeGreaterThanOrEqual(0)
    })
  })

  it('uses custom getValue function', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(200, '2026-01-02T00:00:00Z'),
      makePoint(300, '2026-01-03T00:00:00Z'),
    ]
    const result = computeProjection(data, 'linear', 30, (p) => p.marketplace.installs)
    expect(result).not.toBeNull()
  })
})