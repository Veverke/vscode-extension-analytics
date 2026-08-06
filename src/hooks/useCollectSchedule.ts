import { useState, useEffect } from 'react'
import type { ExtensionEntry, DataPoint } from '../types/schema'
import { loadData, extensionDataPath } from '../utils/dataLoader'

/** Milliseconds in 6 hours — collect workflow cron schedule (every 6 hours). */
export const COLLECT_INTERVAL_MS = 6 * 60 * 60 * 1000
const COLLECT_SCHEDULE_LABEL = 'Schedule runs every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)'

export interface CollectSchedule {
  /** ISO timestamp of the most recent data collection run (max data point `ts`). */
  lastRun: string | null
  /** ISO timestamp of the next expected collection run (next 6-hour cron boundary). */
  nextRun: string | null
  loading: boolean
  error: string | null
}

/** Returns the next UTC cron boundary (00:00 / 06:00 / 12:00 / 18:00) strictly after `from`. */
export function nextScheduledRun(from: Date): Date {
  const boundary = Math.ceil(from.getTime() / COLLECT_INTERVAL_MS) * COLLECT_INTERVAL_MS
  const next = new Date(boundary)
  // If `from` is exactly on a boundary, the next run is one interval later.
  return next.getTime() === from.getTime()
    ? new Date(boundary + COLLECT_INTERVAL_MS)
    : next
}

/**
 * Determines when the last data collection job ran and when the next one is
 * expected. "Last run" is derived from the most recent timestamp across all
 * extensions' time-series data. "Next run" is the next 6-hour cron boundary
 * (00:00 / 06:00 / 12:00 / 18:00 UTC) after the last run.
 */
export function useCollectSchedule(extensions: ExtensionEntry[]): CollectSchedule {
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [nextRun, setNextRun] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Derive a stable dependency key so new array references don't retrigger loads.
  const extensionsKey = extensions.length === 0
    ? ''
    : extensions.map((e) => e.id).join(',')

  useEffect(() => {
    if (extensions.length === 0) {
      setLastRun(null)
      setNextRun(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    Promise.allSettled(
      extensions.map(async (ext): Promise<string> => {
        const raw = await loadData<unknown>(extensionDataPath(ext.id))
        const data = Array.isArray(raw) ? (raw as DataPoint[]) : []
        // Data files are sorted chronologically — the last element is the newest.
        return data.length > 0 ? data[data.length - 1].ts : ''
      })
    ).then((results) => {
      if (cancelled) return

      const rejected = results.filter((r) => r.status === 'rejected')
      const timestamps = results
        .filter(
          (r): r is PromiseFulfilledResult<string> =>
            r.status === 'fulfilled' && r.value.length > 0
        )
        .map((r) => r.value)

      // If all fetches failed, surface an error.
      if (rejected.length > 0 && rejected.length === results.length) {
        setError(rejected[0].reason instanceof Error ? rejected[0].reason.message : 'Failed to load collection schedule')
        setLastRun(null)
        setNextRun(null)
        setLoading(false)
        return
      }

      if (timestamps.length === 0) {
        setLastRun(null)
        setNextRun(null)
        setLoading(false)
        return
      }

      const latest = timestamps.reduce((max, ts) => (ts > max ? ts : max))
      setLastRun(latest)
      // The next run is the next 6-hour cron boundary from the current time,
      // regardless of when the last run actually happened.
      setNextRun(nextScheduledRun(new Date()).toISOString())
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [extensionsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { lastRun, nextRun, loading, error }
}

/** Formats an ISO timestamp as a compact UTC string, e.g. "Aug 5, 06:54 UTC". */
export function formatCollectTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(iso)) + ' UTC'
}

export { COLLECT_SCHEDULE_LABEL }