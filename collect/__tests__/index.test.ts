// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

vi.mock('../storage.js', () => ({
  readExtensionRegistry: vi.fn(),
  appendDataPoint: vi.fn(),
  ensureDataDir: vi.fn(),
  readReleases: vi.fn().mockReturnValue([]),
  writeReleases: vi.fn(),
  readTimeSeries: vi.fn().mockReturnValue([]),
  getDataDir: vi.fn().mockReturnValue('/tmp'),
}));

vi.mock('../marketplace.js', () => ({
  fetchMarketplaceStats: vi.fn(),
  fetchReleaseHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('../openvsx.js', () => ({
  fetchOpenVsxStats: vi.fn(),
}));

vi.mock('../github-stats.js', () => ({
  fetchGitHubStats: vi.fn().mockResolvedValue({ stars: 10, forks: 3, contributions: 25 }),
}));

import { runCollector, mergeReleases } from '../index.js';
import * as storage from '../storage.js';
import * as marketplace from '../marketplace.js';
import * as openvsx from '../openvsx.js';
import type { ExtensionEntry, MarketplaceSnapshot, OpenVsxSnapshot } from '../../src/types/schema.js';

const mockEntry: ExtensionEntry = {
  id: 'Veverke.chatwizard',
  namespace: 'Veverke',
  name: 'chatwizard',
  displayName: 'Chat Wizard',
  githubRepo: 'Veverke/chatwizard',
  trackedSince: '2026-01-01T00:00:00Z',
};

const mockMarketplace: MarketplaceSnapshot = {
  installs: 1000,
  updates: 200,
  averageRating: 4.5,
  ratingCount: 5,
  trendingWeekly: 0.1,
  trendingMonthly: 0.5,
};

const mockOpenVsx: OpenVsxSnapshot = {
  downloads: 500,
  averageRating: null,
  ratingCount: 0,
};

describe('collector index', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-test-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns exit code 0 when registry is empty', async () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);
    const code = await runCollector();
    expect(code).toBe(0);
  });

  it('returns exit code 0 when at least one extension succeeds', async () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([mockEntry]);
    vi.mocked(marketplace.fetchMarketplaceStats).mockResolvedValue(mockMarketplace);
    vi.mocked(marketplace.fetchReleaseHistory).mockResolvedValue([]);
    vi.mocked(openvsx.fetchOpenVsxStats).mockResolvedValue(mockOpenVsx);
    vi.mocked(storage.readReleases).mockReturnValue([]);

    const code = await runCollector();
    expect(code).toBe(0);
    expect(storage.appendDataPoint).toHaveBeenCalledOnce();
  });

  it('returns exit code 1 when all extensions fail', async () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([mockEntry]);
    vi.mocked(marketplace.fetchMarketplaceStats).mockRejectedValue(
      new Error('Network error')
    );

    const code = await runCollector();
    expect(code).toBe(1);
  });

  it('constructs DataPoint with correct ts format', async () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([mockEntry]);
    vi.mocked(marketplace.fetchMarketplaceStats).mockResolvedValue(mockMarketplace);
    vi.mocked(marketplace.fetchReleaseHistory).mockResolvedValue([]);
    vi.mocked(openvsx.fetchOpenVsxStats).mockResolvedValue(null);
    vi.mocked(storage.readReleases).mockReturnValue([]);

    await runCollector();

    const appendCall = vi.mocked(storage.appendDataPoint).mock.calls[0];
    expect(appendCall[0]).toBe('Veverke.chatwizard');
    expect(appendCall[1].ts).toBeTruthy();
    expect(new Date(appendCall[1].ts).toISOString()).toBe(appendCall[1].ts);
    expect(appendCall[1].openVsx).toBeNull();
  });

  it('writes releases when new versions are found', async () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([mockEntry]);
    vi.mocked(marketplace.fetchMarketplaceStats).mockResolvedValue(mockMarketplace);
    vi.mocked(marketplace.fetchReleaseHistory).mockResolvedValue([
      { version: '1.0.0', publishedAt: '2026-01-01T00:00:00Z', installsAtRelease: 0 },
    ]);
    vi.mocked(openvsx.fetchOpenVsxStats).mockResolvedValue(mockOpenVsx);
    vi.mocked(storage.readReleases).mockReturnValue([]);

    const code = await runCollector();
    expect(code).toBe(0);
    expect(storage.writeReleases).toHaveBeenCalledOnce();
  });

  it('does not write releases when no new versions', async () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([mockEntry]);
    vi.mocked(marketplace.fetchMarketplaceStats).mockResolvedValue(mockMarketplace);
    vi.mocked(marketplace.fetchReleaseHistory).mockResolvedValue([
      { version: '1.0.0', publishedAt: '2026-01-01T00:00:00Z', installsAtRelease: 0 },
    ]);
    vi.mocked(openvsx.fetchOpenVsxStats).mockResolvedValue(mockOpenVsx);
    vi.mocked(storage.readReleases).mockReturnValue([
      { version: '1.0.0', publishedAt: '2026-01-01T00:00:00Z', installsAtRelease: 100 },
    ]);

    const code = await runCollector();
    expect(code).toBe(0);
    expect(storage.writeReleases).not.toHaveBeenCalled();
  });

  it('handles GitHub stats fetch failure gracefully', async () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([mockEntry]);
    vi.mocked(marketplace.fetchMarketplaceStats).mockResolvedValue(mockMarketplace);
    vi.mocked(marketplace.fetchReleaseHistory).mockResolvedValue([]);
    vi.mocked(openvsx.fetchOpenVsxStats).mockResolvedValue(mockOpenVsx);
    vi.mocked(storage.readReleases).mockReturnValue([]);

    // Import the mocked module to override the mock
    const githubStats = await import('../github-stats.js');
    vi.mocked(githubStats.fetchGitHubStats).mockRejectedValue(new Error('API error'));

    const code = await runCollector();
    expect(code).toBe(0);
    expect(storage.appendDataPoint).toHaveBeenCalledOnce();
  });
});

describe('mergeReleases', () => {
  it('new version detection — only appends versions not already stored', () => {
    const stored = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 50 },
    ];
    const fetched = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 0 },
      { version: '1.1.0', publishedAt: '2026-04-01T00:00:00.000Z', installsAtRelease: 0 },
    ];
    const result = mergeReleases(stored, fetched, 120);

    expect(result).toHaveLength(2);
    expect(result[0].installsAtRelease).toBe(50);
    expect(result[1].version).toBe('1.1.0');
    expect(result[1].installsAtRelease).toBe(120);
  });

  it('no new versions — returns stored unchanged', () => {
    const stored = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 50 },
    ];
    const fetched = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 0 },
    ];
    const result = mergeReleases(stored, fetched, 120);
    expect(result).toHaveLength(1);
    expect(result[0].installsAtRelease).toBe(50);
  });

  it('empty stored — all fetched are new with currentInstalls', () => {
    const stored: import('../../src/types/schema.js').ReleaseEntry[] = [];
    const fetched = [
      { version: '1.0.0', publishedAt: '2026-03-18T00:00:00.000Z', installsAtRelease: 0 },
      { version: '1.1.0', publishedAt: '2026-04-01T00:00:00.000Z', installsAtRelease: 0 },
    ];
    const result = mergeReleases(stored, fetched, 200);
    expect(result).toHaveLength(2);
    expect(result[0].installsAtRelease).toBe(200);
    expect(result[1].installsAtRelease).toBe(200);
  });
});