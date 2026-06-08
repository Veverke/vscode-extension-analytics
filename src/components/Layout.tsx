import { NavLink, Link, Outlet } from 'react-router-dom'
import { ExtensionEntry } from '../types/schema'
import { getExtensionIconUrl } from '../utils/icons'

interface LayoutProps {
  extensions: ExtensionEntry[]
}

export default function Layout({ extensions }: LayoutProps) {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Extension Analytics
          </Link>
        </h1>
      </header>
      <div className="app__body">
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
        </nav>
        <main className="app__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
