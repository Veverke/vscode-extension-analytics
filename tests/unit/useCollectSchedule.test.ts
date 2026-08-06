import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCollectSchedule, nextScheduledRun, formatCollectTime, COLLECT_INTERVAL_MS } from '../../src/hooks/useCollectSchedule'
import type { ExtensionEntry } from '../../src/types/schema'

const testExtensions: ExtensionEntry[] = [
  {
    id: 'Veverke.chatwizard',
    namespace: 'Veverke',
    name: 'chatwizard',
    displayName: 'Chat Wizard',
    githubRepo: 'Veverke/ChatWizard',
    trackedSince: '2026-05-28T11:04:43.476Z',
  },
]

describe('nextScheduledRun', () => {
  it('returns the next 6-hour boundary after the given time', () => {
    // 2026-08-05T02:00:00Z → next boundary is 06:00
    const from = new Date('2026-08-05T02:00:00Z')
    const next = nextScheduledRun(from)
    expect(next.toISOString()).toBe('2026-08-05T06:00:00.000Z')
  })

  it('returns the next boundary when exactly on a boundary', () => {
    // 2026-08-05T06:00:00Z → next boundary is 12:00
    const from = new Date('2026-08-05T06:00:00Z')
    const next = nextScheduledRun(from)
    expect(next.toISOString()).toBe('2026-08-05T12:00:00.000Z')
  })

  it('handles times after 18:00 by rolling to next day 00:00', () => {
    // 2026-08-05T20:00:00Z → next boundary is 2026-08-06T00:00:00Z
    const from = new Date('2026-08-05T20:00:00Z')
    const next = nextScheduledRun(from)
    expect(next.toISOString()).toBe('2026-08-06T00:00:00.000Z')
  })

  it('returns a time exactly 6 hours later when from is on a boundary', () => {
    const from = new Date('2026-08-05T00:00:00Z')
    const next = nextScheduledRun(from)
    expect(next.getTime() - from.getTime()).toBe(COLLECT_INTERVAL_MS)
  })
})

describe('formatCollectTime', () => {
  it('formats an ISO timestamp as a compact UTC string', () => {
    const result = formatCollectTime('2026-08-05T06:54:06.438Z')
    expect(result).toContain('UTC')
    expect(result).toContain('Aug')
  })

  it('returns an em dash for null', () => {
    expect(formatCollectTime(null)).toBe('—')
  })
})

describe('useCollectSchedule', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('handles empty extensions list', async () => {
    const { result, unmount } = renderHook(() => useCollectSchedule([]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lastRun).toBeNull()
    expect(result.current.nextRun).toBeNull()
    expect(result.current.error).toBeNull()
    unmount()
  })

  it('loads the latest data point timestamp as lastRun and computes nextRun', async () => {
    const latestTs = '2026-08-05T06:54:06.438Z'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ ts: '2026-08-05T00:29:39.253Z' }, { ts: latestTs }]),
      }),
    )

    const { result } = renderHook(() => useCollectSchedule(testExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.lastRun).toBe(latestTs)
    expect(result.current.nextRun).not.toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('picks the most recent timestamp across multiple extensions', async () => {
    const ext1 = { ...testExtensions[0] }
    const ext2: ExtensionEntry = {
      id: 'Veverke.copilot-reviewer-assistant',
      namespace: 'Veverke',
      name: 'copilot-reviewer-assistant',
      displayName: 'Copilot Reviewer Assistant',
      githubRepo: 'Veverke/CopilotReviewerAssistant',
      trackedSince: '2026-05-28T11:04:43.483Z',
    }

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ts: '2026-08-05T00:29:39.253Z' }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ts: '2026-08-05T12:00:00.000Z' }]),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCollectSchedule([ext1, ext2]))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.lastRun).toBe('2026-08-05T12:00:00.000Z')
  })

  it('handles fetch failure gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const { result } = renderHook(() => useCollectSchedule(testExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.lastRun).toBeNull()
    expect(result.current.nextRun).toBeNull()
    expect(result.current.error).toBe('Network error')
  })

  it('handles non-Error rejection with fallback message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string rejection'))

    const { result } = renderHook(() => useCollectSchedule(testExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to load collection schedule')
  })

  it('handles empty data arrays — no timestamps found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    )

    const { result } = renderHook(() => useCollectSchedule(testExtensions))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.lastRun).toBeNull()
    expect(result.current.nextRun).toBeNull()
    expect(result.current.error).toBeNull()
  })
})