import { describe, it, expect } from 'vitest'
import { computeAcceleration } from '../../src/metrics/acceleration'
import { computeVelocity } from '../../src/metrics/velocity'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

const fixture = fixtureData as DataPoint[]

describe('computeAcceleration', () => {
  it('output length equals velocity input length', () => {
    const velocity = computeVelocity(fixture)
    const result = computeAcceleration(velocity)
    expect(result).toHaveLength(velocity.length)
  })

  it('first two values are always 0', () => {
    const velocity = computeVelocity(fixture)
    const result = computeAcceleration(velocity)
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
  })

  it('computes known acceleration for uniform velocity', () => {
    const velocity = [0, 10, 20]
    const result = computeAcceleration(velocity)
    expect(result[2]).toBe(10)
  })

  it('returns negative acceleration for slowing velocity', () => {
    const velocity = [0, 20, 10]
    const result = computeAcceleration(velocity)
    expect(result[2]).toBe(-10)
  })

  it('returns 0 for constant velocity', () => {
    const velocity = [5, 5, 5, 5]
    const result = computeAcceleration(velocity)
    expect(result[2]).toBe(0)
    expect(result[3]).toBe(0)
  })

  it('handles empty input', () => {
    const result = computeAcceleration([])
    expect(result).toHaveLength(0)
  })

  it('handles single element', () => {
    const result = computeAcceleration([10])
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(0)
  })

  it('handles two elements', () => {
    const result = computeAcceleration([5, 15])
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
  })
})
