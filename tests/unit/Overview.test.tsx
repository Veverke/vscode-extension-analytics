import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Overview from '../../src/routes/Overview'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import type { ExtensionEntry } from '../../src/types/schema'
import extensionsMulti from '../../fixtures/data/extensions-multi.json'
import chatwizardData from '../../fixtures/data/Veverke.chatwizard.json'
import fastGrowerData from '../../fixtures/data/Veverke.fast-grower.json'
import slowGrowerData from '../../fixtures/data/Veverke.slow-grower.json'
import singleExtension from '../../fixtures/data/extensions.json'

const multiExtensions = extensionsMulti as ExtensionEntry[]

function mockFetchForMulti() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('Veverke.chatwizard')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(chatwizardData),
        })
      }
      if (url.includes('Veverke.fast-grower')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(fastGrowerData),
        })
      }
      if (url.includes('Veverke.slow-grower')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(slowGrowerData),
        })
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) })
    })
  )
}

function renderOverview(extensions: ExtensionEntry[] = multiExtensions) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ExtensionsContext.Provider value={extensions}>
        <Overview />
      </ExtensionsContext.Provider>
    </MemoryRouter>
  )
}

describe('Overview', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders "Your Extensions" heading', async () => {
    mockFetchForMulti()
    renderOverview()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Extensions')
  })

  it('shows skeleton rows while loading', () => {
    // Block fetch to keep in loading state
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    renderOverview()
    const skeletonRows = document.querySelectorAll('.overview__skeleton-row')
    expect(skeletonRows.length).toBeGreaterThan(0)
  })

  it('renders a row for each extension after data loads', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    for (const ext of multiExtensions) {
      expect(
        screen.getByRole('link', { name: ext.displayName })
      ).toBeInTheDocument()
    }
  })

  it('sorted by momentum descending by default — highest momentum row is first', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    const rows = screen.getAllByRole('row').slice(1) // skip header
    // Fast-grower has the highest momentum score, should be first
    // (just assert order is some known descending order — the first row has highest momentum)
    const firstRowText = rows[0].textContent ?? ''
    expect(firstRowText).toBeTruthy()
    // Assert first row has a higher or equal momentum text than last row
    // (momentum badges are labeled "momentum N")
    const momentumBadges = screen.getAllByLabelText(/^momentum /)
    const scores = momentumBadges.map(b => {
      const match = b.getAttribute('aria-label')?.match(/momentum (\d+)/)
      return match ? parseInt(match[1]) : 0
    })
    expect(scores[0]).toBeGreaterThanOrEqual(scores[scores.length - 1])
  })

  it('clicking Installs header sorts by currentInstalls descending', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    const installsHeader = screen.getByText(/^Installs/)
    fireEvent.click(installsHeader)

    // After sort by installs desc, fast-grower (11750) should be first
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Fast Grower')
  })

  it('clicking a column header twice reverses sort order', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    const installsHeader = screen.getByText(/^Installs/)
    // Click once: descending
    fireEvent.click(installsHeader)
    const rowsDesc = screen.getAllByRole('row').slice(1)
    expect(rowsDesc[0]).toHaveTextContent('Fast Grower')

    // Click again: ascending
    fireEvent.click(installsHeader)
    const rowsAsc = screen.getAllByRole('row').slice(1)
    expect(rowsAsc[0]).toHaveTextContent('Slow Grower')
  })

  it('shows error row when one extension fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('Veverke.chatwizard')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(chatwizardData),
          })
        }
        if (url.includes('Veverke.fast-grower')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(fastGrowerData),
          })
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) })
      })
    )

    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(2)
    )

    // Error icon should be visible for the failed extension
    const errorIcon = screen.getByRole('img', { name: 'error' })
    expect(errorIcon).toBeInTheDocument()

    // Other 2 extensions still render as links
    expect(screen.getByRole('link', { name: 'Chat Wizard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fast Grower' })).toBeInTheDocument()
  })

  it('renders sparkline SVGs in data rows', async () => {
    mockFetchForMulti()
    const { container } = renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    const sparklines = container.querySelectorAll('svg[aria-label="sparkline"]')
    expect(sparklines.length).toBe(3)
  })

  it('renders velocity badges in data rows', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    const velocityBadges = screen.getAllByLabelText(/^velocity/)
    expect(velocityBadges.length).toBe(3)
  })

  it('renders momentum badges in data rows', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    const momentumBadges = screen.getAllByLabelText(/^momentum/)
    expect(momentumBadges.length).toBe(3)
  })

  it('single extension: redirects to that extension detail page', () => {
    const singleExt = [singleExtension[0]] as ExtensionEntry[]
    render(
      <MemoryRouter initialEntries={['/']}>
        <ExtensionsContext.Provider value={singleExt}>
          <Overview />
        </ExtensionsContext.Provider>
      </MemoryRouter>
    )
    // Navigate renders nothing itself, but should not show the table
    expect(screen.queryByRole('table')).toBeNull()
  })
})