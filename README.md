# VS Code Extension Analytics

Analytics dashboard for tracking VS Code extension metrics over time.

**Self-hosted, zero-cost time-series analytics** for VS Code extension authors. Collects install counts, ratings, GitHub stats, and release data from both the Visual Studio Marketplace and Open VSX registry, computes derived signals (velocity, acceleration, projections, peaks, momentum), and renders interactive charts — all on a pure static stack with no backend.

---

## Features

| Feature | Description |
|---|---|
| **Multi-registry data** | Collects from both VS Marketplace and Open VSX |
| **GitHub stats** | Stars, forks, and community contributions per extension |
| **Time-series charts** | Install counts, ratings, and daily/weekly velocity over time |
| **Growth velocity** | Install growth rate (Δinstalls/Δtime) with trend analysis |
| **Acceleration** | Change in velocity — detect speeding up vs slowing down |
| **30-day projections** | Linear and exponential regression with R² confidence |
| **Peak detection** | Automatic identification of install spike events |
| **Release impact** | Installs gained per version with correlation timeline |
| **Event annotations** | Developer-defined events (blog posts, launches) overlaid on charts |
| **Momentum score** | Weighted composite ranking (velocity + acceleration + recency) |
| **Monthly statistics** | Per-month rollups with install gains, average rating, and export to CSV/JSON |
| **Competitor analysis** | Compare your extension's installs, rating, and GitHub stars against similar extensions |
| **Auto-discovery** | Automatically find all VS Code extensions in a GitHub account |
| **Track requests** | Request extension tracking via pre-filled GitHub issues |
| **Session management** | Username persistence, switch user, clear session |
| **User-scoped overview** | Filter extensions by requesting user with "show all" toggle |
| **Error & empty states** | Graceful handling of network failures, 404s, malformed data |
| **Rate limit awareness** | GitHub API rate limit display with token suggestion |
| **VS Code extension** | Embedded dashboard as a webview inside VS Code |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  COLLECTOR (GitHub Actions — scheduled cron)            │
│  Node.js script → Marketplace API + Open VSX API        │
│  → appends to /data/*.json → git commit & push          │
└──────────────────────────┬──────────────────────────────┘
                           │ git push triggers GH Pages build
┌──────────────────────────▼──────────────────────────────┐
│  STORAGE (GitHub repo — /data directory)                │
│  Append-only JSON time series, one file per extension   │
│  e.g. data/Veverke.chatwizard.json                      │
└──────────────────────────┬──────────────────────────────┘
                           │ fetch() from browser
┌──────────────────────────▼──────────────────────────────┐
│  FRONTEND (GitHub Pages — static React/Vite app)        │
│  Loads JSON → computes metrics → renders charts         │
│  Recharts + regression-js                               │
└─────────────────────────────────────────────────────────┘
```

### Data Schema

**Per-extension time series** (`data/<namespace>.<name>.json`):
```json
[{
  "ts": "2026-05-27T10:00:00Z",
  "marketplace": { "installs": 12345, "updates": 4567, "averageRating": 4.3, "ratingCount": 12, "trendingWeekly": 0, "trendingMonthly": 0 },
  "openVsx": { "downloads": 9876, "averageRating": 4.1, "ratingCount": 5 },
  "github": { "stars": 150, "forks": 20, "contributions": 8 }
}]
```

**Release timeline** (`data/<namespace>.<name>.releases.json`):
```json
[{
  "version": "1.2.0",
  "publishedAt": "2026-04-15T08:00:00Z",
  "installsAtRelease": 9800,
  "changelog": "Added chat history export"
}]
```

**Monthly rollups** (`data/<namespace>.<name>.monthly.json`):
```json
[{
  "yearMonth": "2026-05",
  "installsEndOfMonth": 12345,
  "installsGained": 2340,
  "avgRating": 4.3,
  "ratingCountEndOfMonth": 12,
  "openVsxDownloadsEndOfMonth": 9876,
  "dataPointsInMonth": 48,
  "starsEndOfMonth": 150,
  "forksEndOfMonth": 20,
  "contributionsEndOfMonth": 8
}]
```

**Extension registry** (`data/extensions.json`):
```json
[{
  "id": "Veverke.chatwizard",
  "namespace": "Veverke",
  "name": "chatwizard",
  "displayName": "ChatWizard",
  "githubRepo": "Veverke/chatwizard",
  "trackedSince": "2026-05-27T00:00:00Z",
  "requestedBy": "Veverke"
}]
```

---

## Using the Dashboard (Community Platform)

The dashboard is available at **[veverke.github.io/vscode-extension-analytics](https://veverke.github.io/vscode-extension-analytics)** — a centralized platform that collects analytics for any VS Code extension.

### Quick Start

1. Go to the dashboard
2. Enter your GitHub username
3. The app scans your public repos and discovers VS Code extensions you've authored
4. For each discovered extension, click **"Track on GitHub"**
5. This opens a pre-filled issue — it's **auto-processed within seconds** and the extension is added to the tracking registry
6. After the next data collection run (every 6 hours), your extension's analytics appear on the dashboard
7. You get a GitHub notification when someone requests tracking for a new extension — no manual action needed

### Returning Users

On subsequent visits, enter your username again to see only your tracked extensions. Use the "Show all tracked extensions" toggle to see every extension in the registry.

### VS Code Extension

The dashboard is also available as a VS Code extension that embeds the analytics view as a webview panel inside your editor.

**Install from VSIX** (included in the repository):
1. Open VS Code
2. Go to Extensions view → `...` → Install from VSIX...
3. Select `extension/vscode-extension-analytics-1.0.0.vsix`

**Commands:**
| Command | Description |
|---|---|
| `Extension Analytics: Open Extension Analytics Dashboard` | Opens the analytics view in the sidebar |
| `Extension Analytics: Refresh Analytics Data` | Refreshes the analytics data |

---

## Getting Started (Self-Hosting)

If you prefer to run your own instance (data collection on your GitHub Actions, dashboard on your GitHub Pages):

### Prerequisites

- A GitHub account
- VS Code extensions published to Marketplace and/or Open VSX

### Setup

1. **Fork this repository** and clone it locally.
2. **Enable GitHub Pages** in repo Settings → Pages → Source: GitHub Actions.
3. **Set up the collector** by configuring the GitHub Action in `.github/workflows/collect.yml`:
   - Optional: Add `GITHUB_TOKEN` as a repo secret for higher GitHub API rate limits.
4. **Build and deploy:**
   ```bash
   npm install
   npm run build          # builds frontend
   git push origin main   # triggers GitHub Pages deploy
   ```
5. **Add extensions to track** in `data/extensions.json`, or use the auto-discovery feature from the frontend.

---

## Using the Frontend

### 1. Landing Page

Enter your GitHub username to begin. The username is stored in `localStorage` and used to scope the extension registry and auto-discovery. After entering your username, you're taken directly to the discovery page to find and track your extensions.

### 2. Auto-Discovery

After entering your username, the app scans all public repositories of the given GitHub user. Each repo's `package.json` is checked for an `engines.vscode` field — repos that match are listed as **discovered extensions**.

Discovered extensions show one of two states:
- **✅ Tracked** — already in the extension registry.
- **⬜ Not Tracked** — available to request tracking.

### 3. Request Tracking (GitHub Issue)

Click **"Track on GitHub"** on any untracked extension. This opens a pre-filled GitHub issue using the `add-extension.yml` template with:
- Extension ID auto-populated in the title and body.
- `tracking-request` label applied.
- The issue is **auto-processed within seconds** by a GitHub Action that validates and adds the extension to `data/extensions.json`.
- The issue is automatically closed with a success comment.
- You'll get a GitHub notification when someone requests tracking.

### 4. Overview Dashboard

View all tracked extensions in a sortable table with:
- Sparkline charts showing install trends.
- Velocity badges (green/red indicators).
- Momentum scores for ranking.
- User-scoped filtering: see only extensions you requested, or all extensions.

### 5. Extension Detail

Click any extension to see:
- **Installs chart** with Marketplace vs Open VSX lines, projection lines, and peak markers.
- **Rating chart** over time.
- **Growth Velocity chart** with acceleration signal.
- **GitHub chart** — stars, forks, and contributions over time.
- **30-day projections** with confidence indicators (R²) and adjustable horizon.
- **Peak markers** — vertical reference lines at detected spike events.
- **Release impact table** — installs gained per version, sorted by impact.
- **Event annotations** — dashed lines for developer-defined events.
- **Metrics panel** — momentum score, velocity, acceleration, projection.
- **Monthly Statistics** — per-month install gains, average rating, with CSV/JSON export.
- **Competitor analysis** — compare against other extensions from the Marketplace.

---

## Development

### Prerequisites

- Node.js ≥ 18
- npm

### Setup

```bash
git clone <your-fork>
cd vscode-extension-analytics
npm install
```

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (browser mode) |
| `npm run build` | Type-check + Vite build + copy data files |
| `npm run test` | Run all unit tests (Vitest) |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint across all source directories |
| `npm run format` | Format with Prettier |

### Project Structure

```
├── collect/              # Collector scripts (GitHub Actions)
│   ├── __tests__/        # Collector unit tests
│   ├── discover.ts       # Extension auto-discovery logic
│   ├── github.ts         # GitHub API helpers
│   ├── marketplace.ts    # VS Marketplace API client
│   ├── openvsx.ts        # Open VSX API client
│   ├── process-tracking-request.ts  # Issue body parsing & validation
│   └── storage.ts        # JSON file read/write helpers
├── data/                 # Time-series data (committed by collector)
├── src/                  # Frontend React application
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (UserContext, ExtensionsContext)
│   ├── hooks/            # Custom React hooks
│   ├── metrics/          # Analytics computation modules
│   ├── routes/           # Page-level route components
│   ├── styles/           # CSS styles
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions (dataLoader, githubApi)
├── tests/                # Test suites
│   ├── e2e/              # Playwright end-to-end tests
│   ├── unit/             # Vitest unit tests
│   └── setup.ts          # Test setup (jsdom, mocks)
├── extension/            # VS Code extension (webview wrapper)
│   ├── extension.ts      # Extension activation & webview provider
│   ├── webview/          # Webview assets
│   └── vscode-extension-analytics-1.0.0.vsix  # Packaged extension
└── fixtures/data/        # Test fixture data
```

---

## Testing

```bash
# Unit tests (Vitest — 90% coverage threshold)
npm run test

# E2E tests (Playwright — requires dev server)
npm run test:e2e
```

The project maintains ≥90% code coverage across all modules. Tests cover:
- **Collector:** Issue parsing, validation, dedup, registry operations, GitHub API pagination.
- **Frontend hooks:** Data fetching, loading/error/empty states, unmount cancellation.
- **Metrics:** Velocity, acceleration, momentum, peaks, projections, release correlation.
- **Data loading:** Browser vs webview context detection, bundled vs fallback URLs, error tolerance.
- **E2E:** Overview dashboard, extension detail, analytics features, issue flow, annotations.

---

## Troubleshooting

### "No extensions found"

- Ensure your extensions are published to the VS Marketplace.
- Run auto-discovery to scan your GitHub repositories.
- Verify that `data/extensions.json` contains your extension entries.

### "GitHub API rate limit reached"

Unauthenticated requests are limited to 60/hour. For development, create a [GitHub personal access token](https://github.com/settings/tokens) and include it as `Authorization: Bearer <token>` header.

### Collector not running

Check GitHub Actions logs in your fork. Ensure `.github/workflows/collect.yml` exists and has the required permissions.

### Data not appearing on dashboard

Verify that `data/extensions.json` contains the extension entry and that the corresponding `<id>.json` time-series file exists. The frontend loads these from the `./data/` directory relative to the deployment root.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Copyright (c) 2026 Avraham Y. Kahana. Licensed under the MIT License with Commons Clause — you may not sell the software.
