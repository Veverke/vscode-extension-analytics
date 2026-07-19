import { DataPoint } from '../../types/schema'
import FormulaTooltip from '../annotations/FormulaTooltip'

interface Props {
  data: DataPoint[]
  trackedSince?: string
  githubRepo?: string
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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Today'
  const diffMonths = Math.round(diffDays / 30.44)
  if (diffMonths < 1) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  const diffYears = Math.floor(diffMonths / 12)
  const remMonths = diffMonths % 12
  return remMonths > 0
    ? `${diffYears} year${diffYears > 1 ? 's' : ''}, ${remMonths} month${remMonths > 1 ? 's' : ''} ago`
    : `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
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

export default function StatsCards({ data, trackedSince, githubRepo }: Props) {
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

  // GitHub stats (backwards-compatible: null-safe)
  const latestGithub = last.github
  const firstGithub = first.github
  const latestStars = latestGithub?.stars ?? null
  const latestForks = latestGithub?.forks ?? null
  const latestContributions = latestGithub?.contributions ?? null
  const firstStars = firstGithub?.stars ?? null
  const firstForks = firstGithub?.forks ?? null
  const firstContributions = firstGithub?.contributions ?? null

  const totalDownloads = latestOpenVsx !== null ? latestInstalls + latestOpenVsx : latestInstalls
  const firstTotal = firstOpenVsx !== null ? firstInstalls + firstOpenVsx : firstInstalls

  const ratingValue =
    latestRating !== undefined ? `⭐ ${latestRating.toFixed(1)}` : 'N/A'
  const ratingDelta =
    latestRating !== undefined && firstRating !== undefined
      ? `${latestRating - firstRating >= 0 ? '+' : ''}${(latestRating - firstRating).toFixed(2)} since tracking started`
      : 'N/A'

  const trackedSinceDate = trackedSince || data[0].ts
  const trackedValue = formatDate(trackedSinceDate)
  const trackedDelta = relativeTime(trackedSinceDate)

  return (
    <div className="stats-cards" role="region" aria-label="Stats">
      <StatCard
        label="Tracking Started"
        value={trackedValue}
        delta={trackedDelta}
      />
      <StatCard
        label="VS Code Marketplace Installs"
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
      <StatCard
        label="Total Downloads"
        value={formatNum(totalDownloads)}
        delta={computeDelta(totalDownloads, firstTotal)}
      />
      <StatCard label="Average Rating" value={ratingValue} delta={ratingDelta} />
      <StatCard
        label="Rating Count"
        value={formatNum(latestRatingCount)}
        delta={computeDelta(latestRatingCount, firstRatingCount)}
      />
      <StatCard
        label="GitHub Stars"
        value={latestStars !== null ? formatNum(latestStars) : 'N/A'}
        delta={
          latestStars !== null && firstStars !== null
            ? computeDelta(latestStars, firstStars)
            : 'N/A'
        }
      />
      <StatCard
        label="GitHub Forks"
        value={latestForks !== null ? formatNum(latestForks) : 'N/A'}
        delta={
          latestForks !== null && firstForks !== null
            ? computeDelta(latestForks, firstForks)
            : 'N/A'
        }
      />
      <div className="stat-card" style={{ overflow: 'visible' }}>
        <p className="stat-label">
          <FormulaTooltip
            label="GitHub Contributions"
            formula="commits + issues + PRs + reviews (by non-owners)"
            description="Total interactions (commits, issues, pull requests, and code reviews) on this repo by contributors other than the repo owner. This measures community engagement, not the owner's own activity."
          >
            GitHub Contributions (non-owner)
          </FormulaTooltip>
        </p>
        <p className="stat-value">{latestContributions !== null ? formatNum(latestContributions) : 'N/A'}</p>
        <p className="stat-delta">
          {latestContributions !== null && firstContributions !== null
            ? computeDelta(latestContributions, firstContributions)
            : 'N/A'}
        </p>
        {latestGithub?.contributionsBreakdown && (
          <div className="contributions-breakdown">
            <a
              href={`https://github.com/${githubRepo}/graphs/contributors`}
              target="_blank"
              rel="noreferrer"
              className="contributions-breakdown__item"
            >
              <span className="contributions-breakdown__dot" style={{ background: '#86efac' }} />
              {latestGithub.contributionsBreakdown.commits} commits
            </a>
            <a
              href={`https://github.com/${githubRepo}/issues`}
              target="_blank"
              rel="noreferrer"
              className="contributions-breakdown__item"
            >
              <span className="contributions-breakdown__dot" style={{ background: '#a7f3d0' }} />
              {latestGithub.contributionsBreakdown.issues} issues
            </a>
            <a
              href={`https://github.com/${githubRepo}/pulls`}
              target="_blank"
              rel="noreferrer"
              className="contributions-breakdown__item"
            >
              <span className="contributions-breakdown__dot" style={{ background: '#6ee7b7' }} />
              {latestGithub.contributionsBreakdown.prs} PRs
            </a>
            <a
              href={`https://github.com/${githubRepo}/pulls`}
              target="_blank"
              rel="noreferrer"
              className="contributions-breakdown__item"
            >
              <span className="contributions-breakdown__dot" style={{ background: '#34d399' }} />
              {latestGithub.contributionsBreakdown.reviews} reviews
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
