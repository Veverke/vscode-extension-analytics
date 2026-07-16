import { describe, it, expect } from 'vitest'
import { computeMomentum } from '../../src/metrics/momentum'
import { computeProjection } from '../../src/metrics/projections'
import { detectPeaks, peakDataPoints } from '../../src/metrics/peaks'
import { getMomentumColor, getAccelerationLabel } from '../../src/components/cards/MetricsPanel'
import { formatTooltipValue } from '../../src/components/charts/GitHubChart'
import { formatInstallsTooltipValue } from '../../src/components/charts/InstallsChart'
import type { DataPoint } from '../../src/types/schema'

function makeData(installs: number[], tsBase = '2026-01-01T00:00:00Z'): DataPoint[] {
  return installs.map((count, i) => ({
    ts: new Date(new Date(tsBase).getTime() + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: { installs: count, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github: null,
  }))
}

describe('Momentum branch coverage', () => {
  it('computeMomentum - single point returns 0', () => {
    expect(computeMomentum(makeData([100]))).toBe(0)
  })

  it('computeMomentum - empty data returns 0', () => {
    expect(computeMomentum([])).toBe(0)
  })

  it('computeMomentum - flat data returns 0', () => {
    expect(computeMomentum(makeData([100, 100, 100, 100, 100]))).toBe(0)
  })

  it('computeMomentum - increasing data returns positive', () => {
    const result = computeMomentum(makeData([100, 200, 300, 400, 500]))
    expect(result).toBeGreaterThan(0)
  })

  it('computeMomentum - decreasing data returns negative', () => {
    const result = computeMomentum(makeData([500, 400, 300, 200, 100]))
    expect(result).toBeLessThan(0)
  })

  it('computeMomentum - clamped to [-1, 1]', () => {
    const data = makeData([100, 1000, 10000, 100000, 1000000])
    const result = computeMomentum(data)
    expect(result).toBeGreaterThanOrEqual(-1)
    expect(result).toBeLessThanOrEqual(1)
  })
})

describe('Projection branch coverage', () => {
  it('computeProjection - single point returns null', () => {
    expect(computeProjection(makeData([100]), 'linear', 30)).toBeNull()
  })

  it('computeProjection - two points returns null', () => {
    expect(computeProjection(makeData([100, 200]), 'linear', 30)).toBeNull()
  })

  it('computeProjection - three points works', () => {
    const result = computeProjection(makeData([100, 200, 300]), 'linear', 30)
    expect(result).not.toBeNull()
    expect(result!.model).toBe('linear')
  })

  it('computeProjection - exponential model', () => {
    const result = computeProjection(makeData([10, 100, 1000]), 'exponential', 30)
    expect(result).not.toBeNull()
    expect(result!.model).toBe('exponential')
  })

  it('computeProjection - polynomial model', () => {
    const result = computeProjection(makeData([100, 200, 300]), 'polynomial', 30)
    expect(result).not.toBeNull()
    expect(result!.model).toBe('polynomial')
  })

  it('computeProjection - NaN r2 becomes 1', () => {
    // Constant data produces NaN R² in regression
    const result = computeProjection(makeData([100, 100, 100]), 'linear', 30)
    expect(result).not.toBeNull()
    expect(result!.r2).toBe(1)
  })

  it('computeProjection - negative values clamped to 0', () => {
    const result = computeProjection(makeData([10, 5, 0]), 'linear', 30)
    expect(result).not.toBeNull()
    result!.points.forEach(p => expect(p.value).toBeGreaterThanOrEqual(0))
  })

  it('computeProjection - custom getValue', () => {
    const data = makeData([100, 200, 300])
    data[1] = { ...data[1], marketplace: { ...data[1].marketplace, installs: 200 } }
    const result = computeProjection(data, 'linear', 30, (p) => p.marketplace.installs)
    expect(result).not.toBeNull()
  })
})

describe('Peaks branch coverage', () => {
  it('detectPeaks - empty velocity returns empty', () => {
    expect(detectPeaks([])).toEqual([])
  })

  it('detectPeaks - single element returns empty', () => {
    expect(detectPeaks([100])).toEqual([])
  })

  it('detectPeaks - detects peaks', () => {
    const peaks = detectPeaks([100, 500, 200, 600, 300])
    expect(peaks.length).toBeGreaterThanOrEqual(1)
  })

  it('detectPeaks - strictly decreasing returns no peaks', () => {
    expect(detectPeaks([500, 400, 300, 200, 100])).toEqual([])
  })

  it('detectPeaks - with minThreshold filters out small peaks', () => {
    const peaks = detectPeaks([100, 500, 200, 600, 300], 550)
    expect(peaks).toEqual([3]) // Only index 3 (value 600) >= 550
  })

  it('peakDataPoints - returns data at given indices', () => {
    const data = makeData([100, 200, 300, 400, 500])
    const result = peakDataPoints(data, [1, 3])
    expect(result).toHaveLength(2)
    expect(result[0].marketplace.installs).toBe(200)
    expect(result[1].marketplace.installs).toBe(400)
  })
})

describe('MetricsPanel function branch coverage', () => {
  it('getMomentumColor - boundary values', () => {
    expect(getMomentumColor(100)).toBe('#4ade80')
    expect(getMomentumColor(67)).toBe('#4ade80')
    expect(getMomentumColor(66)).toBe('#facc15')
    expect(getMomentumColor(33)).toBe('#facc15')
    expect(getMomentumColor(32)).toBe('#f87171')
    expect(getMomentumColor(0)).toBe('#f87171')
  })

  it('getAccelerationLabel - all states', () => {
    expect(getAccelerationLabel(1)).toBe('↑ speeding up')
    expect(getAccelerationLabel(0.1)).toBe('↑ speeding up')
    expect(getAccelerationLabel(0)).toBe('→ stable')
    expect(getAccelerationLabel(-0.1)).toBe('↓ slowing down')
    expect(getAccelerationLabel(-1)).toBe('↓ slowing down')
  })
})

describe('formatTooltipValue coverage', () => {
  it('formats all value types', () => {
    const [a, an] = formatTooltipValue(5000, 'Stars')
    expect(a).toBe('5,000')
    expect(an).toBe('Stars')
    expect(formatTooltipValue(null, 'Stars')[0]).toBe('N/A')
    expect(formatTooltipValue(undefined, 'Stars')[0]).toBe('N/A')
  })
})

describe('formatInstallsTooltipValue coverage', () => {
  it('formats all value types', () => {
    expect(formatInstallsTooltipValue(5000, 'Installs')[0]).toBe('5,000')
    expect(formatInstallsTooltipValue(null, 'Installs')[0]).toBe('N/A')
    expect(formatInstallsTooltipValue(undefined, 'Installs')[0]).toBe('N/A')
  })
})
