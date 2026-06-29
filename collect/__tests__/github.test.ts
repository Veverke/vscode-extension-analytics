// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discoverVSCodeExtensions, scanSingleRepo, discoverFromRepos } from '../github.js';
import githubReposFixture from '../../fixtures/data/github-repos-response.json';
import extensionPkgFixture from '../../fixtures/data/package.json-extension.json';
import nonExtensionPkgFixture from '../../fixtures/data/package.json-non-extension.json';

function mockFetch(...responses: Array<{ status?: number; body: unknown }>) {
  let callIndex = 0;
  global.fetch = vi.fn().mockImplementation(() => {
    const response = responses[callIndex++] ?? { status: 200, body: [] };
    const status = response.status ?? 200;
    return Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      json: () => Promise.resolve(response.body),
      text: () =>
        Promise.resolve(
          typeof response.body === 'string' ? response.body : JSON.stringify(response.body)
        ),
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

  it('discoverVSCodeExtensions — works without a token (no Authorization header)', async () => {
    mockFetch(
      { body: [githubReposFixture[0]] },
      { body: extensionPkgFixture },
      { body: [] }
    );

    // Empty token — should still discover extensions using unauthenticated requests
    const results = await discoverVSCodeExtensions('Veverke', '', { perPage: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].extensionId).toBe('Veverke.chatwizard');
  });

  it('discoverVSCodeExtensions — skips repos where publisher or name are absent', async () => {
    const pkgNoPublisher = {
      name: 'package.json',
      content: Buffer.from(
        JSON.stringify({
          // no publisher, no name, no displayName
          engines: { vscode: '^1.85.0' },
        })
      ).toString('base64'),
      encoding: 'base64',
    };

    mockFetch(
      { body: [{ name: 'mystery', full_name: 'Veverke/mystery', owner: { login: 'Veverke' } }] },
      { body: pkgNoPublisher },
      { body: [] }
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', { perPage: 1 });
    expect(results).toHaveLength(0);
  });

  it('discoverVSCodeExtensions — throws when repos response contains an error message', async () => {
    mockFetch(
      { body: { message: 'API rate limit exceeded' } }, // non-array error response
    );

    await expect(
      discoverVSCodeExtensions('Veverke', 'fake-token')
    ).rejects.toThrow('GitHub API error: API rate limit exceeded');
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

  it('discoverVSCodeExtensions — silently skips repo on non-ok package.json response', async () => {
    mockFetch(
      { body: [githubReposFixture[0]] },           // repos page 1
      { status: 500, body: 'Internal Server Error' }, // package.json: 500 error
      { body: [] },                                 // page 2 empty
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', { perPage: 1 });
    expect(results).toHaveLength(0);
  });

  it('discoverVSCodeExtensions — silently skips repo when package.json response body is not parseable JSON', async () => {
    let callIndex = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve([githubReposFixture[0]]),
          text: () => Promise.resolve(''),
        });
      }
      if (callIndex === 2) {
        return Promise.resolve({
          status: 200,
          ok: true,
          // json() throws — simulates a corrupted response body
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
          text: () => Promise.resolve(''),
        });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve(''),
      });
    }) as unknown as typeof fetch;

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', { perPage: 1 });
    expect(results).toHaveLength(0);
  });

  it('discoverVSCodeExtensions — silently skips repo when package.json content is invalid base64/JSON', async () => {
    // 'bm90IHZhbGlkIGpzb24=' is base64 for 'not valid json' — fails JSON.parse
    const invalidContentPkg = {
      name: 'package.json',
      content: 'bm90IHZhbGlkIGpzb24=',
      encoding: 'base64',
    };

    mockFetch(
      { body: [githubReposFixture[0]] },
      { body: invalidContentPkg },
      { body: [] },
    );

    const results = await discoverVSCodeExtensions('Veverke', 'fake-token', { perPage: 1 });
    expect(results).toHaveLength(0);
  });
});

describe('scanSingleRepo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns DiscoveredExtension when repo has engines.vscode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve(extensionPkgFixture),
    }) as unknown as typeof fetch;

    const result = await scanSingleRepo('Veverke/chatwizard', 'fake-token');
    expect(result).not.toBeNull();
    expect(result!.extensionId).toBe('Veverke.chatwizard');
    expect(result!.githubRepo).toBe('Veverke/chatwizard');
  });

  it('returns null when repo has no package.json (404)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      json: () => Promise.resolve({ message: 'Not Found' }),
      text: () => Promise.resolve('Not Found'),
    }) as unknown as typeof fetch;

    const result = await scanSingleRepo('Veverke/nonexistent', 'fake-token');
    expect(result).toBeNull();
  });

  it('returns null when repo is not a VS Code extension', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve(nonExtensionPkgFixture),
    }) as unknown as typeof fetch;

    const result = await scanSingleRepo('Veverke/some-website', 'fake-token');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const result = await scanSingleRepo('Veverke/chatwizard', 'fake-token');
    expect(result).toBeNull();
  });
});

describe('discoverFromRepos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns extensions from all valid repos', async () => {
    let callIndex = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(extensionPkgFixture) });
      }
      return Promise.resolve({ status: 404, ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    }) as unknown as typeof fetch;

    const results = await discoverFromRepos(['Veverke/chatwizard', 'Veverke/nope'], 'fake-token');
    expect(results).toHaveLength(1);
    expect(results[0].extensionId).toBe('Veverke.chatwizard');
  });

  it('returns empty when no repos are valid extensions', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    }) as unknown as typeof fetch;

    const results = await discoverFromRepos(['org/foo', 'org/bar'], 'fake-token');
    expect(results).toHaveLength(0);
  });

  it('handles empty input list', async () => {
    const results = await discoverFromRepos([], 'fake-token');
    expect(results).toHaveLength(0);
  });

  it('handles rejected promise from scanSingleRepo (unexpected error)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Unexpected crash'));
    const results = await discoverFromRepos(['org/crasher'], 'fake-token');
    expect(results).toHaveLength(0);
  });
});
