// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { setDataDir, writeExtensionRegistry } from '../storage.js';
import { runCollector } from '../index.js';
import type { DataPoint } from '../../src/types/schema.js';

const isIntegration = process.env.INTEGRATION === 'true';

describe.skipIf(!isIntegration)('collect integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-integration-'));
    setDataDir(tmpDir);
    writeExtensionRegistry([
      {
        id: 'Veverke.chatwizard',
        namespace: 'Veverke',
        name: 'chatwizard',
        displayName: 'Chat Wizard',
        githubRepo: 'Veverke/chatwizard',
        trackedSince: new Date().toISOString(),
      },
    ]);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('full collect run appends DataPoint with correct shape', async () => {
    const exitCode = await runCollector();
    expect(exitCode).toBe(0);

    const dataFile = path.join(tmpDir, 'Veverke.chatwizard.json');
    expect(fs.existsSync(dataFile)).toBe(true);

    const points = JSON.parse(fs.readFileSync(dataFile, 'utf-8')) as DataPoint[];
    expect(points.length).toBeGreaterThanOrEqual(1);

    const point = points[0];
    expect(point.ts).toBeTruthy();
    expect(point.marketplace.installs).toBeGreaterThan(0);
    expect(typeof point.marketplace.installs).toBe('number');
  }, 30000);
});
