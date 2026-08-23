export interface MarketplaceSnapshot {
  installs: number;
  updates: number;
  averageRating: number | undefined;
  ratingCount: number;
  trendingWeekly: number;
  trendingMonthly: number;
}

export interface OpenVsxSnapshot {
  downloads: number;
  averageRating: number | null;
  ratingCount: number;
}

export interface GitHubContributionBreakdown {
  commits: number;
  issues: number;
  prs: number;
  reviews: number;
}

export interface GitHubSnapshot {
  stars: number;
  forks: number;
  /** Total contributions by non-owner contributors (PRs + commits + issues + reviews) */
  contributions: number;
  /** Breakdown of contributions by type */
  contributionsBreakdown?: GitHubContributionBreakdown;
}

export interface DataPoint {
  ts: string;
  marketplace: MarketplaceSnapshot;
  openVsx: OpenVsxSnapshot | null;
  github: GitHubSnapshot | null;
}

export interface ExtensionEntry {
  id: string;
  namespace: string;
  name: string;
  displayName: string;
  githubRepo: string;
  trackedSince: string;
  /** GitHub username of the person who requested tracking (optional for legacy entries). */
  requestedBy?: string;
}

export type ExtensionRegistry = ExtensionEntry[];

export interface ReleaseEntry {
  version: string;
  publishedAt: string; // ISO 8601
  installsAtRelease: number; // marketplace.installs at time of fetch (approximation)
  /** Open VSX downloads at time of first detection (approximation), or null if the extension isn't on Open VSX. */
  downloadsAtRelease?: number | null;
  changelog?: string; // not available from API — left empty, filled manually
}

export interface EventAnnotation {
  ts: string; // ISO 8601
  label: string; // e.g. "Blog post on Dev.to"
  type: 'release' | 'marketing' | 'blog' | 'social' | 'other';
  url?: string;
}

export interface MonthlyRollup {
  yearMonth: string; // "2026-05"
  installsEndOfMonth: number;
  installsGained: number;
  avgRating: number;
  ratingCountEndOfMonth: number;
  openVsxDownloadsEndOfMonth: number;
  dataPointsInMonth: number;
  /** GitHub stars at end of month */
  starsEndOfMonth: number;
  /** GitHub forks at end of month */
  forksEndOfMonth: number;
  /** GitHub contributions at end of month */
  contributionsEndOfMonth: number;
}

export interface CompetitorEntry {
  id: string;          // "ms-python.python"
  displayName: string; // fetched from API
  data: DataPoint[];   // single data point with current stats
  releases: ReleaseEntry[];
}