// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { mergeRegistry, runDiscover, scanRegistryRepos } from '../discover.js';
import { setDataDir } from '../storage.js';
import type { ExtensionEntry } from '../../src/types/schema.js';
import type { DiscoveredExtension } from '../github.js';

vi.mock('../github.js', () => ({
  discoverFromRepos: vi.fn(),
}));

import * as github from '../github.js';

const existingEntry: ExtensionEntry = {
  id: 'Veverke.chatwizard',
  namespace: 'Veverke',
  name: 'chatwizard',
  displayName: 'Chat Wizard',
  githubRepo: 'Veverke/chatwizard',
  trackedSince: '2026-01-01T00:00:00Z',
};

const discoveredChatwizard: DiscoveredExtension = {
  githubRepo: 'Veverke/chatwizard',
  extensionId: 'Veverke.chatwizard',
  namespace: 'Veverke',
  name: 'chatwizard',
  displayName: 'Chat Wizard',
};

const discoveredNewExt: DiscoveredExtension = {
  githubRepo: 'Veverke/new-ext',
  extensionId: 'Veverke.new-ext',
  namespace: 'Veverke',
  name: 'new-ext',
  displayName: 'New Extension',
};

describe('mergeRegistry', () => {
  it('does not add duplicate when extension already in registry', () => {
    const registry = [existingEntry];
    const result = mergeRegistry(registry, [discoveredChatwizard]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('Veverke.chatwizard');
  });

  it('adds new extension to empty registry', () => {
    const result = mergeRegistry([], [discoveredChatwizard]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('Veverke.chatwizard');
    expect(result[0].namespace).toBe('Veverke');
    expect(result[0].name).toBe('chatwizard');
    expect(result[0].displayName).toBe('Chat Wizard');
    expect(result[0].githubRepo).toBe('Veverke/chatwizard');
    expect(result[0].trackedSince).toBeTruthy();
  });

  it('adds only new extension, leaves existing unchanged', () => {
    const registry = [existingEntry];
    const result = mergeRegistry(registry, [discoveredChatwizard, discoveredNewExt]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(existingEntry);
    expect(result[1].id).toBe('Veverke.new-ext');
  });

  it('no discovered extensions returns registry unchanged', () => {
    const registry = [existingEntry];
    const result = mergeRegistry(registry, []);
    expect(result).toHaveLength(1);
    expect(result).toEqual(registry);
  });
});

describe('runDiscover', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discover-test-'));
    setDataDir(tmpDir);
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('adds new extension from registry scan', async () => {
    // Seed registry with an entry that has a githubRepo to trigger scan
    fs.writeFileSync(
      path.join(tmpDir, 'extensions.json'),
      JSON.stringify([existingEntry], null, 2)
    );
    vi.mocked(github.discoverFromRepos).mockResolvedValue([discoveredChatwizard]);

    await runDiscover('fake-token');

    const registry = JSON.parse(fs.readFileSync(path.join(tmpDir, 'extensions.json'), 'utf-8')) as ExtensionEntry[];
    expect(registry).toHaveLength(1);
    expect(registry[0].id).toBe('Veverke.chatwizard');
  });

  it('adds new extension (registry-only scan)', async () => {
    vi.mocked(github.discoverFromRepos).mockResolvedValue([discoveredChatwizard]);

    // Write a registry entry with a githubRepo to trigger registry scan
    fs.writeFileSync(
      path.join(tmpDir, 'extensions.json'),
      JSON.stringify([existingEntry], null, 2)
    );

    await runDiscover('fake-token');

    const registry = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'extensions.json'), 'utf-8')
    ) as ExtensionEntry[];
    expect(registry).toHaveLength(1);
    // Already existed — no new entries added from discovered (id matches)
    expect(registry[0].id).toBe('Veverke.chatwizard');
  });

  it('does not duplicate existing entries on re-run', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'extensions.json'),
      JSON.stringify([existingEntry], null, 2)
    );
    vi.mocked(github.discoverFromRepos).mockResolvedValue([discoveredChatwizard]);

    await runDiscover('fake-token');

    const registry = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'extensions.json'), 'utf-8')
    ) as ExtensionEntry[];
    expect(registry).toHaveLength(1);
  });

  it('scans registry repos and discovers new extensions', async () => {
    // Pre-populate registry with an entry that has a githubRepo for registry scan
    fs.writeFileSync(
      path.join(tmpDir, 'extensions.json'),
      JSON.stringify([existingEntry], null, 2)
    );
    vi.mocked(github.discoverFromRepos).mockResolvedValue([discoveredNewExt]);

    await runDiscover('fake-token');

    const registry = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'extensions.json'), 'utf-8')
    ) as ExtensionEntry[];
    // existingEntry already exists, discoveredNewExt is new from registry scan → 2 total
    expect(registry).toHaveLength(2);
    expect(registry.map((e) => e.id)).toContain('Veverke.chatwizard');
    expect(registry.map((e) => e.id)).toContain('Veverke.new-ext');
  });
});

describe('scanRegistryRepos', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-registry-test-'));
    setDataDir(tmpDir);
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns discovered extensions from registry githubRepo fields', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'extensions.json'),
      JSON.stringify([existingEntry], null, 2)
    );
    vi.mocked(github.discoverFromRepos).mockResolvedValue([discoveredChatwizard]);

    const results = await scanRegistryRepos('fake-token');

    expect(results).toHaveLength(1);
    expect(results[0].extensionId).toBe('Veverke.chatwizard');
    expect(github.discoverFromRepos).toHaveBeenCalledWith(
      ['Veverke/chatwizard'],
      'fake-token'
    );
  });

  it('returns empty array when registry has no githubRepo values', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'extensions.json'),
      JSON.stringify([
        { ...existingEntry, githubRepo: '' },
      ], null, 2)
    );

    const results = await scanRegistryRepos('fake-token');

    expect(results).toHaveLength(0);
    expect(github.discoverFromRepos).not.toHaveBeenCalled();
  });

  it('returns empty array when registry is empty', async () => {
    const results = await scanRegistryRepos('fake-token');
    expect(results).toHaveLength(0);
    expect(github.discoverFromRepos).not.toHaveBeenCalled();
  });
});
