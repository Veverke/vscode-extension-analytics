import * as vscode from 'vscode';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

// ─── Proxy Helpers (extension host has no CORS restrictions) ─────────────────

/** Make an HTTPS POST request and return parsed JSON. */
function httpsPostJson(url: string, body: unknown, headers: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const urlObj = new URL(url);

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      timeout: 15_000,
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error(`Invalid JSON response: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(bodyStr);
    req.end();
  });
}

/** Make an HTTPS GET request and return parsed JSON. */
function httpsGetJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const mod = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'vscode-extension-analytics/1.0',
      },
      timeout: 10_000,
    };

    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error(`Invalid JSON response: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

// ─── Marketplace API Helpers ─────────────────────────────────────────────────

interface MarketplaceStat {
  statisticName: string;
  value: number;
}

interface MarketplaceVersion {
  version: string;
  lastUpdated: string;
  targetPlatform?: string;
  properties?: { key: string; value: string }[];
}

interface MarketplaceExtension {
  displayName?: string;
  statistics?: MarketplaceStat[];
  versions?: MarketplaceVersion[];
}

interface MarketplaceResponse {
  results?: Array<{
    extensions?: MarketplaceExtension[];
  }>;
}

function getStat(statistics: MarketplaceStat[], name: string): number {
  const stat = statistics.find((s) => s.statisticName === name);
  return stat?.value ?? 0;
}

function extractGitHubRepo(url: string): string | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/]+\/[^/\s?#]+)/i);
  return match ? match[1].replace(/\.git$/, '') : null;
}

function findGitHubRepoFromProperties(ext: MarketplaceExtension): string | null {
  const versions = ext.versions ?? [];
  for (const v of versions) {
    const props = v.properties ?? [];
    for (const p of props) {
      if (
        p.key === 'Microsoft.VisualStudio.Services.Links.Repository' ||
        p.key === 'Microsoft.VisualStudio.Code.GitHubRepo' ||
        p.key === 'Microsoft.VisualStudio.Services.Links.Source'
      ) {
        const repo = extractGitHubRepo(p.value);
        if (repo) return repo;
      }
    }
  }
  return null;
}

async function fetchCompetitorStats(extensionId: string): Promise<Record<string, unknown>> {
  const flags = 906; // categories + versionProperties + statistics + latestVersionOnly + unpublished
  const data = await httpsPostJson(
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
    {
      filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
      flags,
    },
    {
      'Content-Type': 'application/json',
      Accept: 'application/json;api-version=7.2-preview.1',
    }
  ) as MarketplaceResponse;

  if (
    !data?.results ||
    data.results.length === 0 ||
    !data.results[0].extensions ||
    data.results[0].extensions.length === 0 ||
    !data.results[0].extensions[0].statistics
  ) {
    throw new Error(`No marketplace result for competitor ${extensionId}`);
  }

  const ext = data.results[0].extensions[0];
  const statistics: MarketplaceStat[] = ext.statistics!;
  const averageRating = getStat(statistics, 'averagerating');
  const githubRepo = findGitHubRepoFromProperties(ext);

  return {
    displayName: ext.displayName ?? extensionId,
    installs: getStat(statistics, 'install'),
    updates: getStat(statistics, 'updateCount'),
    averageRating: averageRating === 0 ? undefined : averageRating,
    ratingCount: getStat(statistics, 'ratingcount'),
    trendingWeekly: getStat(statistics, 'trendingweekly'),
    trendingMonthly: getStat(statistics, 'trendingmonthly'),
    githubRepo: githubRepo ?? undefined,
  };
}

async function fetchCompetitorReleases(extensionId: string): Promise<Record<string, unknown>[]> {
  const data = await httpsPostJson(
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
    {
      filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
      flags: 1022,
    },
    {
      'Content-Type': 'application/json',
      Accept: 'application/json;api-version=7.2-preview.1',
    }
  ) as MarketplaceResponse;

  if (
    !data?.results ||
    data.results.length === 0 ||
    !data.results[0].extensions ||
    data.results[0].extensions.length === 0
  ) {
    throw new Error(`No marketplace result for competitor ${extensionId}`);
  }

  const ext = data.results[0].extensions[0];
  const versions = ext.versions ?? [];

  // Deduplicate by version
  const seen = new Map<string, MarketplaceVersion>();
  for (const v of versions) {
    const existing = seen.get(v.version);
    if (!existing || v.lastUpdated < existing.lastUpdated) {
      seen.set(v.version, v);
    }
  }

  return Array.from(seen.values())
    .map((v) => ({
      version: v.version,
      publishedAt: v.lastUpdated,
      installsAtRelease: 0,
    }))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
}

async function fetchCompetitorGitHubStats(repoFullName: string): Promise<Record<string, unknown> | null> {
  try {
    const data = await httpsGetJson(`https://api.github.com/repos/${repoFullName}`) as {
      stargazers_count: number;
      forks_count: number;
      pushed_at: string;
    };
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      pushedAt: data.pushed_at ?? null,
    };
  } catch {
    return null;
  }
}

// ─── Webview View Provider ───────────────────────────────────────────────────

class AnalyticsWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vscodeExtensionAnalytics.mainView';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri,
        vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'dist'),
      ],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    // Listen for messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message: Record<string, unknown>) => {
      const command = message.command as string;
      const requestId = message.requestId as string;
      const args = message.args as Record<string, unknown> | undefined;

      // Helper to respond back to the webview
      const respond = (result: unknown) => {
        webviewView.webview.postMessage({ requestId, result });
      };
      const respondError = (error: Error) => {
        webviewView.webview.postMessage({ requestId, error: error.message });
      };

      switch (command) {
        case 'refresh':
          vscode.commands.executeCommand('vscodeExtensionAnalytics.refreshData');
          break;
        case 'openExternal':
          if (message.url) {
            vscode.env.openExternal(vscode.Uri.parse(message.url as string));
          }
          break;
        case 'fetchCompetitorStats':
          try {
            const stats = await fetchCompetitorStats(args?.extensionId as string);
            respond(stats);
          } catch (err) {
            respondError(err instanceof Error ? err : new Error(String(err)));
          }
          break;
        case 'fetchCompetitorReleases':
          try {
            const releases = await fetchCompetitorReleases(args?.extensionId as string);
            respond(releases);
          } catch (err) {
            respondError(err instanceof Error ? err : new Error(String(err)));
          }
          break;
        case 'fetchCompetitorGitHubStats':
          try {
            const ghStats = await fetchCompetitorGitHubStats(args?.repoFullName as string);
            respond(ghStats);
          } catch (err) {
            respondError(err instanceof Error ? err : new Error(String(err)));
          }
          break;
      }
    });
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    // Path to the built webview assets
    const distPath = vscode.Uri.joinPath(
      this._extensionUri,
      'out',
      'webview',
      'dist'
    );

    const indexPath = vscode.Uri.joinPath(distPath, 'webview.index.html');

    try {
      let html = fs.readFileSync(indexPath.fsPath, 'utf-8');

      // Rewrite resource URIs so they load correctly in the webview
      html = html.replace(
        /(href|src)="\.\/(.+?)"/g,
        (_match, attr, relativePath) => {
          const assetUri = vscode.Uri.joinPath(distPath, relativePath);
          const webviewUri = webview.asWebviewUri(assetUri);
          return `${attr}="${webviewUri.toString()}"`;
        }
      );

      // Set CSP to allow the webview to load resources
      const csp = [
        `default-src 'none'`,
        `script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `font-src ${webview.cspSource}`,
        `connect-src 'self' https:`,
        `img-src ${webview.cspSource} data: https:`,
      ].join('; ');

      html = html.replace('</head>', `<meta http-equiv="Content-Security-Policy" content="${csp}"></head>`);

      // Inject the webview URI for the bundled data directory so the
      // frontend can fetch data from the local copies inside the VSIX.
      const dataDirUri = webview.asWebviewUri(
        vscode.Uri.joinPath(distPath, 'data')
      );
      html = html.replace(
        '</head>',
        `<script>window.__VSCODE_DATA_BASE__="${dataDirUri.toString()}";</script></head>`
      );

      return html;
    } catch {
      return this._getFallbackHtml();
    }
  }

  private _getFallbackHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Extension Analytics</title>
</head>
<body>
  <p>Extension Analytics dashboard is not yet built.</p>
  <p>Run <code>npm run build:webview</code> in the extension directory to build the frontend.</p>
</body>
</html>`;
  }
}

// ─── Extension Activation ────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  // Register the WebviewView provider
  const provider = new AnalyticsWebviewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AnalyticsWebviewProvider.viewType,
      provider
    )
  );

  // Register the "Open Dashboard" command — reveals the view in the activity bar
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscodeExtensionAnalytics.openDashboard',
      () => {
        vscode.commands.executeCommand(
          'workbench.view.vscodeExtensionAnalytics'
        );
      }
    )
  );

  // Register the "Refresh Data" command — sends a message to the webview
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscodeExtensionAnalytics.refreshData',
      () => {
        vscode.window.showInformationMessage(
          'Refreshing analytics data… Please reload the webview.'
        );
      }
    )
  );
}

// ─── Extension Deactivation ──────────────────────────────────────────────────

export function deactivate(): void {
  // Cleanup if needed
}
