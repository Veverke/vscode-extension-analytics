import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CompetitorComparisonCard from '../../src/components/cards/CompetitorComparisonCard'

const competitor = {
  id: 'comp.ext',
  displayName: 'Competitor Ext',
  installs: 10000,
  rating: 4.0,
  ratingCount: 200,
  sinceDate: '2023-01-01T00:00:00Z',
  githubStars: null,
  githubRepo: null,
}

const defaultDiffs = {
  installs: { label: '+5,000 (+100.0%)', className: 'competitor-value--red' },
  rating: { label: '0', className: 'competitor-value--gray' },
  ratingCount: { label: '+100 (+100.0%)', className: 'competitor-value--red' },
  avgMonthly: { label: '+50 (+100.0%)', className: 'competitor-value--red' },
  githubStars: { label: '0', className: 'competitor-value--gray' },
}

describe('CompetitorComparisonCard', () => {
  it('renders competitor name and id', () => {
    render(
      <CompetitorComparisonCard
        competitor={competitor}
        diffs={defaultDiffs}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText(/Competitor Ext/)).toBeInTheDocument()
    expect(screen.getByText(/comp.ext/)).toBeInTheDocument()
  })

  it('renders installs comparison', () => {
    render(
      <CompetitorComparisonCard
        competitor={competitor}
        diffs={defaultDiffs}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText('10,000')).toBeInTheDocument()
  })

  it('renders rating comparison', () => {
    render(
      <CompetitorComparisonCard
        competitor={competitor}
        diffs={defaultDiffs}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText(/⭐ 4.0/)).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(
      <CompetitorComparisonCard
        competitor={competitor}
        diffs={defaultDiffs}
        onRemove={onRemove}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Remove Competitor Ext/i }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('shows green diff when your value is higher', () => {
    const greenDiffs = {
      ...defaultDiffs,
      rating: { label: '-0.5 (-12.5%)', className: 'competitor-value--green' },
    }
    render(
      <CompetitorComparisonCard
        competitor={competitor}
        diffs={greenDiffs}
        onRemove={() => {}}
      />
    )
    const diffCells = document.querySelectorAll('.competitor-value--green')
    expect(diffCells.length).toBeGreaterThan(0)
  })

  it('shows red diff when your value is lower', () => {
    render(
      <CompetitorComparisonCard
        competitor={competitor}
        diffs={defaultDiffs}
        onRemove={() => {}}
      />
    )
    const diffCells = document.querySelectorAll('.competitor-value--red')
    expect(diffCells.length).toBeGreaterThan(0)
  })

  it('shows gray diff when values are equal', () => {
    const grayDiffs = {
      ...defaultDiffs,
      installs: { label: '0', className: 'competitor-value--gray' },
    }
    render(
      <CompetitorComparisonCard
        competitor={competitor}
        diffs={grayDiffs}
        onRemove={() => {}}
      />
    )
    const grayCells = document.querySelectorAll('.competitor-value--gray')
    expect(grayCells.length).toBeGreaterThan(0)
  })

  it('shows N/A when ratings are 0', () => {
    const noRatingCompetitor = { ...competitor, rating: 0 }
    render(
      <CompetitorComparisonCard
        competitor={noRatingCompetitor}
        diffs={defaultDiffs}
        onRemove={() => {}}
      />
    )
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1)
  })
})