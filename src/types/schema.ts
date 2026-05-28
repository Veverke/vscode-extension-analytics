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
}

export type ExtensionRegistry = ExtensionEntry[];
