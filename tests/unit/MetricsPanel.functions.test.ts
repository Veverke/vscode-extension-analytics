import { describe, it, expect } from 'vitest'
import { getMomentumColor, getAccelerationLabel } from '../../src/components/cards/MetricsPanel'

describe('getMomentumColor', () => {
  it('returns green for score > 66', () => {
    expect(getMomentumColor(100)).toBe('#4ade80')
    expect(getMomentumColor(67)).toBe('#4ade80')
  })

  it('returns yellow for score between 33 and 66', () => {
    expect(getMomentumColor(66)).toBe('#facc15')
    expect(getMomentumColor(50)).toBe('#facc15')
    expect(getMomentumColor(33)).toBe('#facc15')
  })

  it('returns red for score < 33', () => {
    expect(getMomentumColor(32)).toBe('#f87171')
    expect(getMomentumColor(0)).toBe('#f87171')
    expect(getMomentumColor(-10)).toBe('#f87171')
  })
})

describe('getAccelerationLabel', () => {
  it('returns speeding up for positive', () => {
    expect(getAccelerationLabel(1)).toBe('↑ speeding up')
    expect(getAccelerationLabel(0.1)).toBe('↑ speeding up')
  })

  it('returns slowing down for negative', () => {
    expect(getAccelerationLabel(-1)).toBe('↓ slowing down')
    expect(getAccelerationLabel(-0.1)).toBe('↓ slowing down')
  })

  it('returns stable for zero', () => {
    expect(getAccelerationLabel(0)).toBe('→ stable')
  })
})