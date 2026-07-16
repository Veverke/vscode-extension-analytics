interface Competitor {
  id: string
  displayName: string
  installs: number
  rating: number | undefined
  ratingCount: number
}

interface Props {
  yourExtension: Competitor
  competitor: Competitor
  onRemove: () => void
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

export default function CompetitorComparisonCard({ yourExtension, competitor, onRemove }: Props) {
  const ratingYours = yourExtension.rating ?? 0
  const ratingTheirs = competitor.rating ?? 0
  const installDiff = formatDiff(yourExtension.installs, competitor.installs)
  const ratingDiff = formatDiff(ratingYours, ratingTheirs)
  const countDiff = formatDiff(yourExtension.ratingCount, competitor.ratingCount)

  return (
    <div className="competitor-card">
      <div className="competitor-card__header">
        <div className="competitor-card__title">
          vs {competitor.displayName}
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginLeft: 8 }}>
            ({competitor.id})
          </span>
        </div>
        <button className="competitor-card__remove" onClick={onRemove} aria-label={`Remove ${competitor.displayName}`}>
          Remove
        </button>
      </div>
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
    </div>
  )
}