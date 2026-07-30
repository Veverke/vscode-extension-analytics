import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ExtensionDetail from '../../src/routes/ExtensionDetail'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import * as useExtensionDataModule from '../../src/hooks/useExtensionData'
import * as useReleaseDataModule from '../../src/hooks/useReleaseData'
import * as useEventsModule from '../../src/hooks/useEvents'
import * as useMonthlyRollupsModule from '../../src/hooks/useMonthlyRollups'
import type { ExtensionEntry, MonthlyRollup, DataPoint } from '../../src/types/schema'

vi.mock('../../src/hooks/useExtensionData')
vi.mock('../../src/hooks/useReleaseData')
vi.mock('../../src/hooks/useEvents')
vi.mock('../../src/hooks/useMonthlyRollups')
vi.mock('../../src/components/charts/InstallsChart', () => ({
  default: () => <div>InstallsChart</div>,
}))
vi.mock('../../src/components/charts/VelocityChart', () => ({
  default: () => <div>VelocityChart</div>,
}))
vi.mock('../../src/components/charts/RatingChart', () => ({
  default: () => <div>RatingChart</div>,
}))
vi.mock('../../src/components/charts/GitHubChart', () => ({
  default: () => <div>GitHubChart</div>,
}))
vi.mock('../../src/components/charts/MonthlyInstallsChart', () => ({
  default: () => <div>MonthlyInstallsChart</div>,
}))
vi.mock('../../src/components/cards/MonthlyTableCard', () => ({
  default: () => <div>MonthlyTableCard</div>,
}))
vi.mock('../../src/components/cards/MetricsPanel', () => ({
  default: () => <div>MetricsPanel</div>,
}))
vi.mock('../../src/components/cards/StatsCards', () => ({
  default: () => <div>StatsCards</div>,
}))
vi.mock('../../src/components/cards/ReleaseImpactPanel', () => ({
  default: () => <div>ReleaseImpactPanel</div>,
}))
vi.mock('../../src/components/cards/CompetitorList', () => ({
  default: () => <div>CompetitorList</div>,
}))

const mockUseExtensionData = vi.mocked(useExtensionDataModule.useExtensionData)
const mockUseReleaseData = vi.mocked(useReleaseDataModule.useReleaseData)
const mockUseEvents = vi.mocked(useEventsModule.useEvents)
const mockUseMonthlyRollups = vi.mocked(useMonthlyRollupsModule.useMonthlyRollups)

const mockExtension: ExtensionEntry = {
  id: 'test.test-ext',
  namespace: 'test',
  name: 'test-ext',
  displayName: 'Test Extension',
  githubRepo: 'test/test-ext',
  trackedSince: '2025-01-01T00:00:00Z',
}

const mockDataPoint: DataPoint = {
  ts: '2025-06-01T00:00:00Z',
  marketplace: {
    installs: 1000,
    updates: 50,
    averageRating: 4.5,
    ratingCount: 100,
    trendingWeekly: 10,
    trendingMonthly: 50,
  },
  openVsx: null,
  github: null,
}

function renderExtensionDetail(extensionId: string = 'test.test-ext') {
  return render(
    <ExtensionsContext.Provider value={[mockExtension]}>
      <MemoryRouter initialEntries={[`/extension/${extensionId}`]}>
        <Routes>
          <Route path="/extension/:extensionId" element={<ExtensionDetail />} />
        </Routes>
      </MemoryRouter>
    </ExtensionsContext.Provider>
  )
}

describe('ExtensionDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUseExtensionData.mockReturnValue({ data: [], loading: true, error: null })
    mockUseReleaseData.mockReturnValue({ releases: [], loading: true, error: null })
    mockUseEvents.mockReturnValue({ events: [], loading: true, error: null })
    mockUseMonthlyRollups.mockReturnValue({ rollups: [], loading: true, error: null })
  })

  it('renders loading skeleton when loading', () => {
    renderExtensionDetail()
    expect(screen.getByRole('status', { name: /Loading extension data/ })).toBeInTheDocument()
  })

  it('renders error state when error occurs', () => {
    mockUseExtensionData.mockReturnValue({ data: [], loading: false, error: 'Failed to fetch data' })
    renderExtensionDetail()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument()
  })

  it('renders extension detail page with data', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    expect(screen.getByText('Test Extension')).toBeInTheDocument()
    expect(screen.getByText('test.test-ext')).toBeInTheDocument()
  })

  it('renders extension not found when extension ID does not match', () => {
    renderExtensionDetail('nonexistent.ext')
    expect(screen.getByText('Extension not found')).toBeInTheDocument()
  })

  it('renders VS Marketplace link', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    const link = screen.getByText('VS Marketplace').closest('a')
    expect(link).toHaveAttribute('href', 'https://marketplace.visualstudio.com/items?itemName=test.test-ext')
  })

  it('renders Open VSX link', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    const link = screen.getByText('Open VSX').closest('a')
    expect(link).toHaveAttribute('href', 'https://open-vsx.org/extension/test/test-ext')
  })

  it('renders all chart sections', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    expect(screen.getByText('InstallsChart')).toBeInTheDocument()
    expect(screen.getByText('VelocityChart')).toBeInTheDocument()
    expect(screen.getByText('RatingChart')).toBeInTheDocument()
    expect(screen.getByText('GitHubChart')).toBeInTheDocument()
    expect(screen.getByText('MonthlyInstallsChart')).toBeInTheDocument()
    expect(screen.getByText('MonthlyTableCard')).toBeInTheDocument()
  })

  it('renders projection controls', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    expect(screen.getByLabelText('Projection horizon (months):')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('renders export buttons', () => {
    mockUseMonthlyRollups.mockReturnValue({
      rollups: [{
        yearMonth: '2025-06',
        installsEndOfMonth: 1000,
        installsGained: 100,
        avgRating: 4.5,
        ratingCountEndOfMonth: 50,
        openVsxDownloadsEndOfMonth: 100,
        dataPointsInMonth: 10,
        starsEndOfMonth: 10,
        forksEndOfMonth: 5,
        contributionsEndOfMonth: 3,
      } as MonthlyRollup],
      loading: false,
      error: null,
    })
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    expect(screen.getByText('Export Report (CSV)')).toBeInTheDocument()
    expect(screen.getByText('Export Raw Data (JSON)')).toBeInTheDocument()
  })

  it('displays ProjectionSummary with linear and exponential projections', () => {
    // Need at least 2 data points with different timestamps for projections to work
    const manyDataPoints: DataPoint[] = Array.from({ length: 10 }, (_, i) => ({
      ...mockDataPoint,
      ts: new Date(2025, 0, 1 + i).toISOString(),
      marketplace: { ...mockDataPoint.marketplace, installs: 100 + i * 100 },
    }))
    mockUseExtensionData.mockReturnValue({ data: manyDataPoints, loading: false, error: null })
    renderExtensionDetail()
    expect(screen.getByText('Linear:')).toBeInTheDocument()
    expect(screen.getByText('Exponential:')).toBeInTheDocument()
  })

  it('changes projection months when input changes', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    const input = screen.getByLabelText('Projection horizon (months):')
    fireEvent.change(input, { target: { value: '3' } })
    expect(input).toHaveValue(3)
  })

  it('clamps projection months to min 1', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    const input = screen.getByLabelText('Projection horizon (months):')
    fireEvent.change(input, { target: { value: '0' } })
    expect(input).toHaveValue(1)
  })

  it('clamps projection months to max 24', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    const input = screen.getByLabelText('Projection horizon (months):')
    fireEvent.change(input, { target: { value: '100' } })
    expect(input).toHaveValue(24)
  })

  it('resets projection months to 1 when reset is clicked', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    const input = screen.getByLabelText('Projection horizon (months):')

    // Change to 5
    fireEvent.change(input, { target: { value: '5' } })
    expect(input).toHaveValue(5)

    // Click reset
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(input).toHaveValue(1)
  })

  it('shows no-data message when extension data is empty', () => {
    mockUseExtensionData.mockReturnValue({ data: [], loading: false, error: null })
    renderExtensionDetail()
    // With empty data, the component shows a "no data yet" message
    expect(screen.getByText("No data yet — the collector hasn't run yet.")).toBeInTheDocument()
  })

  it('renders competitors section', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    expect(screen.getByText('Competitors')).toBeInTheDocument()
  })

  it('handles icon error by hiding it', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    const img = screen.getByAltText('Test Extension icon')
    fireEvent.error(img)
    expect(img.style.display).toBe('none')
  })

  it('renders StatsCards, MetricsPanel, ReleaseImpactPanel', () => {
    mockUseExtensionData.mockReturnValue({ data: [mockDataPoint], loading: false, error: null })
    renderExtensionDetail()
    expect(screen.getByText('StatsCards')).toBeInTheDocument()
    expect(screen.getByText('MetricsPanel')).toBeInTheDocument()
    expect(screen.getByText('ReleaseImpactPanel')).toBeInTheDocument()
  })
})