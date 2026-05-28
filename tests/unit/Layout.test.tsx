import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom'
import Layout from '../../src/components/Layout'
import fixtureExtensions from '../../fixtures/data/extensions.json'

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout extensions={fixtureExtensions} />
    </MemoryRouter>,
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
          element: <Layout extensions={fixtureExtensions} />,
        },
      ],
      { initialEntries: [`/extension/${firstExt.id}`] },
    )
    render(<RouterProvider router={router} />)
    const activeLink = screen.getByRole('link', { name: firstExt.displayName })
    expect(activeLink).toHaveClass('sidebar__link--active')
  })
})
