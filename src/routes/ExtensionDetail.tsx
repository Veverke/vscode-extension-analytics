import { useParams } from 'react-router-dom'
import { useExtensionsContext } from '../contexts/ExtensionsContext'
import { useExtensionData } from '../hooks/useExtensionData'
import StatsCards from '../components/cards/StatsCards'
import InstallsChart from '../components/charts/InstallsChart'
import RatingChart from '../components/charts/RatingChart'

export default function ExtensionDetail() {
  const { extensionId } = useParams<{ extensionId: string }>()
  const extensions = useExtensionsContext()
  const { data, loading, error } = useExtensionData(extensionId ?? '')

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

  return (
    <div>
      <h1>{extension.displayName}</h1>
      <StatsCards data={data} />
      <section aria-label="Installs">
        <h2>Installs</h2>
        <InstallsChart data={data} />
      </section>
      <section aria-label="Rating">
        <h2>Rating</h2>
        <RatingChart data={data} />
      </section>
    </div>
  )
}
