import * as vscode from 'vscode';
import * as fs from 'fs';

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
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'refresh':
          vscode.commands.executeCommand('vscodeExtensionAnalytics.refreshData');
          break;
        case 'openExternal':
          if (message.url) {
            vscode.env.openExternal(vscode.Uri.parse(message.url));
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
