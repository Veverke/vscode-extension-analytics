import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsCards from '../../src/components/cards/StatsCards'
import type { DataPoint } from '../../src/types/schema'

function makePoint(installs: number, ts: string, overrides?: Partial<DataPoint>): DataPoint {
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
    ...overrides,
  }
}

describe('StatsCards branch coverage', () => {
  it('renders with github data', () => {
    const data: DataPoint[] = [
      makePoint(100, '2026-01-01T00:00:00Z', { github: { stars: 10, forks: 3, contributions: 5 } }),
      makePoint(200, '2026-01-02T00:00:00Z', { github: { stars: 15, forks: 5, contributions: 8 } }),
    ]
    render(<StatsCards data={data} />)
    expect(screen.getByText('15')).toBeInTheDocument() // latest stars
    expect(screen.getByText('5')).toBeInTheDocument() // latest forks
    expect(screen.getByText('8')).toBeInTheDocument() // latest contributions
  })

  it('renders with trackedSince prop', () => {
    const data: DataPoint[] = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(200, '2026-01-02T00:00:00Z'),
    ]
    render(<StatsCards data={data} trackedSince="2026-01-01T00:00:00Z" />)
    expect(screen.getByText('January 1, 2026')).toBeInTheDocument()
  })

  it('renders with openVsx data', () => {
    const data: DataPoint[] = [
      makePoint(100, '2026-01-01T00:00:00Z', { openVsx: { downloads: 50, averageRating: null, ratingCount: 0 } }),
      makePoint(200, '2026-01-02T00:00:00Z', { openVsx: { downloads: 100, averageRating: null, ratingCount: 0 } }),
    ]
    render(<StatsCards data={data} />)
    expect(screen.getByText('100')).toBeInTheDocument() // latest openvsx
  })

  it('renders with undefined averageRating', () => {
    const data: DataPoint[] = [
      { ...makePoint(100, '2026-01-01T00:00:00Z'), marketplace: { ...makePoint(100, '2026-01-01T00:00:00Z').marketplace, averageRating: undefined } },
      { ...makePoint(200, '2026-01-02T00:00:00Z'), marketplace: { ...makePoint(200, '2026-01-02T00:00:00Z').marketplace, averageRating: undefined } },
    ]
    render(<StatsCards data={data} />)
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2)
  })

  it('renders with negative delta for decreasing installs', () => {
    const data: DataPoint[] = [
      makePoint(200, '2026-01-01T00:00:00Z'),
      makePoint(100, '2026-01-02T00:00:00Z'),
    ]
    render(<StatsCards data={data} />)
    // The installs delta is the difference between last and first install values
    const matches = screen.getAllByText(/-100/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})