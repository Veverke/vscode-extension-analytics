import { useParams } from 'react-router-dom'
import { useExtensionsContext } from '../contexts/ExtensionsContext'
import { useExtensionData } from '../hooks/useExtensionData'
import { useReleaseData } from '../hooks/useReleaseData'
import { useEvents } from '../hooks/useEvents'
import StatsCards from '../components/cards/StatsCards'
import MetricsPanel from '../components/cards/MetricsPanel'
import ReleaseImpactPanel from '../components/cards/ReleaseImpactPanel'
import InstallsChart from '../components/charts/InstallsChart'
import VelocityChart from '../components/charts/VelocityChart'
import RatingChart from '../components/charts/RatingChart'
import { buildEventReferenceLines } from '../components/annotations/EventAnnotation'
import { computeProjection } from '../metrics/projections'
import { getExtensionIconUrl } from '../utils/icons'
import { computeVelocity } from '../metrics/velocity'
import { detectPeaks } from '../metrics/peaks'
import { computeReleaseImpact } from '../metrics/releaseCorrelation'

export default function ExtensionDetail() {
  const { extensionId } = useParams<{ extensionId: string }>()
  const extensions = useExtensionsContext()
  const { data, loading, error } = useExtensionData(extensionId ?? '')
  const { releases } = useReleaseData(extensionId ?? '')
  const { events } = useEvents()

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
          </div>
        </div>
      </div>

      <StatsCards data={data} />
      <MetricsPanel data={data} />

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <section className="chart-section" aria-label="Installs">
          <h2>Installs</h2>
          <InstallsChart
            data={data}
            projections={[
              computeProjection(data, 'linear', 30),
              computeProjection(data, 'exponential', 30),
            ].filter((p): p is NonNullable<typeof p> => p !== null)}
            peaks={detectPeaks(computeVelocity(data))}
            annotations={annotations}
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

      <div className="card">
        <ReleaseImpactPanel
          impacts={releaseImpacts}
          githubRepo={extension.githubRepo}
        />
      </div>
    </div>
  )
}