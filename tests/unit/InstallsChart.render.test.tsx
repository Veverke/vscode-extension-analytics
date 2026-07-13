import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InstallsChart from '../../src/components/charts/InstallsChart'
import { computeProjection } from '../../src/metrics/projections'
import type { DataPoint } from '../../src/types/schema'

vi.mock('recharts', () => {
  const MockComp = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  const MockLine = () => <div>Line</div>
  const MockBar = () => <div>Bar</div>
  const MockCell = () => <div>Cell</div>
  const MockLegend = () => <div aria-label="Legend">Marketplace Installs</div>
  return {
    ResponsiveContainer: MockComp,
    ComposedChart: MockComp,
    Line: MockLine,
    Bar: MockBar,
    Cell: MockCell,
    XAxis: MockComp,
    YAxis: MockComp,
    Tooltip: MockComp,
    Legend: MockLegend,
    ReferenceLine: MockComp,
    Label: MockComp,
    CartesianGrid: MockComp,
    default: {},
  }
})

function makeData(installs: number[], tsBase = '2026-01-01T00:00:00Z'): DataPoint[] {
  return installs.map((count, i) => ({
    ts: new Date(new Date(tsBase).getTime() + i * 6 * 60 * 60 * 1000).toISOString(),
    marketplace: { installs: count, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 },
    openVsx: null,
    github: null,
  }))
}

describe('InstallsChart rendering', () => {
  it('renders empty state', () => {
    render(<InstallsChart data={[]} />)
    expect(screen.getByText(/No data yet/)).toBeInTheDocument()
  })

  it('renders with data', () => {
    const data = makeData([100, 200, 300, 400, 500])
    const { container } = render(<InstallsChart data={data} />)
    expect(container.textContent).toContain('Marketplace Installs')
  })

  it('renders with data and linear projection', () => {
    const data = makeData([100, 200, 300, 400, 500])
    const projection = computeProjection(data, 'linear', 30)
    const { container } = render(<InstallsChart data={data} projections={projection ? [projection] : []} />)
    expect(container.textContent).toContain('Marketplace Installs')
  })
})