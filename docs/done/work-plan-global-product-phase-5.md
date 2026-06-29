# Phase 5: Frontend — Global Overview & UX Polish

> **Design Principle — Atomic Tasks:** Each task in this phase is designed to be **atomic** (self-contained and independently implementable). Tasks can be worked on **in parallel** by different contributors. 5.1 (Overview), 5.2 (UntrackedCard), 5.3 (loading/skeleton states), 5.4 (githubApi rate limit), and 5.5 (global styles) are all independent components/utilities that can be developed concurrently with little to no cross-dependencies.

## Objective

Polish the UI to support the multi-user, multi-extension global experience.

## Work Items

| # | Task | Files | Details |
|---|------|-------|---------|
| 5.1 | Update Overview page | `src/routes/Overview.tsx` | Show user's discovered extensions (not all registry extensions). Add "Show all tracked extensions" toggle. |
| 5.2 | Add "Untracked" indicator | `src/components/cards/UntrackedCard.tsx` | Card for discovered-but-untracked extensions, showing "Track on GitHub" CTA button |
| 5.3 | Add loading/skeleton states for discovery | `src/components/cards/` | Skeleton screens for the discover flow |
| 5.4 | Handle rate limiting for GitHub API | `src/utils/githubApi.ts` | Show informational message when unauthenticated API rate limit is hit (60 req/hr). Suggest using a token. |
| 5.5 | Update global styles | `src/styles/global.css` | Add styles for new components (landing, discover results, track buttons) |

## Phase 5 Deliverables

- [ ] Updated `src/routes/Overview.tsx` — user-scoped + toggle
- [ ] `src/components/cards/UntrackedCard.tsx` — untracked extension card
- [ ] Loading/skeleton components for discover flow
- [ ] `src/utils/githubApi.ts` — rate limit handling
- [ ] Updated `src/styles/global.css` — new component styles
- [ ] `tests/unit/Overview.test.tsx` — update UT for user-scoping
- [ ] `tests/unit/UntrackedCard.test.tsx` — UT: render, CTA button
- [ ] `tests/unit/githubApi.test.ts` — UT: rate limit detection, messaging
- [ ] `tests/e2e/overview-ux.spec.ts` — E2E: toggle, untracked cards, rate limit message

## Phase 5 Manual Testing

1. Verify Overview shows only current user's discovered extensions
2. Toggle "Show all tracked" → verify all registry extensions appear
3. Verify untracked extensions show "Track on GitHub" CTA button
4. Verify skeleton/loading states appear during discovery
5. Hit GitHub API rate limit → verify informative message appears
6. Verify responsive layout on different Webview sizes
7. Verify all new components match design specs