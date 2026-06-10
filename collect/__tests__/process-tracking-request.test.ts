// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage.js', () => ({
  readExtensionRegistry: vi.fn(),
  writeExtensionRegistry: vi.fn(),
}));

import {
  parseIssueBody,
  validateExtensionId,
  validateGithubRepo,
  addExtensionToRegistry,
  processTrackingRequest,
} from '../process-tracking-request.js';
import * as storage from '../storage.js';
import type { ExtensionRegistry } from '../../src/types/schema.js';

const validIssueBody = [
  '### Extension ID',
  'Veverke.chatwizard',
  '',
  '### GitHub Repository (optional)',
  'Veverke/ChatWizard',
  '',
  '### Notes (optional)',
  'A great chat extension for VSCode.',
].join('\n');

const validIssueBodyNoRepo = [
  '### Extension ID',
  'Veverke.chatwizard',
  '',
  '### GitHub Repository (optional)',
  '',
  '### Notes (optional)',
].join('\n');

const existingRegistry: ExtensionRegistry = [
  {
    id: 'Existing.publisher',
    namespace: 'Existing',
    name: 'publisher',
    displayName: 'Existing Extension',
    githubRepo: 'Existing/publisher',
    trackedSince: '2026-01-01T00:00:00Z',
  },
];

describe('parseIssueBody', () => {
  it('parses extension ID from issue body', () => {
    const result = parseIssueBody(validIssueBody);
    expect(result.extensionId).toBe('Veverke.chatwizard');
  });

  it('parses GitHub repo from issue body', () => {
    const result = parseIssueBody(validIssueBody);
    expect(result.githubRepo).toBe('Veverke/ChatWizard');
  });

  it('parses notes from issue body', () => {
    const result = parseIssueBody(validIssueBody);
    expect(result.notes).toBe('A great chat extension for VSCode.');
  });

  it('returns undefined for missing GitHub repo', () => {
    const result = parseIssueBody(validIssueBodyNoRepo);
    expect(result.githubRepo).toBeUndefined();
  });

  it('returns empty string for missing extension ID', () => {
    const result = parseIssueBody('No extension ID here');
    expect(result.extensionId).toBe('');
  });

  it('handles empty body gracefully', () => {
    const result = parseIssueBody('');
    expect(result.extensionId).toBe('');
    expect(result.githubRepo).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });

  it('trims whitespace from field values', () => {
    const body = '### Extension ID\n  Veverke.chatwizard  \n';
    const result = parseIssueBody(body);
    expect(result.extensionId).toBe('Veverke.chatwizard');
  });

  it('parses extension ID with hyphens and underscores', () => {
    const body = '### Extension ID\nmy-publisher.my_extension';
    const result = parseIssueBody(body);
    expect(result.extensionId).toBe('my-publisher.my_extension');
  });
});

describe('validateExtensionId', () => {
  it('accepts valid publisher.name format', () => {
    const result = validateExtensionId('Veverke.chatwizard');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts IDs with hyphens and underscores', () => {
    expect(validateExtensionId('my-publisher.my_extension').valid).toBe(true);
    expect(validateExtensionId('publisher_123.extension-name').valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validateExtensionId('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Extension ID is required.');
  });

  it('rejects IDs without a publisher part', () => {
    const result = validateExtensionId('.justname');
    expect(result.valid).toBe(false);
  });

  it('rejects IDs with spaces', () => {
    const result = validateExtensionId('publisher name');
    expect(result.valid).toBe(false);
  });

  it('rejects IDs with multiple dots', () => {
    const result = validateExtensionId('a.b.c');
    expect(result.valid).toBe(false);
  });

  it('rejects IDs with special characters', () => {
    const result = validateExtensionId('publisher@name');
    expect(result.valid).toBe(false);
  });

  it('accepts simple pub.name format', () => {
    const result = validateExtensionId('pub.name');
    expect(result.valid).toBe(true);
  });
});

describe('validateGithubRepo', () => {
  it('accepts valid owner/repo format', () => {
    const result = validateGithubRepo('Veverke/ChatWizard');
    expect(result.valid).toBe(true);
  });

  it('accepts repos with hyphens, dots, underscores', () => {
    expect(validateGithubRepo('my-org/my_repo').valid).toBe(true);
    expect(validateGithubRepo('org.123/repo.name').valid).toBe(true);
  });

  it('returns valid when repo is undefined', () => {
    const result = validateGithubRepo(undefined);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects repo without owner', () => {
    const result = validateGithubRepo('/reponame');
    expect(result.valid).toBe(false);
  });

  it('rejects repo without name', () => {
    const result = validateGithubRepo('owner/');
    expect(result.valid).toBe(false);
  });

  it('rejects repo with spaces', () => {
    const result = validateGithubRepo('owner/repo name');
    expect(result.valid).toBe(false);
  });

  it('rejects repo with special characters', () => {
    const result = validateGithubRepo('owner/repo@name');
    expect(result.valid).toBe(false);
  });
});

describe('addExtensionToRegistry', () => {
  it('adds a new extension to an empty registry', () => {
    const { registry, result } = addExtensionToRegistry(
      [],
      'New.ext',
      'requesterUser',
      'New/ext'
    );
    expect(result.action).toBe('added');
    expect(registry).toHaveLength(1);
    expect(registry[0].id).toBe('New.ext');
    expect(registry[0].requestedBy).toBe('requesterUser');
    expect(registry[0].namespace).toBe('New');
    expect(registry[0].name).toBe('ext');
    expect(registry[0].githubRepo).toBe('New/ext');
  });

  it('skips duplicate extension IDs', () => {
    const { registry, result } = addExtensionToRegistry(
      existingRegistry,
      'Existing.publisher',
      'requesterUser'
    );
    expect(result.action).toBe('skipped');
    expect(registry).toHaveLength(existingRegistry.length);
    expect(result.message).toContain('already tracked');
  });

  it('adds extension without githubRepo', () => {
    const { registry, result } = addExtensionToRegistry(
      [],
      'NoRepo.ext',
      'requesterUser'
    );
    expect(result.action).toBe('added');
    expect(registry[0].githubRepo).toBe('');
  });

  it('sets displayName to name as fallback', () => {
    const { registry } = addExtensionToRegistry([], 'Test.ext', 'user');
    expect(registry[0].displayName).toBe('ext');
  });

  it('does not mutate the original registry array', () => {
    const original = [...existingRegistry];
    const { registry } = addExtensionToRegistry(existingRegistry, 'New.ext', 'user');
    expect(existingRegistry).toEqual(original);
    expect(registry).not.toBe(existingRegistry);
  });

  it('includes trackedSince with valid ISO timestamp', () => {
    const before = Date.now();
    const { registry } = addExtensionToRegistry([], 'New.ext', 'user');
    const after = Date.now();
    const ts = new Date(registry[0].trackedSince).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('handles extension with hyphens in parts', () => {
    const { registry } = addExtensionToRegistry([], 'my-pub.my-ext', 'user');
    expect(registry[0].namespace).toBe('my-pub');
    expect(registry[0].name).toBe('my-ext');
  });
});

describe('processTrackingRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a valid tracking request successfully', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);

    const output = processTrackingRequest({
      issueBody: validIssueBody,
      requestedBy: 'testuser',
    });

    expect(output.success).toBe(true);
    expect(output.registryUpdated).toBe(true);
    expect(output.results).toHaveLength(1);
    expect(output.results[0].action).toBe('added');
    expect(output.errors).toHaveLength(0);
    expect(storage.writeExtensionRegistry).toHaveBeenCalledOnce();
  });

  it('skips when extension is already tracked', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue(existingRegistry);

    const body = '### Extension ID\nExisting.publisher';
    const output = processTrackingRequest({ issueBody: body, requestedBy: 'testuser' });

    expect(output.success).toBe(true);
    expect(output.registryUpdated).toBe(false);
    expect(output.results[0].action).toBe('skipped');
    expect(storage.writeExtensionRegistry).not.toHaveBeenCalled();
  });

  it('returns errors for invalid extension ID', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);

    const body = '### Extension ID\ninvalid id with spaces';
    const output = processTrackingRequest({ issueBody: body, requestedBy: 'testuser' });

    expect(output.success).toBe(false);
    expect(output.registryUpdated).toBe(false);
    expect(output.errors.length).toBeGreaterThan(0);
    expect(storage.writeExtensionRegistry).not.toHaveBeenCalled();
  });

  it('returns errors for invalid GitHub repo', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);

    const body = '### Extension ID\nValid.id\n### GitHub Repository (optional)\ninvalid';
    const output = processTrackingRequest({ issueBody: body, requestedBy: 'testuser' });

    expect(output.success).toBe(false);
    expect(output.registryUpdated).toBe(false);
    expect(storage.writeExtensionRegistry).not.toHaveBeenCalled();
  });

  it('returns errors when extension ID cannot be parsed', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);

    const output = processTrackingRequest({
      issueBody: 'No relevant content here',
      requestedBy: 'testuser',
    });

    expect(output.success).toBe(false);
    expect(output.errors).toContain('Could not parse extension ID from issue body.');
  });

  it('sets requestedBy in the new entry', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);

    const body = '### Extension ID\nTracked.bythisuser';
    processTrackingRequest({ issueBody: body, requestedBy: 'the-requester' });

    const written = vi.mocked(storage.writeExtensionRegistry).mock.calls[0][0];
    expect(written[0].requestedBy).toBe('the-requester');
  });

  it('includes githubRepo when provided', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);

    const body = '### Extension ID\nWith.repo\n### GitHub Repository (optional)\nOwner/Repo';
    processTrackingRequest({ issueBody: body, requestedBy: 'user' });

    const written = vi.mocked(storage.writeExtensionRegistry).mock.calls[0][0];
    expect(written[0].githubRepo).toBe('Owner/Repo');
  });

  it('handles empty body gracefully', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);

    const output = processTrackingRequest({ issueBody: '', requestedBy: 'user' });

    expect(output.success).toBe(false);
    expect(output.errors).toContain('Could not parse extension ID from issue body.');
  });

  it('handles body with actual newlines correctly', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue([]);

    const body = [
      '### Extension ID',
      'Valid.ext',
      '',
      '### GitHub Repository (optional)',
      '',
      '### Notes (optional)',
      'Some notes',
    ].join('\n');
    const output = processTrackingRequest({ issueBody: body, requestedBy: 'user' });

    expect(output.success).toBe(true);
    expect(output.registryUpdated).toBe(true);
  });

  it('sets requestedBy for skipped entries', () => {
    vi.mocked(storage.readExtensionRegistry).mockReturnValue(existingRegistry);

    const body = '### Extension ID\nExisting.publisher';
    const output = processTrackingRequest({ issueBody: body, requestedBy: 'another-user' });

    expect(output.success).toBe(true);
    expect(output.registryUpdated).toBe(false);
    expect(storage.writeExtensionRegistry).not.toHaveBeenCalled();
  });
});