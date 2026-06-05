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
| 1 | Repository & Infrastructure Setup | âœ… Completed |
| 2 | Auto-Discovery & Data Collector | ✅ Completed |
| 3 | Frontend Shell & GitHub Pages Deployment | ✅ Completed |
| 4 | Core Charts & Data Display | ✅ Completed |
| 5 | Derived Analytics (Velocity, Projections, Peaks) | ✅ Completed |
| 6 | Release Correlation & Event Annotations | â¬œ Not started |
| 7 | Multi-Extension Overview Dashboard | â¬œ Not started |

---

## Phase Summaries

### Phase 1 â€” Repository & Infrastructure Setup
Establish the monorepo structure, toolchain (React/Vite/TypeScript, Vitest, Playwright), GitHub Actions pipelines for collection and deployment, and GitHub Pages configuration. No application logic â€” pure scaffolding.

**Deliverable:** `npm run dev` serves a blank React app. `npm run build` produces a deployable static bundle. GH Pages deployment pipeline runs on push.

---

### Phase 2 â€” Auto-Discovery & Data Collector
Build the GitHub API auto-discovery pipeline **and** the VS Marketplace / Open VSX collection scripts. Discovery runs first to scan the developer's GitHub account, detect all VS Code extension repos by `engines.vscode` in `package.json`, and populate `data/extensions.json`. The collector then reads that registry on every scheduled run and appends time-series records per extension.

**Deliverable:** `collect/discover.ts` populates `data/extensions.json` from GitHub. `collect/index.ts` appends one correctly-shaped record per discovered extension to its time-series file.

---

### Phase 3 â€” Frontend Shell & GitHub Pages Deployment
Build the React application skeleton: routing, layout, navigation, and the mechanism by which the app loads `data/extensions.json` to know which extensions are being tracked. No charts yet.

**Deliverable:** App shows a sidebar listing tracked extensions. Clicking one navigates to its route. Deploys to GitHub Pages successfully.

---

### Phase 4 — Core Charts & Data Display ✅ Completed
Build the data-loading hooks and the primary visualization components: installs over time, rating over time, and summary stat cards. Uses real fixture data for development and tests.

**Deliverable:** Extension detail page shows installs chart, rating chart, and stat cards populated from the JSON time series.

---

### Phase 5 â€” Derived Analytics (Velocity, Projections, Peaks)
Implement all computed metric functions and their corresponding UI components: velocity chart, acceleration overlay, projection lines (linear + exponential with RÂ²), and peak markers on the installs chart.

**Deliverable:** Extension detail page shows velocity chart, dashed projection line on installs chart with RÂ² confidence label, and highlighted peak points.

---

### Phase 6 â€” Release Correlation & Event Annotations
Enrich collection with version history from the Marketplace API. Build the release timeline and per-release impact metrics. Add vertical annotation lines to charts for releases and custom events.

**Deliverable:** Installs chart shows labeled vertical lines at each release date. A "Release Impact" panel shows installs gained per version.

---

### Phase 7 â€” Multi-Extension Overview Dashboard
Build the multi-extension Overview dashboard that aggregates data across all tracked extensions (already populated in `data/extensions.json` by Phase 2's discovery pipeline) into a single view. Implements sparklines, velocity badges, momentum scores, and sortable columns.

**Deliverable:** Overview dashboard lists all tracked extensions with sparklines, velocity badges, momentum scores, and sortable columns.

---

## Cross-Phase Standards

- Every phase includes unit tests (Vitest) and E2E tests (Playwright).
- Tests use real-world fixture data derived from actual API responses, not invented numbers.
- Each phase ends with the corresponding row in the table above being marked âœ… Completed.
- No phase is considered complete if there are failing tests or TypeScript errors.
