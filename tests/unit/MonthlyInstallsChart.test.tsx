import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MonthlyInstallsChart from '../../src/components/charts/MonthlyInstallsChart'
import type { MonthlyRollup } from '../../src/types/schema'

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  const MockBarChart = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  const MockBar = ({ name }: { name?: string }) => <div>{name || 'Bar'}</div>
  const MockXAxis = () => <div>XAxis</div>
  const MockYAxis = () => <div>YAxis</div>
  const MockTooltip = () => <div>Tooltip</div>
  const MockLegend = () => <div>Legend</div>
  const MockCartesianGrid = () => <div>CartesianGrid</div>
  return {
    ResponsiveContainer: MockResponsiveContainer,
    BarChart: MockBarChart,
    Bar: MockBar,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    Tooltip: MockTooltip,
    Legend: MockLegend,
    CartesianGrid: MockCartesianGrid,
  }
})

const mockRollups: MonthlyRollup[] = [
  {
    yearMonth: '2026-05',
    installsEndOfMonth: 1380,
    installsGained: 880,
    avgRating: 4.19,
    ratingCountEndOfMonth: 14,
    openVsxDownloadsEndOfMonth: 645,
    dataPointsInMonth: 28,
    starsEndOfMonth: 10,
    forksEndOfMonth: 3,
    contributionsEndOfMonth: 25,
  },
  {
    yearMonth: '2026-06',
    installsEndOfMonth: 2500,
    installsGained: 1120,
    avgRating: 4.3,
    ratingCountEndOfMonth: 20,
    openVsxDownloadsEndOfMonth: 900,
    dataPointsInMonth: 30,
    starsEndOfMonth: 15,
    forksEndOfMonth: 5,
    contributionsEndOfMonth: 40,
  },
]

describe('MonthlyInstallsChart', () => {
  it('renders empty state when rollups is empty', () => {
    render(<MonthlyInstallsChart rollups={[]} />)
    expect(screen.getByText(/No monthly rollups available yet/i)).toBeDefined()
  })

  it('renders chart when rollups are provided', () => {
    render(<MonthlyInstallsChart rollups={mockRollups} />)
    expect(screen.getByText(/Installs Gained/i)).toBeDefined()
  })
})