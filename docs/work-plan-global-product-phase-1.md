# Phase 1: Issue-Based Tracking Registration (Infrastructure)

> **Design Principle — Atomic Tasks:** Each task in this phase is designed to be **atomic** (self-contained and independently implementable). Tasks can be worked on **in parallel** by different contributors, as they have minimal interdependencies. Task 1.1 (issue form) and 1.4 (helper script) can be developed concurrently; 1.2 (Action workflow) depends on 1.1 only for the label name; 1.3 (schema update) is standalone.

## Objective

Enable community members to request extension tracking via GitHub Issues.

## Work Items

| # | Task | Files | Details |
|---|------|-------|---------|
| 1.1 | Create Issue Form template | `.github/ISSUE_TEMPLATE/add-extension.yml` | YAML form with fields: extension ID (required), GitHub repo (optional), notes. Label: `tracking-request` |
| 1.2 | Create Action: Process Tracking Requests | `.github/workflows/process-tracking-requests.yml` | Workflow triggered on `issues:opened` + label `tracking-request`. Parses issue body, validates `publisher.name` format, updates `data/extensions.json` (idempotent), adds completion comment, closes/transitions issue |
| 1.3 | Update `data/extensions.json` schema | `data/extensions.json` | Add `requestedBy` field (GitHub username of requester) to track provenance |
| 1.4 | Create helper script for issue processing | `collect/process-tracking-request.ts` | Node.js script: parse issue body → extract extension IDs → validate → merge into registry (dedup) → return updated registry |

## Phase 1 Deliverables

- [ ] `.github/ISSUE_TEMPLATE/add-extension.yml` — issue form template
- [ ] `.github/workflows/process-tracking-requests.yml` — GitHub Action
- [ ] `data/extensions.json` — schema update with `requestedBy` field
- [ ] `collect/process-tracking-request.ts` — issue parsing/validation script
- [ ] `collect/__tests__/process-tracking-request.test.ts` — unit tests (≥90% coverage)

## Phase 1 Manual Testing

1. Open a test issue using the form template with a valid extension ID
2. Verify the Action triggers, parses correctly, and updates `extensions.json`
3. Verify a comment is added to the issue
4. Test with invalid extension IDs (missing publisher, malformed)
5. Test idempotency: submit same extension ID twice, verify no duplicates