import { useState } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import { useExtensions } from './hooks/useExtensions'
import { ExtensionsContext } from './contexts/ExtensionsContext'
import { UserContext } from './contexts/UserContext'

const USERNAME_STORAGE_KEY = 'vscode-ext-analytics-username'

export default function App() {
  const [searchParams] = useSearchParams()
  const urlUsername = searchParams.get('username')

  const [username, setUsernameState] = useState<string | null>(() => {
    const stored = localStorage.getItem(USERNAME_STORAGE_KEY)
    if (stored) return stored
    if (urlUsername) {
      localStorage.setItem(USERNAME_STORAGE_KEY, urlUsername)
      return urlUsername
    }
    return null
  })

  const { extensions, loading, error } = useExtensions(username ?? undefined)

  const setUsername = (name: string) => {
    localStorage.setItem(USERNAME_STORAGE_KEY, name)
    setUsernameState(name)
  }

  const clearUsername = () => {
    localStorage.removeItem(USERNAME_STORAGE_KEY)
    setUsernameState(null)
  }

  const userValue = { username, setUsername, clearUsername }

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
    <UserContext.Provider value={userValue}>
      <ExtensionsContext.Provider value={extensions}>
        <Outlet />
      </ExtensionsContext.Provider>
    </UserContext.Provider>
  )
}
