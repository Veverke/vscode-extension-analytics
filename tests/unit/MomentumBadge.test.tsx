import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MomentumBadge, {
  getMomentumColor,
  getMomentumClass,
  MOMENTUM_HIGH_CLASS,
  MOMENTUM_MID_CLASS,
  MOMENTUM_LOW_CLASS,
} from '../../src/components/cards/MomentumBadge'

describe('getMomentumColor', () => {
  it('score 100 → green', () => {
    expect(getMomentumColor(100)).toBe('#16a34a')
  })
  it('score 67 → green (boundary)', () => {
    expect(getMomentumColor(67)).toBe('#16a34a')
  })
  it('score 66 → yellow', () => {
    expect(getMomentumColor(66)).toBe('#ca8a04')
  })
  it('score 50 → yellow', () => {
    expect(getMomentumColor(50)).toBe('#ca8a04')
  })
  it('score 34 → yellow (boundary)', () => {
    expect(getMomentumColor(34)).toBe('#ca8a04')
  })
  it('score 33 → red', () => {
    expect(getMomentumColor(33)).toBe('#dc2626')
  })
  it('score 0 → red', () => {
    expect(getMomentumColor(0)).toBe('#dc2626')
  })
})

describe('getMomentumClass', () => {
  it('score 80 → high class', () => {
    expect(getMomentumClass(80)).toBe(MOMENTUM_HIGH_CLASS)
  })
  it('score 50 → mid class', () => {
    expect(getMomentumClass(50)).toBe(MOMENTUM_MID_CLASS)
  })
  it('score 20 → low class', () => {
    expect(getMomentumClass(20)).toBe(MOMENTUM_LOW_CLASS)
  })
})

describe('MomentumBadge', () => {
  it('score 80 renders high (green) class and displays score', () => {
    render(<MomentumBadge score={80} />)
    const badge = screen.getByLabelText('momentum 80')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toBe(MOMENTUM_HIGH_CLASS)
    expect(badge).toHaveTextContent('80')
  })

  it('score 50 renders mid (yellow) class', () => {
    render(<MomentumBadge score={50} />)
    const badge = screen.getByLabelText('momentum 50')
    expect(badge.className).toBe(MOMENTUM_MID_CLASS)
  })

  it('score 20 renders low (red) class', () => {
    render(<MomentumBadge score={20} />)
    const badge = screen.getByLabelText('momentum 20')
    expect(badge.className).toBe(MOMENTUM_LOW_CLASS)
  })

  it('score 0 renders correctly', () => {
    render(<MomentumBadge score={0} />)
    const badge = screen.getByLabelText('momentum 0')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toBe(MOMENTUM_LOW_CLASS)
    expect(badge).toHaveTextContent('0')
  })

  it('score 100 renders correctly', () => {
    render(<MomentumBadge score={100} />)
    const badge = screen.getByLabelText('momentum 100')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toBe(MOMENTUM_HIGH_CLASS)
    expect(badge).toHaveTextContent('100')
  })

  it('score above 100 is clamped to 100', () => {
    render(<MomentumBadge score={150} />)
    const badge = screen.getByLabelText('momentum 100')
    expect(badge).toBeInTheDocument()
  })

  it('score below 0 is clamped to 0', () => {
    render(<MomentumBadge score={-10} />)
    const badge = screen.getByLabelText('momentum 0')
    expect(badge).toBeInTheDocument()
  })

  it('renders a bar gauge element', () => {
    const { container } = render(<MomentumBadge score={60} />)
    // The gauge has two spans: outer container and fill bar
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThanOrEqual(3)
  })
})