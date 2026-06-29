# Phase 6: Backend — Generic Discovery & Registry Updates

> **Design Principle — Atomic Tasks:** Each task in this phase is designed to be **atomic** (self-contained and independently implementable). Tasks can be worked on **in parallel** by different contributors. 6.1 (discover.ts) and 6.2 (collect/index.ts) are independent modules that can be updated concurrently. 6.3 references the Action from Phase 1.2 and has no new implementation — it serves as the integration point.

## Objective

Update the collection pipeline to support a global, community-driven registry.

## Work Items

| # | Task | Files | Details |
|---|------|-------|---------|
| 6.1 | Update `discover.ts` | `collect/discover.ts` | Remove `GITHUB_USER` restriction. Instead, the discovery workflow should process tracking-request issues. (Or keep as-is but make it also scan the registry's `githubRepo` fields for updates.) |
| 6.2 | Update `collect/index.ts` | `collect/index.ts` | Ensure it works with the shared global registry (already does — reads `data/extensions.json`). No changes needed unless schema changed. |
| 6.3 | Add issue-processing Action | (same as 1.2) | Ties into Phase 1 — the Action processes issues submitted by the community |

## Phase 6 Deliverables

- [x] Updated `collect/discover.ts` — multi-user discovery support
- [x] Updated `collect/index.ts` — global registry compatibility
- [x] Updated `.github/workflows/discover.yml` — optional `GITHUB_USER`, registry scan
- [x] Updated `collect/__tests__/discover.test.ts` — UT: multi-user, registry updates
- [x] Updated `collect/__tests__/github.test.ts` — UT: scanSingleRepo, discoverFromRepos
- [x] `collect/__tests__/index.test.ts` — unchanged (already compatible with global registry)

## Phase 6 Manual Testing

1. Submit a tracking-request issue → verify Action processes it
2. Run `collect/index.ts` → verify new extension data is collected
3. Verify time-series data files are created for new extensions
4. Check `data/events.json` → verify events are recorded
5. Test with malformed issues → verify graceful error handling
6. Test concurrent issue submissions → verify no race conditions