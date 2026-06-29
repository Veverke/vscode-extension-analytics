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
  }))
}

describe('computeMomentum', () => {
  it('score is in [0, 100] range for fixture data', () => {
    const score = computeMomentum(fixture)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('higher velocity dataset scores higher than slower dataset', () => {
    // slowData: constant velocity of 10 (no acceleration)
    const slowData = makeDataset([100, 110, 120, 130, 140, 150, 160, 170])
    // fastData: accelerating velocity (10 → 22), consistently faster growth
    const fastData = makeDataset([100, 110, 122, 136, 152, 170, 190, 212])
    const slowScore = computeMomentum(slowData)
    const fastScore = computeMomentum(fastData)
    expect(fastScore).toBeGreaterThan(slowScore)
  })

  it('does not crash for single point dataset', () => {
    const data = makeDataset([500])
    const score = computeMomentum(data)
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns 0 for empty dataset', () => {
    expect(computeMomentum([])).toBe(0)
  })

  it('returns a valid number for 2-point dataset', () => {
    const data = makeDataset([100, 200])
    const score = computeMomentum(data)
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns numeric result for 7-point dataset', () => {
    const data = makeDataset([100, 115, 130, 148, 168, 190, 215])
    const score = computeMomentum(data)
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('handles constant installs (zero velocity) without division by zero', () => {
    // All installs identical → velocity is all zeros → minMaxNormalize hits max === min
    const data = makeDataset([50, 50, 50, 50, 50, 50, 50])
    const score = computeMomentum(data)
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
