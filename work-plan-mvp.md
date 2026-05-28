# MVP Work Plan

## Definition of MVP

The MVP is a fully functional, zero-cost analytics tool that:
- Automatically collects VS Code extension stats from both registries on a schedule.
- Persists data as versioned JSON in the repository.
- Renders a GitHub Pages dashboard with charts, derived metrics, and projections.
- Covers at least one extension end-to-end with real data.

---

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | Repository & Infrastructure Setup | ✅ Completed |
| 2 | Data Collector | ⬜ Not started |
| 3 | Frontend Shell & GitHub Pages Deployment | ⬜ Not started |
| 4 | Core Charts & Data Display | ⬜ Not started |
| 5 | Derived Analytics (Velocity, Projections, Peaks) | ⬜ Not started |
| 6 | Release Correlation & Event Annotations | ⬜ Not started |
| 7 | Multi-Extension & Auto-Discovery | ⬜ Not started |

---

## Phase Summaries

### Phase 1 — Repository & Infrastructure Setup
Establish the monorepo structure, toolchain (React/Vite/TypeScript, Vitest, Playwright), GitHub Actions pipelines for collection and deployment, and GitHub Pages configuration. No application logic — pure scaffolding.

**Deliverable:** `npm run dev` serves a blank React app. `npm run build` produces a deployable static bundle. GH Pages deployment pipeline runs on push.

---

### Phase 2 — Data Collector
Build the Node.js scripts that call the VS Marketplace API and Open VSX API, parse the responses, and append time-series records to per-extension JSON files. Includes the GitHub Actions cron workflow and the `data/extensions.json` registry.

**Deliverable:** Running `node collect/index.ts` (or the GH Actions workflow) appends one correctly-shaped record to `data/Veverke.chatwizard.json`.

---

### Phase 3 — Frontend Shell & GitHub Pages Deployment
Build the React application skeleton: routing, layout, navigation, and the mechanism by which the app loads `data/extensions.json` to know which extensions are being tracked. No charts yet.

**Deliverable:** App shows a sidebar listing tracked extensions. Clicking one navigates to its route. Deploys to GitHub Pages successfully.

---

### Phase 4 — Core Charts & Data Display
Build the data-loading hooks and the primary visualization components: installs over time, rating over time, and summary stat cards. Uses real fixture data for development and tests.

**Deliverable:** Extension detail page shows installs chart, rating chart, and stat cards populated from the JSON time series.

---

### Phase 5 — Derived Analytics (Velocity, Projections, Peaks)
Implement all computed metric functions and their corresponding UI components: velocity chart, acceleration overlay, projection lines (linear + exponential with R²), and peak markers on the installs chart.

**Deliverable:** Extension detail page shows velocity chart, dashed projection line on installs chart with R² confidence label, and highlighted peak points.

---

### Phase 6 — Release Correlation & Event Annotations
Enrich collection with version history from the Marketplace API. Build the release timeline and per-release impact metrics. Add vertical annotation lines to charts for releases and custom events.

**Deliverable:** Installs chart shows labeled vertical lines at each release date. A "Release Impact" panel shows installs gained per version.

---

### Phase 7 — Multi-Extension & Auto-Discovery
Build the GitHub API auto-discovery pipeline that detects VS Code extensions in a user's repos. Add the multi-extension overview dashboard with sparklines, velocity badges, and momentum scores.

**Deliverable:** Overview dashboard lists all auto-discovered extensions. Auto-discovery runs on a weekly schedule in GitHub Actions.

---

## Cross-Phase Standards

- Every phase includes unit tests (Vitest) and E2E tests (Playwright).
- Tests use real-world fixture data derived from actual API responses, not invented numbers.
- Each phase ends with the corresponding row in the table above being marked ✅ Completed.
- No phase is considered complete if there are failing tests or TypeScript errors.
