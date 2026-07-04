import { describe, it, expect } from 'vitest'
import { computeMomentum } from '../../src/metrics/momentum'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

const fixture = fixtureData as DataPoint[]

function makeDataset(installs: number[], baseDate = '2026-01-01'): DataPoint[] {
  return installs.map((count, i) => ({
    ts: new Date(new Date(baseDate).getTime() + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: {
      installs: count,
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

describe('computeMomentum', () => {
  it('returns 0 for empty data', () => {
    expect(computeMomentum([])).toBe(0)
  })

  it('returns 0 for single data point', () => {
    const data = makeDataset([100])
    expect(computeMomentum(data)).toBe(0)
  })

  it('returns positive momentum for growing data', () => {
    const data = makeDataset([100, 200, 300, 400, 500])
    const momentum = computeMomentum(data)
    expect(momentum).toBeGreaterThan(0)
  })

  it('returns negative momentum for declining data', () => {
    const data = makeDataset([500, 400, 300, 200, 100])
    const momentum = computeMomentum(data)
    expect(momentum).toBeLessThan(0)
  })

  it('returns near-zero momentum for flat data', () => {
    const data = makeDataset([100, 100, 100, 100, 100])
    const momentum = computeMomentum(data)
    expect(Math.abs(momentum)).toBeLessThan(0.01)
  })

  it('handles fixture data without throwing', () => {
    expect(() => computeMomentum(fixture)).not.toThrow()
  })
})