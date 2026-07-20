interface Competitor {
  id: string
  displayName: string
  installs: number
  rating: number | undefined
  ratingCount: number
  /** ISO date when tracking started (for your extension) or first release (for competitor) */
  sinceDate?: string
}

interface Props {
  yourExtension: Competitor
  competitor: Competitor
  onRemove: () => void
  onToggleVisibility?: () => void
  visible?: boolean
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function formatDiff(yours: number, theirs: number): { label: string; className: string } {
  if (yours === theirs) return { label: '0', className: 'competitor-value--gray' }
  const diff = yours - theirs
  const pct = theirs !== 0 ? ((diff / theirs) * 100).toFixed(1) : '∞'
  const sign = diff > 0 ? '+' : ''
  return {
    label: `${sign}${formatNum(diff)} (${sign}${pct}%)`,
    className: diff > 0 ? 'competitor-value--green' : 'competitor-value--red',
  }
}

/**
 * Calculates average installs per month from a start date to now.
 * Returns 0 if the date is missing or invalid.
 */
function calcAvgMonthlyInstalls(installs: number, sinceDate?: string): number {
  if (!sinceDate) return 0
  const start = new Date(sinceDate)
  const now = new Date()
  const msElapsed = now.getTime() - start.getTime()
  if (msElapsed <= 0) return 0
  const monthsElapsed = msElapsed / (1000 * 60 * 60 * 24 * 30.44)
  if (monthsElapsed < 0.01) return 0
  return Math.round(installs / monthsElapsed)
}

export default function CompetitorComparisonCard({
  yourExtension,
  competitor,
  onRemove,
  onToggleVisibility,
  visible = true,
}: Props) {
  const ratingYours = yourExtension.rating ?? 0
  const ratingTheirs = competitor.rating ?? 0
  const installDiff = formatDiff(yourExtension.installs, competitor.installs)
  const ratingDiff = formatDiff(ratingYours, ratingTheirs)
  const countDiff = formatDiff(yourExtension.ratingCount, competitor.ratingCount)

  const yourAvgMonthly = calcAvgMonthlyInstalls(yourExtension.installs, yourExtension.sinceDate)
  const theirAvgMonthly = calcAvgMonthlyInstalls(competitor.installs, competitor.sinceDate)
  const avgMonthlyDiff = formatDiff(yourAvgMonthly, theirAvgMonthly)

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
          vs {competitor.displayName}
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginLeft: 8 }}>
            ({competitor.id})
          </span>
        </div>
        <button className="competitor-card__remove" onClick={onRemove} aria-label={`Remove ${competitor.displayName}`}>
          Remove
        </button>
      </div>
      {visible && (
        <table className="competitor-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Your Extension</th>
              <th>Competitor</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Installs</td>
              <td>{formatNum(yourExtension.installs)}</td>
              <td>{formatNum(competitor.installs)}</td>
              <td className={installDiff.className}>
                {installDiff.label}
                <span className="competitor-diff">{installDiff.className.includes('green') ? '↑' : installDiff.className.includes('red') ? '↓' : '→'}</span>
              </td>
            </tr>
            <tr>
              <td>Avg Installs / Month</td>
              <td>{yourAvgMonthly > 0 ? formatNum(yourAvgMonthly) : 'N/A'}</td>
              <td>{theirAvgMonthly > 0 ? formatNum(theirAvgMonthly) : 'N/A'}</td>
              <td className={avgMonthlyDiff.className}>
                {avgMonthlyDiff.label}
              </td>
            </tr>
            <tr>
              <td>Rating</td>
              <td>{ratingYours > 0 ? `⭐ ${ratingYours.toFixed(1)}` : 'N/A'}</td>
              <td>{ratingTheirs > 0 ? `⭐ ${ratingTheirs.toFixed(1)}` : 'N/A'}</td>
              <td className={ratingDiff.className}>
                {ratingDiff.label}
              </td>
            </tr>
            <tr>
              <td>Rating Count</td>
              <td>{formatNum(yourExtension.ratingCount)}</td>
              <td>{formatNum(competitor.ratingCount)}</td>
              <td className={countDiff.className}>
                {countDiff.label}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}