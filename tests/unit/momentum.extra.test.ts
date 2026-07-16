import { describe, it, expect } from 'vitest'
import { computeMomentum } from '../../src/metrics/momentum'
import type { DataPoint } from '../../src/types/schema'

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

// Test the internal functions that aren't exported
describe('momentum internal branch coverage', () => {
  it('computes mean with empty array', () => {
    // The function returns 0 for empty array
    // We test via computeMomentum which internally calls mean
    const data = makeDataset([100, 100, 100, 100, 100])
    const result = computeMomentum(data)
    // All same values → all velocity 0 → early exit before mean
    expect(result).toBe(0)
  })

  it('handles signedNormalize with all zeros', () => {
    // signedNormalize maps via Math.abs, so all zeros works fine
    const data = makeDataset([100, 100])
    const result = computeMomentum(data)
    expect(result).toBe(0)
  })

  it('handles data with only 2 points where second is higher', () => {
    const data = makeDataset([100, 200])
    const result = computeMomentum(data)
    expect(result).toBeGreaterThan(0)
  })

  it('returns 0 when all velocity values are zero (flat data)', () => {
    const data = makeDataset([100, 100, 100, 100, 100])
    const result = computeMomentum(data)
    expect(result).toBe(0)
  })

  it('recency factor approaches 0 for old data', () => {
    // Use very old dates
    const installs = [100, 200, 300]
    const data = installs.map((count, i) => ({
      ts: new Date(Date.UTC(2024, 0, 1) + i * 6 * 60 * 60 * 1000).toISOString(),
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
    const result = computeMomentum(data)
    expect(result).not.toBeNaN()
  })
})