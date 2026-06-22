# VS Code Extension Analytics

> View analytics and trends for your tracked VS Code extensions directly inside VS Code.

This extension provides a dashboard inside VS Code that displays the same analytics data available on the [VS Code Extension Analytics](https://veverke.github.io/vscode-extension-analytics) web dashboard — install counts, ratings, velocity, projections, and more — right in your editor.

## Features

- **Dashboard View:** See all tracked extensions with sparklines, velocity badges, and momentum scores.
- **Extension Detail:** Dive into per-extension charts — installs over time, ratings, velocity, acceleration, projections, and release correlations.
- **Real-time Data:** Pulls data from the latest GitHub Pages deployment of your analytics dataset.
- **Familiar Interface:** Same underlying data and metrics as the web dashboard, redesigned for the VS Code sidebar.

## Usage

1. After installation, open the **Extension Analytics** view in the Explorer sidebar.
2. The dashboard will load automatically with data from the analytics repository.
3. Use the **Refresh Analytics Data** command from the Command Palette (`Ctrl+Shift+P`) to reload data.

## Commands

| Command | Description |
|---------|-------------|
| `Extension Analytics: Open Extension Analytics Dashboard` | Opens the analytics view |
| `Extension Analytics: Refresh Analytics Data` | Refreshes the analytics data |

## Requirements

- The [vscode-extension-analytics](https://github.com/Veverke/vscode-extension-analytics) collector must be running (GitHub Actions scheduled job).
- The analytics data must be deployed to GitHub Pages.

## Extension Settings

None currently. The extension reads from the published GitHub Pages dataset automatically.

## Known Issues

- First load may be slow if the dataset is large.
- The extension requires network access to fetch the analytics data.
