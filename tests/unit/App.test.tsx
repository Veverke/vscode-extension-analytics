import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import App from '../../src/App'
import * as useExtensionsModule from '../../src/hooks/useExtensions'
import fixtureExtensions from '../../fixtures/data/extensions.json'

vi.mock('../../src/hooks/useExtensions')

function renderApp() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <App />,
        children: [{ index: true, element: <div>child route</div> }],
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading indicator while fetching', () => {
    vi.spyOn(useExtensionsModule, 'useExtensions').mockReturnValue({
      extensions: [],
      loading: true,
      error: null,
    })

    renderApp()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows error message on fetch failure', () => {
    vi.spyOn(useExtensionsModule, 'useExtensions').mockReturnValue({
      extensions: [],
      loading: false,
      error: 'Network error',
    })

    renderApp()

    expect(screen.getByRole('alert')).toHaveTextContent('Network error')
  })

  it('renders sidebar with extensions on success', () => {
    vi.spyOn(useExtensionsModule, 'useExtensions').mockReturnValue({
      extensions: fixtureExtensions,
      loading: false,
      error: null,
    })

    renderApp()

    expect(screen.getByText('Chat Wizard')).toBeInTheDocument()
    expect(screen.getByText('Copilot Reviewer Assistant')).toBeInTheDocument()
  })
})
