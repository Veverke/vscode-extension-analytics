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
  /** ISO date of last commit / push to the GitHub repo */
  lastCommit?: string | null
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

function formatShortDate(isoDate?: string): string {
  if (!isoDate) return 'N/A'
  return new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

function MetricItem({ label, value, diff }: { label: string; value: string; diff?: { label: string; className: string } }) {
  return (
    <div className="competitor-metric">
      <span className="competitor-metric__label">{label}</span>
      <span className="competitor-metric__value">{value}</span>
      {diff && (
        <span className={`competitor-metric__diff ${diff.className}`}>{diff.label}</span>
      )}
    </div>
  )
}

export default function CompetitorComparisonCard({
  competitor,
  diffs,
  onRemove,
  onToggleVisibility,
  visible = true,
}: Props) {
  const ratingTheirs = competitor.rating ?? 0
  const avgMonthly = competitor.sinceDate
    ? formatNum(Math.round(competitor.installs / Math.max(1, (Date.now() - new Date(competitor.sinceDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))))
    : 'N/A'

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
          <span className="competitor-card__id">({competitor.id})</span>
        </div>
        <button className="competitor-card__remove" onClick={onRemove} aria-label={`Remove ${competitor.displayName}`}>
          Remove
        </button>
      </div>
      {visible && (
        <div className="competitor-metrics-row">
          <MetricItem label="Installs" value={formatNum(competitor.installs)} diff={diffs.installs} />
          <MetricItem label="Avg/Mo" value={avgMonthly} diff={diffs.avgMonthly} />
          <MetricItem label="Rating" value={ratingTheirs > 0 ? `⭐ ${ratingTheirs.toFixed(1)}` : 'N/A'} diff={diffs.rating} />
          <MetricItem label="Reviews" value={formatNum(competitor.ratingCount)} diff={diffs.ratingCount} />
          <MetricItem label="GitHub" value={competitor.githubStars != null ? formatNum(competitor.githubStars) : 'N/A'} diff={diffs.githubStars} />
          <MetricItem label="Released" value={formatShortDate(competitor.sinceDate)} />
          <MetricItem label="Last Updated" value={formatShortDate(competitor.lastCommit ?? undefined)} />
        </div>
      )}
    </div>
  )
}