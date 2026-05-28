import type { DataPoint } from '../src/types/schema.js';
import { fileURLToPath } from 'node:url';
import { readExtensionRegistry, appendDataPoint, ensureDataDir } from './storage.js';
import { fetchMarketplaceStats } from './marketplace.js';
import { fetchOpenVsxStats } from './openvsx.js';

export async function runCollector(): Promise<number> {
  ensureDataDir();
  const registry = readExtensionRegistry();

  if (registry.length === 0) {
    console.warn('[collector] No extensions in registry. Run discover first.');
    return 0;
  }

  const results = await Promise.allSettled(
    registry.map(async (entry) => {
      const [marketplace, openVsx] = await Promise.all([
        fetchMarketplaceStats(entry.id),
        fetchOpenVsxStats(entry.namespace, entry.name),
      ]);

      const point: DataPoint = {
        ts: new Date().toISOString(),
        marketplace,
        openVsx,
      };

      appendDataPoint(entry.id, point);
      console.log(`[collector] Collected data for ${entry.id}`);
      return entry.id;
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `[collector] Summary: ${succeeded} succeeded, ${failed} failed out of ${registry.length} extensions.`
  );

  results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .forEach((r) => console.error('[collector] Error:', r.reason));

  return succeeded === 0 ? 1 : 0;
}

/* v8 ignore next 7 */
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runCollector()
    .then((code) => { process.exitCode = code; })
    .catch((err: unknown) => {
      console.error('[collector] Fatal error:', err);
      process.exitCode = 1;
    });
}
