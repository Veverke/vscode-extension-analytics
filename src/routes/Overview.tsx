import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useExtensionsContext } from '../contexts/ExtensionsContext'
import { useAllExtensionsData, type ExtensionSummary } from '../hooks/useAllExtensionsData'
import Sparkline from '../components/charts/Sparkline'
import VelocityBadge from '../components/cards/VelocityBadge'
import MomentumBadge from '../components/cards/MomentumBadge'

export type OverviewSortField = 'displayName' | 'currentInstalls' | 'velocity' | 'momentum'

const SKELETON_ROW_COUNT = 3

function SkeletonRow() {
  return (
    <tr className="overview__skeleton-row" aria-hidden="true">
      <td><span className="skeleton skeleton--text" style={{ width: 120, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--text" style={{ width: 60, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--sparkline" style={{ width: 80, height: 28, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--badge" style={{ width: 50, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
      <td><span className="skeleton skeleton--badge" style={{ width: 40, height: 14, display: 'inline-block', background: '#e5e7eb', borderRadius: 4 }} /></td>
    </tr>
  )
}

function sortSummaries(
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
  const extensions = useExtensionsContext()
  const { results, loading, errors } = useAllExtensionsData(extensions)

  const [sortField, setSortField] = useState<OverviewSortField>('momentum')
  const [sortAsc, setSortAsc] = useState(false)

  // Single-extension shortcut: navigate directly to detail page
  if (extensions.length === 1) {
    return <Navigate to={`/extension/${extensions[0].id}`} replace />
  }

  const sorted = useMemo(
    () => sortSummaries(results, sortField, sortAsc),
    [results, sortField, sortAsc]
  )

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
    <div>
      <h1>Your Extensions</h1>
      <table aria-label="Extensions overview">
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
                <tr key={summary.extension.id}>
                  <td>
                    <Link to={`/extension/${summary.extension.id}`}>
                      {summary.extension.displayName}
                    </Link>
                  </td>
                  <td>{summary.currentInstalls.toLocaleString()}</td>
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
              const ext = extensions.find(e => e.id === extId)
              return (
                <tr key={`error-${extId}`} className="overview__error-row">
                  <td>
                    {ext ? (
                      <Link to={`/extension/${extId}`}>
                        {ext.displayName}
                      </Link>
                    ) : (
                      extId
                    )}
                  </td>
                  <td colSpan={4}>
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
  )
}