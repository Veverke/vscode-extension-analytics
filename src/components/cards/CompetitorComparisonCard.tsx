interface Competitor {
  id: string
  displayName: string
  installs: number
  rating: number | undefined
  ratingCount: number
  /** ISO date when tracking started (for your extension) or first release (for competitor) */
  sinceDate?: string
  /** GitHub stars */
  githubStars?: number | null
  /** GitHub repo */
  githubRepo?: string | null
}

interface Props {
  competitor: Competitor
  /** The difference values are pre-computed relative to your extension */
  diffs: {
    installs: { label: string; className: string }
    rating: { label: string; className: string }
    ratingCount: { label: string; className: string }
    avgMonthly: { label: string; className: string }
    githubStars: { label: string; className: string }
  }
  onRemove: () => void
  onToggleVisibility?: () => void
  visible?: boolean
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export default function CompetitorComparisonCard({
  competitor,
  diffs,
  onRemove,
  onToggleVisibility,
  visible = true,
}: Props) {
  const ratingTheirs = competitor.rating ?? 0

  return (
    <div className="competitor-card" style={{ opacity: visible ? 1 : 0.5 }}>
      <div className="competitor-card__header">
        <div className="competitor-card__title">
          {onToggleVisibility && (
            <input
              type="checkbox"
              checked={visible}
              onChange={onToggleVisibility}
              aria-label={`Toggle visibility of ${competitor.displayName}`}
              style={{ marginRight: 8 }}
            />
          )}
          {competitor.displayName}
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginLeft: 8 }}>
            ({competitor.id})
          </span>
        </div>
        <button className="competitor-card__remove" onClick={onRemove} aria-label={`Remove ${competitor.displayName}`}>
          Remove
        </button>
      </div>
      {visible && (
        <table className="competitor-table competitor-table--single">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>vs Your Extension</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Installs</td>
              <td>{formatNum(competitor.installs)}</td>
              <td className={diffs.installs.className}>
                {diffs.installs.label}
                <span className="competitor-diff">{diffs.installs.className.includes('green') ? '↑' : diffs.installs.className.includes('red') ? '↓' : '→'}</span>
              </td>
            </tr>
            <tr>
              <td>Avg Installs / Month</td>
              <td>{competitor.sinceDate ? formatNum(Math.round(competitor.installs / Math.max(1, (Date.now() - new Date(competitor.sinceDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))) : 'N/A'}</td>
              <td className={diffs.avgMonthly.className}>
                {diffs.avgMonthly.label}
              </td>
            </tr>
            <tr>
              <td>Rating</td>
              <td>{ratingTheirs > 0 ? `⭐ ${ratingTheirs.toFixed(1)}` : 'N/A'}</td>
              <td className={diffs.rating.className}>
                {diffs.rating.label}
              </td>
            </tr>
            <tr>
              <td>Rating Count</td>
              <td>{formatNum(competitor.ratingCount)}</td>
              <td className={diffs.ratingCount.className}>
                {diffs.ratingCount.label}
              </td>
            </tr>
            <tr>
              <td>GitHub Stars</td>
              <td>{competitor.githubStars != null ? formatNum(competitor.githubStars) : 'N/A'}</td>
              <td className={diffs.githubStars.className}>
                {diffs.githubStars.label}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}