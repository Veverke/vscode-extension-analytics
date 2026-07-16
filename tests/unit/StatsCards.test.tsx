import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsCards from '../../src/components/cards/StatsCards'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import fixtureNoOpenVsx from '../../fixtures/data/Veverke.chatwizard.no-openvsx.json'
import type { DataPoint } from '../../src/types/schema'

const fixture = fixtureData as DataPoint[]
const noOpenVsxFixture = fixtureNoOpenVsx as DataPoint[]

describe('StatsCards', () => {
  it('correct values — latest install count is visible and matches last data point', () => {
    render(<StatsCards data={fixture} />)
    // Last data point installs: 136 → formatted as "136"
    expect(screen.getByText('136')).toBeInTheDocument()
  })

  it('delta calculation — shows +54 since tracking started (136 - 82)', () => {
    render(<StatsCards data={fixture} />)
    const lastInstall = fixture[fixture.length - 1].marketplace.installs
    const firstInstall = fixture[0].marketplace.installs
    const delta = lastInstall - firstInstall
    expect(screen.getByText(`+${delta} since tracking started`)).toBeInTheDocument()
  })

  it('no openVsx — shows N/A for Open VSX Downloads value and delta', () => {
    render(<StatsCards data={noOpenVsxFixture} />)
    const naElements = screen.getAllByText('N/A')
    expect(naElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows stats region with label', () => {
    render(<StatsCards data={fixture} />)
    expect(screen.getByRole('region', { name: 'Stats' })).toBeInTheDocument()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(<StatsCards data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('negative delta — shows negative delta when value decreased', () => {
    // Reverse the fixture so last installs < first installs
    const reversed = [...fixture].reverse() as DataPoint[]
    render(<StatsCards data={reversed} />)
    const firstInstall = reversed[0].marketplace.installs
    const lastInstall = reversed[reversed.length - 1].marketplace.installs
    const delta = lastInstall - firstInstall
    expect(screen.getByText(`${delta} since tracking started`)).toBeInTheDocument()
  })

  it('undefined averageRating — shows N/A for rating value and delta', () => {
    const noRatingFixture: DataPoint[] = fixture.map(p => ({
      ...p,
      marketplace: { ...p.marketplace, averageRating: undefined },
    }))
    render(<StatsCards data={noRatingFixture} />)
    const naElements = screen.getAllByText('N/A')
    // should have N/A for rating value and N/A for rating delta
    expect(naElements.length).toBeGreaterThanOrEqual(2)
  })
})
