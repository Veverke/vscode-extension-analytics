import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import VelocityBadge, {
  VELOCITY_POSITIVE_CLASS,
  VELOCITY_ZERO_CLASS,
  VELOCITY_NEGATIVE_CLASS,
} from '../../src/components/cards/VelocityBadge'

describe('VelocityBadge', () => {
  it('positive velocity renders green class and shows "+N"', () => {
    render(<VelocityBadge velocity={42} />)
    const badge = screen.getByLabelText('velocity +42')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toBe(VELOCITY_POSITIVE_CLASS)
    expect(badge).toHaveTextContent('+42')
    expect(badge).toHaveStyle({ color: '#16a34a' })
  })

  it('negative velocity renders red class and shows "-N"', () => {
    render(<VelocityBadge velocity={-5} />)
    const badge = screen.getByLabelText('velocity -5')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toBe(VELOCITY_NEGATIVE_CLASS)
    expect(badge).toHaveTextContent('-5')
    expect(badge).toHaveStyle({ color: '#dc2626' })
  })

  it('zero velocity renders gray class and shows "→ 0"', () => {
    render(<VelocityBadge velocity={0} />)
    const badge = screen.getByLabelText('velocity 0')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toBe(VELOCITY_ZERO_CLASS)
    expect(badge).toHaveTextContent('→ 0')
    expect(badge).toHaveStyle({ color: '#6b7280' })
  })

  it('small positive (0.4) rounds to 0 → gray', () => {
    render(<VelocityBadge velocity={0.4} />)
    expect(screen.getByLabelText('velocity 0')).toBeInTheDocument()
  })

  it('small negative (-0.4) rounds to 0 → gray', () => {
    render(<VelocityBadge velocity={-0.4} />)
    expect(screen.getByLabelText('velocity 0')).toBeInTheDocument()
  })

  it('large positive velocity shows correct number', () => {
    render(<VelocityBadge velocity={1533} />)
    const badge = screen.getByLabelText('velocity +1533')
    expect(badge).toHaveTextContent('+1533')
  })
})