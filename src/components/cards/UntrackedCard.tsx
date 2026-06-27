import type { DiscoveredExtension } from '../../hooks/useAutoDiscover'

interface UntrackedCardProps {
  extension: DiscoveredExtension
  onTrack: (extensionId: string) => void
}

/**
 * Card for a discovered-but-untracked VS Code extension.
 *
 * Displays the extension's display name, ID, and GitHub repo,
 * with a CTA button to request tracking via GitHub issue.
 */
export default function UntrackedCard({ extension, onTrack }: UntrackedCardProps) {
  return (
    <li className="untracked-card">
      <div className="untracked-card__info">
        <span className="untracked-card__name">
          {extension.displayName || extension.name}
        </span>
        <code className="untracked-card__id">{extension.extensionId}</code>
        <a
          href={`https://github.com/${extension.githubRepo}`}
          target="_blank"
          rel="noreferrer"
          className="untracked-card__repo"
        >
          {extension.githubRepo}
        </a>
      </div>
      <div className="untracked-card__actions">
        <span className="untracked-card__badge">⬜ Not Tracked</span>
        <button
          className="untracked-card__cta"
          type="button"
          onClick={() => onTrack(extension.extensionId)}
          title={`Request tracking for ${extension.extensionId}`}
        >
          Track on GitHub
        </button>
      </div>
    </li>
  )
}