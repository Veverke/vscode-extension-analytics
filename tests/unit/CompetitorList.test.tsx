import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CompetitorList from '../../src/components/cards/CompetitorList'
import * as useCompetitorModule from '../../src/hooks/useCompetitor'

vi.mock('../../src/hooks/useCompetitor')

const mockUseCompetitor = vi.mocked(useCompetitorModule.useCompetitor)

const defaultProps = {
  extensionId: 'myext.myext',
  yourInstalls: 5000,
  yourRating: 4.5,
  yourRatingCount: 100,
}

describe('CompetitorList', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    localStorage.clear()
    mockUseCompetitor.mockReturnValue({
      displayName: null,
      data: [],
      releases: [],
      loading: false,
      error: null,
    })
  })

  it('renders input and add button', () => {
    render(<CompetitorList {...defaultProps} />)
    expect(screen.getByLabelText('Competitor extension ID')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('shows empty state message when no competitors', () => {
    render(<CompetitorList {...defaultProps} />)
    expect(screen.getByText(/No competitors added yet/)).toBeInTheDocument()
  })

  it('adds a competitor when valid ID is entered and Add is clicked', () => {
    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.queryByText(/No competitors added yet/)).not.toBeInTheDocument()
  })

  it('shows error for invalid extension ID format', () => {
    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'invalid-id' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText(/Invalid format/)).toBeInTheDocument()
  })

  it('shows error when adding duplicate competitor', () => {
    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    // Try adding same one again
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Competitor already added')).toBeInTheDocument()
  })

  it('shows error when adding own extension ID', () => {
    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'myext.myext' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Cannot compare with yourself')).toBeInTheDocument()
  })

  it('does not add empty input', () => {
    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText(/No competitors added yet/)).toBeInTheDocument()
  })

  it('adds competitor on Enter key press', () => {
    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.queryByText(/No competitors added yet/)).not.toBeInTheDocument()
  })

  it('clears input error when typing', () => {
    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText(/Invalid format/)).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'valid.name' } })
    expect(screen.queryByText(/Invalid format/)).not.toBeInTheDocument()
  })

  it('removes a competitor when remove is clicked', () => {
    mockUseCompetitor.mockReturnValue({
      displayName: 'Python',
      data: [{
        ts: '2025-01-01',
        marketplace: { installs: 10000, updates: 50, averageRating: 4.0, ratingCount: 200, trendingWeekly: 10, trendingMonthly: 50 },
        openVsx: null,
        github: null,
      }],
      releases: [],
      loading: false,
      error: null,
    })

    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    // Should show the competitor with a remove button
    const removeBtn = screen.getByRole('button', { name: /Remove/ })
    fireEvent.click(removeBtn)

    expect(screen.getByText(/No competitors added yet/)).toBeInTheDocument()
  })

  it('shows loading state for competitor', () => {
    mockUseCompetitor.mockReturnValue({
      displayName: null,
      data: [],
      releases: [],
      loading: true,
      error: null,
    })

    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText(/Loading ms-python.python/)).toBeInTheDocument()
  })

  it('shows error state for competitor', () => {
    mockUseCompetitor.mockReturnValue({
      displayName: null,
      data: [],
      releases: [],
      loading: false,
      error: 'Failed to fetch',
    })

    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
  })

  it('shows competitor comparison card when data is available', () => {
    mockUseCompetitor.mockReturnValue({
      displayName: 'Python',
      data: [{
        ts: '2025-01-01',
        marketplace: { installs: 10000, updates: 50, averageRating: 4.0, ratingCount: 200, trendingWeekly: 10, trendingMonthly: 50 },
        openVsx: null,
        github: null,
      }],
      releases: [],
      loading: false,
      error: null,
    })

    render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText(/Python/)).toBeInTheDocument()
  })

  it('persists competitors to localStorage', () => {
    const { unmount } = render(<CompetitorList {...defaultProps} />)

    const input = screen.getByLabelText('Competitor extension ID')
    fireEvent.change(input, { target: { value: 'ms-python.python' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    unmount()

    // Re-render should restore from localStorage
    render(<CompetitorList {...defaultProps} />)
    expect(screen.queryByText(/No competitors added yet/)).not.toBeInTheDocument()
  })
})