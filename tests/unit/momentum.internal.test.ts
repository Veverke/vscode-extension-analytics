import { describe, it, expect } from 'vitest'
import { mean, signedNormalize } from '../../src/metrics/momentum'

describe('signedNormalize', () => {
  it('returns empty array for empty input', () => {
    expect(signedNormalize([])).toEqual([])
  })

  it('normalizes positive values', () => {
    const result = signedNormalize([1, 2, 4, 8])
    expect(result[3]).toBeCloseTo(1) // largest is 1
    expect(result[0]).toBeCloseTo(0.125)
  })

  it('normalizes negative values', () => {
    const result = signedNormalize([-1, -2, -4, -8])
    expect(result[3]).toBeCloseTo(-1)
    expect(result[0]).toBeCloseTo(-0.125)
  })

  it('handles mixed positive and negative', () => {
    const result = signedNormalize([-5, 0, 3, 10])
    expect(Math.abs(result[3])).toBeCloseTo(1) // largest abs is 10
  })

  it('handles all zeros with default maxAbs of 1', () => {
    const result = signedNormalize([0, 0, 0])
    expect(result).toEqual([0, 0, 0])
  })
})

describe('mean internal function', () => {
  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0)
  })

  it('returns the value for single element', () => {
    expect(mean([5])).toBe(5)
  })

  it('computes average of multiple values', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3)
  })

  it('handles negative values', () => {
    expect(mean([-1, 0, 1])).toBe(0)
  })

  it('handles all zeros', () => {
    expect(mean([0, 0, 0])).toBe(0)
  })
})