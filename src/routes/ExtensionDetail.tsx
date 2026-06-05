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
      <div>
        <p>Extension not found</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading extension data">
        <span>Loading…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert">
        <p>{error}</p>
      </div>
    )
  }

  const currentInstalls =
    data.length > 0 ? data[data.length - 1].marketplace.installs : 0

  const annotations = buildEventReferenceLines(events, releases)
  const releaseImpacts = computeReleaseImpact(releases, currentInstalls)

  return (
    <div>
      <h1>{extension.displayName}</h1>
      <StatsCards data={data} />
      <MetricsPanel data={data} />
      <section aria-label="Installs">
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
      <section aria-label="Growth Velocity">
        <h2>Growth Velocity</h2>
        <VelocityChart data={data} />
      </section>
      <section aria-label="Rating">
        <h2>Rating</h2>
        <RatingChart data={data} />
      </section>
      <ReleaseImpactPanel
        impacts={releaseImpacts}
        githubRepo={extension.githubRepo}
      />
    </div>
  )
}