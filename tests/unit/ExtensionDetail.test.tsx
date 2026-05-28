import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import ExtensionDetail from '../../src/routes/ExtensionDetail'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import fixtureExtensions from '../../fixtures/data/extensions.json'
import fixtureData from '../../fixtures/data/Veverke.chatwizard.json'
import type { DataPoint } from '../../src/types/schema'
import * as useExtensionDataModule from '../../src/hooks/useExtensionData'

vi.mock('../../src/components/charts/InstallsChart', () => ({
  default: () => <div data-testid="installs-chart" />,
}))
vi.mock('../../src/components/charts/RatingChart', () => ({
  default: () => <div data-testid="rating-chart" />,
}))
vi.mock('../../src/components/cards/StatsCards', () => ({
  default: () => <div data-testid="stats-cards" />,
}))

const fixture = fixtureData as DataPoint[]

function renderDetail(extensionId: string) {
  const router = createMemoryRouter(
    [{ path: '/extension/:extensionId', element: <ExtensionDetail /> }],
    { initialEntries: [`/extension/${extensionId}`] },
  )

  return render(
    <ExtensionsContext.Provider value={fixtureExtensions}>
      <RouterProvider router={router} />
    </ExtensionsContext.Provider>,
  )
}

describe('ExtensionDetail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the extension display name as h1', () => {
    vi.spyOn(useExtensionDataModule, 'useExtensionData').mockReturnValue({
      data: fixture,
      loading: false,
      error: null,
    })
    renderDetail('Veverke.chatwizard')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chat Wizard')
  })

  it('renders charts and stats cards when data is loaded', () => {
    vi.spyOn(useExtensionDataModule, 'useExtensionData').mockReturnValue({
      data: fixture,
      loading: false,
      error: null,
    })
    renderDetail('Veverke.chatwizard')
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument()
    expect(screen.getByTestId('installs-chart')).toBeInTheDocument()
    expect(screen.getByTestId('rating-chart')).toBeInTheDocument()
  })

  it('shows loading indicator while fetching data', () => {
    vi.spyOn(useExtensionDataModule, 'useExtensionData').mockReturnValue({
      data: [],
      loading: true,
      error: null,
    })
    renderDetail('Veverke.chatwizard')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows error message when data fetch fails', () => {
    vi.spyOn(useExtensionDataModule, 'useExtensionData').mockReturnValue({
      data: [],
      loading: false,
      error: 'HTTP 500',
    })
    renderDetail('Veverke.chatwizard')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 500')
  })

  it('renders section headings for Installs and Rating', () => {
    vi.spyOn(useExtensionDataModule, 'useExtensionData').mockReturnValue({
      data: fixture,
      loading: false,
      error: null,
    })
    renderDetail('Veverke.chatwizard')
    expect(screen.getByRole('region', { name: 'Installs' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Rating' })).toBeInTheDocument()
  })

  it('renders "not found" message for unknown extensionId', () => {
    vi.spyOn(useExtensionDataModule, 'useExtensionData').mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })
    renderDetail('does.not.exist')
    expect(screen.getByText('Extension not found')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
