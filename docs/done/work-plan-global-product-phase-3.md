# Phase 3: Frontend — User Onboarding & GitHub Username Flow

> **Design Principle — Atomic Tasks:** Each task in this phase is designed to be **atomic** (self-contained and independently implementable). Tasks can be worked on **in parallel** by different contributors. For example, 3.1 (Landing screen), 3.2 (auto-discover hook), and 3.4 (track-this-extension hook) are independent components that can be developed concurrently with agreed-upon interfaces. 3.3 (DiscoverResults) depends on 3.2's hook signature. 3.5 (routing) and 3.6 (Layout) can integrate components as they become available.

## Objective

Replace the hardcoded extension list with a GitHub-username-driven experience.

## Work Items

| # | Task | Files | Details |
|---|------|-------|---------|
| 3.1 | Create Landing / Username Input screen | `src/routes/Landing.tsx` | Input field for GitHub username + "Discover My Extensions" button. Validate username format. |
| 3.2 | Add auto-discovery hook | `src/hooks/useAutoDiscover.ts` (enhance existing) | Given GitHub username → fetch repos via GitHub API → filter by `package.json` `engines.vscode` → return list of extension IDs |
| 3.3 | Create Discover Results screen | `src/routes/DiscoverResults.tsx` | Shows discovered extensions with status: ✅ Tracked (has analytics), ⬜ Not Tracked (shows "Track" button) |
| 3.4 | Add "Track This Extension" flow | `src/hooks/useCreateTrackingIssue.ts` | Opens GitHub new-issue URL pre-filled: `https://github.com/Veverke/vscode-extension-analytics/issues/new?template=add-extension.yml&title=Add+extension:+<id>&labels=tracking-request` |
| 3.5 | Add routing for new screens | `src/App.tsx` | Add routes: `/` (Landing), `/discover/:username` (Discover Results), keep existing `/extension/:extensionId` and `/overview` |
| 3.6 | Update Layout component | `src/components/Layout.tsx` | Adapt sidebar to show extensions for the *current user session* (not all from registry). Add "switch user" / "discover" link. |

## Phase 3 Deliverables

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

## Phase 3 Manual Testing

1. Open the app, enter a valid GitHub username, click "Discover"
2. Verify discovered extensions appear with correct tracked/untracked status
3. Click "Track" on an untracked extension → verify GitHub issue page opens pre-filled
4. Verify sidebar shows only the current user's discovered extensions
5. Test with invalid username → verify error handling
6. Test with username that has no VS Code extensions → verify empty state
7. Test GitHub API rate limit (after 60 requests) → verify rate limit message