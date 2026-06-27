import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom'
import Layout from '../../src/components/Layout'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import fixtureExtensions from '../../fixtures/data/extensions.json'

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
})
