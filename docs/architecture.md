# Architecture

## Overview

The system is composed of three decoupled layers:

```
┌─────────────────────────────────────────────────────────┐
│  COLLECTOR (GitHub Actions — scheduled cron)            │
│  Node.js script → Marketplace API + Open VSX API        │
│  → appends to /data/*.json → git commit & push          │
└──────────────────────────┬──────────────────────────────┘
                           │ git push triggers GH Pages build
┌──────────────────────────▼──────────────────────────────┐
│  STORAGE (GitHub repo — /data directory on master)      │
│  Append-only JSON time series, one file per extension   │
│  e.g. data/veverke.chatwizard.json                      │
└──────────────────────────┬──────────────────────────────┘
                           │ fetch() from browser
┌──────────────────────────▼──────────────────────────────┐
│  FRONTEND (GitHub Pages — static React/Vite app)        │
│  Loads JSON → computes metrics → renders charts         │
│  Recharts + regression-js + simple-statistics           │
└─────────────────────────────────────────────────────────┘
```

---

## Data Schema

### Per-Extension Time Series (`data/<namespace>.<name>.json`)

```json
[
  {
    "ts": "2026-05-27T10:00:00Z",
    "marketplace": {
      "installs": 12345,
      "updates": 4567,
      "averageRating": 4.3,
      "ratingCount": 89,
      "trendingWeekly": 0.12,
      "trendingMonthly": 0.45
    },
    "openVsx": {
      "downloads": 9876,
      "averageRating": 4.1,
      "ratingCount": 34
    },
    "github": {
      "stars": 42,
      "forks": 8,
      "contributions": 156
    }
  }
]
```

**GitHub fields:**
- `stars` — Total stargazers count from the GitHub API.
- `forks` — Total fork count from the GitHub API.
- `contributions` — Composite metric: sum of non-owner commits, issues, pull requests, and code reviews. Excludes contributions by the repo owner.

### Release Timeline (`data/<namespace>.<name>.releases.json`)

```json
[
  {
    "version": "1.2.0",
    "publishedAt": "2026-04-15T08:00:00Z",
    "installsAtRelease": 9800,
    "downloadsAtRelease": 2100,
    "changelog": "Added chat history export"
  }
]
```

- `installsAtRelease` — VS Marketplace install count at the time the version was first detected by the collector.
- `downloadsAtRelease` — Open VSX download count at the time the version was first detected by the collector (`null` if the extension isn't on Open VSX).

### Extension Registry (`data/extensions.json`)

```json
[
  {
    "id": "Veverke.chatwizard",
    "namespace": "Veverke",
    "name": "chatwizard",
    "displayName": "ChatWizard",
    "githubRepo": "Veverke/chatwizard",
    "trackedSince": "2026-05-27T00:00:00Z"
  }
]
```

---

## Phase 1: MVP

**Goal:** Collect, store, and visualize basic time-series data with derived metrics on a zero-cost stack.

### Collector

- Runtime: Node.js (GitHub Actions, `ubuntu-latest`)
- Schedule: Every 6 hours (`0 */6 * * *`)
- APIs consumed:
  - VS Marketplace: `POST https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery` (flags: 914 — installs, updates, rating, trending)
  - Open VSX: `GET https://open-vsx.org/api/<namespace>/<name>`
- Output: Append one record to `data/<namespace>.<name>.json`; update `data/extensions.json`

### Storage

- Plain JSON files in the `master` branch under `/data/`
- Committed by the Actions bot after each successful collection run
- Git history provides full audit log at no extra cost

### Frontend

- Stack: React 18 + Vite + TypeScript
- Hosting: GitHub Pages (`gh-pages` branch), deployed via GitHub Actions on every push to `master`
- Routing: React Router (hash-based for GH Pages compatibility)
- Charts: Recharts (composable, TypeScript-native)
- Analytics: `regression-js` (projections), custom JS (velocity, acceleration, peaks)

### Analytics Capabilities (MVP)

| Feature | Implementation |
|---|---|
| Installs over time | Line chart from raw time series |
| Rating over time | Line chart from raw time series |
| Daily/weekly velocity | `Δinstalls / Δtime` computed client-side |
| Acceleration | `Δvelocity / Δtime` |
| Peak detection | Local maxima in velocity signal |
| Projections | Linear + exponential regression, R² shown |
| Release correlation | Vertical reference lines at release dates |
| Installs per release | `installs(now) - installs(releaseDate)` |
| Cross-registry split | Marketplace vs Open VSX as % of total |
| GitHub stars over time | Line chart from `github.stars` |
| GitHub forks over time | Line chart from `github.forks` |
| GitHub contributions over time | Line chart from `github.contributions` (non-owner) |

---

## Phase 2: Growth

**Goal:** Improve UX, add auto-discovery, enrich with events, and add offline caching.

### New Capabilities

- **Auto-discovery:** GitHub API (`GET /users/<user>/repos`) — detect extensions by `package.json` `engines.vscode` field. Automatically add to tracking without manual config.
- **Event annotations:** Developer can define arbitrary events (blog post, HN submission) in `data/events.json`; these appear as labeled vertical lines on all charts.
- **Momentum score:** Weighted composite: `score = 0.5 * normalizedVelocity + 0.3 * normalizedAcceleration + 0.2 * recencyFactor`. Used to rank extensions on the overview dashboard.
- **Forecast scenarios:** Three overlay lines per projection: optimistic (exponential), neutral (linear), pessimistic (flat/decay).
- **localStorage caching:** Last fetched dataset cached in `localStorage` for instant load; invalidated on next successful fetch.
- **Multi-extension overview:** Sortable table of all tracked extensions with sparklines, velocity badges, and momentum scores.

### Infrastructure Changes

- Collector adds GitHub API call to enumerate and register new extensions automatically.
- `data/events.json` added to schema.
- Frontend adds global "Overview" route.

---

## Phase 3: Scale

**Goal:** Support ecosystem-level analysis and embeddable artifacts, if the tool grows beyond personal use.

### New Capabilities

- **IndexedDB caching:** Replace `localStorage` with IndexedDB for large datasets. Cache precomputed metrics (velocity, regression coefficients) to avoid recomputing on every render.
- **Category aggregation:** Aggregate installs across extensions by VS Code category tag (AI, Linters, Themes). Requires enriched metadata in `extensions.json`.
- **Ecosystem leaderboards:** Trending-this-week, all-time-top, rising-stars — computed from aggregated data.
- **Embeddable badges:** Static SVG badges generated by a lightweight edge function (Cloudflare Workers free tier) reading the latest JSON. Example: `![Installs](https://...badge/Veverke.chatwizard/installs.svg)`.
- **Optional backend:** If query complexity outgrows frontend feasibility, introduce a lightweight read-only API (Cloudflare Worker or Vercel Serverless function) that serves pre-aggregated JSON.

### Infrastructure Changes

- Add `category` and `tags` fields to `extensions.json`.
- Add Cloudflare Worker for badge endpoint (optional, stays free).
- No mandatory database — scale with static JSON until forced otherwise.

---

## Technology Decisions

### Why GitHub Actions (not a Windows Service)?

| Criterion | Windows Service | GitHub Actions |
|---|---|---|
| Infra cost | $0 (own machine) | $0 (GH free tier) |
| Machine must be running | Yes | No |
| Platform portability | Windows only | Any |
| Version history for data | Manual | Built-in (git) |
| Failure recovery | Manual restart | GH retry logic |
| Onboarding for others | Hard | Fork + enable |

### Why JSON (not SQLite or Postgres)?

- Dataset is bounded (1–50 extensions × hourly samples × 1 year ≈ 500K rows maximum)
- JSON is human-readable and trivially diffable in git
- No query engine needed — all analytics computed in-memory in the browser
- Zero setup for new users — no DB migration, no connection string

### Why Recharts (not Chart.js)?

- React-native component model — no imperative `ref` wrangling
- Built-in `ComposedChart` supports overlay lines (projections) cleanly
- TypeScript types are first-class
- Smaller API surface — easier to build custom tooltips and annotations

### Why regression-js?

- Pure JS, no WASM, no server round-trip
- Supports linear, exponential, polynomial, logarithmic, power
- Returns R² coefficient — lets the UI communicate projection confidence to the user
- 4KB minified

---

## Repository Structure

```
vscode-extension-analytics/
├── .github/
│   └── workflows/
│       ├── collect.yml          # Cron: fetch stats, commit JSON
│       ├── discover.yml         # Weekly: auto-discover new extensions
│       └── deploy.yml           # Push to master: build & deploy GH Pages
├── collect/
│   ├── index.ts                 # Entry point — orchestrates collection
│   ├── marketplace.ts           # VS Marketplace API client
│   ├── openvsx.ts               # Open VSX API client
│   ├── github.ts                # GitHub API client (auto-discovery)
│   ├── storage.ts               # JSON append/read helpers
│   └── __tests__/
├── data/
│   ├── extensions.json          # Registry of tracked extensions
│   ├── events.json              # Annotated events (blog posts, etc.)
│   └── <namespace>.<name>.json  # Per-extension time series
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── Overview.tsx         # Multi-extension dashboard
│   │   └── Extension.tsx        # Single extension deep-dive
│   ├── components/
│   │   ├── charts/
│   │   │   ├── InstallsChart.tsx
│   │   │   ├── RatingChart.tsx
│   │   │   ├── VelocityChart.tsx
│   │   │   └── ProjectionOverlay.tsx
│   │   ├── cards/
│   │   │   ├── StatsCard.tsx
│   │   │   └── ReleaseImpactCard.tsx
│   │   └── annotations/
│   │       └── EventAnnotation.tsx
│   ├── metrics/
│   │   ├── velocity.ts
│   │   ├── acceleration.ts
│   │   ├── projections.ts
│   │   ├── peaks.ts
│   │   ├── momentum.ts
│   │   └── releaseCorrelation.ts
│   ├── hooks/
│   │   ├── useExtensionData.ts
│   │   └── useAutoDiscover.ts
│   └── types/
│       └── schema.ts            # Shared TypeScript types matching data schema
├── tests/
│   ├── unit/                    # Vitest unit tests
│   └── e2e/                     # Playwright E2E tests
├── fixtures/
│   └── data/                    # Real-world fixture JSON for tests
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── package.json
└── tsconfig.json
```
