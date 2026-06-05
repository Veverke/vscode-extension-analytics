import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import VelocityChart, { formatVelocityTooltipValue } from '../../src/components/charts/VelocityChart'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

vi.mock('recharts', async () => {
  const recharts = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...recharts,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement<{ width?: number; height?: number }>
    }) => React.cloneElement(children, { width: 800, height: 250 }),
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
  }
}

describe('VelocityChart', () => {
  it('renders svg with fixture data', () => {
    const { container } = render(<VelocityChart data={fixture} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('shows empty-state message when data is empty', () => {
    render(<VelocityChart data={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('No velocity data available')
  })

  it('renders with single data point without error', () => {
    const single = [makePoint(100, '2026-01-01T00:00:00Z')]
    const { container } = render(<VelocityChart data={single} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with data containing negative velocities', () => {
    const data = [
      makePoint(500, '2026-01-01T00:00:00Z'),
      makePoint(480, '2026-01-01T06:00:00Z'),
      makePoint(510, '2026-01-01T12:00:00Z'),
    ]
    const { container } = render(<VelocityChart data={data} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('formatVelocityTooltipValue', () => {
  it('formats positive number with + prefix', () => {
    const [label, name] = formatVelocityTooltipValue(42)
    expect(label).toBe('+42 installs')
    expect(name).toBe('Velocity')
  })

  it('formats negative number without extra + prefix', () => {
    const [label] = formatVelocityTooltipValue(-10)
    expect(label).toBe('-10 installs')
  })

  it('formats zero with + prefix', () => {
    const [label] = formatVelocityTooltipValue(0)
    expect(label).toBe('+0 installs')
  })

  it('formats non-number value as 0', () => {
    const [label] = formatVelocityTooltipValue('not a number')
    expect(label).toBe('+0 installs')
  })

  it('formats undefined as 0', () => {
    const [label] = formatVelocityTooltipValue(undefined)
    expect(label).toBe('+0 installs')
  })
})
