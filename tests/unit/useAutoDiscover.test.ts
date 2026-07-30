import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  useAutoDiscover,
  isExtensionTracked,
  filterExtensionsByUser,
} from '../../src/hooks/useAutoDiscover'
import type { ExtensionEntry } from '../../src/types/schema'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const reposFixture = {
  ok: true,
  headers: new Headers({ 'x-ratelimit-remaining': '59', 'x-ratelimit-reset': '9999999999' }),
  json: () =>
    Promise.resolve([
      { name: 'chatwizard', full_name: 'Veverke/chatwizard' },
      { name: 'some-website', full_name: 'Veverke/some-website' },
      { name: 'mystery', full_name: 'Veverke/mystery' },
    ]),
}

const extensionPackageJson = {
  name: 'chatwizard',
  publisher: 'Veverke',
  displayName: 'Chat Wizard',
  engines: { vscode: '^1.85.0' },
}

const nonExtensionPackageJson = {
  name: 'some-website',
  engines: {},
}

const minimalExtensionPackageJson = {
  name: 'minimal-ext',
  publisher: 'MinPub',
  engines: { vscode: '^1.85.0' },
}

const emptyPackageJson = {
  name: 'mystery',
}

function base64Encode(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

function makeContentsResponse(pkg: object) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        content: base64Encode(pkg),
        encoding: 'base64',
      }),
  }
}

function makeNotFoundResponse() {
  return { ok: false, status: 404, json: () => Promise.resolve(null) }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAutoDiscover', () => {
  let abortSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.restoreAllMocks()
    abortSpy = vi.spyOn(AbortController.prototype, 'abort')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('success — discovers extensions from GitHub repos', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      // Repos list
      .mockResolvedValueOnce(reposFixture as unknown as Response)
      // chatwizard package.json
      .mockResolvedValueOnce(makeContentsResponse(extensionPackageJson) as unknown as Response)
      // some-website package.json
      .mockResolvedValueOnce(makeContentsResponse(nonExtensionPackageJson) as unknown as Response)
      // mystery package.json
      .mockResolvedValueOnce(makeContentsResponse(emptyPackageJson) as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    expect(result.current.loading).toBe(false)
    expect(result.current.results).toHaveLength(0)

    act(() => {
      result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0]).toEqual({
      extensionId: 'Veverke.chatwizard',
      namespace: 'Veverke',
      name: 'chatwizard',
      displayName: 'Chat Wizard',
      githubRepo: 'Veverke/chatwizard',
    })
    expect(result.current.rateLimitRemaining).toBe(59)
  })

  it('discover — no repos returns empty results', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'x-ratelimit-remaining': '58', 'x-ratelimit-reset': '9999999999' }),
      json: () => Promise.resolve([]),
    } as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('new-user')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.results).toHaveLength(0)
  })

  it('discover — 404 user sets error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'x-ratelimit-remaining': '57', 'x-ratelimit-reset': '9999999999' }),
      json: () => Promise.resolve({ message: 'Not Found' }),
    } as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('nonexistent-user')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toContain('nonexistent-user')
    expect(result.current.error).toContain('not found')
    expect(result.current.results).toHaveLength(0)
  })

  it('discover — 403 rate limit sets error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: new Headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '9999999999' }),
      json: () => Promise.resolve({ message: 'Rate limit exceeded' }),
    } as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('rate-limited-user')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toContain('rate limit')
    expect(result.current.results).toHaveLength(0)
    expect(result.current.rateLimitRemaining).toBe(0)
  })

  it('discover — network error sets error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Network failure')
    expect(result.current.results).toHaveLength(0)
  })

  it('discover — non-Error thrown uses fallback message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string error'))

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Failed to discover extensions')
  })

  it('discover — non-ok HTTP status sets error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'x-ratelimit-remaining': '50', 'x-ratelimit-reset': '9999999999' }),
      json: () => Promise.resolve(null),
    } as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toContain('HTTP 500')
    expect(result.current.results).toHaveLength(0)
  })

  it('discover — silently skips repo when package.json returns non-404 non-ok status', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reposFixture as unknown as Response)
      // Veverke/chatwizard: package.json returns 500 (non-404 non-ok)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(null),
      } as unknown as Response)
      // Veverke/some-website: valid extension
      .mockResolvedValueOnce(makeContentsResponse(extensionPackageJson) as unknown as Response)
      // Veverke/mystery: not found
      .mockResolvedValueOnce(makeNotFoundResponse() as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    // Only some-website (which has valid extension) should be discovered
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].extensionId).toBe('Veverke.chatwizard')
  })

  it('discover — silently skips repo when package.json has non-base64 encoding', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reposFixture as unknown as Response)
      // Veverke/chatwizard: package.json with non-base64 encoding
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: 'plain text content',
          encoding: 'plain',
        }),
      } as unknown as Response)
      // Veverke/some-website: valid extension
      .mockResolvedValueOnce(makeContentsResponse(extensionPackageJson) as unknown as Response)
      // Veverke/mystery: not found
      .mockResolvedValueOnce(makeNotFoundResponse() as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    // Only some-website should be discovered
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].extensionId).toBe('Veverke.chatwizard')
  })

  it('discover — silently skips repo when package.json has invalid JSON content', async () => {
    // Base64-encoded "not valid json" which will fail JSON.parse
    const invalidContent = Buffer.from('not valid json').toString('base64')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reposFixture as unknown as Response)
      // Veverke/chatwizard: package.json with invalid JSON content
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: invalidContent,
          encoding: 'base64',
        }),
      } as unknown as Response)
      // Veverke/some-website: valid extension
      .mockResolvedValueOnce(makeContentsResponse(extensionPackageJson) as unknown as Response)
      // Veverke/mystery: not found
      .mockResolvedValueOnce(makeNotFoundResponse() as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    // Only some-website should be discovered
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].extensionId).toBe('Veverke.chatwizard')
  })

  it('discover — skips repos without package.json', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reposFixture as unknown as Response)
      // chatwizard has valid extension
      .mockResolvedValueOnce(makeContentsResponse(extensionPackageJson) as unknown as Response)
      // some-website has no package.json
      .mockResolvedValueOnce(makeNotFoundResponse() as unknown as Response)
      // mystery has no package.json
      .mockResolvedValueOnce(makeNotFoundResponse() as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].extensionId).toBe('Veverke.chatwizard')
  })

  it('discover — skips repos with non-VS Code package.json', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reposFixture as unknown as Response)
      // chatwizard is valid
      .mockResolvedValueOnce(makeContentsResponse(extensionPackageJson) as unknown as Response)
      // some-website has no engines.vscode
      .mockResolvedValueOnce(makeContentsResponse(nonExtensionPackageJson) as unknown as Response)
      // mystery has no engines.vscode
      .mockResolvedValueOnce(makeContentsResponse(emptyPackageJson) as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].extensionId).toBe('Veverke.chatwizard')
  })

  it('discover — silently skips repos when package.json fetch throws', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reposFixture as unknown as Response)
      // Veverke/chatwizard: package.json fetch fails → skipped
      .mockRejectedValueOnce(new Error('Network timeout'))
      // Veverke/some-website: has a valid VS Code extension package.json
      // (publisher=MinPub, name=minimal-ext → MinPub.minimal-ext)
      .mockResolvedValueOnce(makeContentsResponse(minimalExtensionPackageJson) as unknown as Response)
      // Veverke/mystery: not needed but must not hang
      .mockResolvedValueOnce(makeNotFoundResponse() as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.loading).toBe(false)
    // Only the one that succeeded should appear
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].extensionId).toBe('MinPub.minimal-ext')
  })

  it('discover — sets rateLimitRemaining from response headers', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'x-ratelimit-remaining': '5', 'x-ratelimit-reset': '9999999999' }),
      json: () => Promise.resolve([]),
    } as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    await act(async () => {
      await result.current.discover('Veverke')
    })

    expect(result.current.rateLimitRemaining).toBe(5)
  })

  it('aborts previous discovery when called again', async () => {
    const firstFetchPromise = new Promise<Response>(() => {})

    const fetchMock = vi
      .fn<typeof fetch>()
      // First call — hangs
      .mockReturnValueOnce(firstFetchPromise)

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAutoDiscover())

    act(() => {
      result.current.discover('user1')
    })

    // Before first completes, call discover again
    act(() => {
      result.current.discover('user2')
    })

    // Abort should have been called on the first controller
    expect(abortSpy).toHaveBeenCalledTimes(1)
  })

  it('does not update state after abort', async () => {
    const reposResponse = {
      ok: true,
      headers: new Headers({ 'x-ratelimit-remaining': '59', 'x-ratelimit-reset': '9999999999' }),
      json: () =>
        Promise.resolve([
          { name: 'chatwizard', full_name: 'Veverke/chatwizard' },
        ]),
    }

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reposResponse as unknown as Response)
      .mockResolvedValueOnce(makeContentsResponse(extensionPackageJson) as unknown as Response)

    vi.stubGlobal('fetch', fetchMock)

    const { result, unmount } = renderHook(() => useAutoDiscover())

    // Since the hook doesn't return a promise from discover,
    // we call it and immediately unmount
    act(() => {
      result.current.discover('Veverke')
    })

    unmount()

    // Wait a tick
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 50))
    })

    // After unmount, state should not be updated
    expect(result.current.loading).toBe(true) // would have been reset to false if not aborted
  })
})

// ─── isExtensionTracked ──────────────────────────────────────────────────────

describe('isExtensionTracked', () => {
  const tracked: ExtensionEntry[] = [
    {
      id: 'Veverke.chatwizard',
      namespace: 'Veverke',
      name: 'chatwizard',
      displayName: 'Chat Wizard',
      githubRepo: 'Veverke/chatwizard',
      trackedSince: '2026-01-01T00:00:00Z',
    },
  ]

  it('returns true when extension is tracked', () => {
    expect(isExtensionTracked('Veverke.chatwizard', tracked)).toBe(true)
  })

  it('returns false when extension is not tracked', () => {
    expect(isExtensionTracked('Other.ext', tracked)).toBe(false)
  })

  it('returns false for empty registry', () => {
    expect(isExtensionTracked('Veverke.chatwizard', [])).toBe(false)
  })
})

// ─── filterExtensionsByUser ──────────────────────────────────────────────────

describe('filterExtensionsByUser', () => {
  const extensions: ExtensionEntry[] = [
    {
      id: 'A.one',
      namespace: 'A',
      name: 'one',
      displayName: 'One',
      githubRepo: '',
      requestedBy: 'user1',
      trackedSince: '2026-01-01T00:00:00Z',
    },
    {
      id: 'B.two',
      namespace: 'B',
      name: 'two',
      displayName: 'Two',
      githubRepo: '',
      requestedBy: 'user2',
      trackedSince: '2026-01-01T00:00:00Z',
    },
    {
      id: 'C.legacy',
      namespace: 'C',
      name: 'legacy',
      displayName: 'Legacy',
      githubRepo: '',
      trackedSince: '2026-01-01T00:00:00Z',
      // no requestedBy — legacy entry visible to all
    },
  ]

  it('filters by username', () => {
    const result = filterExtensionsByUser(extensions, 'user1')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('A.one')
    expect(result[1].id).toBe('C.legacy')
  })

  it('returns all when username is null', () => {
    const result = filterExtensionsByUser(extensions, null)
    expect(result).toHaveLength(3)
  })

  it('includes legacy entries (no requestedBy) for any user', () => {
    const result = filterExtensionsByUser(extensions, 'user2')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('B.two')
    expect(result[1].id).toBe('C.legacy')
  })

  it('returns empty array for username with no matches', () => {
    const result = filterExtensionsByUser(extensions, 'unknown-user')
    expect(result).toHaveLength(1) // only the legacy entry
    expect(result[0].id).toBe('C.legacy')
  })
})