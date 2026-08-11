import type { ExtensionRegistry, ExtensionEntry } from '../src/types/schema.js';
import { fileURLToPath } from 'node:url';
import {
  readExtensionRegistry,
  readTimeSeries,
  writeExtensionRegistry,
} from './storage.js';

// ─── Issue Body Parsing ─────────────────────────────────────────────────────

export interface ParsedIssueBody {
  extensionId: string;
  githubRepo?: string;
  notes?: string;
}

/**
 * Parses an issue body (from a YAML-form template) into structured fields.
 */
export function parseIssueBody(body: string): ParsedIssueBody {
  const extensionIdMatch = body.match(
    /### Extension ID\s*\n\s*(.+?)(?:\r?\n|$)/i
  );
  const githubRepoMatch = body.match(
    /### GitHub Repository \(optional\)\s*\n\s*(.+?)(?:\r?\n|$)/i
  );
  const notesMatch = body.match(
    /### Notes \(optional\)\s*\n\s*([\s\S]*?)(?:\r?\n(?:###|$)|$)/i
  );

  const extensionId = extensionIdMatch?.[1]?.trim() ?? '';

  const rawRepo = githubRepoMatch?.[1]?.trim() ?? '';
  const githubRepo = rawRepo && !rawRepo.startsWith('###') ? rawRepo : undefined;

  const rawNotes = notesMatch?.[1]?.trim() ?? '';
  const notes = rawNotes && !rawNotes.startsWith('###') ? rawNotes : undefined;

  return { extensionId, githubRepo, notes };
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const EXTENSION_ID_REGEX = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;

export function validateExtensionId(extensionId: string): ValidationResult {
  const errors: string[] = [];

  if (!extensionId) {
    errors.push('Extension ID is required.');
    return { valid: false, errors };
  }

  if (!EXTENSION_ID_REGEX.test(extensionId)) {
    errors.push(
      'Invalid extension ID format: ' +
        JSON.stringify(extensionId) +
        '. Expected "publisher.name" format.'
    );
  }

  return { valid: errors.length === 0, errors };
}

export function validateGithubRepo(repo?: string): ValidationResult {
  const errors: string[] = [];

  if (repo) {
    const repoRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    if (!repoRegex.test(repo)) {
      errors.push(
        'Invalid GitHub repository format: ' +
          JSON.stringify(repo) +
          '. Expected "owner/repo" format.'
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Registry Update ────────────────────────────────────────────────────────

export interface ProcessResult {
  action: 'skipped' | 'added' | 'updated';
  extensionId: string;
  message: string;
}

export function addExtensionToRegistry(
  existing: ExtensionRegistry,
  extensionId: string,
  requestedBy: string,
  githubRepo?: string
): { registry: ExtensionRegistry; result: ProcessResult } {
  const existingEntry = existing.find((e) => e.id === extensionId);
  if (existingEntry) {
    // If the extension is already tracked but the requester isn't recorded
    // (e.g. it was hardcoded into the registry before the requestedBy field
    // existed), or a different user is now requesting it, update the
    // requestedBy so it appears in that user's filtered view.
    if (existingEntry.requestedBy !== requestedBy) {
      const updated = existing.map((e) =>
        e.id === extensionId ? { ...e, requestedBy } : e
      );
      return {
        registry: updated,
        result: {
          action: 'updated',
          extensionId,
          message:
            'Extension ' +
            JSON.stringify(extensionId) +
            ' is already tracked. Updated requester to ' +
            JSON.stringify(requestedBy) +
            '.',
        },
      };
    }
    return {
      registry: existing,
      result: {
        action: 'skipped',
        extensionId,
        message: 'Extension ' + JSON.stringify(extensionId) + ' is already tracked.',
      },
    };
  }

  const parts = extensionId.split('.');
  const namespace = parts[0];
  const name = parts[1];

  // Derive trackedSince from the oldest existing data point if historical
  // data already exists for this extension (e.g. it was previously tracked
  // and is being re-added). This preserves the true tracking start date.
  const existingData = readTimeSeries(extensionId);
  const trackedSince =
    existingData.length > 0
      ? existingData[0].ts
      : new Date().toISOString();

  const newEntry: ExtensionEntry = {
    id: extensionId,
    namespace,
    name,
    displayName: name,
    githubRepo: githubRepo ?? '',
    requestedBy,
    trackedSince,
  };

  return {
    registry: [...existing, newEntry],
    result: {
      action: 'added',
      extensionId,
      message: 'Extension ' + JSON.stringify(extensionId) + ' has been added.',
    },
  };
}

// ─── Main Processing Function ───────────────────────────────────────────────

export interface ProcessTrackingRequestInput {
  issueBody: string;
  requestedBy: string;
}

export interface ProcessTrackingRequestOutput {
  success: boolean;
  results: ProcessResult[];
  errors: string[];
  registryUpdated: boolean;
}

export function processTrackingRequest(
  input: ProcessTrackingRequestInput
): ProcessTrackingRequestOutput {
  const { issueBody, requestedBy } = input;
  const results: ProcessResult[] = [];

  const parsed = parseIssueBody(issueBody);

  if (!parsed.extensionId) {
    return {
      success: false,
      results: [],
      errors: ['Could not parse extension ID from issue body.'],
      registryUpdated: false,
    };
  }

  const idValidation = validateExtensionId(parsed.extensionId);
  if (!idValidation.valid) {
    return {
      success: false,
      results: [],
      errors: idValidation.errors,
      registryUpdated: false,
    };
  }

  if (parsed.githubRepo) {
    const repoValidation = validateGithubRepo(parsed.githubRepo);
    if (!repoValidation.valid) {
      return {
        success: false,
        results: [],
        errors: repoValidation.errors,
        registryUpdated: false,
      };
    }
  }

  const existing = readExtensionRegistry();
  const { registry, result } = addExtensionToRegistry(
    existing,
    parsed.extensionId,
    requestedBy,
    parsed.githubRepo
  );
  results.push(result);

  let registryUpdated = false;
  if (result.action === 'added' || result.action === 'updated') {
    writeExtensionRegistry(registry);
    registryUpdated = true;
  }

  return {
    success: true,
    results,
    errors: [],
    registryUpdated,
  };
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

/* v8 ignore next 23 */
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const issueBody = process.env.ISSUE_BODY;
  const requestedBy = process.env.REQUESTED_BY ?? 'unknown';

  if (!issueBody) {
    console.error('ISSUE_BODY environment variable is required.');
    process.exitCode = 1;
  } else {
    const output = processTrackingRequest({ issueBody, requestedBy });

    console.log(JSON.stringify(output, null, 2));

    if (!output.success) {
      console.error('Processing failed:', output.errors.join('; '));
      process.exitCode = 1;
    } else {
      process.exitCode = 0;
    }
  }
}