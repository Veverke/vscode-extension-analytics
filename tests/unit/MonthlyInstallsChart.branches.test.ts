import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MonthlyInstallsChart from '../../src/components/charts/MonthlyInstallsChart'
import type { MonthlyRollup } from '../../src/types/schema'

describe('MonthlyInstallsChart branch coverage', () => {
  it('renders empty state when no data', () => {
    const { container } = render(<MonthlyInstallsChart data={[]} />)
    expect(container.textContent).toContain('No monthly data')
  })

  it('renders with single data point', () => {
    const data: MonthlyRollup[] = [
      { yearMonth: '2026-01', installsEndOfMonth: 100, installsGained: 10, dataPointsInMonth: 5, starsEndOfMonth: 5, forksEndOfMonth: 2, contributionsEndOfMonth: 1 },
    ]
    render(<MonthlyInstallsChart data={data} />)
    expect(screen.getByText('Monthly Installs')).toBeInTheDocument()
  })

  it('renders with multiple data points', () => {
    const data: MonthlyRollup[] = [
      { yearMonth: '2026-01', installsEndOfMonth: 100, installsGained: 10, dataPointsInMonth: 5, starsEndOfMonth: 5, forksEndOfMonth: 2, contributionsEndOfMonth: 1 },
      { yearMonth: '2026-02', installsEndOfMonth: 200, installsGained: 20, dataPointsInMonth: 8, starsEndOfMonth: 10, forksEndOfMonth: 4, contributionsEndOfMonth: 3 },
    ]
    render(<MonthlyInstallsChart data={data} />)
    expect(screen.getByText('Monthly Installs')).toBeInTheDocument()
  })
})