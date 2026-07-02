import { useState, useCallback, useEffect } from 'react'
import { useCompetitor } from '../../hooks/useCompetitor'
import CompetitorComparisonCard from './CompetitorComparisonCard'

interface Props {
  extensionId: string
  yourInstalls: number
  yourRating: number | undefined
  yourRatingCount: number
}

const STORAGE_PREFIX = 'competitors:'

function getStoredIds(extensionId: string): string[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_PREFIX + extensionId)
    return stored ? (JSON.parse(stored) as string[]) : []
  } catch {
    return []
  }
}

function storeIds(extensionId: string, ids: string[]): void {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + extensionId, JSON.stringify(ids))
  } catch {
    // sessionStorage may be full
  }
}

function isValidExtensionId(id: string): boolean {
  return /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(id)
}

export default function CompetitorList({ extensionId, yourInstalls, yourRating, yourRatingCount }: Props) {
  const [competitorIds, setCompetitorIds] = useState<string[]>(() => getStoredIds(extensionId))
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  // Persist to sessionStorage whenever list changes
  useEffect(() => {
    storeIds(extensionId, competitorIds)
  }, [extensionId, competitorIds])

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
  }, [])

  const yourExtension = {
    id: extensionId,
    displayName: 'Your Extension',
    installs: yourInstalls,
    rating: yourRating,
    ratingCount: yourRatingCount,
  }

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
      <div className="competitor-list">
        {competitorIds.map((id) => (
          <CompetitorItem
            key={id}
            id={id}
            yourExtension={yourExtension}
            onRemove={() => removeCompetitor(id)}
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
}: {
  id: string
  yourExtension: { id: string; displayName: string; installs: number; rating: number | undefined; ratingCount: number }
  onRemove: () => void
}) {
  const { displayName, data, loading, error } = useCompetitor(id)

  if (loading) {
    return (
      <div className="competitor-card">
        <div className="competitor-loading">Loading {id}...</div>
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
  const competitorInfo: {
    id: string
    displayName: string
    installs: number
    rating: number | undefined
    ratingCount: number
  } = {
    id,
    displayName: displayName ?? id,
    installs: lastPoint.marketplace.installs,
    rating: lastPoint.marketplace.averageRating,
    ratingCount: lastPoint.marketplace.ratingCount,
  }

  return (
    <CompetitorComparisonCard
      yourExtension={yourExtension}
      competitor={competitorInfo}
      onRemove={onRemove}
    />
  )
}