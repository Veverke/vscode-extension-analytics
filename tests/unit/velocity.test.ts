import { describe, it, expect } from 'vitest'
import { computeVelocity, computeVelocityNormalized } from '../../src/metrics/velocity'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

const fixture = fixtureData as DataPoint[]

function makeDataPoint(installs: number, ts: string): DataPoint {
  return {
    ts,
    marketplace: {
      installs,
      updates: 0,
      averageRating: 4.0,
      ratingCount: 1,
      trendingWeekly: 0,
      trendingMonthly: 0,
    },
    openVsx: null,
  }
}

describe('computeVelocity', () => {
  it('output length equals input length', () => {
    const result = computeVelocity(fixture)
    expect(result).toHaveLength(fixture.length)
  })

  it('first value is always 0', () => {
    const result = computeVelocity(fixture)
    expect(result[0]).toBe(0)
  })

  it('computes known delta for increasing installs', () => {
    const data = [
      makeDataPoint(100, '2026-01-01T00:00:00Z'),
      makeDataPoint(142, '2026-01-01T06:00:00Z'),
    ]
    const result = computeVelocity(data)
    expect(result[1]).toBe(42)
  })

  it('computes negative delta for declining installs', () => {
    const data = [
      makeDataPoint(500, '2026-01-01T00:00:00Z'),
      makeDataPoint(480, '2026-01-01T06:00:00Z'),
    ]
    const result = computeVelocity(data)
    expect(result[1]).toBe(-20)
  })

  it('handles single point dataset', () => {
    const data = [makeDataPoint(100, '2026-01-01T00:00:00Z')]
    const result = computeVelocity(data)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(0)
  })

  it('handles empty dataset', () => {
    const result = computeVelocity([])
    expect(result).toHaveLength(0)
  })
})

describe('computeVelocityNormalized', () => {
  it('output length equals input length', () => {
    const result = computeVelocityNormalized(fixture)
    expect(result).toHaveLength(fixture.length)
  })

  it('first value is 0', () => {
    const result = computeVelocityNormalized(fixture)
    expect(result[0]).toBe(0)
  })

  it('computes installs per hour correctly', () => {
    const data = [
      makeDataPoint(0, '2026-01-01T00:00:00Z'),
      makeDataPoint(60, '2026-01-01T02:00:00Z'), // 2 hours, 60 installs → 30/hr
    ]
    const result = computeVelocityNormalized(data)
    expect(result[1]).toBeCloseTo(30, 5)
  })

  it('returns 0 for zero time delta', () => {
    const data = [
      makeDataPoint(100, '2026-01-01T00:00:00Z'),
      makeDataPoint(200, '2026-01-01T00:00:00Z'), // same timestamp
    ]
    const result = computeVelocityNormalized(data)
    expect(result[1]).toBe(0)
  })
})
