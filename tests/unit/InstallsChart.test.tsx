import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import InstallsChart from '../../src/components/charts/InstallsChart'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import fixtureSingle from '../../fixtures/data/Veverke.chatwizard.single-point.json'
import type { DataPoint } from '../../src/types/schema'

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
})
