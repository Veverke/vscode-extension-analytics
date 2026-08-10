import { useState, useMemo } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useExtensionsContext } from '../contexts/ExtensionsContext'
import { useAllExtensionsData, type ExtensionSummary } from '../hooks/useAllExtensionsData'
import { useUser } from '../contexts/UserContext'
import { useExtensions } from '../hooks/useExtensions'
import Sparkline from '../components/charts/Sparkline'
import VelocityBadge from '../components/cards/VelocityBadge'
import MomentumBadge from '../components/cards/MomentumBadge'

export type OverviewSortField = 'displayName' | 'currentInstalls' | 'currentDownloads' | 'velocity' | 'momentum'

const SKELETON_ROW_COUNT = 3

function SkeletonRow() {
  return (
    <tr className="overview__skeleton-row" aria-hidden="true">
      <td><span className="skeleton skeleton--text" style={{ width: 120, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--text" style={{ width: 60, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--text" style={{ width: 60, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--sparkline" style={{ width: 80, height: 28, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--badge" style={{ width: 50, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--badge" style={{ width: 40, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
    </tr>
  )
}

export function sortSummaries(
  summaries: ExtensionSummary[],
  field: OverviewSortField,
  asc: boolean
): ExtensionSummary[] {
  return [...summaries].sort((a, b) => {
    let diff: number
    switch (field) {
      case 'displayName':
        diff = a.extension.displayName.localeCompare(b.extension.displayName)
        break
      case 'currentInstalls':
        diff = a.currentInstalls - b.currentInstalls
        break
      case 'currentDownloads':
        diff = a.currentDownloads - b.currentDownloads
        break
      case 'velocity':
        diff = a.velocity - b.velocity
        break
      case 'momentum':
      default:
        diff = a.momentum - b.momentum
        break
    }
    return asc ? diff : -diff
  })
}

export default function Overview() {
  const userExtensions = useExtensionsContext()
  const { username } = useUser()
  const { extensions: allExtensions } = useExtensions()
  const [showAll, setShowAll] = useState(false)

  // Determine which extensions to display
  const displayExtensions = showAll || userExtensions.length === 0
    ? allExtensions
    : userExtensions

  // If user has no extensions and there are tracked ones, default to showing all
  const hasTrackedExtensions = allExtensions.length > 0
  const hasUserExtensions = userExtensions.length > 0

  const { results, loading, errors } = useAllExtensionsData(displayExtensions)

  const navigate = useNavigate()

  const [sortField, setSortField] = useState<OverviewSortField>('momentum')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(
    () => sortSummaries(results, sortField, sortAsc),
    [results, sortField, sortAsc]
  )

  // Single-extension shortcut: navigate directly to detail page
  if (!loading && displayExtensions.length === 1 && results.length === 1) {
    return <Navigate to={`/extension/${displayExtensions[0].id}`} replace />
  }

  const handleSort = (field: OverviewSortField) => {
    if (field === sortField) {
      setSortAsc(prev => !prev)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const sortIndicator = (field: OverviewSortField) => {
    if (field !== sortField) return null
    return sortAsc ? ' ▲' : ' ▼'
  }

  return (
    <div className="overview-wrapper">
      <div className="overview-header-row">
        <h1 className="overview-header">Your Extensions</h1>
        {hasTrackedExtensions && (
          <label className="overview__toggle">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            <span className="overview__toggle-label">
              Show all tracked extensions ({allExtensions.length})
            </span>
          </label>
        )}
      </div>

      {!hasUserExtensions && !loading && (
        <div className="overview__empty">
          <p className="overview__empty-text">
            No extensions found for your GitHub username.
          </p>
          {hasTrackedExtensions && (
            <p className="overview__empty-hint">
              <button
                className="overview__empty-toggle"
                onClick={() => setShowAll(true)}
              >
                View all tracked extensions
              </button>
              {' '}or{' '}
              <Link to={username ? `/discover/${encodeURIComponent(username)}` : '/'}>
                discover extensions
              </Link>
              {' '}for your account.
            </p>
          )}
        </div>
      )}

      <div className="card">
        <table className="overview-table" aria-label="Extensions overview">
        <thead>
          <tr>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('displayName')}
            >
              Extension{sortIndicator('displayName')}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('currentInstalls')}
            >
              Installs{sortIndicator('currentInstalls')}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('currentDownloads')}
            >
              Downloads{sortIndicator('currentDownloads')}
            </th>
            <th>Trend</th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('velocity')}
            >
              Velocity{sortIndicator('velocity')}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort('momentum')}
            >
              Momentum{sortIndicator('momentum')}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                <SkeletonRow key={`skeleton-${i}`} />
              ))
            : sorted.map(summary => (
                <tr
                  key={summary.extension.id}
                  className="overview__row"
                  onClick={() => navigate(`/extension/${summary.extension.id}`)}
                >
                  <td>
                    <Link
                      to={`/extension/${summary.extension.id}`}
                      onClick={e => e.stopPropagation()}
                    >
                      {summary.extension.displayName}
                    </Link>
                  </td>
                  <td>{summary.currentInstalls.toLocaleString()}</td>
                  <td>{summary.currentDownloads.toLocaleString()}</td>
                  <td>
                    <Sparkline points={summary.sparklinePoints} />
                  </td>
                  <td>
                    <VelocityBadge velocity={summary.velocity} />
                  </td>
                  <td>
                    <MomentumBadge score={summary.momentum} />
                  </td>
                </tr>
              ))}
          {/* Per-row error state for extensions that failed to load */}
          {!loading &&
            Object.entries(errors).map(([extId, message]) => {
              const ext = displayExtensions.find(e => e.id === extId)
              return (
                <tr
                  key={`error-${extId}`}
                  className="overview__error-row"
                  onClick={() => ext && navigate(`/extension/${extId}`)}
                >
                  <td>
                    {ext ? (
                      <Link
                        to={`/extension/${extId}`}
                        onClick={e => e.stopPropagation()}
                      >
                        {ext.displayName}
                      </Link>
                    ) : (
                      extId
                    )}
                  </td>
                  <td colSpan={5}>
                    <span
                      className="overview__error-icon"
                      role="img"
                      aria-label="error"
                      title={message}
                    >
                      ⚠️
                    </span>{' '}
                    <span className="overview__error-message">{message}</span>
                  </td>
                </tr>
              )
            })}
        </tbody>
        </table>
      </div>

          {hasUserExtensions && (
            <div className="overview__discover-cta">
              <Link
                to={username ? `/discover/${encodeURIComponent(username)}` : '/'}
                className="overview__cta-link"
              >
                ← Add more extensions to track
              </Link>
              <span className="overview__cta-hint">
                Found new extensions? Click to discover and request tracking.
              </span>
            </div>
          )}
          {!hasUserExtensions && showAll && hasTrackedExtensions && (
            <div className="overview__discover-cta">
              <Link
                to={username ? `/discover/${encodeURIComponent(username)}` : '/'}
                className="overview__cta-link"
              >
                ← Discover extensions for your GitHub account
              </Link>
            </div>
          )}
    </div>
  )
}