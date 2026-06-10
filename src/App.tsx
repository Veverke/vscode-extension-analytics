import { useExtensions } from './hooks/useExtensions'
import Layout from './components/Layout'
import { ExtensionsContext } from './contexts/ExtensionsContext'

export default function App() {
  const { extensions, loading, error } = useExtensions()

  if (loading) {
    return (
      <div role="status" aria-label="Loading indicator" className="loading">
        Loading extensions…
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="error">
        {error}
      </div>
    )
  }

  return (
    <ExtensionsContext.Provider value={extensions}>
      <Layout extensions={extensions} />
    </ExtensionsContext.Provider>
  )
}
