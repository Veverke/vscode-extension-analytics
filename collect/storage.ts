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

export function ensureDataDir(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
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
  const filePath = path.join(dataDir, `${extensionId}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as DataPoint[];
}

export function appendDataPoint(extensionId: string, point: DataPoint): void {
  ensureDataDir();
  const existing = readTimeSeries(extensionId);
  existing.push(point);
  const filePath = path.join(dataDir, `${extensionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
}

export function readReleases(extensionId: string): ReleaseEntry[] {
  const filePath = path.join(dataDir, `${extensionId}.releases.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ReleaseEntry[];
}

export function writeReleases(extensionId: string, releases: ReleaseEntry[]): void {
  ensureDataDir();
  const filePath = path.join(dataDir, `${extensionId}.releases.json`);
  fs.writeFileSync(filePath, JSON.stringify(releases, null, 2), 'utf-8');
}
