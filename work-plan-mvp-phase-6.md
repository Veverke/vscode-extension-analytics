# Phase 6 — Release Correlation & Event Annotations

## Goal
Enrich the time series with release version history from the VS Marketplace API. Compute installs-per-release metrics. Allow the developer to annotate charts with arbitrary custom events. Render these as labeled vertical reference lines overlaid on charts.

---

## Atomic Tasks

---

### Task 6.1 — Fetch release history in collector
**Depends on Phase 2**

Update `collect/marketplace.ts`:
- Add `fetchReleaseHistory(extensionId: string): Promise<ReleaseEntry[]>`
- API: the same `extensionquery` endpoint returns `versions[]` in the response when flag `512` is included in the flags bitmask (add `512` to the existing `914` → use `914 | 512 = 1022`)
- Each version entry contains `version` (semver string) and `lastUpdated` (ISO timestamp)
- Map to `ReleaseEntry`:
  ```ts
  interface ReleaseEntry {
    version: string;
    publishedAt: string;    // ISO 8601
    installsAtRelease: number;  // marketplace.installs at time of fetch (approximation)
    changelog?: string;     // not available from API — left empty, filled manually
  }
  ```
- `installsAtRelease` is the current install count at the moment the release was first seen by the collector; populated only on first detection, not on re-fetch

Update `collect/index.ts`:
- On each run, compare fetched `versions[]` against the stored `releases.json` for each extension
- If a new version is detected (not in stored file), add a new `ReleaseEntry` with current install count
- Write to `data/<namespace>.<name>.releases.json`

**Done when:** After two collector runs where a new version is published between them, the new version appears in the releases file with a valid `installsAtRelease`.

---

### Task 6.2 — Release correlation metric
**Independent**

Create `src/metrics/releaseCorrelation.ts`.

```ts
export interface ReleaseImpact {
  version: string;
  publishedAt: string;
  installsAtRelease: number;
  installsCurrent: number;
  installsGained: number;     // installsCurrent - installsAtRelease
  daysElapsed: number;        // days since release
  installsPerDay: number;     // installsGained / daysElapsed
}

/**
 * Computes impact of each release using current install count and
 * the install count recorded at the time of each release.
 */
export function computeReleaseImpact(
  releases: ReleaseEntry[],
  currentInstalls: number
): ReleaseImpact[]
```

- Sort releases by `publishedAt` ascending
- For each release: `installsGained = installsAtRelease(nextRelease) - installsAtRelease(thisRelease)` if a next release exists; otherwise use `currentInstalls`
- Return sorted descending by `installsGained`

**Done when:** Unit tests confirm correct computation with known fixture inputs.

---

### Task 6.3 — `useReleaseData` hook
**Depends on 6.1 (schema), Phase 3 (hooks pattern)**

Create `src/hooks/useReleaseData.ts`.

Logic:
- `fetch(\`./data/${extensionId}.releases.json\`)`
- Return `{ releases: ReleaseEntry[], loading: boolean, error: string | null }`
- Handle 404 gracefully (extension has no releases file yet): return `releases: []`, no error

**Done when:** Hook returns releases array from fixture file in tests.

---

### Task 6.4 — Events schema and `useEvents` hook
**Independent**

Define `EventAnnotation` type in `src/types/schema.ts`:
```ts
interface EventAnnotation {
  ts: string;           // ISO 8601
  label: string;        // e.g. "Blog post on Dev.to"
  type: 'release' | 'marketing' | 'blog' | 'social' | 'other';
  url?: string;
}
```

Create `data/events.json` (empty array initially):
```json
[]
```

Create `src/hooks/useEvents.ts`:
- `fetch('./data/events.json')`
- Return `{ events: EventAnnotation[], loading, error }`
- 404 → return empty array

Create `fixtures/data/events.json` with at least 2 real-world-plausible events (e.g. a blog post date and a HN submission date) anchored to dates within the 30-point fixture's time range.

**Done when:** Hook loads fixture events correctly in unit tests.

---

### Task 6.5 — `EventAnnotation` chart overlay component
**Depends on 6.4**

Create `src/components/annotations/EventAnnotation.tsx`.

This is not a standalone chart — it is a utility that produces Recharts `<ReferenceLine>` props to be injected into any `<ComposedChart>`:

```ts
export function buildEventReferenceLines(
  events: EventAnnotation[],
  releases: ReleaseEntry[]
): ReferenceLineProps[]
```

Returns an array of Recharts `ReferenceLine` props objects:
- Each event: vertical dashed line, color by type (marketing=purple, release=green, blog=blue)
- Each line has a `label` showing the event name
- Release events use a distinct stroke width

**Done when:** Unit tests confirm correct prop generation from fixture event/release data.

---

### Task 6.6 — Update `InstallsChart` to render annotations
**Depends on 6.5, Phase 4 Task 4.4**

Update `src/components/charts/InstallsChart.tsx`:
- Accept `annotations?: ReferenceLineProps[]` prop
- Render each entry as `<ReferenceLine {...props} />` inside the `ComposedChart`

**Done when:** Chart renders with annotation lines from fixture data.

---

### Task 6.7 — `ReleaseImpactPanel` component
**Depends on 6.2**

Create `src/components/cards/ReleaseImpactPanel.tsx`.

Props: `impacts: ReleaseImpact[]`

Renders a sortable table:
- Columns: Version, Released, Installs at Release, Installs Gained, Days Active, Installs/Day
- Default sort: descending by `installsGained`
- Highlight the top row (best-performing release) in a subtle accent color
- Each version row has a "View diff" link if a `githubRepo` is available (links to GitHub compare URL)

**Done when:** Panel renders with fixture data, sorted correctly.

---

### Task 6.8 — Wire Phase 6 components into `ExtensionDetail`
**Depends on 6.3, 6.4, 6.5, 6.6, 6.7**

Update `src/routes/ExtensionDetail.tsx`:
- Call `useReleaseData(extensionId)` and `useEvents()`
- Build `annotations` by calling `buildEventReferenceLines(events, releases)`
- Pass `annotations` to `<InstallsChart>`
- Add `<ReleaseImpactPanel impacts={computeReleaseImpact(releases, currentInstalls)} />` section

**Done when:** Extension detail page shows annotated chart and release impact table.

---

## Tests

### Unit Tests (Vitest)

**New fixtures needed:**
- `fixtures/data/Veverke.chatwizard.releases.json` — 3 release entries with realistic version numbers, realistic `publishedAt` dates, and realistic `installsAtRelease` values that grow across versions
- `fixtures/data/events.json` — 2 event entries (one blog post, one social media post) within the fixture time range

| Test | File | Fixture | Description |
|---|---|---|---|
| `fetchReleaseHistory — parses versions` | `collect/__tests__/marketplace.test.ts` | `fixtures/data/marketplace-response.json` (must include `versions[]`) | Assert `version` and `publishedAt` fields extracted correctly |
| `fetchReleaseHistory — new version detection` | same | two fixture states: before and after a new release | Assert only the new version is appended to the releases file |
| `computeReleaseImpact — correct installsGained` | `tests/unit/releaseCorrelation.test.ts` | `fixtures/data/Veverke.chatwizard.releases.json` | With 3 releases and known install counts, assert each `installsGained` is `releases[i+1].installsAtRelease - releases[i].installsAtRelease` |
| `computeReleaseImpact — last release uses currentInstalls` | same | same | Assert last entry's `installsGained = currentInstalls - lastRelease.installsAtRelease` |
| `computeReleaseImpact — installsPerDay` | same | same | Assert `installsPerDay ≈ installsGained / daysElapsed` (within floating point tolerance) |
| `computeReleaseImpact — sorted descending` | same | same | Assert `result[0].installsGained >= result[1].installsGained` |
| `buildEventReferenceLines — returns correct count` | `tests/unit/eventAnnotations.test.ts` | `fixtures/data/events.json`, `fixtures/data/Veverke.chatwizard.releases.json` | Assert returned array length = events.length + releases.length |
| `buildEventReferenceLines — release uses green stroke` | same | same | Assert release entries have the release color value |
| `useReleaseData — 404 returns empty` | `tests/unit/useReleaseData.test.ts` | none | Mock 404; assert `releases: []`, no error |
| `useReleaseData — success` | same | `fixtures/data/Veverke.chatwizard.releases.json` | Assert all 3 releases returned with correct fields |
| `ReleaseImpactPanel — renders rows` | `tests/unit/ReleaseImpactPanel.test.tsx` | computed impacts from fixture | Assert 3 rows present in table |
| `ReleaseImpactPanel — sorted by installsGained` | same | same | Assert first row shows highest `installsGained` value |

### E2E Tests (Playwright)

| Test | File | Description |
|---|---|---|
| Annotation lines on installs chart | `tests/e2e/annotations.spec.ts` | Intercept `events.json` and `releases.json` with fixture data; navigate to extension detail; assert at least one `<line>` element with `stroke-dasharray` is present inside the installs chart SVG |
| Release impact panel visible | same | Assert "Release Impact" heading and a table element are present in the DOM |
| Release impact table has rows | same | Assert `<tbody> tr` count equals number of releases in fixture (3) |
| Best release highlighted | same | Assert first table row has the expected highlight CSS class or `background-color` attribute |
| Event tooltip on hover | same | Hover over an annotation line; assert a tooltip element appears with the event label text |

---

## Completion Criteria

- [ ] Collector detects and stores new releases with `installsAtRelease` correctly
- [ ] `computeReleaseImpact` computes all impact fields correctly
- [ ] Installs chart shows annotation lines for events and releases
- [ ] Release impact table renders correctly, sorted by installs gained
- [ ] All unit tests pass
- [ ] All E2E tests pass

---

## Deliverables

| Artifact | Location | Description |
|---|---|---|
| Release history collection | `collect/marketplace.ts` updated | `fetchReleaseHistory()` extracts version list from the Marketplace API response |
| Release file writer | `collect/index.ts` updated | Detects new versions on each run; appends new `ReleaseEntry` with current install count to `data/<id>.releases.json` |
| Release data files | `data/Veverke.chatwizard.releases.json` | Append-only list of all detected versions with `installsAtRelease` snapshot |
| Release correlation metric | `src/metrics/releaseCorrelation.ts` | `computeReleaseImpact()` — installs gained, days active, installs/day per version |
| `useReleaseData` hook | `src/hooks/useReleaseData.ts` | Loads `data/<id>.releases.json`; handles 404 (extension with no releases file) |
| Events schema & data | `src/types/schema.ts` updated, `data/events.json` | `EventAnnotation` type; empty events file ready for developer entries |
| `useEvents` hook | `src/hooks/useEvents.ts` | Loads `data/events.json` |
| Annotation builder | `src/components/annotations/EventAnnotation.tsx` | `buildEventReferenceLines()` — produces Recharts `ReferenceLine` props for events and releases |
| Annotated `InstallsChart` | `src/components/charts/InstallsChart.tsx` updated | Renders vertical annotation lines color-coded by event type |
| `ReleaseImpactPanel` | `src/components/cards/ReleaseImpactPanel.tsx` | Sortable table of versions with installs gained, days active, installs/day; best release highlighted |
| Fixtures | `fixtures/data/Veverke.chatwizard.releases.json`, `fixtures/data/events.json` | Real-world-shaped test data |

---

## Manual Testing Checklist

> Cumulative — includes Phase 1–5 checks. To fully test this phase you need at least one real collector run after a version was published, or you can populate `data/Veverke.chatwizard.releases.json` manually.

- [ ] **Releases file created by collector:** Run `node --loader ts-node/esm collect/index.ts` — `data/Veverke.chatwizard.releases.json` is created (or updated) with at least one version entry
- [ ] **Version fields correct:** Open `data/Veverke.chatwizard.releases.json` — each entry has `version` (valid semver), `publishedAt` (ISO date), and `installsAtRelease` (positive integer)
- [ ] **New version detection:** Manually add a fake entry to `releases.json` with a future version string, then run the collector — confirm the new real version is added if it's newer, but the manually added fake entry causes no crash; restore the file
- [ ] **Release annotation lines on chart:** Open the ChatWizard detail page — vertical dashed green lines appear on the installs chart at each release date
- [ ] **Annotation labels readable:** The release lines are labeled with version numbers (e.g. "v1.2.0"); labels do not overlap unreadably on the chart
- [ ] **Custom event annotation:** Add an entry to `data/events.json` (e.g. a blog post dated within the chart's time range) — reload the app and confirm a purple vertical line appears at that date with the event label
- [ ] **Release impact table visible:** A "Release Impact" section with a table is present on the extension detail page
- [ ] **Table columns and values correct:** The table shows Version, Released date, Installs at Release, Installs Gained, Days Active, Installs/Day — all populated with plausible numbers
- [ ] **Table sorted by installs gained:** The version with the most installs gained is in the first row
- [ ] **Top row highlighted:** The best-performing version row has a distinct background color
- [ ] **"View diff" link works:** If a `githubRepo` is set in `extensions.json`, each row has a "View diff" link that opens the correct GitHub compare URL in a new tab
- [ ] **No release file graceful:** Temporarily rename `data/Veverke.chatwizard.releases.json` — confirm the page loads without error and the Release Impact section shows an empty state; rename back

## Master Plan Update

On completion, update `work-plan-mvp.md` Phase 6 row to: ✅ Completed
