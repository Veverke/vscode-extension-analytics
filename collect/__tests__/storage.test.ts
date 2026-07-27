// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  readExtensionRegistry,
  writeExtensionRegistry,
  readTimeSeries,
  appendDataPoint,
  readReleases,
  writeReleases,
  setDataDir,
  getDataDir,
  ensureDataDir,
} from '../storage.js';
import type { DataPoint, ExtensionRegistry, ReleaseEntry } from '../../src/types/schema.js';

const chatwizardFixture = JSON.parse(
  fs.readFileSync(
    new URL('../../fixtures/data/Veverke.chatwizard.json', import.meta.url),
    'utf-8'
  )
) as unknown[];

function makePoint(ts: string): DataPoint {
  return {
    ts,
    marketplace: {
      installs: 100,
      updates: 50,
      averageRating: 4.5,
      ratingCount: 2,
      trendingWeekly: 0.1,
      trendingMonthly: 0.5,
    },
    openVsx: { downloads: 50, averageRating: null, ratingCount: 0 },
    github: null,
  };
}

describe('storage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'vscode-analytics-test-')
    );
    setDataDir(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getDataDir — returns current data directory', () => {
    expect(getDataDir()).toBe(tmpDir);
  });

  it('ensureDataDir — creates directory when it does not exist', () => {
    const newSubDir = path.join(tmpDir, 'new-subdir');
    setDataDir(newSubDir);
    expect(fs.existsSync(newSubDir)).toBe(false);
    ensureDataDir();
    expect(fs.existsSync(newSubDir)).toBe(true);
    // Restore
    setDataDir(tmpDir);
  });

  it('readExtensionRegistry — missing file returns []', () => {
    const result = readExtensionRegistry();
    expect(result).toEqual([]);
  });

  it('writeExtensionRegistry — round-trip write then read', () => {
    const registry: ExtensionRegistry = [
      {
        id: 'Veverke.chatwizard',
        namespace: 'Veverke',
        name: 'chatwizard',
        displayName: 'Chat Wizard',
        githubRepo: 'Veverke/chatwizard',
        trackedSince: '2026-01-01T00:00:00Z',
      },
    ];
    writeExtensionRegistry(registry);
    const result = readExtensionRegistry();
    expect(result).toEqual(registry);
  });

  it('readTimeSeries — missing file returns []', () => {
    const result = readTimeSeries('nonexistent.ext');
    expect(result).toEqual([]);
  });

  it('appendDataPoint — empty file: append one point; read back; assert length 1', () => {
    const point = makePoint('2026-05-28T00:00:00Z');
    appendDataPoint('test.ext', point);
    const result = readTimeSeries('test.ext');
    expect(result).toHaveLength(1);
    expect(result[0].ts).toBe('2026-05-28T00:00:00Z');
  });

  it('appendDataPoint — existing data: append to 30-point fixture; assert length 31', () => {
    // The new storage writes to data/<namespace>/<name>/data.json
    const extDir = path.join(tmpDir, 'Veverke', 'chatwizard');
    fs.mkdirSync(extDir, { recursive: true });
    fs.writeFileSync(
      path.join(extDir, 'data.json'),
      JSON.stringify(chatwizardFixture, null, 2)
    );

    const newPoint = makePoint('2026-05-28T00:00:00Z');
    appendDataPoint('Veverke.chatwizard', newPoint);
    const result = readTimeSeries('Veverke.chatwizard');

    expect(result).toHaveLength(chatwizardFixture.length + 1);
    expect(result[result.length - 1].ts).toBe('2026-05-28T00:00:00Z');
  });

  it('appendDataPoint — idempotency: two identical ts values both stored (no dedup)', () => {
    const point = makePoint('2026-05-28T00:00:00Z');
    appendDataPoint('test.ext', point);
    appendDataPoint('test.ext', point);
    const result = readTimeSeries('test.ext');
    expect(result).toHaveLength(2);
  });

  it('readReleases — missing file returns []', () => {
    const result = readReleases('nonexistent.ext');
    expect(result).toEqual([]);
  });

  it('writeReleases — round-trip write then read', () => {
    const releases: ReleaseEntry[] = [
      { version: '1.0.0', publishedAt: '2026-01-15T00:00:00Z', installsAtRelease: 100 },
      { version: '1.1.0', publishedAt: '2026-03-01T00:00:00Z', installsAtRelease: 250 },
    ];
    writeReleases('Veverke.chatwizard', releases);
    const result = readReleases('Veverke.chatwizard');
    expect(result).toEqual(releases);
  });

  it('readReleases — returns parsed content from existing file', () => {
    const releases: ReleaseEntry[] = [
      { version: '2.0.0', publishedAt: '2026-06-01T00:00:00Z', installsAtRelease: 500 },
    ];
    writeReleases('test.ext', releases);
    const result = readReleases('test.ext');
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe('2.0.0');
  });
});