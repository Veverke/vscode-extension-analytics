import { useParams } from 'react-router-dom'
import { useExtensionsContext } from '../contexts/ExtensionsContext'

export default function ExtensionDetail() {
  const { extensionId } = useParams<{ extensionId: string }>()
  const extensions = useExtensionsContext()

  const extension = extensions.find(ext => ext.id === extensionId)

  if (!extension) {
    return (
      <div>
        <p>Extension not found</p>
      </div>
    )
  }

  return (
    <div>
      <h1>{extension.displayName}</h1>
      <section aria-label="Charts">
        <h2>Charts</h2>
        <p>(coming soon)</p>
      </section>
      <section aria-label="Metrics">
        <h2>Metrics</h2>
        <p>(coming soon)</p>
      </section>
      <section aria-label="Projections">
        <h2>Projections</h2>
        <p>(coming soon)</p>
      </section>
    </div>
  )
}
