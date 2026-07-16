import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import VelocityChart from '../../src/components/charts/VelocityChart'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  const MockComposedChart = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  const MockLine = () => <div>Line</div>
  const MockBar = ({ name }: { name?: string }) => <div>{name || 'Bar'}</div>
  const MockXAxis = () => <div>XAxis</div>
  const MockYAxis = () => <div>YAxis</div>
  const MockTooltip = () => <div>Tooltip</div>
  const MockLegend = () => <div>Legend</div>
  const MockReferenceLine = () => <div>ReferenceLine</div>
  const MockCell = () => <div>Cell</div>
  return {
    ResponsiveContainer: MockResponsiveContainer,
    ComposedChart: MockComposedChart,
    Line: MockLine,
    Bar: MockBar,
    Cell: MockCell,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    Tooltip: MockTooltip,
    Legend: MockLegend,
    ReferenceLine: MockReferenceLine,
  }
})

const fixture = fixtureData as DataPoint[]

function makePoint(installs: number, ts: string): DataPoint {
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
    openVsx: null,
    github: null,
  }
}

describe('VelocityChart', () => {
  it('renders empty state when data is empty', () => {
    render(<VelocityChart data={[]} />)
    expect(screen.getByText(/No velocity data available/i)).toBeDefined()
  })

  it('renders chart when data has enough points', () => {
    const data = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(200, '2026-01-02T00:00:00Z'),
      makePoint(300, '2026-01-03T00:00:00Z'),
    ]
    render(<VelocityChart data={data} />)
    expect(screen.getByText(/Velocity/i)).toBeDefined()
  })

  it('handles fixture data without throwing', () => {
    expect(() => render(<VelocityChart data={fixture} />)).not.toThrow()
  })
})