// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

vi.mock('../storage.js', () => ({
  readExtensionRegistry: vi.fn(),
  appendDataPoint: vi.fn(),
  ensureDataDir: vi.fn(),
}));

vi.mock('../marketplace.js', () => ({
  fetchMarketplaceStats: vi.fn(),
}));

vi.mock('../openvsx.js', () => ({
  fetchOpenVsxStats: vi.fn(),
}));

import { runCollector } from '../index.js';
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
    vi.mocked(openvsx.fetchOpenVsxStats).mockResolvedValue(mockOpenVsx);

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
    vi.mocked(openvsx.fetchOpenVsxStats).mockResolvedValue(null);

    await runCollector();

    const appendCall = vi.mocked(storage.appendDataPoint).mock.calls[0];
    expect(appendCall[0]).toBe('Veverke.chatwizard');
    expect(appendCall[1].ts).toBeTruthy();
    expect(new Date(appendCall[1].ts).toISOString()).toBe(appendCall[1].ts);
    expect(appendCall[1].openVsx).toBeNull();
  });
});
