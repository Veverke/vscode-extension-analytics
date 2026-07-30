// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import DiscoverResults from '../../src/routes/DiscoverResults'
import { ExtensionsContext } from '../../src/contexts/ExtensionsContext'
import { UserContext } from '../../src/contexts/UserContext'
import type { ExtensionEntry } from '../../src/types/schema'
import * as useAutoDiscoverModule from '../../src/hooks/useAutoDiscover'
import * as useCreateTrackingIssueModule from '../../src/hooks/useCreateTrackingIssue'

vi.mock('../../src/components/cards/UntrackedCard', () => ({
  default: ({ extension }: { extension: { extensionId: string; displayName?: string; name?: string } }) => (
    <div data-testid="untracked-card">{extension.displayName || extension.name || extension.extensionId}</div>
  ),
}))

vi.mock('../../src/components/cards/SkeletonCard', () => ({
  default: () => <div data-testid="skeleton-card" />,
}))

function createMockDiscovery(
  overrides: Partial<ReturnType<typeof useAutoDiscoverModule.useAutoDiscover>> = {},
) {
  return {
    discover: vi.fn().mockResolvedValue(undefined),
    results: [],
    loading: false,
    error: null,
    rateLimitRemaining: null,
    ...overrides,
  }
}

function renderDiscoverResults(
  usernameParam: string,
  sessionUsername: string | null = null,
  tracked: ExtensionEntry[] = [],
) {
  vi.spyOn(useCreateTrackingIssueModule, 'useCreateTrackingIssue').mockReturnValue({
    openIssue: vi.fn(),
  })

  const router = createMemoryRouter(
    [
      {
        path: '/discover/:username',
        element: <DiscoverResults />,
      },
    ],
    { initialEntries: [`/discover/${usernameParam}`] },
  )

  return render(
    <ExtensionsContext.Provider value={tracked}>
      <UserContext.Provider
        value={{
          username: sessionUsername,
          setUsername: vi.fn(),
          clearUsername: vi.fn(),
        }}
      >
        <RouterProvider router={router} />
      </UserContext.Provider>
    </ExtensionsContext.Provider>,
  )
}

describe('DiscoverResults', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state with skeleton cards', () => {
    vi.spyOn(useAutoDiscoverModule, 'useAutoDiscover').mockReturnValue(
      createMockDiscovery({ loading: true }),
    )

    renderDiscoverResults('testuser')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading skeleton')).toBeInTheDocument()
  })

  it('shows error state with retry button', () => {
    vi.spyOn(useAutoDiscoverModule, 'useAutoDiscover').mockReturnValue(
      createMockDiscovery({ error: 'API rate limit exceeded' }),
    )

    renderDiscoverResults('testuser')
    expect(screen.getByRole('alert')).toHaveTextContent('API rate limit exceeded')
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('shows empty state when no extensions found', () => {
    vi.spyOn(useAutoDiscoverModule, 'useAutoDiscover').mockReturnValue(
      createMockDiscovery(),
    )

    renderDiscoverResults('testuser')
    expect(screen.getByText(/No VS Code extensions found/)).toBeInTheDocument()
    expect(screen.getByText(/Try another username/)).toBeInTheDocument()
  })

  it('shows username mismatch notice when session differs', () => {
    vi.spyOn(useAutoDiscoverModule, 'useAutoDiscover').mockReturnValue(
      createMockDiscovery({
        results: [
          {
            extensionId: 'Pub.ext',
            namespace: 'Pub',
            name: 'ext',
            displayName: 'Ext',
            githubRepo: 'user/ext',
          },
        ],
      }),
    )

    renderDiscoverResults('otheruser', 'sessionuser')
    expect(screen.getByRole('note')).toHaveTextContent(
      /Showing results for otheruser/,
    )
    expect(screen.getByRole('note')).toHaveTextContent(/sessionuser/)
  })

  it('renders discovered extension cards', () => {
    vi.spyOn(useAutoDiscoverModule, 'useAutoDiscover').mockReturnValue(
      createMockDiscovery({
        results: [
          {
            extensionId: 'Pub.my-ext',
            namespace: 'Pub',
            name: 'my-ext',
            displayName: 'My Extension',
            githubRepo: 'user/my-ext',
          },
        ],
      }),
    )

    renderDiscoverResults('testuser')
    expect(screen.getByText('My Extension')).toBeInTheDocument()
  })

  it('retry button calls discover with the username', () => {
    const mockDiscover = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(useAutoDiscoverModule, 'useAutoDiscover').mockReturnValue(
      createMockDiscovery({ error: 'Something went wrong', discover: mockDiscover }),
    )

    renderDiscoverResults('testuser')
    const retryButton = screen.getByText('Retry')
    retryButton.click()
    expect(mockDiscover).toHaveBeenCalledWith('testuser')
  })
})
