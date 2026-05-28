// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { discoverVSCodeExtensions } from '../github.js';

const isIntegration = process.env.INTEGRATION === 'true';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';

describe.skipIf(!isIntegration)('discover integration', () => {
  it('discoverVSCodeExtensions — finds Veverke.chatwizard in live repos', async () => {
    const results = await discoverVSCodeExtensions('Veverke', GITHUB_TOKEN);
    const ids = results.map((r) => r.extensionId);
    expect(ids).toContain('Veverke.chatwizard');
  });

  it('discoverVSCodeExtensions — repos without package.json do not cause crash', async () => {
    await expect(
      discoverVSCodeExtensions('Veverke', GITHUB_TOKEN)
    ).resolves.not.toThrow();
  });
});
