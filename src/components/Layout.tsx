import { NavLink, Link, Outlet } from 'react-router-dom'
import { useExtensionsContext } from '../contexts/ExtensionsContext'
import { useUser } from '../contexts/UserContext'
import { getExtensionIconUrl } from '../utils/icons'

export default function Layout() {
  const extensions = useExtensionsContext()
  const { username, clearUsername } = useUser()

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            VS Code Extension Analytics
          </Link>
        </h1>
        {username && (
          <div className="app__user-bar">
            <span className="app__user-name">{username}</span>
            <Link to="/" className="app__user-switch" onClick={clearUsername}>
              Switch user
            </Link>
            <Link to={`/discover/${encodeURIComponent(username)}`} className="app__user-discover">
              Discover
            </Link>
          </div>
        )}
      </header>
      <div className="app__body">
        {extensions.length > 0 && (
          <nav className="app__sidebar" aria-label="Extension navigation">
            <ul className="sidebar__list">
              {extensions.map(ext => (
                <li key={ext.id} className="sidebar__item">
                  <NavLink
                    to={`/extension/${ext.id}`}
                    className={({ isActive }) =>
                      ['sidebar__link', isActive ? 'sidebar__link--active' : '']
                        .filter(Boolean)
                        .join(' ')
                    }
                  >
                    <span className="sidebar__link-icon">
                      <img
                        src={getExtensionIconUrl(ext.namespace, ext.name)}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.display = 'none'
                        }}
                      />
                    </span>
                    {ext.displayName}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="sidebar__overview-link">
              <NavLink to="/overview" className="sidebar__link">
                📊 Overview
              </NavLink>
            </div>
          </nav>
        )}
        <main className="app__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
