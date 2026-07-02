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

export interface DataPoint {
  ts: string;
  marketplace: MarketplaceSnapshot;
  openVsx: OpenVsxSnapshot | null;
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
}

export interface CompetitorEntry {
  id: string;          // "ms-python.python"
  displayName: string; // fetched from API
  data: DataPoint[];   // single data point with current stats
  releases: ReleaseEntry[];
}