import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchGitHubStats } from '../github-stats'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('fetchGitHubStats', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches repo info and returns GitHubSnapshot', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 100,
          forks_count: 20,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { author: { login: 'testowner' }, total: 50 },
          { author: { login: 'contributor1' }, total: 30 },
          { author: { login: 'contributor2' }, total: 20 },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { user: { login: 'contributor1' } },
          { user: { login: 'testowner' } },
          { user: { login: 'contributor2' }, pull_request: {} },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { user: { login: 'contributor1' } },
          { user: { login: 'testowner' } },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { number: 1 },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { user: { login: 'contributor1' } },
          { user: { login: 'testowner' } },
        ],
      })

    const result = await fetchGitHubStats('testowner/test-repo', 'test-token')

    expect(result).toEqual({
      stars: 100,
      forks: 20,
      contributions: 53, // 30 + 20 (commits) + 1 (issue) + 1 (PR) + 1 (review) = 53
    })
  })

  it('throws when repo fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    await expect(fetchGitHubStats('testowner/test-repo', 'test-token')).rejects.toThrow(
      '[github-stats] Failed to fetch repo testowner/test-repo: 404'
    )
  })

  it('handles 202 from contributor stats gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 202,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

    const result = await fetchGitHubStats('testowner/test-repo', 'test-token')
    expect(result.contributions).toBe(0)
  })

  it('handles non-array contributor stats', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ not: 'an array' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

    const result = await fetchGitHubStats('testowner/test-repo', 'test-token')
    expect(result.contributions).toBe(0)
  })

  it('handles empty issues response', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

    const result = await fetchGitHubStats('testowner/test-repo', 'test-token')
    expect(result.contributions).toBe(0)
  })

  it('handles fetch failure for issues', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    await expect(fetchGitHubStats('testowner/test-repo', 'test-token')).rejects.toThrow(
      '[github-stats] Failed to fetch issues for testowner/test-repo: 500'
    )
  })

  it('handles fetch failure for PRs', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    await expect(fetchGitHubStats('testowner/test-repo', 'test-token')).rejects.toThrow(
      '[github-stats] Failed to fetch PRs for testowner/test-repo: 500'
    )
  })

  it('handles pagination for issues', async () => {
    const issuesPage1 = Array.from({ length: 100 }, (_, i) => ({
      user: { login: `contributor${i}` },
    }))
    const issuesPage2 = [
      { user: { login: 'contributor100' } },
    ]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => issuesPage1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => issuesPage2,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

    const result = await fetchGitHubStats('testowner/test-repo', 'test-token')
    expect(result.contributions).toBe(101)
  })

  it('handles pagination for PRs and reviews with proper fetch error handling', async () => {
    // Test that individual fetch failures in reviews are handled gracefully
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { number: 1, user: { login: 'testowner' } },
        ],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
        text: async () => 'Forbidden',
      })

    const result = await fetchGitHubStats('testowner/test-repo', 'test-token')
    expect(result.stars).toBe(50)
    expect(result.forks).toBe(10)
    expect(result.contributions).toBe(0)
  })

  it('handles missing owner in repo data by fetching it separately', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ owner: { login: 'testowner' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

    const result = await fetchGitHubStats('testowner/test-repo', 'test-token')
    expect(result.stars).toBe(50)
    expect(result.forks).toBe(10)
  })

  it('handles empty token by not including Authorization header', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 0,
          forks_count: 0,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValue({ ok: true, json: async () => [] })

    const result = await fetchGitHubStats('testowner/test-repo', '')
    expect(result.stars).toBe(0)
    expect(result.forks).toBe(0)
  })

  it('throws when fetchRepoOwner fails (missing owner, then repo fetch fails)', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          // no owner field
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
      })

    await expect(fetchGitHubStats('testowner/test-repo', 'test-token')).rejects.toThrow(
      '[github-stats] Failed to fetch repo info for testowner/test-repo: 403'
    )
  })

  it('throws when contributor stats returns non-ok non-202 status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    await expect(fetchGitHubStats('testowner/test-repo', 'test-token')).rejects.toThrow(
      '[github-stats] Failed to fetch contributor stats for testowner/test-repo: 500'
    )
  })

  it('handles empty PR response gracefully (no PRs)', async () => {
    // fetchNonOwnerReviews also calls the PRs API, so we need mocks for both
    // fetchNonOwnerPRs and fetchNonOwnerReviews
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'testowner' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      // fetchNonOwnerReviews also fetches PRs
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

    const result = await fetchGitHubStats('testowner/test-repo', 'test-token')
    expect(result.stars).toBe(50)
    expect(result.forks).toBe(10)
    expect(result.contributions).toBe(0)
  })
})