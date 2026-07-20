import { useParams } from 'react-router-dom'
import { useExtensionsContext } from '../contexts/ExtensionsContext'
import { useExtensionData } from '../hooks/useExtensionData'
import { useReleaseData } from '../hooks/useReleaseData'
import { useEvents } from '../hooks/useEvents'
import { useMonthlyRollups } from '../hooks/useMonthlyRollups'
import StatsCards from '../components/cards/StatsCards'
import MetricsPanel from '../components/cards/MetricsPanel'
import ReleaseImpactPanel from '../components/cards/ReleaseImpactPanel'
import InstallsChart from '../components/charts/InstallsChart'
import VelocityChart from '../components/charts/VelocityChart'
import RatingChart from '../components/charts/RatingChart'
import GitHubChart from '../components/charts/GitHubChart'
import MonthlyInstallsChart from '../components/charts/MonthlyInstallsChart'
import MonthlyTableCard from '../components/cards/MonthlyTableCard'
import { buildEventReferenceLines } from '../components/annotations/EventAnnotation'
import { computeProjection } from '../metrics/projections'
import { getExtensionIconUrl } from '../utils/icons'
import { computeVelocity } from '../metrics/velocity'
import { detectPeaks } from '../metrics/peaks'
import { computeReleaseImpact } from '../metrics/releaseCorrelation'
import React, { useState } from 'react'
import CompetitorList from '../components/cards/CompetitorList'
import type { MonthlyRollup, DataPoint } from '../types/schema'

export default function ExtensionDetail() {
  const { extensionId } = useParams<{ extensionId: string }>()
  const extensions = useExtensionsContext()
  const { data, loading, error } = useExtensionData(extensionId ?? '')
  const { releases } = useReleaseData(extensionId ?? '')
  const { events } = useEvents()
  const { rollups: monthlyRollups } = useMonthlyRollups(extensionId ?? '')
  const [projectionMonths, setProjectionMonths] = useState(1)

  const extension = extensions.find(ext => ext.id === extensionId)

  if (!extension) {
    return (
      <div className="not-found">
        <span>Extension not found</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="detail-skeleton" role="status" aria-label="Loading extension data">
        <div className="detail-skeleton__header">
          <div className="detail-skeleton__icon" />
          <div className="detail-skeleton__title" />
        </div>
        <div className="detail-skeleton__stats">
          <div className="detail-skeleton__stat" />
          <div className="detail-skeleton__stat" />
          <div className="detail-skeleton__stat" />
          <div className="detail-skeleton__stat" />
        </div>
        <div className="detail-skeleton__chart" />
        <div className="detail-skeleton__chart" style={{ animationDelay: '0.3s' }} />
        <div className="detail-skeleton__chart" style={{ animationDelay: '0.4s' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="error" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  const currentInstalls =
    data.length > 0 ? data[data.length - 1].marketplace.installs : 0

  const annotations = buildEventReferenceLines(events, releases)
  const releaseImpacts = computeReleaseImpact(releases, currentInstalls)

  return (
    <div>
      <div className="extension-header">
        <div className="extension-header__icon">
          <img
            src={getExtensionIconUrl(extension.namespace, extension.name)}
            alt={`${extension.displayName} icon`}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              target.parentElement!.textContent = '🧩'
            }}
          />
        </div>
        <div className="extension-header__info">
          <h1>{extension.displayName}</h1>
          <div className="extension-header__id">{extension.id}</div>
          <div className="extension-header__links">
            <a
              href={`https://marketplace.visualstudio.com/items?itemName=${extension.id}`}
              target="_blank"
              rel="noreferrer"
              className="extension-header__link"
            >
              <span className="extension-header__link-icon">↗</span>
              VS Marketplace
            </a>
            <a
              href={`https://open-vsx.org/extension/${extension.namespace}/${extension.name}`}
              target="_blank"
              rel="noreferrer"
              className="extension-header__link"
            >
              <span className="extension-header__link-icon">↗</span>
              Open VSX
            </a>
            <a
              href={`https://github.com/${extension.githubRepo}`}
              target="_blank"
              rel="noreferrer"
              className="extension-header__link"
            >
              <span className="extension-header__link-icon">↗</span>
              GitHub Repo
            </a>
          </div>
        </div>
      </div>

      <StatsCards data={data} trackedSince={extension.trackedSince} githubRepo={extension.githubRepo} />
      <MetricsPanel data={data} projectionMonths={projectionMonths} />

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <section className="chart-section" aria-label="Installs">
          <div className="projection-controls">
            <h2 style={{ marginBottom: 0 }}>Installs</h2>
            <label className="projection-label" htmlFor="projection-months">
              Projection horizon (months):
            </label>
            <input
              id="projection-months"
              className="projection-input"
              type="number"
              min={1}
              max={24}
              value={projectionMonths}
              onChange={(e) => {
                const val = Math.max(1, Math.min(24, Number(e.target.value) || 1))
                setProjectionMonths(val)
              }}
            />
            <button
              className="projection-reset-btn"
              onClick={() => setProjectionMonths(1)}
            >
              Reset
            </button>
          </div>
          <InstallsChart
            data={data}
            projections={[
              computeProjection(data, 'linear', projectionMonths * 30),
              computeProjection(data, 'exponential', projectionMonths * 30),
            ].filter((p): p is NonNullable<typeof p> => p !== null)}
            openVsxProjections={[
              computeProjection(data, 'linear', projectionMonths * 30, (p) => p.openVsx?.downloads ?? 0),
              computeProjection(data, 'exponential', projectionMonths * 30, (p) => p.openVsx?.downloads ?? 0),
            ].filter((p): p is NonNullable<typeof p> => p !== null)}
            peaks={detectPeaks(computeVelocity(data))}
            annotations={annotations}
          />
          <ProjectionSummary
            data={data}
            projectionMonths={projectionMonths}
            currentInstalls={currentInstalls}
          />
        </section>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <section className="chart-section" aria-label="Growth Velocity">
          <h2>Growth Velocity</h2>
          <VelocityChart data={data} />
        </section>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <section className="chart-section" aria-label="Rating">
          <h2>Rating</h2>
          <RatingChart data={data} />
        </section>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <section className="chart-section" aria-label="GitHub">
          <h2>GitHub</h2>
          <GitHubChart data={data} />
        </section>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <ReleaseImpactPanel
          impacts={releaseImpacts}
          githubRepo={extension.githubRepo}
        />
      </div>

      {/* Monthly Statistics Section */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <section className="chart-section" aria-label="Monthly Statistics">
          <div className="monthly-header">
            <h2>Monthly Statistics</h2>
            <div className="monthly-export-buttons">
              <button
                className="btn btn--sm"
                onClick={() => exportCsv(monthlyRollups, extension.id)}
              >
                Export Report (CSV)
              </button>
              <button
                className="btn btn--sm"
                onClick={() => exportJson(monthlyRollups, extension.id)}
              >
                Export Raw Data (JSON)
              </button>
            </div>
          </div>
          <MonthlyInstallsChart rollups={monthlyRollups} />
          <div style={{ marginTop: 'var(--space-md)' }}>
            <MonthlyTableCard rollups={monthlyRollups} />
          </div>
        </section>
      </div>

      {/* Competitors Section */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <section className="chart-section" aria-label="Competitors">
          <h2>Competitors</h2>
          <CompetitorList
            extensionId={extension.id}
            yourInstalls={currentInstalls}
            yourRating={data.length > 0 ? data[data.length - 1].marketplace.averageRating : undefined}
            yourRatingCount={data.length > 0 ? data[data.length - 1].marketplace.ratingCount : 0}
            yourGithubStars={data.length > 0 ? (data[data.length - 1].github?.stars ?? null) : null}
            trackedSince={extension.trackedSince}
          />
        </section>
      </div>
    </div>
  )
}

function ProjectionSummary({ data, projectionMonths, currentInstalls }: { data: DataPoint[]; projectionMonths: number; currentInstalls: number }) {
  const linearProj = computeProjection(data, 'linear', projectionMonths * 30)
  const expoProj = computeProjection(data, 'exponential', projectionMonths * 30)

  if (!linearProj && !expoProj) return null

  function formatProj(proj: NonNullable<ReturnType<typeof computeProjection>>): React.ReactNode {
    const lastVal = proj.points[proj.points.length - 1]?.value
    if (lastVal === undefined) return null
    const gained = Math.round(lastVal - currentInstalls)
    return (
      <span>
        <strong>{Math.round(lastVal).toLocaleString()}</strong> installs (+{gained.toLocaleString()} from today) · R²={proj.r2.toFixed(2)}
      </span>
    )
  }

  return (
    <div className="projection-summary">
      <div className="projection-summary__item">
        <span className="projection-summary__model">Linear:</span>{' '}
        {linearProj ? formatProj(linearProj) : <span className="projection-summary__na">N/A</span>}
      </div>
      <div className="projection-summary__item">
        <span className="projection-summary__model">Exponential:</span>{' '}
        {expoProj ? formatProj(expoProj) : <span className="projection-summary__na">N/A</span>}
      </div>
    </div>
  )
}

function exportCsv(rollups: MonthlyRollup[], extensionId: string): void {
  const headers = ['YearMonth', 'InstallsEndOfMonth', 'InstallsGained', 'AvgRating', 'RatingCountEndOfMonth', 'OpenVsxDownloadsEndOfMonth', 'DataPointsInMonth']
  const rows = rollups.map(r => [
    r.yearMonth,
    r.installsEndOfMonth,
    r.installsGained,
    r.avgRating,
    r.ratingCountEndOfMonth,
    r.openVsxDownloadsEndOfMonth,
    r.dataPointsInMonth,
  ].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  downloadBlob(csv, `${extensionId}-monthly.csv`, 'text/csv')
}

function exportJson(rollups: MonthlyRollup[], extensionId: string): void {
  const json = JSON.stringify(rollups, null, 2)
  downloadBlob(json, `${extensionId}-monthly.json`, 'application/json')
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
