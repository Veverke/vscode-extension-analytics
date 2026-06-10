# Phase 2: VS Code Extension Scaffolding

> **Design Principle — Atomic Tasks:** Each task in this phase is designed to be **atomic** (self-contained and independently implementable). Tasks can be worked on **in parallel** by different contributors. For example, 2.1 (manifest) and 2.6 (assets/icon) are fully independent; 2.2 (entry point) and 2.3 (webview HTML) can be developed concurrently once the manifest is agreed upon; 2.4 (build pipeline) and 2.5 (launch config) are standalone from the code tasks.

## Objective

Package the React analytics frontend as a VS Code extension with Webview UI.

## Work Items

| # | Task | Files | Details |
|---|------|-------|---------|
| 2.1 | Create extension manifest | `extension/package.json` | VS Code extension manifest (`publisher`, `name`, `activationEvents`, `contributes.views`, etc.) |
| 2.2 | Create extension entry point | `extension/extension.ts` | Activation function that registers a WebviewPanel provider (or TreeView + Webview) |
| 2.3 | Create Webview HTML template | `extension/webview/index.html` | HTML shell that loads the React bundle inside the Webview |
| 2.4 | Set up build pipeline for extension | `extension/` + Vite config | Dual build: 1) Vite builds React app for Webview, 2) `vsce` packages the extension. Update `scripts` in root `package.json` |
| 2.5 | Configure VS Code launch/debug | `.vscode/launch.json`, `.vscode/tasks.json` | Launch config to run extension in Extension Development Host |
| 2.6 | Add extension icon and marketplace assets | `extension/assets/` | Icon (`128x128`), marketplace banner, README |

## Phase 2 Deliverables

- [ ] `extension/package.json` — extension manifest
- [ ] `extension/extension.ts` — activation entry point
- [ ] `extension/webview/index.html` — Webview shell
- [ ] Updated `vite.config.ts` — dual build (React + extension)
- [ ] `.vscode/launch.json` + `.vscode/tasks.json` — debug config
- [ ] `extension/assets/` — icon + banner + README
- [ ] `tests/unit/extension.test.ts` — unit tests for extension activation
- [ ] `tests/e2e/extension-shell.spec.ts` — E2E: extension loads in dev host

## Phase 2 Manual Testing

1. Press F5 in VS Code to launch Extension Development Host
2. Verify the extension activates and the Webview panel appears
3. Verify the React app renders inside the Webview
4. Verify the extension icon appears in the Activity Bar
5. Run `vsce package` and verify `.vsix` is created without errors
6. Install the `.vsix` in a clean VS Code instance and verify it works