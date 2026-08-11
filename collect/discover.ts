import type { ExtensionRegistry, ExtensionEntry } from '../src/types/schema.js';
import { fileURLToPath } from 'node:url';
import {
  readExtensionRegistry,
  writeExtensionRegistry,
} from './storage.js';
import { discoverFromRepos } from './github.js';

export function mergeRegistry(
  existing: ExtensionRegistry,
  discovered: DiscoveredExtension[]
): ExtensionRegistry {
  const existingIds = new Set(existing.map((e) => e.id));
  // Map of githubRepo → requestedBy from existing entries, so newly
  // discovered extensions from repos already in the registry inherit
  // the requester (e.g. monorepo with multiple extensions).
  const requestersByRepo = new Map<string, string>();
  for (const entry of existing) {
    if (entry.githubRepo && entry.requestedBy) {
      requestersByRepo.set(entry.githubRepo.toLowerCase(), entry.requestedBy);
    }
  }

  // Map discovered extensions by ID for quick lookup.
  const discoveredById = new Map(
    discovered.map((d) => [d.extensionId, d])
  );

  // Update existing entries with fresh metadata from the Discover scan.
  // This corrects displayName (e.g. from "chatwizard" to "Chat Wizard")
  // and other fields that may have been set with best-effort values when
  // the extension was added via a tracking request.
  const updatedExisting = existing.map((entry) => {
    const d = discoveredById.get(entry.id);
    if (!d) return entry;
    return {
      ...entry,
      namespace: d.namespace,
      name: d.name,
      displayName: d.displayName,
      githubRepo: d.githubRepo,
    };
  });

  const newEntries: ExtensionEntry[] = discovered
    .filter((d) => !existingIds.has(d.extensionId))
    .map((d) => ({
      id: d.extensionId,
      namespace: d.namespace,
      name: d.name,
      displayName: d.displayName,
      githubRepo: d.githubRepo,
      trackedSince: new Date().toISOString(),
      // Inherit the requester from an existing entry that shares the same repo.
      requestedBy: requestersByRepo.get(d.githubRepo.toLowerCase()),
    }));

  return [...updatedExisting, ...newEntries];
}

// Re-export for discoverFromRepos caller
import type { DiscoveredExtension } from './github.js';

/**
 * Scans the githubRepo fields of the existing registry to discover/verify
 * extension metadata (namespace, name, displayName) from each repo's package.json.
 * Only returns entries that are valid VS Code extensions.
 */
export async function scanRegistryRepos(
  githubToken: string
): Promise<DiscoveredExtension[]> {
  const registry = readExtensionRegistry();
  const repoFullNames = registry
    .map((e) => e.githubRepo)
    .filter((repo): repo is string => !!repo);

  if (repoFullNames.length === 0) {
    console.log('[discover] No githubRepo fields in registry to scan.');
    return [];
  }

  console.log(`[discover] Scanning ${repoFullNames.length} registry repo(s) for updates...`);
  return discoverFromRepos(repoFullNames, githubToken);
}

export async function runDiscover(
  githubToken: string
): Promise<void> {
  const discovered: DiscoveredExtension[] = [];

  // Scan registry's githubRepo fields for new/updated metadata
  const registryDiscovered = await scanRegistryRepos(githubToken);
  discovered.push(...registryDiscovered);

  const existing = readExtensionRegistry();
  const updated = mergeRegistry(existing, discovered);
  const added = updated.length - existing.length;

  writeExtensionRegistry(updated);
  console.log(
    `[discover] Added ${added} new extension(s). Registry now has ${updated.length} entries.`
  );
}

/* v8 ignore next 10 */
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const githubToken = process.env.GITHUB_TOKEN ?? '';
  runDiscover(githubToken).catch((err: unknown) => {
    console.error('[discover] Fatal error:', err);
    process.exitCode = 1;
  });
}
