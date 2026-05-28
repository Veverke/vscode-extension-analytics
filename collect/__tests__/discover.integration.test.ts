// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { discoverVSCodeExtensions } from '../github.js';

const isIntegration = process.env.INTEGRATION === 'true';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';
// Discover integration tests require a token — unauthenticated requests are
// rate-limited to 60/hour and will fail in CI without auth.
const hasToken = GITHUB_TOKEN.length > 0;

describe.skipIf(!isIntegration || !hasToken)('discover integration', () => {
  it('discoverVSCodeExtensions — finds Veverke.chatwizard in live repos', async () => {
    const results = await discoverVSCodeExtensions('Veverke', GITHUB_TOKEN);
    const ids = results.map((r) => r.extensionId);
    expect(ids).toContain('Veverke.chatwizard');
  }, 30000);

  it('discoverVSCodeExtensions — repos without package.json do not cause crash', async () => {
    await expect(
      discoverVSCodeExtensions('Veverke', GITHUB_TOKEN)
    ).resolves.not.toThrow();
  }, 30000);
});
