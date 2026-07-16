import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CompetitorComparisonCard from '../../src/components/cards/CompetitorComparisonCard'

const yourExtension = {
  id: 'myext.myext',
  displayName: 'My Extension',
  installs: 5000,
  rating: 4.5,
  ratingCount: 100,
}

const competitor = {
  id: 'comp.ext',
  displayName: 'Competitor Ext',
  installs: 10000,
  rating: 4.0,
  ratingCount: 200,
}

describe('CompetitorComparisonCard', () => {
  it('renders competitor name and id', () => {
    render(
      <CompetitorComparisonCard
        yourExtension={yourExtension}
        competitor={competitor}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText(/Competitor Ext/)).toBeInTheDocument()
    expect(screen.getByText(/comp.ext/)).toBeInTheDocument()
  })

  it('renders installs comparison', () => {
    render(
      <CompetitorComparisonCard
        yourExtension={yourExtension}
        competitor={competitor}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText('5,000')).toBeInTheDocument()
    expect(screen.getByText('10,000')).toBeInTheDocument()
  })

  it('renders rating comparison', () => {
    render(
      <CompetitorComparisonCard
        yourExtension={yourExtension}
        competitor={competitor}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText(/⭐ 4.5/)).toBeInTheDocument()
    expect(screen.getByText(/⭐ 4.0/)).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(
      <CompetitorComparisonCard
        yourExtension={yourExtension}
        competitor={competitor}
        onRemove={onRemove}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Remove Competitor Ext/i }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('shows green diff when your value is higher (rating)', () => {
    render(
      <CompetitorComparisonCard
        yourExtension={{ ...yourExtension, rating: 4.5 }}
        competitor={{ ...competitor, rating: 4.0 }}
        onRemove={() => {}}
      />
    )
    const diffCells = document.querySelectorAll('.competitor-value--green')
    expect(diffCells.length).toBeGreaterThan(0)
  })

  it('shows red diff when your value is lower (installs)', () => {
    render(
      <CompetitorComparisonCard
        yourExtension={{ ...yourExtension, installs: 1000 }}
        competitor={{ ...competitor, installs: 5000 }}
        onRemove={() => {}}
      />
    )
    const diffCells = document.querySelectorAll('.competitor-value--red')
    expect(diffCells.length).toBeGreaterThan(0)
  })

  it('shows gray diff when values are equal', () => {
    render(
      <CompetitorComparisonCard
        yourExtension={{ ...yourExtension, installs: 5000 }}
        competitor={{ ...competitor, installs: 5000 }}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows N/A when ratings are 0', () => {
    render(
      <CompetitorComparisonCard
        yourExtension={{ ...yourExtension, rating: 0 }}
        competitor={{ ...competitor, rating: 0 }}
        onRemove={() => {}}
      />
    )
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1)
  })

  it('shows arrow indicators for green and red diffs', () => {
    render(
      <CompetitorComparisonCard
        yourExtension={{ ...yourExtension, installs: 1000 }}
        competitor={{ ...competitor, installs: 5000 }}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText('↓')).toBeInTheDocument()
  })
})
