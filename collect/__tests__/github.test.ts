// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discoverVSCodeExtensions } from '../github.js';
import githubReposFixture from '../../fixtures/data/github-repos-response.json';
import extensionPkgFixture from '../../fixtures/data/package.json-extension.json';
import nonExtensionPkgFixture from '../../fixtures/data/package.json-non-extension.json';

function mockFetch(...responses: Array<{ status?: number; body: unknown }>) {
  let callIndex = 0;
  global.fetch = vi.fn().mockImplementation(() => {
    const response = responses[callIndex++] ?? { status: 200, body: [] };
    return Promise.resolve({
      status: response.status ?? 200,
      json: () => Promise.resolve(response.body),
    });
  }) as unknown as typeof fetch;
}

describe('github', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('discoverVSCodeExtensions — filters by engines.vscode', async () => {
    mockFetch(
      { body: githubReposFixture },         // page 1 repos (2 repos)
      { body: extensionPkgFixture },         // chatwizard package.json (has engines.vscode)
      { body: nonExtensionPkgFixture },      // some-website package.json (no engines.vscode)
      { body: [] }                           // page 2 empty → stop
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', {
      perPage: 2,
    });

    expect(results).toHaveLength(1);
    expect(results[0].extensionId).toBe('Veverke.chatwizard');
  });

  it('discoverVSCodeExtensions — extracts correct fields', async () => {
    mockFetch(
      { body: [githubReposFixture[0]] },   // single repo
      { body: extensionPkgFixture },        // its package.json
      { body: [] }                          // page 2 empty
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', {
      perPage: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0].namespace).toBe('Veverke');
    expect(results[0].name).toBe('chatwizard');
    expect(results[0].displayName).toBe('Chat Wizard');
    expect(results[0].githubRepo).toBe('Veverke/chatwizard');
    expect(results[0].extensionId).toBe('Veverke.chatwizard');
  });

  it('discoverVSCodeExtensions — pagination returns extensions from both pages', async () => {
    const page1 = [
      { name: 'chatwizard', full_name: 'Veverke/chatwizard', owner: { login: 'Veverke' } },
      { name: 'other-ext', full_name: 'Veverke/other-ext', owner: { login: 'Veverke' } },
    ];

    const otherExtPkg = {
      name: 'package.json',
      content: Buffer.from(
        JSON.stringify({
          name: 'other-ext',
          publisher: 'Veverke',
          displayName: 'Other Extension',
          engines: { vscode: '^1.85.0' },
        })
      ).toString('base64'),
      encoding: 'base64',
    };

    mockFetch(
      { body: page1 },                  // page 1 returns 2 repos (= perPage=2, triggers page 2)
      { body: extensionPkgFixture },    // chatwizard pkg
      { body: otherExtPkg },            // other-ext pkg
      { body: [] }                      // page 2 empty
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', {
      perPage: 2,
    });

    expect(results).toHaveLength(2);
    const ids = results.map((r) => r.extensionId);
    expect(ids).toContain('Veverke.chatwizard');
    expect(ids).toContain('Veverke.other-ext');
  });

  it('discoverVSCodeExtensions — repo without package.json is silently skipped', async () => {
    mockFetch(
      { body: [githubReposFixture[1]] }, // some-website repo only
      { status: 404, body: { message: 'Not Found' } }, // no package.json
      { body: [] }                        // page 2 empty
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', {
      perPage: 1,
    });

    expect(results).toHaveLength(0);
  });

  it('discoverVSCodeExtensions — uses name as displayName fallback when displayName absent', async () => {
    const pkgWithoutDisplayName = {
      name: 'package.json',
      content: Buffer.from(
        JSON.stringify({
          name: 'nodisplay-ext',
          publisher: 'Veverke',
          // no displayName
          engines: { vscode: '^1.85.0' },
        })
      ).toString('base64'),
      encoding: 'base64',
    };

    mockFetch(
      { body: [{ name: 'nodisplay-ext', full_name: 'Veverke/nodisplay-ext', owner: { login: 'Veverke' } }] },
      { body: pkgWithoutDisplayName },
      { body: [] }
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', {
      perPage: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('nodisplay-ext');
  });

  it('discoverVSCodeExtensions — stops when repos response is not an array', async () => {
    mockFetch(
      { body: { message: 'API rate limit exceeded' } }, // non-array response
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token');
    expect(results).toHaveLength(0);
  });

  it('discoverVSCodeExtensions — silently skips repo when package.json fetch throws', async () => {
    let callIndex = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // page 1 repos
        return Promise.resolve({ status: 200, json: () => Promise.resolve([githubReposFixture[0]]) });
      }
      if (callIndex === 2) {
        // package.json fetch throws a network error
        return Promise.reject(new Error('Network timeout'));
      }
      // page 2 empty
      return Promise.resolve({ status: 200, json: () => Promise.resolve([]) });
    }) as unknown as typeof fetch;

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', {
      perPage: 1,
    });

    expect(results).toHaveLength(0);
  });
});
