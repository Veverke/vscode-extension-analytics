import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useExtensions } from '../../src/hooks/useExtensions'
import fixtureExtensions from '../../fixtures/data/extensions.json'

describe('useExtensions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns extensions array on successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fixtureExtensions),
      }),
    )

    const { result } = renderHook(() => useExtensions())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.extensions).toHaveLength(fixtureExtensions.length)
    expect(result.current.extensions.find(e => e.id === 'Veverke.chatwizard')).toBeDefined()
  })

  it('sets error and empty extensions on fetch rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network failure')),
    )

    const { result } = renderHook(() => useExtensions())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Network failure')
    expect(result.current.extensions).toEqual([])
  })

  it('sets error and empty extensions when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve(null),
      }),
    )

    const { result } = renderHook(() => useExtensions())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('HTTP 404')
    expect(result.current.extensions).toEqual([])
  })

  it('sets error when JSON is not an array (malformed)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve('not an array'),
      }),
    )

    const { result } = renderHook(() => useExtensions())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Invalid extensions data: expected an array')
    expect(result.current.extensions).toEqual([])
  })

  it('does not update state after unmount (then path)', async () => {
    let resolveFetch!: (res: object) => void
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(resolve => { resolveFetch = resolve })),
    )

    const { result, unmount } = renderHook(() => useExtensions())
    // Unmount before fetch resolves — triggers the cleanup (cancelled = true)
    unmount()

    await act(async () => {
      // Now resolve the fetch — the .then() chain will hit the cancelled guard
      resolveFetch({ ok: true, json: () => Promise.resolve(fixtureExtensions) })
      // Flush all pending microtasks
      await new Promise<void>(r => setTimeout(r, 0))
    })

    // State must remain at initial values because cancelled guard fired
    expect(result.current.loading).toBe(true)
    expect(result.current.extensions).toEqual([])
  })

  it('does not update state after unmount (catch path)', async () => {
    let rejectFn!: (err: Error) => void
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise<never>((_, reject) => { rejectFn = reject })),
    )

    const { result, unmount } = renderHook(() => useExtensions())
    unmount()

    await act(async () => {
      rejectFn(new Error('Network failure'))
      await Promise.resolve()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('non-Error thrown — uses fallback message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string error'))

    const { result } = renderHook(() => useExtensions())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to load extensions')
    expect(result.current.extensions).toEqual([])
  })

  describe('username filtering', () => {
    const mixedFixture = [
      { id: 'user1.ext-a', namespace: 'user1', name: 'ext-a', displayName: 'Ext A', githubRepo: 'user1/ext-a', trackedSince: '2026-01-01T00:00:00.000Z', requestedBy: 'user1' },
      { id: 'user1.ext-b', namespace: 'user1', name: 'ext-b', displayName: 'Ext B', githubRepo: 'user1/ext-b', trackedSince: '2026-01-01T00:00:00.000Z', requestedBy: 'user1' },
      { id: 'user2.ext-c', namespace: 'user2', name: 'ext-c', displayName: 'Ext C', githubRepo: 'user2/ext-c', trackedSince: '2026-01-01T00:00:00.000Z', requestedBy: 'user2' },
      { id: 'legacy.ext', namespace: 'legacy', name: 'ext', displayName: 'Legacy Ext', githubRepo: 'legacy/ext', trackedSince: '2026-01-01T00:00:00.000Z' },
    ]

    it('returns all extensions when no username is provided', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mixedFixture),
        }),
      )

      const { result } = renderHook(() => useExtensions())

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.extensions).toHaveLength(4)
    })

    it('filters to only matching user and legacy entries', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mixedFixture),
        }),
      )

      const { result } = renderHook(() => useExtensions('user1'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.extensions).toHaveLength(3)
      const ids = result.current.extensions.map(e => e.id)
      expect(ids).toContain('user1.ext-a')
      expect(ids).toContain('user1.ext-b')
      expect(ids).toContain('legacy.ext') // legacy entries without requestedBy pass through
      expect(ids).not.toContain('user2.ext-c')
    })

    it('filters to only user2 extensions and legacy', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mixedFixture),
        }),
      )

      const { result } = renderHook(() => useExtensions('user2'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.extensions).toHaveLength(2)
      const ids = result.current.extensions.map(e => e.id)
      expect(ids).toContain('user2.ext-c')
      expect(ids).toContain('legacy.ext')
      expect(ids).not.toContain('user1.ext-a')
    })

    it('re-fetches when username changes', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mixedFixture),
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result, rerender } = renderHook(
        (username?: string) => useExtensions(username),
        { initialProps: undefined },
      )

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.current.extensions).toHaveLength(4)

      // Change username — triggers re-fetch and re-filter
      rerender('user1')

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(result.current.extensions).toHaveLength(3)
      })
      const ids = result.current.extensions.map(e => e.id)
      expect(ids).toContain('user1.ext-a')
      expect(ids).toContain('user1.ext-b')
      expect(ids).toContain('legacy.ext')
      expect(ids).not.toContain('user2.ext-c')
    })
  })
})
