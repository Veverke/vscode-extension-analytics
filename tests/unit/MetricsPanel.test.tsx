import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricsPanel from '../../src/components/cards/MetricsPanel'
import type { DataPoint } from '../../src/types/schema'

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  const MockLineChart = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  const MockLine = () => <div>Line</div>
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

function makePoint(installs: number, ts: string, openVsx?: { downloads: number; averageRating: number; ratingCount: number }): DataPoint {
  return {
    ts,
    marketplace: {
      installs,
      updates: 0,
      averageRating: 4.0,
      ratingCount: 1,
      trendingWeekly: 0,
      trendingMonthly: 0,
    },
    openVsx: openVsx ?? null,
    github: null,
  }
}

describe('MetricsPanel', () => {
  it('renders velocity and acceleration when data has enough points', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(200, '2026-01-02T00:00:00Z'),
      makePoint(300, '2026-01-03T00:00:00Z'),
    ]
    render(<MetricsPanel data={data} projectionMonths={1} />)
    expect(screen.getByText(/Velocity/i)).toBeDefined()
    expect(screen.getByText(/Acceleration/i)).toBeDefined()
  })

  it('renders projection controls', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(200, '2026-01-02T00:00:00Z'),
      makePoint(300, '2026-01-03T00:00:00Z'),
    ]
    render(<MetricsPanel data={data} projectionMonths={1} />)
    expect(screen.getByTestId('metric-projection')).toBeDefined()
    expect(screen.getByTestId('metric-openvsx-projection')).toBeDefined()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(<MetricsPanel data={[]} projectionMonths={1} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows stable acceleration when velocity does not change', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(100, '2026-01-02T00:00:00Z'),
      makePoint(100, '2026-01-03T00:00:00Z'),
    ]
    render(<MetricsPanel data={data} projectionMonths={1} />)
    expect(screen.getByTestId('metric-acceleration')).toHaveTextContent('→ stable')
  })

  it('shows "Not enough data" for projection with single data point', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z')]
    render(<MetricsPanel data={data} projectionMonths={1} />)
    expect(screen.getByTestId('metric-projection')).toHaveTextContent('Not enough data')
  })

  it('shows "Not enough data" for Open VSX projection when no openVsx data', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(200, '2026-01-02T00:00:00Z'),
      makePoint(300, '2026-01-03T00:00:00Z'),
    ]
    render(<MetricsPanel data={data} projectionMonths={1} />)
    expect(screen.getByTestId('metric-openvsx-projection')).toHaveTextContent('Not enough data')
  })

  it('renders with single data point and shows stable acceleration', () => {
    const data = [makePoint(100, '2026-01-01T00:00:00Z')]
    render(<MetricsPanel data={data} projectionMonths={1} />)
    // Should show velocity of 0 and stable acceleration
    expect(screen.getByTestId('metric-velocity')).toHaveTextContent('0.0')
    expect(screen.getByTestId('metric-acceleration')).toHaveTextContent('→ stable')
    expect(screen.getByTestId('metric-projection')).toHaveTextContent('Not enough data')
  })

  it('renders with Open VSX data and shows projection', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z', { downloads: 100, averageRating: 4.0, ratingCount: 5 }),
      makePoint(200, '2026-01-02T00:00:00Z', { downloads: 75, averageRating: 4.0, ratingCount: 5 }),
      makePoint(300, '2026-01-03T00:00:00Z', { downloads: 100, averageRating: 4.0, ratingCount: 5 }),
    ]
    render(<MetricsPanel data={data} projectionMonths={1} />)
    // Should show a projection value (not "Not enough data")
    expect(screen.getByTestId('metric-openvsx-projection')).not.toHaveTextContent('Not enough data')
  })
})
