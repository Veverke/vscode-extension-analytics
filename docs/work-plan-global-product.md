# Work Plan: From Personal Web App → Global VS Code Extension Analytics Platform

## Objective

Transform the current single-user web app into a **public, community-driven analytics platform** packaged as a VS Code extension, powered by GitHub as the backend (Actions → compute, Issues → input queue, Repo → storage).

---

## Overview of Changes

| Layer | Current (Personal) | Target (Global) |
|-------|-------------------|-----------------|
| **Frontend delivery** | GitHub Pages web app | VS Code Extension (Webview) + GitHub Pages |
| **Extension discovery** | Static list in `data/extensions.json` | GitHub username → auto-discover via API |
| **Tracking registration** | Manual edit of `data/extensions.json` | Issue-driven (`tracking-request` label) |
| **Registry** | Single-user static list | Shared global dataset |
| **User input** | None (hardcoded) | GitHub username entry |

---

## Work Items

### Phase 1: Issue-Based Tracking Registration (Infrastructure)

**Objective:** Enable community members to request extension tracking via GitHub Issues.

| # | Task | Files | Details |
|---|------|-------|---------|
| 1.1 | Create Issue Form template | `.github/ISSUE_TEMPLATE/add-extension.yml` | YAML form with fields: extension ID (required), GitHub repo (optional), notes. Label: `tracking-request` |
| 1.2 | Create Action: Process Tracking Requests | `.github/workflows/process-tracking-requests.yml` | Workflow triggered on `issues:opened` + label `tracking-request`. Parses issue body, validates `publisher.name` format, updates `data/extensions.json` (idempotent), adds completion comment, closes/transitions issue |
| 1.3 | Update `data/extensions.json` schema | `data/extensions.json` | Add `requestedBy` field (GitHub username of requester) to track provenance |
| 1.4 | Create helper script for issue processing | `collect/process-tracking-request.ts` | Node.js script: parse issue body → extract extension IDs → validate → merge into registry (dedup) → return updated registry |

#### Phase 1 Deliverables
- [ ] `.github/ISSUE_TEMPLATE/add-extension.yml` — issue form template
- [ ] `.github/workflows/process-tracking-requests.yml` — GitHub Action
- [ ] `data/extensions.json` — schema update with `requestedBy` field
- [ ] `collect/process-tracking-request.ts` — issue parsing/validation script
- [ ] `collect/__tests__/process-tracking-request.test.ts` — unit tests (≥90% coverage)

#### Phase 1 Manual Testing
1. Open a test issue using the form template with a valid extension ID
2. Verify the Action triggers, parses correctly, and updates `extensions.json`
3. Verify a comment is added to the issue
4. Test with invalid extension IDs (missing publisher, malformed)
5. Test idempotency: submit same extension ID twice, verify no duplicates

---

### Phase 2: VS Code Extension Scaffolding

**Objective:** Package the React analytics frontend as a VS Code extension with Webview UI.

| # | Task | Files | Details |
|---|------|-------|---------|
| 2.1 | Create extension manifest | `extension/package.json` | VS Code extension manifest (`publisher`, `name`, `activationEvents`, `contributes.views`, etc.) |
| 2.2 | Create extension entry point | `extension/extension.ts` | Activation function that registers a WebviewPanel provider (or TreeView + Webview) |
| 2.3 | Create Webview HTML template | `extension/webview/index.html` | HTML shell that loads the React bundle inside the Webview |
| 2.4 | Set up build pipeline for extension | `extension/` + Vite config | Dual build: 1) Vite builds React app for Webview, 2) `vsce` packages the extension. Update `scripts` in root `package.json` |
| 2.5 | Configure VS Code launch/debug | `.vscode/launch.json`, `.vscode/tasks.json` | Launch config to run extension in Extension Development Host |
| 2.6 | Add extension icon and marketplace assets | `extension/assets/` | Icon (`128x128`), marketplace banner, README |

#### Phase 2 Deliverables
- [ ] `extension/package.json` — extension manifest
- [ ] `extension/extension.ts` — activation entry point
- [ ] `extension/webview/index.html` — Webview shell
- [ ] Updated `vite.config.ts` — dual build (React + extension)
- [ ] `.vscode/launch.json` + `.vscode/tasks.json` — debug config
- [ ] `extension/assets/` — icon + banner + README
- [ ] `tests/unit/extension.test.ts` — unit tests for extension activation
- [ ] `tests/e2e/extension-shell.spec.ts` — E2E: extension loads in dev host

#### Phase 2 Manual Testing
1. Press F5 in VS Code to launch Extension Development Host
2. Verify the extension activates and the Webview panel appears
3. Verify the React app renders inside the Webview
4. Verify the extension icon appears in the Activity Bar
5. Run `vsce package` and verify `.vsix` is created without errors
6. Install the `.vsix` in a clean VS Code instance and verify it works

---

### Phase 3: Frontend — User Onboarding & GitHub Username Flow

**Objective:** Replace the hardcoded extension list with a GitHub-username-driven experience.

| # | Task | Files | Details |
|---|------|-------|---------|
| 3.1 | Create Landing / Username Input screen | `src/routes/Landing.tsx` | Input field for GitHub username + "Discover My Extensions" button. Validate username format. |
| 3.2 | Add auto-discovery hook | `src/hooks/useAutoDiscover.ts` (enhance existing) | Given GitHub username → fetch repos via GitHub API → filter by `package.json` `engines.vscode` → return list of extension IDs |
| 3.3 | Create Discover Results screen | `src/routes/DiscoverResults.tsx` | Shows discovered extensions with status: ✅ Tracked (has analytics), ⬜ Not Tracked (shows "Track" button) |
| 3.4 | Add "Track This Extension" flow | `src/hooks/useCreateTrackingIssue.ts` | Opens GitHub new-issue URL pre-filled: `https://github.com/Veverke/vscode-extension-analytics/issues/new?template=add-extension.yml&title=Add+extension:+<id>&labels=tracking-request` |
| 3.5 | Add routing for new screens | `src/App.tsx` | Add routes: `/` (Landing), `/discover/:username` (Discover Results), keep existing `/extension/:extensionId` and `/overview` |
| 3.6 | Update Layout component | `src/components/Layout.tsx` | Adapt sidebar to show extensions for the *current user session* (not all from registry). Add "switch user" / "discover" link. |

#### Phase 3 Deliverables
- [ ] `src/routes/Landing.tsx` — username input screen
- [ ] `src/hooks/useAutoDiscover.ts` — GitHub API auto-discovery hook
- [ ] `src/routes/DiscoverResults.tsx` — discover results screen
- [ ] `src/hooks/useCreateTrackingIssue.ts` — track-this-extension flow
- [ ] Updated `src/App.tsx` — new routes
- [ ] Updated `src/components/Layout.tsx` — session-aware sidebar
- [ ] `tests/unit/Landing.test.tsx` — UT: render, validation, submit
- [ ] `tests/unit/useAutoDiscover.test.ts` — UT: mock GitHub API, extension detection
- [ ] `tests/unit/DiscoverResults.test.tsx` — UT: tracked/untracked states
- [ ] `tests/unit/useCreateTrackingIssue.test.ts` — UT: URL generation
- [ ] `tests/e2e/discover-flow.spec.ts` — E2E: full username → discover → track flow

#### Phase 3 Manual Testing
1. Open the app, enter a valid GitHub username, click "Discover"
2. Verify discovered extensions appear with correct tracked/untracked status
3. Click "Track" on an untracked extension → verify GitHub issue page opens pre-filled
4. Verify sidebar shows only the current user's discovered extensions
5. Test with invalid username → verify error handling
6. Test with username that has no VS Code extensions → verify empty state
7. Test GitHub API rate limit (after 60 requests) → verify rate limit message

---

### Phase 4: Frontend — Data Loading Adaptation

**Objective:** Make data loading work in both webview and browser contexts, using GitHub raw URLs.

| # | Task | Files | Details |
|---|------|-------|---------|
| 4.1 | Create data loading utility | `src/utils/dataLoader.ts` | Abstraction over fetch: in webview context → fetch from GitHub raw URLs (`https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/main/data/...`). In browser context → relative path (existing). Detect via `window.vscode` API. |
| 4.2 | Update `useExtensions` hook | `src/hooks/useExtensions.ts` | Use `dataLoader` for fetching registry. Support fetching all extensions (global registry) AND filtering by user's discovered set. |
| 4.3 | Update `useExtensionData` hook | `src/hooks/useExtensionData.ts` | Use `dataLoader` for fetching per-extension time series. |
| 4.4 | Update `useEvents` hook | `src/hooks/useEvents.ts` | Use `dataLoader` for events. |
| 4.5 | Add session/user state management | `src/contexts/UserContext.ts` | Store current GitHub username in context + URL param. Persist to localStorage. |

#### Phase 4 Deliverables
- [ ] `src/utils/dataLoader.ts` — context-aware data loading utility
- [ ] Updated `src/hooks/useExtensions.ts` — uses dataLoader
- [ ] Updated `src/hooks/useExtensionData.ts` — uses dataLoader
- [ ] Updated `src/hooks/useEvents.ts` — uses dataLoader
- [ ] `src/contexts/UserContext.ts` — user session state
- [ ] `tests/unit/dataLoader.test.ts` — UT: webview vs browser context, URL construction
- [ ] `tests/unit/UserContext.test.tsx` — UT: session persistence, URL params
- [ ] `tests/unit/useExtensions.test.ts` — update UT for dataLoader
- [ ] `tests/unit/useExtensionData.test.ts` — update UT for dataLoader
- [ ] `tests/unit/useEvents.test.ts` — update UT for dataLoader

#### Phase 4 Manual Testing
1. In browser: verify data loads from relative paths (existing behavior)
2. In Webview (Extension Dev Host): verify data loads from GitHub raw URLs
3. Verify session persistence: enter username, refresh → username still shown
4. Verify extension data loads for both tracked and newly-discovered extensions
5. Test with network failures → verify error states render correctly
6. Test with CORS issues in Webview → verify proper error handling

---

### Phase 5: Frontend — Global Overview & UX Polish

**Objective:** Polish the UI to support the multi-user, multi-extension global experience.

| # | Task | Files | Details |
|---|------|-------|---------|
| 5.1 | Update Overview page | `src/routes/Overview.tsx` | Show user's discovered extensions (not all registry extensions). Add "Show all tracked extensions" toggle. |
| 5.2 | Add "Untracked" indicator | `src/components/cards/UntrackedCard.tsx` | Card for discovered-but-untracked extensions, showing "Track on GitHub" CTA button |
| 5.3 | Add loading/skeleton states for discovery | `src/components/cards/` | Skeleton screens for the discover flow |
| 5.4 | Handle rate limiting for GitHub API | `src/utils/githubApi.ts` | Show informational message when unauthenticated API rate limit is hit (60 req/hr). Suggest using a token. |
| 5.5 | Update global styles | `src/styles/global.css` | Add styles for new components (landing, discover results, track buttons) |

#### Phase 5 Deliverables
- [ ] Updated `src/routes/Overview.tsx` — user-scoped + toggle
- [ ] `src/components/cards/UntrackedCard.tsx` — untracked extension card
- [ ] Loading/skeleton components for discover flow
- [ ] `src/utils/githubApi.ts` — rate limit handling
- [ ] Updated `src/styles/global.css` — new component styles
- [ ] `tests/unit/Overview.test.tsx` — update UT for user-scoping
- [ ] `tests/unit/UntrackedCard.test.tsx` — UT: render, CTA button
- [ ] `tests/unit/githubApi.test.ts` — UT: rate limit detection, messaging
- [ ] `tests/e2e/overview-ux.spec.ts` — E2E: toggle, untracked cards, rate limit message

#### Phase 5 Manual Testing
1. Verify Overview shows only current user's discovered extensions
2. Toggle "Show all tracked" → verify all registry extensions appear
3. Verify untracked extensions show "Track on GitHub" CTA button
4. Verify skeleton/loading states appear during discovery
5. Hit GitHub API rate limit → verify informative message appears
6. Verify responsive layout on different Webview sizes
7. Verify all new components match design specs

---

### Phase 6: Backend — Generic Discovery & Registry Updates

**Objective:** Update the collection pipeline to support a global, community-driven registry.

| # | Task | Files | Details |
|---|------|-------|---------|
| 6.1 | Update `discover.ts` | `collect/discover.ts` | Remove `GITHUB_USER` restriction. Instead, the discovery workflow should process tracking-request issues. (Or keep as-is but make it also scan the registry's `githubRepo` fields for updates.) |
| 6.2 | Update `collect/index.ts` | `collect/index.ts` | Ensure it works with the shared global registry (already does — reads `data/extensions.json`). No changes needed unless schema changed. |
| 6.3 | Add issue-processing Action | (same as 1.2) | Ties into Phase 1 — the Action processes issues submitted by the community |

#### Phase 6 Deliverables
- [ ] Updated `collect/discover.ts` — multi-user discovery support
- [ ] Updated `collect/index.ts` — global registry compatibility
- [ ] Updated `collect/__tests__/discover.test.ts` — UT: multi-user, registry updates
- [ ] `collect/__tests__/index.test.ts` — update UT for global registry
- [ ] `collect/__tests__/integration.test.ts` — integration: issue → registry → collect → data

#### Phase 6 Manual Testing
1. Submit a tracking-request issue → verify Action processes it
2. Run `collect/index.ts` → verify new extension data is collected
3. Verify time-series data files are created for new extensions
4. Check `data/events.json` → verify events are recorded
5. Test with malformed issues → verify graceful error handling
6. Test concurrent issue submissions → verify no race conditions

---

### Phase 7: Testing & Documentation

| # | Task | Files | Details |
|---|------|-------|---------|
| 7.1 | Unit tests for issue parsing | `collect/__tests__/process-tracking-request.test.ts` | Test extraction of extension IDs from issue body, validation, dedup logic |
| 7.2 | Unit tests for auto-discovery | `src/__tests__/useAutoDiscover.test.ts` | Mock GitHub API responses, test extension detection |
| 7.3 | Unit tests for data loader | `src/__tests__/dataLoader.test.ts` | Test webview vs browser context detection, URL construction |
| 7.4 | E2E tests for issue flow | `tests/e2e/` | Test the full flow: click "Track" → opens correct GitHub issue URL |
| 7.5 | Update README | `README.md` | Document new architecture, how to use the VS Code extension, how to request tracking |

#### Phase 7 Deliverables
- [ ] `collect/__tests__/process-tracking-request.test.ts` — UT: issue parsing
- [ ] `tests/unit/useAutoDiscover.test.ts` — UT: GitHub API mocking
- [ ] `tests/unit/dataLoader.test.ts` — UT: context detection
- [ ] `tests/e2e/issue-flow.spec.ts` — E2E: track → issue URL
- [ ] Updated `README.md` — new architecture documentation
- [ ] All tests passing with ≥90% code coverage
- [ ] No skipped tests (or documented reason for skip)
- [ ] Manual test checklist completed for all phases

#### Phase 7 Manual Testing (Full Regression)
1. **MVP features still work:** Overview page, extension detail, charts, metrics
2. **Extension scaffolding:** F5 launch, Webview renders, commands work
3. **User onboarding:** Landing page, username input, validation
4. **Auto-discovery:** GitHub API integration, extension detection, error states
5. **Track flow:** CTA button, GitHub issue pre-fill, issue submission
6. **Data loading:** Browser context (relative paths), Webview context (GitHub raw)
7. **Session management:** Username persistence, switch user, clear session
8. **Global overview:** User-scoped view, "show all" toggle
9. **Rate limiting:** Unauthenticated API limit, token suggestion
10. **Error states:** Network failures, 404s, malformed data, empty states

---

## Architecture Diagram (After)

```
┌─ VS Code Extension (Webview) ──────────────────────┐
│  User enters GitHub username                        │
│       ↓                                             │
│  Auto-discover extensions (GitHub API)              │
│       ↓                                             │
│  Match against global dataset (data/extensions.json)│
│       ↓                                             │
│  Show: Tracked ✅ | Not Tracked ⬜                  │
│       ↓                                             │
│  "Track" button → opens pre-filled GitHub Issue     │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─ GitHub Repo ───────────────────────────────────────┐
│  .github/ISSUE_TEMPLATE/add-extension.yml            │
│       ↓                                              │
│  Issue created with label: tracking-request           │
│       ↓                                              │
│  GitHub Action: process-tracking-requests.yml         │
│  → Parses issue → Validates → Updates registry       │
│  → Comments on issue → Closes                        │
│       ↓                                              │
│  Next collect run → data available                   │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─ User returns to extension ────────────────────────┐
│  Same username → data now shows analytics ✅        │
└─────────────────────────────────────────────────────┘
```

---

## Dependency Order

```
Phase 1 (Issue infra) ──┐
                         ├──> Phase 6 (Backend updates) ──> Phase 7 (Testing)
Phase 2 (Extension) ────┤
                         ├──> Phase 3 (Username flow) ──> Phase 4 (Data loading) ──> Phase 5 (UX polish)
Phase 2 must precede 3 (extension scaffold needed for webview)
Phase 1 must precede 6 (issue processing workflow depends on issue form)
Phase 3 → 4 → 5 are sequential (discover → load → polish)
Phase 7 runs in parallel after 1, 3, 4
```

---

## Current State Code Coverage (Pre-Phase 1)

### Source Files with Existing Unit Tests ✅
| File | Test File | Coverage |
|------|-----------|----------|
| `src/App.tsx` | `tests/unit/App.test.tsx` | ✅ |
| `src/components/Layout.tsx` | `tests/unit/Layout.test.tsx` | ✅ |
| `src/routes/Overview.tsx` | `tests/unit/Overview.test.tsx` | ✅ |
| `src/routes/ExtensionDetail.tsx` | `tests/unit/ExtensionDetail.test.tsx` | ✅ |
| `src/hooks/useExtensions.ts` | `tests/unit/useExtensions.test.ts` | ✅ |
| `src/hooks/useExtensionData.ts` | `tests/unit/useExtensionData.test.ts` | ✅ |
| `src/hooks/useEvents.ts` | `tests/unit/useEvents.test.ts` | ✅ |
| `src/hooks/useAllExtensionsData.ts` | `tests/unit/useAllExtensionsData.test.ts` | ✅ |
| `src/hooks/useReleaseData.ts` | `tests/unit/useReleaseData.test.ts` | ✅ |
| `src/metrics/acceleration.ts` | `tests/unit/acceleration.test.ts` | ✅ |
| `src/metrics/momentum.ts` | `tests/unit/momentum.test.ts` | ✅ |
| `src/metrics/peaks.ts` | `tests/unit/peaks.test.ts` | ✅ |
| `src/metrics/projections.ts` | `tests/unit/projections.test.ts` | ✅ |
| `src/metrics/velocity.ts` | `tests/unit/velocity.test.ts` | ✅ |
| `src/metrics/releaseCorrelation.ts` | `tests/unit/releaseCorrelation.test.ts` | ✅ |
| `src/utils/normalize.ts` | `tests/unit/normalize.test.ts` | ✅ |
| `src/utils/icons.ts` | (no direct test) | ⬜ |
| `src/components/charts/InstallsChart.tsx` | `tests/unit/InstallsChart.test.tsx` | ✅ |
| `src/components/charts/VelocityChart.tsx` | `tests/unit/VelocityChart.test.tsx` | ✅ |
| `src/components/charts/RatingChart.tsx` | `tests/unit/RatingChart.test.tsx` | ✅ |
| `src/components/charts/Sparkline.tsx` | `tests/unit/Sparkline.test.tsx` | ✅ |
| `src/components/cards/StatsCards.tsx` | `tests/unit/StatsCards.test.tsx` | ✅ |
| `src/components/cards/MetricsPanel.tsx` | `tests/unit/MetricsPanel.test.tsx` | ✅ |
| `src/components/cards/MomentumBadge.tsx` | `tests/unit/MomentumBadge.test.tsx` | ✅ |
| `src/components/cards/VelocityBadge.tsx` | `tests/unit/VelocityBadge.test.tsx` | ✅ |
| `src/components/cards/ReleaseImpactPanel.tsx` | `tests/unit/ReleaseImpactPanel.test.tsx` | ✅ |
| `src/components/annotations/EventAnnotation.tsx` | `tests/unit/eventAnnotations.test.ts` | ✅ |
| `collect/discover.ts` | `collect/__tests__/discover.test.ts` | ✅ |
| `collect/github.ts` | `collect/__tests__/github.test.ts` | ✅ |
| `collect/marketplace.ts` | `collect/__tests__/marketplace.test.ts` | ✅ |
| `collect/storage.ts` | `collect/__tests__/storage.test.ts` | ✅ |

### Source Files Without Tests ⚠️
| File | Reason | Priority |
|------|--------|----------|
| `src/utils/icons.ts` | Simple icon mapping, low risk | Low |
| `src/types/schema.ts` | Type definitions only | Low |
| `collect/index.ts` | CLI entry point, covered by integration | Low |
| `src/main.tsx` | Entry point, trivial | Low |
| `src/vite-env.d.ts` | Type declarations | N/A |

### Test Issues Identified
1. **OOM in `useAllExtensionsData.test.ts`:** The `sparklinePoints has at most 14 values` test causes a memory leak in vitest pool workers. **Fix:** Add `unmount` after each test to clean up React state.
2. **E2E tests (`tests/e2e/`)** are skipped when Playwright is not available — this is expected.

## Known Test Issues & Required Fixes

### Issue 1: Memory Leak in `useAllExtensionsData.test.ts`
**Symptom:** `sparklinePoints has at most 14 values` test causes vitest worker OOM
**Root Cause:** React state updates from async fetch are not cleaned up between tests
**Fix:** Add `unmount()` after each test, or increase vitest pool timeout. See `tests/unit/useAllExtensionsData.test.ts`.

### Issue 2: Missing `icons.test.ts`
**Symptom:** `src/utils/icons.ts` has no test coverage
**Fix:** Create `tests/unit/icons.test.ts` with basic import/export tests

## Effort Estimate

| Phase | Estimated Complexity | Key Risk |
|-------|---------------------|----------|
| Phase 1: Issue infra | Low-Medium | YAML + GitHub Actions syntax |
| Phase 2: Extension scaffold | Medium | First-time VS Code extension setup |
| Phase 3: Username flow | Medium | GitHub API integration, rate limits |
| Phase 4: Data loading | Low | URL abstraction, testing both contexts |
| Phase 5: UX polish | Medium | Many UI components to create |
| Phase 6: Backend updates | Low | Minimal changes needed |
| Phase 7: Testing | Medium | Mocking GitHub API, E2E in webview |
