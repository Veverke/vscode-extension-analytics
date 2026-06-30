import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import App from '../../src/App'
import { UserContext } from '../../src/contexts/UserContext'
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

function TestConsumer({ onMount }: { onMount: (value: { username: string | null; setUsername: (n: string) => void; clearUsername: () => void }) => void }) {
  return (
    <UserContext.Consumer>
      {(value) => {
        onMount(value)
        return <div>test action</div>
      }}
    </UserContext.Consumer>
  )
}

function renderAppWithTestAction(onMount: (userValue: { username: string | null; setUsername: (n: string) => void; clearUsername: () => void }) => void) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <App />,
        children: [{ index: true, element: <TestConsumer onMount={onMount} /> }],
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

  it('provides context and renders child routes on success', () => {
    vi.spyOn(useExtensionsModule, 'useExtensions').mockReturnValue({
      extensions: fixtureExtensions,
      loading: false,
      error: null,
    })

    renderApp()

    // App should render the child outlet content
    expect(screen.getByText('child route')).toBeInTheDocument()
  })
})

describe('App — username state', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(useExtensionsModule, 'useExtensions').mockReturnValue({
      extensions: fixtureExtensions,
      loading: false,
      error: null,
    })
    localStorage.clear()
  })

  it('reads username from localStorage on mount', () => {
    localStorage.setItem('vscode-ext-analytics-username', 'stored-user')

    let capturedValue: { username: string | null } | undefined
    renderAppWithTestAction((value) => {
      capturedValue = value
    })

    expect(capturedValue?.username).toBe('stored-user')
  })

  it('setUsername persists to localStorage and updates state', () => {
    let capturedValue!: { username: string | null; setUsername: (n: string) => void; clearUsername: () => void }
    renderAppWithTestAction((value) => {
      capturedValue = value
    })

    act(() => {
      capturedValue.setUsername('new-user')
    })

    expect(capturedValue.username).toBe('new-user')
    expect(localStorage.getItem('vscode-ext-analytics-username')).toBe('new-user')
  })

  it('clearUsername removes from localStorage and sets null', () => {
    localStorage.setItem('vscode-ext-analytics-username', 'some-user')

    let capturedValue!: { username: string | null; clearUsername: () => void }
    renderAppWithTestAction((value) => {
      capturedValue = value
    })

    expect(capturedValue.username).toBe('some-user')

    act(() => {
      capturedValue.clearUsername()
    })

    expect(capturedValue.username).toBeNull()
    expect(localStorage.getItem('vscode-ext-analytics-username')).toBeNull()
  })

  it('reads username from URL search param when nothing stored', () => {
    // No stored username, but URL has ?username=urluser
    let capturedValue: { username: string | null } | undefined
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [{ index: true, element: <TestConsumer onMount={(v: { username: string | null }) => { capturedValue = v }} /> }],
        },
      ],
      { initialEntries: ['/?username=urluser'] },
    )
    render(<RouterProvider router={router} />)

    expect(capturedValue?.username).toBe('urluser')
    expect(localStorage.getItem('vscode-ext-analytics-username')).toBe('urluser')
  })
})
