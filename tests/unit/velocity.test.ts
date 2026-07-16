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
    github: null,
  }
}

describe('computeVelocity', () => {
  it('returns empty array for empty data', () => {
    expect(computeVelocity([])).toEqual([])
  })

  it('returns empty array for single data point', () => {
    const data = [makeDataPoint(100, '2026-01-01T00:00:00Z')]
    expect(computeVelocity(data)).toEqual([])
  })

  it('returns positive velocity for increasing installs', () => {
    const data = [
      makeDataPoint(100, '2026-01-01T00:00:00Z'),
      makeDataPoint(200, '2026-01-02T00:00:00Z'),
    ]
    const velocity = computeVelocity(data)
    expect(velocity).toHaveLength(1)
    expect(velocity[0]).toBeGreaterThan(0)
  })

  it('returns negative velocity for decreasing installs', () => {
    const data = [
      makeDataPoint(200, '2026-01-01T00:00:00Z'),
      makeDataPoint(100, '2026-01-02T00:00:00Z'),
    ]
    const velocity = computeVelocity(data)
    expect(velocity).toHaveLength(1)
    expect(velocity[0]).toBeLessThan(0)
  })

  it('returns zero velocity for flat installs', () => {
    const data = [
      makeDataPoint(100, '2026-01-01T00:00:00Z'),
      makeDataPoint(100, '2026-01-02T00:00:00Z'),
    ]
    const velocity = computeVelocity(data)
    expect(velocity).toHaveLength(1)
    expect(velocity[0]).toBe(0)
  })

  it('handles fixture data without throwing', () => {
    expect(() => computeVelocity(fixture)).not.toThrow()
  })
})

describe('computeVelocityNormalized', () => {
  it('returns empty array for empty data', () => {
    expect(computeVelocityNormalized([])).toEqual([])
  })

  it('returns values in 0–1 range', () => {
    const data = [
      makeDataPoint(100, '2026-01-01T00:00:00Z'),
      makeDataPoint(200, '2026-01-02T00:00:00Z'),
      makeDataPoint(300, '2026-01-03T00:00:00Z'),
    ]
    const normalized = computeVelocityNormalized(data)
    normalized.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    })
  })

  it('returns values in -1 to 1 range for negative data', () => {
    const data = [
      makeDataPoint(300, '2026-01-01T00:00:00Z'),
      makeDataPoint(200, '2026-01-02T00:00:00Z'),
      makeDataPoint(100, '2026-01-03T00:00:00Z'),
    ]
    const normalized = computeVelocityNormalized(data)
    expect(normalized).toHaveLength(2)
    normalized.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(0)
    })
  })

  it('handles zero time difference by returning 0', () => {
    const data = [
      makeDataPoint(100, '2026-01-01T00:00:00Z'),
      makeDataPoint(200, '2026-01-01T00:00:00Z'), // same timestamp
    ]
    const normalized = computeVelocityNormalized(data)
    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toBe(0)
  })
})