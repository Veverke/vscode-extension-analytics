/**
 * Copies the data/ directory into the webview build output
 * so that runtime fetch('./data/...') calls work in the webview.
 */
import { cp, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const source = resolve(root, 'data');
const webviewTarget = resolve(root, 'extension', 'out', 'webview', 'dist', 'data');
const standaloneTarget = resolve(root, 'dist', 'data');

async function copyData(target, label) {
  if (!existsSync(source)) {
    console.log(`  ⚠  Source data/ not found, skipping ${label}`);
    return;
  }
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, force: true });
  console.log(`  ✓ Copied data/ → ${label}`);
}

(async () => {
  console.log('Copying data files...');
  await Promise.all([
    copyData(webviewTarget, 'webview build (extension/out/webview/dist/data/)'),
    copyData(standaloneTarget, 'standalone build (dist/data/)'),
  ]);
  console.log('Done.');
})();
