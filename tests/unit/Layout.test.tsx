import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom'
import Layout from '../../src/components/Layout'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import { UserContext } from '../../src/contexts/UserContext'
import fixtureExtensions from '../../fixtures/data/extensions.json'

function mockFetchSuccess(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

function renderLayout() {
  return render(
    <ExtensionsContext.Provider value={fixtureExtensions}>
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    </ExtensionsContext.Provider>,
  )
}

describe('Layout', () => {
  it('renders the app title', () => {
    renderLayout()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'VS Code Extension Analytics',
    )
  })

  it('renders a nav link for each extension', () => {
    renderLayout()
    for (const ext of fixtureExtensions) {
      const link = screen.getByRole('link', { name: ext.displayName })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', `/extension/${ext.id}`)
    }
  })

  it('renders a sidebar navigation landmark', () => {
    renderLayout()
    expect(screen.getByRole('navigation', { name: 'Extension navigation' })).toBeInTheDocument()
  })

  it('renders the main content area', () => {
    renderLayout()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('marks the currently active navigation link', () => {
    const firstExt = fixtureExtensions[0]
    const router = createMemoryRouter(
      [
        {
          path: '/extension/:extensionId',
          element: (
            <ExtensionsContext.Provider value={fixtureExtensions}>
              <Layout />
            </ExtensionsContext.Provider>
          ),
        },
      ],
      { initialEntries: [`/extension/${firstExt.id}`] },
    )
    render(<RouterProvider router={router} />)
    const activeLink = screen.getByRole('link', { name: firstExt.displayName })
    expect(activeLink).toHaveClass('sidebar__link--active')
  })

  it('header title links to home (/)', () => {
    renderLayout()
    const homeLink = screen.getByRole('link', { name: 'VS Code Extension Analytics' })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('renders collect schedule with last and next run labels', () => {
    vi.stubGlobal('fetch', mockFetchSuccess([{ ts: '2026-08-05T06:54:06.438Z' }]))
    renderLayout()

    expect(screen.getByText('Last run')).toBeInTheDocument()
    expect(screen.getByText('Next run')).toBeInTheDocument()
    expect(screen.getByTitle('Schedule runs every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('renders em dash placeholders when no data is available', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess([]))
    renderLayout()

    await waitFor(() => {
      expect(screen.getAllByText('—')).toHaveLength(2)
    })
    vi.unstubAllGlobals()
  })
})

describe('Layout — with username', () => {
  function renderLayoutWithUser(username: string) {
    return render(
      <UserContext.Provider value={{ username, setUsername: vi.fn(), clearUsername: vi.fn() }}>
        <ExtensionsContext.Provider value={fixtureExtensions}>
          <MemoryRouter>
            <Layout />
          </MemoryRouter>
        </ExtensionsContext.Provider>
      </UserContext.Provider>,
    )
  }

  it('renders user bar with username when username is set', () => {
    renderLayoutWithUser('testuser')

    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Switch user' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Discover' })).toHaveAttribute(
      'href',
      '/discover/testuser',
    )
  })

  it('does not render user bar when no username is set', () => {
    renderLayout()
    expect(screen.queryByText('testuser')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Switch user' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Discover' })).not.toBeInTheDocument()
  })

  it('does not render sidebar nav when extensions list is empty', () => {
    render(
      <ExtensionsContext.Provider value={[]}>
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      </ExtensionsContext.Provider>,
    )
    expect(screen.queryByRole('navigation', { name: 'Extension navigation' })).not.toBeInTheDocument()
  })

  it('calls clearUsername when Switch user is clicked', () => {
    const clearUsername = vi.fn()
    render(
      <UserContext.Provider
        value={{ username: 'testuser', setUsername: vi.fn(), clearUsername }}
      >
        <ExtensionsContext.Provider value={fixtureExtensions}>
          <MemoryRouter>
            <Layout />
          </MemoryRouter>
        </ExtensionsContext.Provider>
      </UserContext.Provider>,
    )

    screen.getByRole('link', { name: 'Switch user' }).click()
    expect(clearUsername).toHaveBeenCalledOnce()
  })
})