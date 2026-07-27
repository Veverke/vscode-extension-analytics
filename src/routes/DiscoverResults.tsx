import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAutoDiscover, isExtensionTracked } from '../hooks/useAutoDiscover'
import { useCreateTrackingIssue } from '../hooks/useCreateTrackingIssue'
import { useExtensionsContext } from '../contexts/ExtensionsContext'
import { useUser } from '../contexts/UserContext'
import UntrackedCard from '../components/cards/UntrackedCard'
import SkeletonCard from '../components/cards/SkeletonCard'

/**
 * Discover Results screen.
 *
 * Automatically triggers extension discovery when the route is loaded
 * with a valid username parameter. Shows discovered extensions with
 * their tracking status and provides action buttons.
 */
export default function DiscoverResults() {
  const { username: paramUsername } = useParams<{ username: string }>()
  const trackedExtensions = useExtensionsContext()
  const { username: sessionUsername } = useUser()
  const { discover, results, loading, error, rateLimitRemaining } =
    useAutoDiscover()
  const { openIssue } = useCreateTrackingIssue()

  // Auto-discover on mount / param change
  useEffect(() => {
    if (paramUsername) {
      discover(paramUsername)
    }
  }, [paramUsername, discover])

  // Redirect prompt if user session doesn't match
  const usernameMismatch =
    sessionUsername && paramUsername && sessionUsername !== paramUsername

  return (
    <div className="discover">
      <div className="discover__header">
        <h1 className="discover__title">
          Extensions by{' '}
          <code className="discover__username">{paramUsername}</code>
        </h1>
        {usernameMismatch && (
          <p className="discover__mismatch-notice" role="note">
            Showing results for <strong>{paramUsername}</strong>. Your current
            session is <strong>{sessionUsername}</strong>.{' '}
            <Link to={`/discover/${encodeURIComponent(sessionUsername!)}`}>
              Switch to your session
            </Link>
          </p>
        )}
        <p className="discover__how-it-works">
          Found an extension you want to track? Click <strong>"Track on GitHub"</strong> to
          open a pre-filled issue. It gets auto-processed within seconds and will appear
          in your dashboard after the next data collection run (every 6 hours).
        </p>
      </div>

      {/* Loading state with skeleton cards */}
      {loading && (
        <div className="discover__loading" role="status" aria-label="Discovering extensions">
          <p className="discover__loading-text">Scanning repositories for VS Code extensions…</p>
          <ul className="discover__list" aria-label="Loading skeleton">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={`skeleton-${i}`} />
            ))}
          </ul>
          {rateLimitRemaining !== null && rateLimitRemaining <= 10 && (
            <p className="discover__rate-warning">
              ⚠️ GitHub API rate limit: {rateLimitRemaining} requests remaining.
              This may affect discovery.
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="discover__error" role="alert">
          <p className="discover__error-title">Discovery failed</p>
          <p>{error}</p>
          <button
            className="discover__retry-btn"
            onClick={() => paramUsername && discover(paramUsername)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && (
        <div className="discover__empty">
          <p>
            No VS Code extensions found for{' '}
            <strong>{paramUsername}</strong>.
          </p>
          <p className="discover__empty-hint">
            Make sure your repositories contain a{' '}
            <code>package.json</code> with an{' '}
            <code>engines.vscode</code> field.
          </p>
          <Link to="/" className="discover__back-link">
            ← Try another username
          </Link>
        </div>
      )}

      {/* Results list */}
      {!loading && results.length > 0 && (
        <>
          {rateLimitRemaining !== null && rateLimitRemaining <= 5 && (
            <p className="discover__rate-warning discover__rate-warning--low">
              ⚠️ GitHub API rate limit low ({rateLimitRemaining} remaining).
            </p>
          )}

          <ul className="discover__list" aria-label="Discovered extensions">
            {results.map((ext) => {
              const tracked = isExtensionTracked(ext.extensionId, trackedExtensions)

              return tracked ? (
                <li key={ext.extensionId} className="discover__item discover__item--tracked">
                  <div className="discover__item-info">
                    <span className="discover__item-name">
                      {ext.displayName || ext.name}
                    </span>
                    <code className="discover__item-id">{ext.extensionId}</code>
                    <a
                      href={`https://github.com/${ext.githubRepo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="discover__item-repo"
                    >
                      {ext.githubRepo}
                    </a>
                  </div>
                  <div className="discover__item-status">
                    <span className="discover__status-tracked">
                      ✅ Tracked
                    </span>
                  </div>
                </li>
              ) : (
                <UntrackedCard
                  key={ext.extensionId}
                  extension={ext}
                  onTrack={openIssue}
                />
              )
            })}
          </ul>

          {trackedExtensions.length > 0 && (
            <div className="discover__nav">
              <Link to="/overview" className="discover__nav-link">
                ← Go to Overview
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}