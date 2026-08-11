import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Overview from '../../src/routes/Overview'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import { UserContext } from '../../src/contexts/UserContext'
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
      // Extensions registry fetch (needed by useExtensions hook)
      if (url.includes('extensions.json') || url === './data/extensions.json') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(extensionsMulti),
        })
      }
      if (url.includes('/Veverke/chatwizard/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(chatwizardData),
        })
      }
      if (url.includes('/Veverke/fast-grower/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(fastGrowerData),
        })
      }
      if (url.includes('/Veverke/slow-grower/')) {
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
      <UserContext.Provider value={{ username: 'Veverke', setUsername: () => {}, clearUsername: () => {} }}>
        <ExtensionsContext.Provider value={extensions}>
          <Overview />
        </ExtensionsContext.Provider>
      </UserContext.Provider>
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

  it('renders Downloads column with open vsx download counts', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    // Downloads header exists
    expect(screen.getByText(/^Downloads/)).toBeInTheDocument()

    // Chat Wizard has openVsx downloads (1,998); others have null → 0
    const rows = screen.getAllByRole('row').slice(1)
    const chatWizardRow = rows.find(r => r.textContent?.includes('Chat Wizard'))
    expect(chatWizardRow).toHaveTextContent('1,998')
  })

  it('clicking Downloads header sorts by currentDownloads descending', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    const downloadsHeader = screen.getByText(/^Downloads/)
    fireEvent.click(downloadsHeader)

    // After sort by downloads desc, chat-wizard (1998) should be first
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Chat Wizard')
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
        if (url.includes('/Veverke/chatwizard/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(chatwizardData),
          })
        }
        if (url.includes('/Veverke/fast-grower/')) {
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

  it('single extension: redirects to that extension detail page', async () => {
    const singleExt = [singleExtension[0]] as ExtensionEntry[]
    // Mock fetch to return correct data per URL:
    // - extensions.json → the single extension entry
    // - time-series data → valid chatwizardData so useAllExtensionsData succeeds
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('extensions.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(singleExt),
          })
        }
        if (url.includes('/Veverke/chatwizard/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chatwizardData),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      })
    )
    render(
      <MemoryRouter initialEntries={['/']}>
        <UserContext.Provider value={{ username: 'Veverke', setUsername: () => {}, clearUsername: () => {} }}>
          <ExtensionsContext.Provider value={singleExt}>
            <Overview />
          </ExtensionsContext.Provider>
        </UserContext.Provider>
      </MemoryRouter>
    )

    // Wait for async useExtensions + useAllExtensionsData to resolve and Navigate to render
    await waitFor(() => {
      expect(screen.queryByRole('table')).toBeNull()
    })
  })

  it('shows "Show all tracked extensions" toggle when user has extensions', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    expect(screen.getByText(/Show all tracked extensions/)).toBeInTheDocument()
  })

  it('does NOT fall back to all extensions when user has none tracked', async () => {
    mockFetchForMulti()
    // User has no extensions in the registry — must NOT show all users' extensions
    render(
      <MemoryRouter initialEntries={['/']}>
        <UserContext.Provider value={{ username: 'new-user', setUsername: () => {}, clearUsername: () => {} }}>
          <ExtensionsContext.Provider value={[]}>
            <Overview />
          </ExtensionsContext.Provider>
        </UserContext.Provider>
      </MemoryRouter>
    )

    // Should show the empty state, not the previous user's extensions
    await waitFor(() =>
      expect(screen.getByText('No extensions found for your GitHub username.')).toBeInTheDocument()
    )

    // None of the other users' extensions should be displayed
    expect(screen.queryByRole('link', { name: 'Chat Wizard' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Fast Grower' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Slow Grower' })).not.toBeInTheDocument()
  })

  it('toggling "Show all tracked extensions" maintains data display', async () => {
    mockFetchForMulti()
    renderOverview()

    await waitFor(() =>
      expect(screen.queryAllByRole('link').length).toBeGreaterThanOrEqual(3)
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()

    // Toggle it on
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()

    // All extensions should still be visible
    expect(screen.getByRole('link', { name: 'Chat Wizard' })).toBeInTheDocument()
  })
})