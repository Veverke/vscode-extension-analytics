import { useState, useCallback, useEffect } from 'react'
import { useCompetitor } from '../../hooks/useCompetitor'
import CompetitorComparisonCard from './CompetitorComparisonCard'

interface Props {
  extensionId: string
  yourInstalls: number
  yourRating: number | undefined
  yourRatingCount: number
  yourGithubStars: number | null
  trackedSince?: string
}

interface CompetitorInfo {
  id: string
  displayName: string
  installs: number
  rating: number | undefined
  ratingCount: number
  sinceDate?: string
  githubStars: number | null
  githubRepo: string | null
}

const STORAGE_PREFIX = 'competitors:'
const VISIBILITY_PREFIX = 'competitors-vis:'

function getStoredIds(extensionId: string): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + extensionId)
    return stored ? (JSON.parse(stored) as string[]) : []
  } catch {
    return []
  }
}

function storeIds(extensionId: string, ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + extensionId, JSON.stringify(ids))
  } catch {
    // localStorage may be full
  }
}

function getStoredVisibility(extensionId: string): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(VISIBILITY_PREFIX + extensionId)
    return stored ? (JSON.parse(stored) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function storeVisibility(extensionId: string, vis: Record<string, boolean>): void {
  try {
    localStorage.setItem(VISIBILITY_PREFIX + extensionId, JSON.stringify(vis))
  } catch {
    // localStorage may be full
  }
}

function isValidExtensionId(id: string): boolean {
  return /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(id)
}

function formatDiff(yours: number, theirs: number): { label: string; className: string } {
  if (yours === theirs) return { label: '0', className: 'competitor-value--gray' }
  const diff = theirs - yours
  const pct = yours !== 0 ? ((diff / yours) * 100).toFixed(1) : '∞'
  const sign = diff > 0 ? '+' : ''
  return {
    label: `${sign}${formatNum(diff)} (${sign}${pct}%)`,
    className: diff > 0 ? 'competitor-value--red' : 'competitor-value--green',
  }
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export default function CompetitorList({ extensionId, yourInstalls, yourRating, yourRatingCount, yourGithubStars, trackedSince }: Props) {
  const [competitorIds, setCompetitorIds] = useState<string[]>(() => getStoredIds(extensionId))
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => getStoredVisibility(extensionId))
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  // Increment to force re-fetch all competitors on mount
  const [refreshKey, setRefreshKey] = useState(0)

  // Persist to localStorage whenever list changes
  useEffect(() => {
    storeIds(extensionId, competitorIds)
  }, [extensionId, competitorIds])

  // Persist visibility whenever it changes
  useEffect(() => {
    storeVisibility(extensionId, visibility)
  }, [extensionId, visibility])

  // Auto-refetch on mount by incrementing refreshKey
  useEffect(() => {
    setRefreshKey((k) => k + 1)
  }, [extensionId])

  const addCompetitor = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    if (!isValidExtensionId(trimmed)) {
      setInputError('Invalid format. Use <namespace>.<name> (e.g. ms-python.python)')
      return
    }

    if (competitorIds.includes(trimmed)) {
      setInputError('Competitor already added')
      return
    }

    if (trimmed === extensionId) {
      setInputError('Cannot compare with yourself')
      return
    }

    setCompetitorIds((prev) => [...prev, trimmed])
    setInputValue('')
    setInputError(null)
  }, [inputValue, competitorIds, extensionId])

  const removeCompetitor = useCallback((id: string) => {
    setCompetitorIds((prev) => prev.filter((c) => c !== id))
    setVisibility((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const toggleVisibility = useCallback((id: string) => {
    setVisibility((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }))
  }, [])

  const yourAvgMonthly = trackedSince
    ? Math.round(yourInstalls / Math.max(1, (Date.now() - new Date(trackedSince).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
    : 0

  const visibleCount = competitorIds.filter((id) => visibility[id] ?? true).length
  const hiddenCount = competitorIds.length - visibleCount

  return (
    <div className="competitor-section">
      <div className="competitor-input-row">
        <input
          className="competitor-input"
          type="text"
          placeholder="Add competitor by extension ID (e.g. ms-python.python)"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setInputError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addCompetitor()
          }}
          aria-label="Competitor extension ID"
        />
        <button className="btn btn--sm btn--primary" onClick={addCompetitor}>
          Add
        </button>
      </div>
      {inputError && (
        <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-sm)' }}>
          {inputError}
        </p>
      )}

      {/* Your Extension Header Row */}
      <div className="competitor-your-ext">
        <div className="competitor-your-ext__title">Your Extension</div>
        <table className="competitor-table competitor-table--your-ext">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Installs</td>
              <td>{formatNum(yourInstalls)}</td>
            </tr>
            <tr>
              <td>Avg Installs / Month</td>
              <td>{yourAvgMonthly > 0 ? formatNum(yourAvgMonthly) : 'N/A'}</td>
            </tr>
            <tr>
              <td>Rating</td>
              <td>{yourRating != null && yourRating > 0 ? `⭐ ${yourRating.toFixed(1)}` : 'N/A'}</td>
            </tr>
            <tr>
              <td>Rating Count</td>
              <td>{formatNum(yourRatingCount)}</td>
            </tr>
            <tr>
              <td>GitHub Stars</td>
              <td>{yourGithubStars != null ? formatNum(yourGithubStars) : 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {competitorIds.length > 0 && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          {visibleCount} visible{hiddenCount > 0 ? `, ${hiddenCount} hidden` : ''} &middot; Use checkboxes to filter
        </p>
      )}
      <div className="competitor-list">
        {competitorIds.map((id) => (
          <CompetitorItem
            key={id + ':' + refreshKey}
            id={id}
            yourExtension={{ installs: yourInstalls, rating: yourRating, ratingCount: yourRatingCount, sinceDate: trackedSince, githubStars: yourGithubStars }}
            onRemove={() => removeCompetitor(id)}
            visible={visibility[id] ?? true}
            onToggleVisibility={() => toggleVisibility(id)}
            bypassCache={refreshKey > 0}
          />
        ))}
        {competitorIds.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No competitors added yet. Enter an extension ID above to compare.
          </p>
        )}
      </div>
    </div>
  )
}

function CompetitorItem({
  id,
  yourExtension,
  onRemove,
  visible,
  onToggleVisibility,
  bypassCache,
}: {
  id: string
  yourExtension: { installs: number; rating: number | undefined; ratingCount: number; sinceDate?: string; githubStars: number | null }
  onRemove: () => void
  visible: boolean
  onToggleVisibility: () => void
  bypassCache: boolean
}) {
  const { displayName, data, releases, loading, error, githubStars, githubRepo } = useCompetitor(id, bypassCache)

  if (loading) {
    return (
      <div className="competitor-card">
        <div className="competitor-loading">
          <span className="competitor-spinner" aria-hidden="true" />
          <span>Loading {id}...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="competitor-card">
        <div className="competitor-card__header">
          <div className="competitor-card__title">{id}</div>
          <button className="competitor-card__remove" onClick={onRemove} aria-label={`Remove ${id}`}>
            Remove
          </button>
        </div>
        <div className="competitor-error">{error}</div>
      </div>
    )
  }

  if (data.length === 0) return null

  const lastPoint = data[data.length - 1]

  // Use the first release's publishedAt as the competitor's "since" date
  const firstRelease = releases.length > 0 ? releases[0] : null

  const competitorInfo: CompetitorInfo = {
    id,
    displayName: displayName ?? id,
    installs: lastPoint.marketplace.installs,
    rating: lastPoint.marketplace.averageRating,
    ratingCount: lastPoint.marketplace.ratingCount,
    sinceDate: firstRelease?.publishedAt ?? undefined,
    githubStars,
    githubRepo,
  }

  // Compute diffs: positive means competitor is ahead (bad for us), negative means we're ahead (good for us)
  const diffs = {
    installs: formatDiff(yourExtension.installs, competitorInfo.installs),
    rating: formatDiff(yourExtension.rating ?? 0, competitorInfo.rating ?? 0),
    ratingCount: formatDiff(yourExtension.ratingCount, competitorInfo.ratingCount),
    avgMonthly: formatDiff(yourExtension.installs / Math.max(1, (Date.now() - new Date(yourExtension.sinceDate ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 30.44)), competitorInfo.installs / Math.max(1, (Date.now() - new Date(competitorInfo.sinceDate ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 30.44))),
    githubStars: formatDiff(yourExtension.githubStars ?? 0, competitorInfo.githubStars ?? 0),
  }

  return (
    <CompetitorComparisonCard
      competitor={competitorInfo}
      diffs={diffs}
      onRemove={onRemove}
      onToggleVisibility={onToggleVisibility}
      visible={visible}
    />
  )
}