// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import Landing from '../../src/routes/Landing'
import { UserContext } from '../../src/contexts/UserContext'

function renderLanding() {
  const setUsername = vi.fn()
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <UserContext.Provider
            value={{
              username: null,
              setUsername,
              clearUsername: vi.fn(),
            }}
          >
            <Landing />
          </UserContext.Provider>
        ),
      },
      {
        path: '/overview',
        element: <div>overview page</div>,
      },
      {
        path: '/discover/:username',
        element: <div>discover page</div>,
      },
    ],
    { initialEntries: ['/'] },
  )

  return { setUsername, ...render(<RouterProvider router={router} />) }
}

describe('Landing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders title and input field', () => {
    renderLanding()
    expect(
      screen.getByText('VS Code Extension Analytics'),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('e.g. your-github-username'),
    ).toBeInTheDocument()
  })

  it('shows validation error for empty submission', () => {
    renderLanding()
    fireEvent.click(screen.getByText('Discover My Extensions'))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please enter a GitHub username.',
    )
  })

  it('shows validation error for invalid username format', () => {
    renderLanding()
    fireEvent.change(screen.getByPlaceholderText('e.g. your-github-username'), {
      target: { value: 'invalid username!' },
    })
    fireEvent.click(screen.getByText('Discover My Extensions'))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invalid GitHub username format',
    )
  })

  it('calls setUsername and navigates on valid submission', () => {
    const { setUsername } = renderLanding()
    fireEvent.change(screen.getByPlaceholderText('e.g. your-github-username'), {
      target: { value: 'validUser' },
    })
    fireEvent.click(screen.getByText('Discover My Extensions'))
    expect(setUsername).toHaveBeenCalledWith('validUser')
  })

  it('clears validation error when user types after error', () => {
    renderLanding()
    fireEvent.click(screen.getByText('Discover My Extensions'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('e.g. your-github-username'), {
      target: { value: 'v' },
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})