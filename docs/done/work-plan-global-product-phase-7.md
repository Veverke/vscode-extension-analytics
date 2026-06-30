# Phase 7: Testing & Documentation

> **Design Principle — Atomic Tasks:** Each task in this phase is designed to be **atomic** (self-contained and independently implementable). Tasks can be worked on **in parallel** by different contributors. 7.1 (issue parsing tests), 7.2 (auto-discovery tests), 7.3 (data loader tests), 7.4 (E2E tests), and 7.5 (README) are all independent testing and documentation items that can be written concurrently based on their respective phase deliverables.

## Objective

Comprehensive testing and documentation to ensure quality and usability.

## Work Items

| # | Task | Files | Details |
|---|------|-------|---------|
| 7.1 | Unit tests for issue parsing | `collect/__tests__/process-tracking-request.test.ts` | Test extraction of extension IDs from issue body, validation, dedup logic |
| 7.2 | Unit tests for auto-discovery | `src/__tests__/useAutoDiscover.test.ts` | Mock GitHub API responses, test extension detection |
| 7.3 | Unit tests for data loader | `src/__tests__/dataLoader.test.ts` | Test webview vs browser context detection, URL construction |
| 7.4 | E2E tests for issue flow | `tests/e2e/` | Test the full flow: click "Track" → opens correct GitHub issue URL |
| 7.5 | Update README | `README.md` | Document new architecture, how to use the VS Code extension, how to request tracking |

## Phase 7 Deliverables

- [ ] `collect/__tests__/process-tracking-request.test.ts` — UT: issue parsing
- [ ] `tests/unit/useAutoDiscover.test.ts` — UT: GitHub API mocking
- [ ] `tests/unit/dataLoader.test.ts` — UT: context detection
- [ ] `tests/e2e/issue-flow.spec.ts` — E2E: track → issue URL
- [ ] Updated `README.md` — new architecture documentation
- [ ] All tests passing with ≥90% code coverage
- [ ] No skipped tests (or documented reason for skip)
- [ ] Manual test checklist completed for all phases

## Phase 7 Manual Testing (Full Regression)

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