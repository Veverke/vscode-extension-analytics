import { describe, it, expect } from 'vitest'
import { computeProjection } from '../../src/metrics/projections'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

const fixture = fixtureData as DataPoint[]

function makeLinearData(count: number, startInstalls = 100, step = 10): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    ts: new Date(Date.UTC(2026, 0, 1) + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: {
      installs: startInstalls + i * step,
      updates: 0,
      averageRating: 4.0,
      ratingCount: 1,
      trendingWeekly: 0,
      trendingMonthly: 0,
    },
    openVsx: null,
  }))
}

function makeExponentialData(count: number): DataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    ts: new Date(Date.UTC(2026, 0, 1) + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: {
      installs: Math.round(100 * Math.pow(1.15, i)),
      updates: 0,
      averageRating: 4.0,
      ratingCount: 1,
      trendingWeekly: 0,
      trendingMonthly: 0,
    },
    openVsx: null,
  }))
}

describe('computeProjection', () => {
  it('returns null when data has fewer than 3 points', () => {
    const data = makeLinearData(2)
    expect(computeProjection(data, 'linear', 30)).toBeNull()
  })

  it('returns null for empty data', () => {
    expect(computeProjection([], 'linear', 30)).toBeNull()
  })

  it('returns null for single point', () => {
    const data = makeLinearData(1)
    expect(computeProjection(data, 'linear', 30)).toBeNull()
  })

  it('linear R² is >= 0.99 for perfectly linear data', () => {
    const data = makeLinearData(20, 100, 10)
    const result = computeProjection(data, 'linear', 30)
    expect(result).not.toBeNull()
    expect(result!.r2).toBeGreaterThanOrEqual(0.99)
  })

  it('projected value is higher than last real value for growing fixture data', () => {
    const result = computeProjection(fixture, 'linear', 30)
    expect(result).not.toBeNull()
    const lastInstalls = fixture[fixture.length - 1].marketplace.installs
    const projectedLast = result!.points[result!.points.length - 1].value
    expect(projectedLast).toBeGreaterThan(lastInstalls)
  })

  it('returns projection with r2 in [0, 1] range', () => {
    const result = computeProjection(fixture, 'linear', 30)
    expect(result).not.toBeNull()
    expect(result!.r2).toBeGreaterThanOrEqual(0)
    expect(result!.r2).toBeLessThanOrEqual(1)
  })

  it('exponential model r2 > linear r2 for exponential data', () => {
    const data = makeExponentialData(20)
    const linear = computeProjection(data, 'linear', 30)
    const exponential = computeProjection(data, 'exponential', 30)
    expect(linear).not.toBeNull()
    expect(exponential).not.toBeNull()
    expect(exponential!.r2).toBeGreaterThan(linear!.r2)
  })

  it('model name is set correctly on result', () => {
    const linear = computeProjection(fixture, 'linear', 30)
    const exponential = computeProjection(fixture, 'exponential', 30)
    const polynomial = computeProjection(fixture, 'polynomial', 30)
    expect(linear!.model).toBe('linear')
    expect(exponential!.model).toBe('exponential')
    expect(polynomial!.model).toBe('polynomial')
  })

  it('projected points are all in the future relative to last data point', () => {
    const result = computeProjection(fixture, 'linear', 30)
    expect(result).not.toBeNull()
    const lastTs = new Date(fixture[fixture.length - 1].ts).getTime()
    result!.points.forEach(p => {
      expect(p.ts).toBeGreaterThan(lastTs)
    })
  })

  it('equation string is non-empty', () => {
    const result = computeProjection(fixture, 'linear', 30)
    expect(result).not.toBeNull()
    expect(result!.equation.length).toBeGreaterThan(0)
  })

  it('projected values are non-negative', () => {
    const result = computeProjection(fixture, 'linear', 30)
    expect(result).not.toBeNull()
    result!.points.forEach(p => {
      expect(p.value).toBeGreaterThanOrEqual(0)
    })
  })
})
