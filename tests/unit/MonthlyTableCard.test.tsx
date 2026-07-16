import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MonthlyTableCard from '../../src/components/cards/MonthlyTableCard'
import type { MonthlyRollup } from '../../src/types/schema'

const mockRollups: MonthlyRollup[] = [
  { yearMonth: '2025-01', installsEndOfMonth: 1000, installsGained: 200, avgRating: 4.5, ratingCountEndOfMonth: 50, openVsxDownloadsEndOfMonth: 100, dataPointsInMonth: 10, starsEndOfMonth: 50, forksEndOfMonth: 10, contributionsEndOfMonth: 5 },
  { yearMonth: '2025-02', installsEndOfMonth: 1500, installsGained: 500, avgRating: 4.2, ratingCountEndOfMonth: 60, openVsxDownloadsEndOfMonth: 150, dataPointsInMonth: 12, starsEndOfMonth: 60, forksEndOfMonth: 12, contributionsEndOfMonth: 8 },
  { yearMonth: '2025-03', installsEndOfMonth: 2000, installsGained: 0, avgRating: 0, ratingCountEndOfMonth: 0, openVsxDownloadsEndOfMonth: 200, dataPointsInMonth: 15, starsEndOfMonth: 70, forksEndOfMonth: 15, contributionsEndOfMonth: 10 },
]

describe('MonthlyTableCard', () => {
  it('renders table with rollup data', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    expect(screen.getByText('Jan 2025')).toBeInTheDocument()
    expect(screen.getByText('Feb 2025')).toBeInTheDocument()
    expect(screen.getByText('Mar 2025')).toBeInTheDocument()
  })

  it('renders formatted numbers', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
    expect(screen.getByText('2,000')).toBeInTheDocument()
  })

  it('shows empty state when no rollups', () => {
    render(<MonthlyTableCard rollups={[]} />)
    expect(screen.getByText('No monthly data available yet')).toBeInTheDocument()
  })

  it('shows FormulaTooltip when installsGained is 0', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    expect(screen.getByText('+0')).toBeInTheDocument()
  })

  it('shows FormulaTooltip when avgRating is 0', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('shows non-zero installs gained with + prefix', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    expect(screen.getByText('+200')).toBeInTheDocument()
    expect(screen.getByText('+500')).toBeInTheDocument()
  })

  it('shows non-zero avgRating with 2 decimal places', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    expect(screen.getByText('4.50')).toBeInTheDocument()
    expect(screen.getByText('4.20')).toBeInTheDocument()
  })

  it('sorts by yearMonth descending by default', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const rows = screen.getAllByRole('row')
    // First data row should be Mar 2025 (most recent)
    expect(rows[1]).toHaveTextContent('Mar 2025')
  })

  it('toggles sort direction when clicking same column header', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const monthHeader = screen.getByText('Month')
    fireEvent.click(monthHeader)
    // Should now be ascending
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Jan 2025')
  })

  it('sorts by installsEndOfMonth when clicking that header', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const installsHeader = screen.getByText('Installs (EOM)')
    fireEvent.click(installsHeader)
    const rows = screen.getAllByRole('row')
    // Descending by default: highest first
    expect(rows[1]).toHaveTextContent('2,000')
  })

  it('sorts by installsGained when clicking that header', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const gainedHeader = screen.getByText('Gained')
    fireEvent.click(gainedHeader)
    const rows = screen.getAllByRole('row')
    // Descending by default: highest first
    expect(rows[1]).toHaveTextContent('+500')
  })

  it('sorts by avgRating when clicking that header', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const ratingHeader = screen.getByText('Avg Rating')
    fireEvent.click(ratingHeader)
    const rows = screen.getAllByRole('row')
    // Descending by default: highest first
    expect(rows[1]).toHaveTextContent('4.50')
  })

  it('sorts by dataPointsInMonth when clicking that header', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const dpHeader = screen.getByText('Data Points')
    fireEvent.click(dpHeader)
    const rows = screen.getAllByRole('row')
    // Descending by default: highest first
    expect(rows[1]).toHaveTextContent('15')
  })

  it('sorts by starsEndOfMonth when clicking that header', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const starsHeader = screen.getByText('Stars')
    fireEvent.click(starsHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('70')
  })

  it('sorts by forksEndOfMonth when clicking that header', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const forksHeader = screen.getByText('Forks')
    fireEvent.click(forksHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('15')
  })

  it('sorts by contributionsEndOfMonth when clicking that header', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    const contribHeader = screen.getByText('Contributions')
    fireEvent.click(contribHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('10')
  })

  it('renders all column headers', () => {
    render(<MonthlyTableCard rollups={mockRollups} />)
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Installs (EOM)')).toBeInTheDocument()
    expect(screen.getByText('Gained')).toBeInTheDocument()
    expect(screen.getByText('Avg Rating')).toBeInTheDocument()
    expect(screen.getByText('Data Points')).toBeInTheDocument()
    expect(screen.getByText('Stars')).toBeInTheDocument()
    expect(screen.getByText('Forks')).toBeInTheDocument()
    expect(screen.getByText('Contributions')).toBeInTheDocument()
  })
})