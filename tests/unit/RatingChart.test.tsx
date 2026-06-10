import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import RatingChart from '../../src/components/charts/RatingChart'
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
    }) => React.cloneElement(children, { width: 800, height: 300 }),
  }
})

const fixture = fixtureData as DataPoint[]

describe('RatingChart', () => {
  it('renders without error and shows svg with fixture data', () => {
    const { container } = render(<RatingChart data={fixture} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('shows empty-state message when data is empty', () => {
    const { getByRole } = render(<RatingChart data={[]} />)
    expect(getByRole('status')).toBeInTheDocument()
  })

  it('renders when averageRating is undefined (null branch in buildChartData)', () => {
    const noRating: DataPoint[] = fixture.map(p => ({
      ...p,
      marketplace: { ...p.marketplace, averageRating: undefined },
    }))
    const { container } = render(<RatingChart data={noRating} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
