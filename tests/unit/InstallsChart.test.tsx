import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import InstallsChart, { formatInstallsTooltipValue } from '../../src/components/charts/InstallsChart'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import fixtureSingle from '../../fixtures/data/Veverke.chatwizard.single-point.json'
import type { DataPoint } from '../../src/types/schema'
import { computeProjection } from '../../src/metrics/projections'
import { computeVelocity } from '../../src/metrics/velocity'
import { detectPeaks } from '../../src/metrics/peaks'

vi.mock('recharts', async () => {
  const recharts = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...recharts,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement<{ width?: number; height?: number }>
    }) => React.cloneElement(children, { width: 800, height: 300 }),
  }
})

const fixture = fixtureData as DataPoint[]
const singlePoint = fixtureSingle as DataPoint[]

describe('InstallsChart', () => {
  it('renders without error and shows svg with fixture data', () => {
    const { container } = render(<InstallsChart data={fixture} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without error for a single data point', () => {
    const { container } = render(<InstallsChart data={singlePoint} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('shows empty-state message when data is empty', () => {
    render(<InstallsChart data={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent(
      "No data yet — the collector hasn't run yet",
    )
  })

  it('renders without Open VSX line when all openVsx is null', () => {
    const noOpenVsx: DataPoint[] = fixture.map(p => ({ ...p, openVsx: null }))
    const { container } = render(<InstallsChart data={noOpenVsx} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with projection lines when projections prop is provided', () => {
    const linearProj = computeProjection(fixture, 'linear', 30)
    const expProj = computeProjection(fixture, 'exponential', 30)
    const projections = [linearProj!, expProj!]
    const { container } = render(<InstallsChart data={fixture} projections={projections} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with empty projections array without error', () => {
    const { container } = render(<InstallsChart data={fixture} projections={[]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with peak markers when peaks prop is provided', () => {
    const velocity = computeVelocity(fixture)
    const peaks = detectPeaks(velocity)
    const { container } = render(<InstallsChart data={fixture} peaks={peaks} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with both projections and peaks', () => {
    const linearProj = computeProjection(fixture, 'linear', 30)
    const velocity = computeVelocity(fixture)
    const peaks = detectPeaks(velocity)
    const { container } = render(
      <InstallsChart data={fixture} projections={[linearProj!]} peaks={peaks} />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with empty peaks array without error', () => {
    const { container } = render(<InstallsChart data={fixture} peaks={[]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('formatInstallsTooltipValue', () => {
  it('formats numeric value with localized string', () => {
    const [label, name] = formatInstallsTooltipValue(1234, 'Marketplace Installs')
    expect(label).toBe('1,234')
    expect(name).toBe('Marketplace Installs')
  })

  it('formats non-numeric value as N/A', () => {
    const [label] = formatInstallsTooltipValue(null, 'Test')
    expect(label).toBe('N/A')
  })

  it('formats undefined as N/A', () => {
    const [label] = formatInstallsTooltipValue(undefined, 'Test')
    expect(label).toBe('N/A')
  })

  it('formats zero correctly', () => {
    const [label] = formatInstallsTooltipValue(0, 'Downloads')
    expect(label).toBe('0')
  })
})
