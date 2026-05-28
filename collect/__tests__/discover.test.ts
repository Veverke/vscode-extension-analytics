// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { mergeRegistry, runDiscover } from '../discover.js';
import { setDataDir } from '../storage.js';
import type { ExtensionEntry } from '../../src/types/schema.js';
import type { DiscoveredExtension } from '../github.js';

vi.mock('../github.js', () => ({
  discoverVSCodeExtensions: vi.fn(),
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

  it('adds new extension to empty registry', async () => {
    vi.mocked(github.discoverVSCodeExtensions).mockResolvedValue([
      discoveredChatwizard,
    ]);

    await runDiscover('Veverke', 'fake-token');

    const registryFile = path.join(tmpDir, 'extensions.json');
    const registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8')) as ExtensionEntry[];
    expect(registry).toHaveLength(1);
    expect(registry[0].id).toBe('Veverke.chatwizard');
  });

  it('does not duplicate existing entries on re-run', async () => {
    // Write existing registry
    fs.writeFileSync(
      path.join(tmpDir, 'extensions.json'),
      JSON.stringify([existingEntry], null, 2)
    );
    vi.mocked(github.discoverVSCodeExtensions).mockResolvedValue([
      discoveredChatwizard,
    ]);

    await runDiscover('Veverke', 'fake-token');

    const registry = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'extensions.json'), 'utf-8')
    ) as ExtensionEntry[];
    expect(registry).toHaveLength(1);
  });
});
