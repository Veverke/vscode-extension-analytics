# Phase 2 — Auto-Discovery & Data Collector

## Goal
Build the GitHub API auto-discovery pipeline **and** the VS Marketplace / Open VSX collection scripts. Discovery runs first: it scans the developer's GitHub account, detects all VS Code extension repos by the presence of `engines.vscode` in `package.json`, and populates `data/extensions.json`. The collector then reads that registry on every scheduled run and appends time-series records per extension. Includes shared TypeScript schema types and all associated unit and integration tests.

---

## Atomic Tasks

---

### Task 2.1 — Define shared TypeScript schema types
**Independent**

Create `src/types/schema.ts` — the canonical type definitions shared by both the collector and the frontend.

Types to define:
- `MarketplaceSnapshot` — fields returned by the Marketplace API (`installs`, `updates`, `averageRating`, `ratingCount`, `trendingWeekly`, `trendingMonthly`)
- `OpenVsxSnapshot` — fields returned by Open VSX API (`downloads`, `averageRating`, `ratingCount`)
- `DataPoint` — `{ ts: string; marketplace: MarketplaceSnapshot; openVsx: OpenVsxSnapshot }`
- `ExtensionEntry` — entry in `data/extensions.json` (`id`, `namespace`, `name`, `displayName`, `githubRepo`, `trackedSince`)
- `ExtensionRegistry` — `ExtensionEntry[]`

**Done when:** `src/types/schema.ts` compiles with `tsc --noEmit`.

---

### Task 2.2 — VS Marketplace API client
**Depends on 2.1**

Create `collect/marketplace.ts`.

Implementation:
- `POST https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery`
- Request header: `Accept: application/json;api-version=7.2-preview.1`
- Request body: `{ filters: [{ criteria: [{ filterType: 7, value: "<id>" }] }], flags: 914 }`
- Parse `results[0].extensions[0].statistics[]` array into `MarketplaceSnapshot`
- Flag values to extract:
  - `statisticName: "install"` → `installs`
  - `statisticName: "updateCount"` → `updates`
  - `statisticName: "averagerating"` → `averageRating`
  - `statisticName: "ratingcount"` → `ratingCount`
  - `statisticName: "trendingweekly"` → `trendingWeekly`
  - `statisticName: "trendingmonthly"` → `trendingMonthly`
- Export: `fetchMarketplaceStats(extensionId: string): Promise<MarketplaceSnapshot>`
- Use native `fetch` (Node 18+); no axios dependency

**Done when:** Function returns a valid `MarketplaceSnapshot` when called with `"Veverke.chatwizard"`.

---

### Task 2.3 — Open VSX API client
**Depends on 2.1**

Create `collect/openvsx.ts`.

Implementation:
- `GET https://open-vsx.org/api/<namespace>/<name>`
- Parse `downloads`, `averageRating`, `reviewCount` from response
- Export: `fetchOpenVsxStats(namespace: string, name: string): Promise<OpenVsxSnapshot>`
- Handle 404 gracefully: if extension is not published on Open VSX, return `null` and log a warning

**Done when:** Function returns a valid `OpenVsxSnapshot` when called with `("Veverke", "chatwizard")`.

---

### Task 2.4 — JSON storage helpers
**Depends on 2.1**

Create `collect/storage.ts`.

Functions to implement:
- `readExtensionRegistry(): ExtensionRegistry` — reads `data/extensions.json`; returns `[]` if file does not exist
- `writeExtensionRegistry(registry: ExtensionRegistry): void`
- `readTimeSeries(extensionId: string): DataPoint[]` — reads `data/<id>.json`; returns `[]` if file does not exist
- `appendDataPoint(extensionId: string, point: DataPoint): void` — reads existing array, appends, writes back
- `ensureDataDir(): void` — creates `data/` directory if it does not exist

**Done when:** Round-trip test (write → read → compare) passes.

---

### Task 2.5 — Collector entry point
**Depends on 2.2, 2.3, 2.4**

Create `collect/index.ts`.

Logic:
1. Call `readExtensionRegistry()` to get the list of extensions to track.
2. For each extension in parallel (`Promise.allSettled`):
   a. Call `fetchMarketplaceStats(entry.id)`.
   b. Call `fetchOpenVsxStats(entry.namespace, entry.name)`.
   c. Construct a `DataPoint` with current timestamp.
   d. Call `appendDataPoint(entry.id, point)`.
3. Log summary: how many succeeded, how many failed.
4. Exit with code 1 if all extensions failed; exit 0 if at least one succeeded.

**Done when:** Running `npx ts-node collect/index.ts` (with a real `data/extensions.json`) appends one record to the appropriate JSON files.

---

### Task 2.6 — GitHub API client for repo discovery
**Independent**

Create `collect/github.ts`.

```ts
/**
 * Fetches all repositories for a GitHub user/org and returns those
 * that are VS Code extensions (have engines.vscode in their package.json).
 */
export async function discoverVSCodeExtensions(
  githubUser: string,
  githubToken: string
): Promise<DiscoveredExtension[]>
```

Where `DiscoveredExtension`:
```ts
interface DiscoveredExtension {
  githubRepo: string;          // "Veverke/chatwizard"
  extensionId: string;         // from package.json publisher + name
  namespace: string;
  name: string;
  displayName: string;
}
```

Implementation:
1. `GET https://api.github.com/users/<user>/repos?per_page=100&type=public` — paginate if needed
2. For each repo, fetch `GET https://api.github.com/repos/<owner>/<repo>/contents/package.json`
3. Base64-decode content, parse JSON
4. Check `engines.vscode` exists — if so, extract `publisher`, `name`, `displayName`
5. Use `Authorization: Bearer <token>` header (from `GITHUB_TOKEN` env var in Actions)
6. Rate limit: GitHub’s token-authenticated rate limit is 5,000 req/hour; with pagination and `package.json` fetches for ~50 repos, this is well within limits
7. Repos without a `package.json` (404) are silently skipped

**Done when:** Function returns at least `Veverke.chatwizard` when called with the correct GitHub user.

---

### Task 2.7 — Discovery entry point & workflow
**Depends on 2.4, 2.6**

Create `collect/discover.ts`:
- Entry point called by the discovery workflow
- Calls `discoverVSCodeExtensions` using `GITHUB_USER` and `GITHUB_TOKEN` env vars
- Reads existing `data/extensions.json` via `readExtensionRegistry()` (Task 2.4)
- Merges results: adds new entries only — never removes or overwrites existing ones
- Writes the updated registry via `writeExtensionRegistry()` (Task 2.4)
- Logs: how many repos scanned, how many new extensions added

Create `.github/workflows/discover.yml`:

```yaml
name: Discover VS Code Extensions

on:
  schedule:
    - cron: "0 0 * * 0"  # weekly, Sunday midnight
  workflow_dispatch:

jobs:
  discover:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: node --loader ts-node/esm collect/discover.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_USER: ${{ vars.GITHUB_USER }}
      - name: Commit and push updated registry
        run: |
          git config user.name "analytics-bot"
          git config user.email "analytics-bot@users.noreply.github.com"
          git add data/extensions.json
          git diff --staged --quiet || git commit -m "chore: update extension registry [skip ci]"
          git push
```

> **Bootstrap note:** On first run, `data/extensions.json` can be an empty array `[]`. The discovery workflow will populate it. For local development before the workflow has run, manually trigger `workflow_dispatch` or run `GITHUB_USER=Veverke node --loader ts-node/esm collect/discover.ts` locally once.

**Done when:** `collect/discover.ts` runs without errors and merges newly discovered extensions into `data/extensions.json`.

---

## Tests

### Unit Tests (Vitest)

All unit tests mock HTTP using `vi.mock` / `msw` (Mock Service Worker for Node) — no real network calls.

| Test | File | Fixture Used | Description |
|---|---|---|---|
| `parseMarketplaceResponse` | `collect/__tests__/marketplace.test.ts` | `fixtures/data/marketplace-response.json` | Feed the real fixture response through the parser; assert each field maps to the correct `MarketplaceSnapshot` field with correct numeric values |
| `parseMarketplaceResponse — missing stat` | same | modified fixture | Assert that a missing `statisticName` (e.g. `trendingMonthly` absent) results in `undefined` or `0`, not a crash |
| `fetchOpenVsxStats — 404` | `collect/__tests__/openvsx.test.ts` | mock returns 404 | Assert function returns `null` without throwing |
| `parseOpenVsxResponse` | same | `fixtures/data/openvsx-response.json` | Feed real fixture; assert field mapping |
| `appendDataPoint — empty file` | `collect/__tests__/storage.test.ts` | none (temp dir) | Start with no file; append one point; read back; assert array length 1 |
| `appendDataPoint — existing data` | same | `fixtures/data/Veverke.chatwizard.json` | Append one point to 30-point fixture; assert array length 31, newest point is last |
| `appendDataPoint — idempotency` | same | none | Appending two points with identical `ts` should result in two entries (no dedup — timestamps are meant to be unique per run) |
| `readExtensionRegistry — missing file` | same | none | Assert returns `[]` without throwing |

**Additional fixtures for discovery (create at task 2.6 time):**
- `fixtures/data/github-repos-response.json` — raw GitHub API `/users/<user>/repos` response listing repos including a VS Code extension
- `fixtures/data/package.json-extension.json` — a real VS Code extension `package.json` (base64-encoded as the GitHub API returns it)
- `fixtures/data/package.json-non-extension.json` — a `package.json` that does NOT have `engines.vscode` (to test filtering)

| `discoverVSCodeExtensions — filters by engines.vscode` | `collect/__tests__/github.test.ts` | `fixtures/data/github-repos-response.json`, both package.json fixtures | Mock GitHub API; assert only the extension repo is returned |
| `discoverVSCodeExtensions — extracts correct fields` | same | same | Assert `extensionId`, `namespace`, `name`, `displayName` match the `package.json` `publisher`+`name`+`displayName` |
| `discoverVSCodeExtensions — pagination` | same | two-page repos fixture | Assert extensions from both pages are returned |
| `discoverVSCodeExtensions — repo without package.json` | same | 404 on package.json | Assert repo is silently skipped, no throw |
| `discover — merges without duplicates` | `collect/__tests__/discover.test.ts` | registry already containing `Veverke.chatwizard` | Run merge; assert registry length is unchanged |
| `discover — adds new extension` | same | empty registry `[]` | Run merge with a discovered extension; assert registry length becomes 1 |

### E2E / Integration Tests (Vitest, real network)

These tests are tagged `@integration` and skipped in CI by default (`INTEGRATION=true` env var enables them). They call real APIs and validate live response shapes.

| Test | File | Description |
|---|---|---|
| Marketplace live call | `collect/__tests__/marketplace.integration.test.ts` | Call `fetchMarketplaceStats("Veverke.chatwizard")` against the real API. Assert `installs > 0`, all fields are numbers, no field is `NaN`. |
| Open VSX live call | `collect/__tests__/openvsx.integration.test.ts` | Call `fetchOpenVsxStats("Veverke", "chatwizard")`. Assert `downloads >= 0`. |
| Full collect run | `collect/__tests__/collect.integration.test.ts` | Run full `collect/index.ts` against real APIs into a temp directory. Assert the output JSON file has length ≥ 1 and each point matches the `DataPoint` schema. |
| Discovery live run | `collect/__tests__/discover.integration.test.ts` | Call `discoverVSCodeExtensions("Veverke", GITHUB_TOKEN)` against the real GitHub API. Assert `Veverke.chatwizard` is in the result. Assert repos without `package.json` cause no crash. |

---

## Completion Criteria

- [ ] `collect/github.ts` discovers VS Code extensions from a GitHub user's repos correctly; filters out non-extension repos; handles repos without `package.json`
- [ ] `collect/discover.ts` merges discovered extensions into the registry without duplicates or removals
- [ ] Discovery workflow `.github/workflows/discover.yml` is valid YAML
- [ ] `collect/marketplace.ts` fetches and parses Marketplace response correctly
- [ ] `collect/openvsx.ts` fetches and parses Open VSX response correctly; handles 404
- [ ] `collect/storage.ts` read/write/append round-trips are correct
- [ ] `collect/index.ts` runs end-to-end with no unhandled errors
- [ ] `data/extensions.json` is populated by running `collect/discover.ts` (or bootstrapped from an empty array on first run)
- [ ] All unit tests pass (`npm run test`)
- [ ] Integration tests pass when run manually with `INTEGRATION=true npm run test`

---

## Deliverables

| Artifact | Location | Description |
|---|---|---|
| GitHub API discovery client | `collect/github.ts` | `discoverVSCodeExtensions()` — scans GitHub user repos, detects VS Code extensions by `engines.vscode` in `package.json` |
| Discovery entry point | `collect/discover.ts` | Merges discovered extensions into `data/extensions.json`; idempotent (safe to re-run) |
| Discovery workflow | `.github/workflows/discover.yml` | Weekly cron + manual trigger; commits registry updates back to the repo |
| TypeScript types | `src/types/schema.ts` | `DataPoint`, `MarketplaceSnapshot`, `OpenVsxSnapshot`, `ExtensionEntry`, `ExtensionRegistry` — shared by collector and frontend |
| Marketplace API client | `collect/marketplace.ts` | Fetches and parses install counts, ratings, trending stats from the VS Marketplace query endpoint |
| Open VSX API client | `collect/openvsx.ts` | Fetches and parses download counts and ratings; handles 404 gracefully |
| Storage helpers | `collect/storage.ts` | Read/append/write JSON time-series files; manage extensions registry |
| Collector entry point | `collect/index.ts` | Orchestrates parallel collection across all tracked extensions; exits with correct status code |
| Extensions registry | `data/extensions.json` | Populated by discovery; consumed by both collector and frontend |
| First live data file | `data/Veverke.chatwizard.json` | Created/appended on first manual or scheduled collector run |
| Collector unit tests | `collect/__tests__/` | Parser, storage, discovery, and error-handling tests using fixture data |
| Integration tests | `collect/__tests__/*.integration.test.ts` | Runnable with `INTEGRATION=true`; call real APIs and validate response shapes |

---

## Manual Testing Checklist

> Cumulative — includes Phase 1 checks. Run these after Phase 2 to confirm both discovery and the collector work end-to-end before building the frontend.

- [ ] **Discovery runs without error:** `GITHUB_USER=Veverke node --loader ts-node/esm collect/discover.ts` — exits 0, no unhandled rejections
- [ ] **Extensions.json populated:** After the first discovery run, `data/extensions.json` is a non-empty JSON array containing at least `Veverke.chatwizard`
- [ ] **Entry fields correct:** Each entry in `data/extensions.json` has `id`, `namespace`, `name`, `displayName`, `githubRepo`, and `trackedSince`
- [ ] **No duplicates on re-run:** Run discovery a second time — `data/extensions.json` has the same number of entries, not doubled
- [ ] **Non-extension repos filtered:** Inspect the discovery log output — repos without `engines.vscode` are listed as "skipped", not added to the registry
- [ ] **Collector runs without error:** `node --loader ts-node/esm collect/index.ts` — exits 0, no unhandled rejections in output
- [ ] **Data file created:** After running the collector, `data/Veverke.chatwizard.json` exists and contains at least one data point
- [ ] **Data point shape is correct:** Open `data/Veverke.chatwizard.json` — it is a JSON array; each object has `ts`, `marketplace.installs`, `marketplace.averageRating`, `openVsx.downloads` (or `openVsx: null`)
- [ ] **Installs value is realistic:** `marketplace.installs` is a positive integer greater than zero
- [ ] **Rating value is in range:** `marketplace.averageRating` is between 0 and 5 (or null/undefined if no ratings yet)
- [ ] **Append works correctly:** Run the collector a second time — `data/Veverke.chatwizard.json` now has 2 entries; the second `ts` is later than the first
- [ ] **Open VSX handled:** If the extension exists on Open VSX, `openVsx.downloads` is a non-negative number; if not, the field is `null` with no crash
- [ ] **Registry unchanged by collector:** `data/extensions.json` still lists the same extensions after running the collector — collector does not modify it
- [ ] **Integration tests pass live:** `INTEGRATION=true npm run test -- --reporter=verbose` — all integration tests pass against real APIs

## Master Plan Update

On completion, update `work-plan-mvp.md` Phase 2 row to: ✅ Completed
