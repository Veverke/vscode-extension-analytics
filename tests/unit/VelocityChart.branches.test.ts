import { describe, it, expect } from 'vitest'
import { buildChartData, formatVelocityTooltipValue } from '../../src/components/charts/VelocityChart'
import type { DataPoint } from '../../src/types/schema'

function makePoint(installs: number, ts: string): DataPoint {
  return {
    ts,
    marketplace: { installs, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github: null,
  }
}

describe('VelocityChart internal functions', () => {
  it('buildChartData - returns array with velocities', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z'), makePoint(200, '2026-01-02T00:00:00Z')]
    const result = buildChartData(data)
    expect(result).toHaveLength(2)
    expect(result[0].velocity).toBeDefined()
    expect(typeof result[0].velocity).toBe('number')
  })

  it('buildChartData - single point has undefined velocity (no deltas to compute)', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z')]
    const result = buildChartData(data)
    expect(result).toHaveLength(1)
    // computeVelocity returns n-1 values, so a single point has undefined velocity
    expect(result[0].velocity).toBeUndefined()
  })

  it('formatVelocityTooltipValue - formats positive number with + sign', () => {
    const [label] = formatVelocityTooltipValue(50)
    expect(label).toBe('+50 installs')
  })

  it('formatVelocityTooltipValue - formats negative number correctly', () => {
    const [label] = formatVelocityTooltipValue(-25)
    expect(label).toBe('-25 installs')
  })

  it('formatVelocityTooltipValue - formats zero correctly', () => {
    const [label] = formatVelocityTooltipValue(0)
    expect(label).toBe('+0 installs')
  })

  it('formatVelocityTooltipValue - handles null by defaulting to 0', () => {
    const [label] = formatVelocityTooltipValue(null)
    expect(label).toBe('+0 installs')
  })

  it('formatVelocityTooltipValue - handles large numbers with locale', () => {
    const [label] = formatVelocityTooltipValue(1000)
    expect(label).toBe('+1,000 installs')
  })

  it('formatVelocityTooltipValue - formats large negative numbers with locale', () => {
    const [label] = formatVelocityTooltipValue(-5000)
    expect(label).toBe('-5,000 installs')
  })
})