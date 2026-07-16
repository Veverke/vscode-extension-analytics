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
    github: null,
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
    github: null,
  }))
}

describe('computeProjection', () => {
  it('returns null for empty data', () => {
    expect(computeProjection([], 'linear', 30)).toBeNull()
  })

  it('returns null for single data point', () => {
    const data = makeLinearData(1)
    expect(computeProjection(data, 'linear', 30)).toBeNull()
  })

  it('returns null for two data points with same installs', () => {
    const data = makeLinearData(2, 100, 0)
    expect(computeProjection(data, 'linear', 30)).toBeNull()
  })

  it('returns projection result for linear data', () => {
    const data = makeLinearData(10)
    const result = computeProjection(data, 'linear', 30)
    expect(result).not.toBeNull()
    expect(result!.model).toBe('linear')
    expect(result!.points.length).toBeGreaterThan(0)
    expect(result!.r2).toBeGreaterThan(0.9)
  })

  it('returns projection result for exponential data', () => {
    const data = makeExponentialData(10)
    const result = computeProjection(data, 'exponential', 30)
    expect(result).not.toBeNull()
    expect(result!.model).toBe('exponential')
    expect(result!.points.length).toBeGreaterThan(0)
    expect(result!.r2).toBeGreaterThan(0.9)
  })

  it('projection points have increasing timestamps', () => {
    const data = makeLinearData(10)
    const result = computeProjection(data, 'linear', 30)
    expect(result).not.toBeNull()
    for (let i = 1; i < result!.points.length; i++) {
      expect(result!.points[i].ts).toBeGreaterThan(result!.points[i - 1].ts)
    }
  })

  it('handles fixture data without throwing', () => {
    expect(() => computeProjection(fixture, 'linear', 30)).not.toThrow()
  })
})