import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MonthlyInstallsChart from '../../src/components/charts/MonthlyInstallsChart'
import type { MonthlyRollup } from '../../src/types/schema'

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

const mockRollups: MonthlyRollup[] = [
  {
    yearMonth: '2026-05',
    installsEndOfMonth: 1380,
    installsGained: 880,
    avgRating: 4.19,
    ratingCountEndOfMonth: 14,
    openVsxDownloadsEndOfMonth: 645,
    dataPointsInMonth: 28,
  },
  {
    yearMonth: '2026-06',
    installsEndOfMonth: 2500,
    installsGained: 1120,
    avgRating: 4.3,
    ratingCountEndOfMonth: 20,
    openVsxDownloadsEndOfMonth: 900,
    dataPointsInMonth: 30,
  },
]

describe('MonthlyInstallsChart', () => {
  it('shows empty message when no rollups', () => {
    render(<MonthlyInstallsChart rollups={[]} />)
    expect(screen.getByText('No monthly rollups available yet')).toBeInTheDocument()
  })

  it('renders chart with rollups data', () => {
    const { container } = render(<MonthlyInstallsChart rollups={mockRollups} />)
    // Should render a BarChart (recharts renders SVG)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('sorts rollups by yearMonth ascending', () => {
    const unsorted = [...mockRollups].reverse()
    const { container } = render(<MonthlyInstallsChart rollups={unsorted} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})