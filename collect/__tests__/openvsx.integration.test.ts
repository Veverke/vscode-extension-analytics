// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { fetchOpenVsxStats } from '../openvsx.js';

const isIntegration = process.env.INTEGRATION === 'true';

describe.skipIf(!isIntegration)('openvsx integration', () => {
  it('fetchOpenVsxStats — live call returns valid OpenVsxSnapshot', async () => {
    const result = await fetchOpenVsxStats('Veverke', 'chatwizard');

    expect(result).not.toBeNull();
    expect(result!.downloads).toBeGreaterThanOrEqual(0);
    expect(typeof result!.downloads).toBe('number');
    expect(result!.downloads).not.toBeNaN();
  });
});
