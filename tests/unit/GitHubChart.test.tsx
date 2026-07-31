import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GitHubChart from '../../src/components/charts/GitHubChart'
import type { DataPoint } from '../../src/types/schema'
import { EMPTY_DATA_MESSAGE } from '../../src/components/charts/GitHubChart'

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  const MockLineChart = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  const MockLine = ({ name }: { name?: string }) => <div>{name || 'Line'}</div>
  const MockXAxis = () => <div>XAxis</div>
  const MockYAxis = () => <div>YAxis</div>
  const MockTooltip = () => <div>Tooltip</div>
  const MockLegend = () => <div>Legend</div>
  return {
    ResponsiveContainer: MockResponsiveContainer,
    LineChart: MockLineChart,
    Line: MockLine,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    Tooltip: MockTooltip,
    Legend: MockLegend,
  }
})

const makeDataPoint = (ts: string, github: { stars: number; forks: number; contributions: number } | null): DataPoint => ({
  ts,
  marketplace: { installs: 100, updates: 0, averageRating: 4.0, ratingCount: 10, trendingWeekly: 0, trendingMonthly: 0 },
  openVsx: null,
  github,
})

describe('GitHubChart', () => {
  it('renders empty state when no data', () => {
    render(<GitHubChart data={[]} />)
    expect(screen.getByText(EMPTY_DATA_MESSAGE)).toBeInTheDocument()
  })

  it('renders empty state when all points have null github', () => {
    const data: DataPoint[] = [
      makeDataPoint('2025-01-01', null),
      makeDataPoint('2025-01-02', null),
    ]
    render(<GitHubChart data={data} />)
    expect(screen.getByText(EMPTY_DATA_MESSAGE)).toBeInTheDocument()
  })

  it('renders chart with github data', () => {
    const data: DataPoint[] = [
      makeDataPoint('2025-01-01', { stars: 100, forks: 20, contributions: 50 }),
      makeDataPoint('2025-01-02', { stars: 150, forks: 25, contributions: 60 }),
    ]
    render(<GitHubChart data={data} />)
    expect(screen.getByText('Stars')).toBeInTheDocument()
    expect(screen.getByText('Forks')).toBeInTheDocument()
    expect(screen.getByText('Contributions (non-owner)')).toBeInTheDocument()
  })

  it('filters out null github points but renders with some data', () => {
    const data: DataPoint[] = [
      makeDataPoint('2025-01-01', null),
      makeDataPoint('2025-01-02', { stars: 100, forks: 20, contributions: 50 }),
    ]
    render(<GitHubChart data={data} />)
    expect(screen.getByText('Stars')).toBeInTheDocument()
  })

  it('renders with all-zero stars and forks', () => {
    const data: DataPoint[] = [
      makeDataPoint('2025-01-01', { stars: 0, forks: 0, contributions: 0 }),
      makeDataPoint('2025-01-02', { stars: 0, forks: 0, contributions: 0 }),
    ]
    render(<GitHubChart data={data} />)
    expect(screen.getByText('Stars')).toBeInTheDocument()
    expect(screen.getByText('Forks')).toBeInTheDocument()
  })
})
