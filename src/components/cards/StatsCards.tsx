import { DataPoint } from '../../types/schema'

interface Props {
  data: DataPoint[]
}

interface CardProps {
  label: string
  value: string
  delta: string
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function computeDelta(last: number, first: number): string {
  const d = last - first
  return `${d >= 0 ? '+' : ''}${formatNum(d)} since tracking started`
}

function StatCard({ label, value, delta }: CardProps) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-delta">{delta}</p>
    </div>
  )
}

export default function StatsCards({ data }: Props) {
  if (data.length === 0) {
    return null
  }

  const first = data[0]
  const last = data[data.length - 1]

  const latestInstalls = last.marketplace.installs
  const latestOpenVsx = last.openVsx?.downloads ?? null
  const latestRating = last.marketplace.averageRating
  const latestRatingCount = last.marketplace.ratingCount

  const firstInstalls = first.marketplace.installs
  const firstOpenVsx = first.openVsx?.downloads ?? null
  const firstRating = first.marketplace.averageRating
  const firstRatingCount = first.marketplace.ratingCount

  const ratingValue =
    latestRating !== undefined ? `⭐ ${latestRating.toFixed(1)}` : 'N/A'
  const ratingDelta =
    latestRating !== undefined && firstRating !== undefined
      ? `${latestRating - firstRating >= 0 ? '+' : ''}${(latestRating - firstRating).toFixed(2)} since tracking started`
      : 'N/A'

  return (
    <div className="stats-cards" role="region" aria-label="Stats">
      <StatCard
        label="Total Marketplace Installs"
        value={formatNum(latestInstalls)}
        delta={computeDelta(latestInstalls, firstInstalls)}
      />
      <StatCard
        label="Open VSX Downloads"
        value={latestOpenVsx !== null ? formatNum(latestOpenVsx) : 'N/A'}
        delta={
          latestOpenVsx !== null && firstOpenVsx !== null
            ? computeDelta(latestOpenVsx, firstOpenVsx)
            : 'N/A'
        }
      />
      <StatCard label="Average Rating" value={ratingValue} delta={ratingDelta} />
      <StatCard
        label="Rating Count"
        value={formatNum(latestRatingCount)}
        delta={computeDelta(latestRatingCount, firstRatingCount)}
      />
    </div>
  )
}
