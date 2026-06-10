# Phase 4: Frontend — Data Loading Adaptation

> **Design Principle — Atomic Tasks:** Each task in this phase is designed to be **atomic** (self-contained and independently implementable). Tasks can be worked on **in parallel** by different contributors. 4.1 (dataLoader utility) is the foundational abstraction and should be defined first to agree on the interface. Once its interface is set, 4.2 (useExtensions), 4.3 (useExtensionData), 4.4 (useEvents), and 4.5 (UserContext) can all be implemented concurrently by different team members.

## Objective

Make data loading work in both webview and browser contexts, using GitHub raw URLs.

## Work Items

| # | Task | Files | Details |
|---|------|-------|---------|
| 4.1 | Create data loading utility | `src/utils/dataLoader.ts` | Abstraction over fetch: in webview context → fetch from GitHub raw URLs (`https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/main/data/...`). In browser context → relative path (existing). Detect via `window.vscode` API. |
| 4.2 | Update `useExtensions` hook | `src/hooks/useExtensions.ts` | Use `dataLoader` for fetching registry. Support fetching all extensions (global registry) AND filtering by user's discovered set. |
| 4.3 | Update `useExtensionData` hook | `src/hooks/useExtensionData.ts` | Use `dataLoader` for fetching per-extension time series. |
| 4.4 | Update `useEvents` hook | `src/hooks/useEvents.ts` | Use `dataLoader` for events. |
| 4.5 | Add session/user state management | `src/contexts/UserContext.ts` | Store current GitHub username in context + URL param. Persist to localStorage. |

## Phase 4 Deliverables

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

## Phase 4 Manual Testing

1. In browser: verify data loads from relative paths (existing behavior)
2. In Webview (Extension Dev Host): verify data loads from GitHub raw URLs
3. Verify session persistence: enter username, refresh → username still shown
4. Verify extension data loads for both tracked and newly-discovered extensions
5. Test with network failures → verify error states render correctly
6. Test with CORS issues in Webview → verify proper error handling