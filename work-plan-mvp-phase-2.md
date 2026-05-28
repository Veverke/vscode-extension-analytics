# Phase 2 — Data Collector

## Goal
Build the Node.js scripts that call the VS Marketplace API and Open VSX API, parse and validate responses, and append correctly-shaped records to per-extension JSON files. Includes the shared TypeScript data schema types and all associated unit and integration tests.

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

### Task 2.6 — Seed `data/extensions.json` with ChatWizard
**Independent**

Create `data/extensions.json` containing the `Veverke.chatwizard` entry:

```json
[
  {
    "id": "Veverke.chatwizard",
    "namespace": "Veverke",
    "name": "chatwizard",
    "displayName": "ChatWizard",
    "githubRepo": "Veverke/chatwizard",
    "trackedSince": "<date of first run>"
  }
]
```

**Done when:** File exists and is valid JSON matching the `ExtensionEntry` schema.

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

### E2E / Integration Tests (Vitest, real network)

These tests are tagged `@integration` and skipped in CI by default (`INTEGRATION=true` env var enables them). They call real APIs and validate live response shapes.

| Test | File | Description |
|---|---|---|
| Marketplace live call | `collect/__tests__/marketplace.integration.test.ts` | Call `fetchMarketplaceStats("Veverke.chatwizard")` against the real API. Assert `installs > 0`, all fields are numbers, no field is `NaN`. |
| Open VSX live call | `collect/__tests__/openvsx.integration.test.ts` | Call `fetchOpenVsxStats("Veverke", "chatwizard")`. Assert `downloads >= 0`. |
| Full collect run | `collect/__tests__/collect.integration.test.ts` | Run full `collect/index.ts` against real APIs into a temp directory. Assert the output JSON file has length ≥ 1 and each point matches the `DataPoint` schema. |

---

## Completion Criteria

- [ ] `collect/marketplace.ts` fetches and parses Marketplace response correctly
- [ ] `collect/openvsx.ts` fetches and parses Open VSX response correctly; handles 404
- [ ] `collect/storage.ts` read/write/append round-trips are correct
- [ ] `collect/index.ts` runs end-to-end with no unhandled errors
- [ ] `data/extensions.json` contains the ChatWizard entry
- [ ] All unit tests pass (`npm run test`)
- [ ] Integration tests pass when run manually with `INTEGRATION=true npm run test`

---

## Deliverables

| Artifact | Location | Description |
|---|---|---|
| TypeScript types | `src/types/schema.ts` | `DataPoint`, `MarketplaceSnapshot`, `OpenVsxSnapshot`, `ExtensionEntry`, `ExtensionRegistry` — shared by collector and frontend |
| Marketplace API client | `collect/marketplace.ts` | Fetches and parses install counts, ratings, trending stats from the VS Marketplace query endpoint |
| Open VSX API client | `collect/openvsx.ts` | Fetches and parses download counts and ratings; handles 404 gracefully |
| Storage helpers | `collect/storage.ts` | Read/append/write JSON time-series files; manage extensions registry |
| Collector entry point | `collect/index.ts` | Orchestrates parallel collection across all tracked extensions; exits with correct status code |
| Extensions registry | `data/extensions.json` | Seeded with `Veverke.chatwizard`; consumed by both collector and frontend |
| First live data file | `data/Veverke.chatwizard.json` | Created/appended on first manual or scheduled collector run |
| Collector unit tests | `collect/__tests__/` | Parser, storage, and error-handling tests using fixture data |
| Integration tests | `collect/__tests__/*.integration.test.ts` | Runnable with `INTEGRATION=true`; call real APIs and validate response shapes |

---

## Manual Testing Checklist

> Cumulative — includes Phase 1 checks. Run these after Phase 2 to confirm the collector works end-to-end before building the frontend.

- [ ] **Collector runs without error:** `npx ts-node collect/index.ts` (or `node --loader ts-node/esm collect/index.ts`) — exits 0, no unhandled rejections in output
- [ ] **Data file created:** After running the collector, `data/Veverke.chatwizard.json` exists and contains at least one data point
- [ ] **Data point shape is correct:** Open `data/Veverke.chatwizard.json` — it is a JSON array; each object has `ts`, `marketplace.installs`, `marketplace.averageRating`, `openVsx.downloads` (or `openVsx: null`)
- [ ] **Installs value is realistic:** `marketplace.installs` is a positive integer greater than zero
- [ ] **Rating value is in range:** `marketplace.averageRating` is between 0 and 5 (or null/undefined if no ratings yet)
- [ ] **Append works correctly:** Run the collector a second time — `data/Veverke.chatwizard.json` now has 2 entries; the second `ts` is later than the first
- [ ] **Open VSX handled:** If the extension exists on Open VSX, `openVsx.downloads` is a non-negative number; if not, the field is `null` with no crash
- [ ] **Integration tests pass live:** `INTEGRATION=true npm run test -- --reporter=verbose` — all three integration tests pass against real APIs
- [ ] **Registry unchanged after collect:** `data/extensions.json` still contains exactly the seeded entry — collector does not corrupt it

## Master Plan Update

On completion, update `work-plan-mvp.md` Phase 2 row to: ✅ Completed
