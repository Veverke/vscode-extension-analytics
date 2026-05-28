import type { ExtensionRegistry, ExtensionEntry } from '../src/types/schema.js';
import type { DiscoveredExtension } from './github.js';
import { fileURLToPath } from 'node:url';
import {
  readExtensionRegistry,
  writeExtensionRegistry,
} from './storage.js';
import { discoverVSCodeExtensions } from './github.js';

export function mergeRegistry(
  existing: ExtensionRegistry,
  discovered: DiscoveredExtension[]
): ExtensionRegistry {
  const existingIds = new Set(existing.map((e) => e.id));
  const newEntries: ExtensionEntry[] = discovered
    .filter((d) => !existingIds.has(d.extensionId))
    .map((d) => ({
      id: d.extensionId,
      namespace: d.namespace,
      name: d.name,
      displayName: d.displayName,
      githubRepo: d.githubRepo,
      trackedSince: new Date().toISOString(),
    }));

  return [...existing, ...newEntries];
}

export async function runDiscover(
  githubUser: string,
  githubToken: string
): Promise<void> {
  console.log(`[discover] Scanning repos for GitHub user: ${githubUser}`);
  const discovered = await discoverVSCodeExtensions(githubUser, githubToken);
  console.log(`[discover] Scanned ${discovered.length} VS Code extensions`);

  const existing = readExtensionRegistry();
  const updated = mergeRegistry(existing, discovered);
  const added = updated.length - existing.length;

  writeExtensionRegistry(updated);
  console.log(
    `[discover] Added ${added} new extension(s). Registry now has ${updated.length} entries.`
  );
}

/* v8 ignore next 8 */
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const githubUser = process.env.GITHUB_USER;
  const githubToken = process.env.GITHUB_TOKEN ?? '';
  if (!githubUser) {
    console.error('GITHUB_USER env var is required');
    process.exitCode = 1;
  } else {
    runDiscover(githubUser, githubToken).catch((err: unknown) => {
      console.error('[discover] Fatal error:', err);
      process.exitCode = 1;
    });
  }
}
