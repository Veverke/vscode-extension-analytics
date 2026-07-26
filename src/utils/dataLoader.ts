/**
 * Context-aware data loading utility.
 *
 * **Browser context:** fetches from relative paths (e.g. `./data/extensions.json`).
 *
 * **Webview context:** tries GitHub raw URLs first (always up-to-date), falls back
 * to bundled local copies (injected at build time into the VSIX via
 * `window.__VSCODE_DATA_BASE__`) if the network fetch fails.
 *
 * @example
 * ```ts
 * const extensions = await loadData<ExtensionEntry[]>('./data/extensions.json')
 * const events = await loadData<EventAnnotation[]>('./data/events.json', { tolerate404: true })
 * ```
 */

declare global {
  interface Window {
    vscode?: unknown;
    /** Webview URI for the bundled data/ directory (injected by extension.ts). */
    __VSCODE_DATA_BASE__?: string;
  }
}

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/main/data/';
const DATA_PREFIX = './data/';

/** Detects whether the code is running inside a VS Code webview. */
function isWebviewContext(): boolean {
  return typeof window !== 'undefined' && window.vscode !== undefined;
}

/**
 * Strips the `./data/` prefix from a path, returning just the filename portion.
 */
function stripDataPrefix(path: string): string {
  return path.startsWith(DATA_PREFIX) ? path.slice(DATA_PREFIX.length) : path;
}

/**
 * Resolves a data path to a GitHub raw URL (primary for webview context).
 */
function toGitHubRawUrl(path: string): string {
  return `${GITHUB_RAW_BASE}${stripDataPrefix(path)}`;
}

/**
 * Resolves a data path to a bundled webview URI (fallback for webview context).
 * Returns `null` if no `__VSCODE_DATA_BASE__` has been injected.
 */
function toBundledUrl(path: string): string | null {
  if (!window.__VSCODE_DATA_BASE__) return null;
  const base = window.__VSCODE_DATA_BASE__.replace(/\/+$/, '');
  return `${base}/${stripDataPrefix(path)}`;
}

export interface LoadDataOptions {
  /**
   * When true, 404 responses return `null` instead of throwing.
   * Useful for optional data files (events, releases) that may not exist yet.
   */
  tolerate404?: boolean;
}

/**
 * Loads JSON data from the given path.
 *
 * In webview context, tries the GitHub raw URL first (always up-to-date).
 * If that fails, falls back to the bundled VSIX copy.
 *
 * @typeParam T - The expected shape of the JSON response.
 * @param path - Relative data path (e.g. `./data/extensions.json`).
 * @param options - Optional flags such as `tolerate404`.
 * @returns The parsed JSON data, or `null` if `tolerate404` is set and the server returns 404.
 * @throws {Error} If all fetch attempts fail.
 */
export async function loadData<T>(
  path: string,
  options?: LoadDataOptions,
): Promise<T | null> {
  const tryFetch = async (url: string): Promise<Response> => {
    const res = await fetch(url);
    if (options?.tolerate404 && res.status === 404) {
      return res; // caller will handle
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  };

  if (isWebviewContext()) {
    // Webview: try GitHub raw first (always up-to-date), fall back to bundled
    const gitHubUrl = toGitHubRawUrl(path);

    try {
      const res = await tryFetch(gitHubUrl);
      if (options?.tolerate404 && res.status === 404) {
        return null;
      }
      return res.json() as Promise<T>;
    } catch (err: unknown) {
      // GitHub raw failed — try bundled copy as fallback
      const bundledUrl = toBundledUrl(path);
      if (bundledUrl) {
        try {
          const res = await tryFetch(bundledUrl);
          if (options?.tolerate404 && res.status === 404) {
            return null;
          }
          return res.json() as Promise<T>;
        } catch {
          // Both failed — throw the original error
          throw err;
        }
      }
      // No bundled URL available — re-throw the original error
      throw err;
    }
  }

  // Browser context: use relative path
  const primaryUrl = path;

  try {
    const res = await tryFetch(primaryUrl);
    if (options?.tolerate404 && res.status === 404) {
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err: unknown) {
    if (options?.tolerate404) {
      if (err instanceof Error && err.message === 'HTTP 404') {
        return null;
      }
      throw err;
    }
    throw err;
  }
}