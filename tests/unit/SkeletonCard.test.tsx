import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import SkeletonCard from '../../src/components/cards/SkeletonCard'

describe('SkeletonCard', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<SkeletonCard />)
    const li = container.querySelector('.skeleton-card')
    expect(li).toBeInTheDocument()
    expect(li).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders skeleton children', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.querySelector('.skeleton-card__info')).toBeInTheDocument()
    expect(container.querySelector('.skeleton-card__actions')).toBeInTheDocument()
  })

  it('renders three skeleton text elements', () => {
    const { container } = render(<SkeletonCard />)
    const skeletonElements = container.querySelectorAll('.skeleton')
    expect(skeletonElements.length).toBeGreaterThanOrEqual(3)
  })
})
