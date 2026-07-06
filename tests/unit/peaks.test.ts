import { describe, it, expect } from 'vitest'
import { detectPeaks, peakDataPoints } from '../../src/metrics/peaks'
import { computeVelocity } from '../../src/metrics/velocity'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

const fixture = fixtureData as DataPoint[]

describe('detectPeaks', () => {
  it('returns correct peak indices for known velocity sequence', () => {
    const velocity = [0, 5, 20, 8, 3, 15, 7, 2]
    const result = detectPeaks(velocity)
    expect(result).toEqual([2, 5])
  })

  it('returns empty array when no peaks exist', () => {
    const result = detectPeaks([1, 1, 1, 1])
    expect(result).toEqual([])
  })

  it('returns empty array for monotonically increasing sequence', () => {
    const result = detectPeaks([1, 2, 3, 4])
    expect(result).toEqual([])
  })

  it('returns empty array for monotonically decreasing sequence', () => {
    const result = detectPeaks([4, 3, 2, 1])
    expect(result).toEqual([])
  })

  it('filters small peaks with minThreshold', () => {
    const velocity = [0, 5, 4, 3, 50, 48]
    const result = detectPeaks(velocity, 10)
    expect(result).toEqual([4])
  })

  it('includes all peaks when threshold not set', () => {
    const velocity = [0, 5, 4, 3, 50, 48]
    const result = detectPeaks(velocity)
    expect(result).toContain(1)
    expect(result).toContain(4)
  })

  it('handles fixture data without throwing', () => {
    const velocity = computeVelocity(fixture)
    expect(() => detectPeaks(velocity)).not.toThrow()
  })

  it('handles empty input', () => {
    expect(detectPeaks([])).toEqual([])
  })

  it('handles single element', () => {
    expect(detectPeaks([10])).toEqual([])
  })

  it('handles two elements', () => {
    expect(detectPeaks([10, 5])).toEqual([])
  })
})

describe('peakDataPoints', () => {
  it('returns the correct data points at peak indices', () => {
    const velocity = computeVelocity(fixture)
    const peaks = detectPeaks(velocity)
    const peakPoints = peakDataPoints(fixture, peaks)
    expect(peakPoints).toHaveLength(peaks.length)
    peaks.forEach((idx, i) => {
      expect(peakPoints[i]).toBe(fixture[idx])
    })
  })

  it('returns empty array for empty peak indices', () => {
    expect(peakDataPoints(fixture, [])).toEqual([])
  })
})
