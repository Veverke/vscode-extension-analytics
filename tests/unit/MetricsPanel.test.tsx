import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricsPanel from '../../src/components/cards/MetricsPanel'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'

const fixture = fixtureData as DataPoint[]

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

describe('MetricsPanel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(<MetricsPanel data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders metrics panel region with fixture data', () => {
    render(<MetricsPanel data={fixture} />)
    expect(screen.getByRole('region', { name: 'Metrics' })).toBeInTheDocument()
  })

  it('shows velocity metric with /hour label', () => {
    render(<MetricsPanel data={fixture} />)
    const velocityEl = screen.getByTestId('metric-velocity')
    expect(velocityEl.textContent).toMatch(/\/hour/)
  })

  it('shows momentum score as a number', () => {
    render(<MetricsPanel data={fixture} />)
    const momentumEl = screen.getByTestId('metric-momentum')
    expect(momentumEl.textContent).toMatch(/\d+/)
  })

  it('shows projection value for sufficient data', () => {
    render(<MetricsPanel data={fixture} />)
    const projEl = screen.getByTestId('metric-projection')
    expect(projEl.textContent).not.toBe('Not enough data')
  })

  it('shows "Not enough data" projection when data has 2 points', () => {
    const twoPoints = [
      makePoint(100, '2026-01-01T00:00:00Z'),
      makePoint(110, '2026-01-01T06:00:00Z'),
    ]
    render(<MetricsPanel data={twoPoints} />)
    const projEl = screen.getByTestId('metric-projection')
    expect(projEl.textContent).toBe('Not enough data')
  })

  it('shows acceleration direction label', () => {
    render(<MetricsPanel data={fixture} />)
    const accEl = screen.getByTestId('metric-acceleration')
    expect(accEl.textContent).toMatch(/speeding up|slowing down|stable/)
  })

  it('shows stable acceleration for constant velocity data', () => {
    const data = Array.from({ length: 10 }, (_, i) =>
      makePoint(100 + i * 10, new Date(Date.UTC(2026, 0, 1) + i * 6 * 60 * 60 * 1000).toISOString()),
    )
    render(<MetricsPanel data={data} />)
    const accEl = screen.getByTestId('metric-acceleration')
    expect(accEl.textContent).toBe('→ stable')
  })

  it('shows red color for low momentum score (old data with spike then flat growth)', () => {
    // Big velocity spike followed by near-zero growth + very old timestamps (recency ≈ 0)
    const installs = [100, 300, 302, 304, 306, 308, 310, 312]
    const data = installs.map((count, i) =>
      makePoint(
        count,
        // 4 months ago so recency ≈ 0
        new Date(Date.UTC(2026, 1, 1) + i * 6 * 60 * 60 * 1000).toISOString(),
      ),
    )
    render(<MetricsPanel data={data} />)
    const momentumEl = screen.getByTestId('metric-momentum')
    const score = parseInt(momentumEl.textContent ?? '50', 10)
    expect(score).toBeLessThanOrEqual(33)
  })

  it('shows green color for high momentum score (fresh accelerating data)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'))
    // Installs growing by ~200/step with constant acceleration — fresh data (today)
    const installs = [100, 295, 491, 688, 886, 1085, 1285, 1486]
    const data = installs.map((count, i) =>
      makePoint(
        count,
        new Date(Date.UTC(2026, 5, 5, 12) - (7 - i) * 6 * 60 * 60 * 1000).toISOString(),
      ),
    )
    render(<MetricsPanel data={data} />)
    const momentumEl = screen.getByTestId('metric-momentum')
    const score = parseInt(momentumEl.textContent ?? '0', 10)
    expect(score).toBeGreaterThan(66)
  })

  it('shows slowing down acceleration label', () => {
    // velocities: [0, 10, 15, 20, 25, 15, 10, 5] → last acc = 5 - 10 = -5 (slowing)
    const installs = [100, 110, 125, 145, 170, 185, 195, 200]
    const data = installs.map((count, i) =>
      makePoint(count, new Date(Date.UTC(2026, 0, 1) + i * 6 * 60 * 60 * 1000).toISOString()),
    )
    render(<MetricsPanel data={data} />)
    expect(screen.getByTestId('metric-acceleration').textContent).toBe('↓ slowing down')
  })

  it('shows negative velocity sign for declining data', () => {
    // Last velocity: 115 - 120 = -5 → computeVelocityNormalized gives negative value
    const installs = [100, 110, 120, 115]
    const data = installs.map((count, i) =>
      makePoint(count, new Date(Date.UTC(2026, 0, 1) + i * 6 * 60 * 60 * 1000).toISOString()),
    )
    render(<MetricsPanel data={data} />)
    const velocityEl = screen.getByTestId('metric-velocity')
    expect(velocityEl.textContent).toMatch(/-[\d.]+/)
  })
})
