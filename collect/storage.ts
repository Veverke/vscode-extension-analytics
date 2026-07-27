import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ExtensionRegistry, DataPoint, ReleaseEntry } from '../src/types/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DATA_DIR = path.join(__dirname, '..', 'data');

let dataDir = DEFAULT_DATA_DIR;

export function setDataDir(dir: string): void {
  dataDir = dir;
}

export function getDataDir(): string {
  return dataDir;
}

export function ensureDataDir(dir?: string): void {
  const target = dir ?? dataDir;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

/**
 * Derives the subdirectory path for an extension from its ID (e.g. "Veverke.chatwizard").
 * Returns e.g. "data/Veverke/chatwizard".
 */
export function extensionDir(extensionId: string): string {
  const parts = extensionId.split('.');
  return path.join(getDataDir(), parts[0], parts.slice(1).join('.'));
}

/**
 * Ensures the extension's data subdirectory exists.
 */
export function ensureExtensionDir(extensionId: string): string {
  const dir = extensionDir(extensionId);
  ensureDataDir(dir);
  return dir;
}

export function readExtensionRegistry(): ExtensionRegistry {
  const filePath = path.join(dataDir, 'extensions.json');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ExtensionRegistry;
}

export function writeExtensionRegistry(registry: ExtensionRegistry): void {
  ensureDataDir();
  const filePath = path.join(dataDir, 'extensions.json');
  fs.writeFileSync(filePath, JSON.stringify(registry, null, 2), 'utf-8');
}

export function readTimeSeries(extensionId: string): DataPoint[] {
  const filePath = path.join(extensionDir(extensionId), 'data.json');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as DataPoint[];
}

export function appendDataPoint(extensionId: string, point: DataPoint): void {
  const dir = ensureExtensionDir(extensionId);
  const existing = readTimeSeries(extensionId);
  existing.push(point);
  const filePath = path.join(dir, 'data.json');
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
}

export function readReleases(extensionId: string): ReleaseEntry[] {
  const filePath = path.join(extensionDir(extensionId), 'releases.json');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ReleaseEntry[];
}

export function writeReleases(extensionId: string, releases: ReleaseEntry[]): void {
  const dir = ensureExtensionDir(extensionId);
  const filePath = path.join(dir, 'releases.json');
  fs.writeFileSync(filePath, JSON.stringify(releases, null, 2), 'utf-8');
}
