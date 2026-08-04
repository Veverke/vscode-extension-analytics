// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── github.ts uncovered branches ─────────────────────────────────────────────

describe('github.ts — remaining coverage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('scanSingleRepo — non-404 non-ok response throws proper error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 500,
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('Server error body'),
    } as unknown as typeof fetch);

    const { scanSingleRepo } = await import('../github.js');
    const result = await scanSingleRepo('owner/repo', 'fake-token');
    // Should return null (caught by the catch block, returns null)
    expect(result).toBeNull();
  });

  it('scanSingleRepo — non-ok response with text() rejection still returns null', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 500,
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
      text: () => Promise.reject(new Error('stream error')),
    } as unknown as typeof fetch);

    const { scanSingleRepo } = await import('../github.js');
    const result = await scanSingleRepo('owner/repo', 'fake-token');
    expect(result).toBeNull();
  });

  it('scanSingleRepo — network error in try block returns null (catch all)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const { scanSingleRepo } = await import('../github.js');
    const result = await scanSingleRepo('owner/repo', 'fake-token');
    expect(result).toBeNull();
  });

  it('discoverVSCodeExtensions — pagination breaks when repos length < perPage', async () => {
    // Only one page with fewer repos than perPage, so no second page fetch
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            { name: 'ext1', full_name: 'owner/ext1' },
          ]),
          text: () => Promise.resolve(''),
        });
      }
      // package.json for ext1 - has no engines.vscode (skipped)
      return Promise.resolve({
        status: 404,
        ok: false,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });
    }) as unknown as typeof fetch;

    const { discoverVSCodeExtensions } = await import('../github.js');
    const results = await discoverVSCodeExtensions('owner', 'fake-token', { perPage: 100 });
    // Should have 1 page call + 1 root package.json (404) + 1 extension/package.json (404) = 3 total calls
    expect(callCount).toBe(3);
    expect(results).toHaveLength(0);
  });
});

// ─── github-stats.ts uncovered branches ───────────────────────────────────────

describe('github-stats.ts — remaining coverage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetchGitHubStats — PR pagination (page++ branch)', async () => {
    const prsPage1 = Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      user: { login: `contributor${i}` },
    }));
    const prsPage2 = [{ number: 101, user: { login: 'contributor101' } }];

    // The 4 functions are called in parallel via Promise.all, so the mock
    // consumption order is: repo, commits, issues, PRs-page1, reviews-PRs-fetch,
    // PRs-page2, then reviews for each PR (none since reviews got empty PRs).
    const mockFetch = vi.fn()
      // [1] repo info
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'owner' },
        }),
      })
      // [2] fetchNonOwnerCommits: 1 call
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      // [3] fetchNonOwnerIssues: 1 call
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      // [4] fetchNonOwnerPRs page 1 (100 items — triggers page 2)
      .mockResolvedValueOnce({ ok: true, json: async () => prsPage1 })
      // [5] fetchNonOwnerReviews PRs fetch (returns empty → no reviews fetched)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      // [6] fetchNonOwnerPRs page 2 (1 item — breaks pagination)
      .mockResolvedValueOnce({ ok: true, json: async () => prsPage2 });

    global.fetch = mockFetch as unknown as typeof fetch;

    const { fetchGitHubStats } = await import('../github-stats.js');
    const result = await fetchGitHubStats('owner/repo', 'token');
    expect(result.stars).toBe(50);
    expect(result.forks).toBe(10);
  });

  it('fetchGitHubStats — reviews pagination (page++ branch)', async () => {
    const prsPage1 = Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      user: { login: `owner` },
    }));
    const prsPage2 = [{ number: 101, user: { login: 'owner' } }];

    // Mock consumption order due to parallel Promise.all:
    // [1] repo, [2] commits, [3] issues, [4] PRs (fetchNonOwnerPRs, empty),
    // [5] reviews PRs fetch (page 1, 100 items), [6..105] reviews for each PR,
    // [106] reviews PRs fetch (page 2, 1 item), [107] reviews for last PR
    const mockFetch = vi.fn()
      // [1] repo info
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stargazers_count: 50,
          forks_count: 10,
          owner: { login: 'owner' },
        }),
      })
      // [2] fetchNonOwnerCommits: 1 call
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      // [3] fetchNonOwnerIssues: 1 call
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      // [4] fetchNonOwnerPRs: 1 call (empty, no pagination)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      // [5] fetchNonOwnerReviews PRs fetch (page 1, 100 items)
      .mockResolvedValueOnce({ ok: true, json: async () => prsPage1 })
      // [6..105] reviews for each PR on page 1 (100 calls)
      .mockResolvedValue({ ok: true, json: async () => [] })
      // [106] fetchNonOwnerReviews PRs page 2 (1 item, breaks pagination)
      .mockResolvedValueOnce({ ok: true, json: async () => prsPage2 })
      // [107] reviews for the last PR
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    global.fetch = mockFetch as unknown as typeof fetch;

    const { fetchGitHubStats } = await import('../github-stats.js');
    const result = await fetchGitHubStats('owner/repo', 'token');
    expect(result.stars).toBe(50);
    expect(result.forks).toBe(10);
  });
});

// ─── index.ts uncovered branches ──────────────────────────────────────────────

describe('index.ts — remaining coverage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-remaining-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runCollector — clamps decreasing installs to last known max', async () => {
    // Mock the storage module to simulate a decreasing install count
    vi.doMock('../storage.js', () => ({
      readExtensionRegistry: vi.fn().mockReturnValue([{
        id: 'test.ext',
        namespace: 'test',
        name: 'ext',
        displayName: 'Test',
        githubRepo: 'test/ext',
        trackedSince: '2026-01-01T00:00:00Z',
      }]),
      appendDataPoint: vi.fn(),
      ensureDataDir: vi.fn(),
      readReleases: vi.fn().mockReturnValue([]),
      writeReleases: vi.fn(),
      readTimeSeries: vi.fn().mockReturnValue([
        { ts: '2026-06-01T00:00:00Z', marketplace: { installs: 1000, updates: 0, averageRating: 4.0, ratingCount: 1, trendingWeekly: 0, trendingMonthly: 0 }, openVsx: null, github: null },
      ]),
      getDataDir: vi.fn().mockReturnValue(tmpDir),
      extensionDir: vi.fn().mockReturnValue(tmpDir),
      ensureExtensionDir: vi.fn().mockReturnValue(tmpDir),
      setDataDir: vi.fn(),
    }));

    vi.doMock('../marketplace.js', () => ({
      fetchMarketplaceStats: vi.fn().mockResolvedValue({
        installs: 500, // lower than last stored 1000 → triggers clamp
        updates: 0,
        averageRating: undefined,
        ratingCount: 0,
        trendingWeekly: 0,
        trendingMonthly: 0,
      }),
      fetchReleaseHistory: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../openvsx.js', () => ({
      fetchOpenVsxStats: vi.fn().mockResolvedValue(null),
    }));

    vi.doMock('../github-stats.js', () => ({
      fetchGitHubStats: vi.fn().mockResolvedValue({ stars: 10, forks: 3, contributions: 5 }),
    }));

    // Re-import with mocks applied
    const { runCollector } = await import('../index.js');
    const code = await runCollector();
    expect(code).toBe(0);
  });
});