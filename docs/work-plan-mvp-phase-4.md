# Phase 4 — Core Charts & Data Display

## Goal
Build the data-loading hooks and primary visualization components that turn raw time-series JSON into readable charts and summary cards. All components must work correctly with the 30-point real-world fixture established in Phase 1, and must handle edge cases (empty data, single data point, network error).

---

## Atomic Tasks

---

### Task 4.1 — Install Recharts
**Independent**

- Install: `recharts`, `@types/recharts` (if not bundled)
- Verify Recharts renders inside a Vite + React project by adding a minimal `<LineChart>` test in a dev-only scratch file, then removing it

**Done when:** `recharts` is in `package.json` and the build succeeds.

---

### Task 4.2 — `useExtensionData` hook
**Independent**

Create `src/hooks/useExtensionData.ts`.

Logic:
- Accept `extensionId: string`
- `fetch(\`./data/${extensionId}.json\`)` (relative path)
- Return `{ data: DataPoint[], loading: boolean, error: string | null }`
- On error: set `error`, return empty `data: []`
- Parse the JSON array and validate it is an array of `DataPoint`; if the shape is wrong, set `error`

**Done when:** Hook returns 30 data points when pointed at `fixtures/data/Veverke.chatwizard.json` in tests.

---

### Task 4.3 — Data normalization utility
**Independent**

Create `src/utils/normalize.ts`.

Functions:
- `toChartPoints(data: DataPoint[], field: 'installs' | 'rating' | 'openVsxDownloads'): { ts: number; value: number }[]`
  - Converts `DataPoint[]` to a flat array of `{ ts: milliseconds-since-epoch, value: number }` for Recharts consumption
  - `ts` must be a number (Recharts `XAxis` type `'number'`)
- `formatDate(ts: number): string` — returns `"MMM D"` format (e.g. "May 15") for axis tick labels; no external date library — use `Intl.DateTimeFormat`

**Done when:** Unit tests confirm correct output for each field.

---

### Task 4.4 — `InstallsChart` component
**Depends on 4.1, 4.3**

Create `src/components/charts/InstallsChart.tsx`.

Props: `data: DataPoint[]`

Renders:
- `ComposedChart` (allows overlays added in Phase 5)
- Single `Line` for Marketplace installs (`marketplace.installs`)
- Second `Line` (dashed, different color) for Open VSX downloads (`openVsx.downloads`) — shown only if any `openVsx` data is non-null
- `XAxis` — time axis, formatted with `formatDate`
- `YAxis` — auto-scaled, number formatted with `toLocaleString`
- `Tooltip` — shows date, marketplace installs, Open VSX downloads
- `Legend`
- Responsive wrapper: `<ResponsiveContainer width="100%" height={300}>`

**Done when:** Component renders with fixture data in Storybook or `npm run dev`.

---

### Task 4.5 — `RatingChart` component
**Depends on 4.1, 4.3**

Create `src/components/charts/RatingChart.tsx`.

Props: `data: DataPoint[]`

Renders:
- `ComposedChart`
- `Line` for `marketplace.averageRating`
- `Bar` for `marketplace.ratingCount` (secondary Y-axis, right side) — shows how many ratings exist at each point
- `XAxis` — same time format as `InstallsChart`
- `YAxis` left: 0–5 domain (rating)
- `YAxis` right: auto-scaled (count)
- `Tooltip` — shows date, rating, count
- `Legend`
- Responsive wrapper

**Done when:** Component renders with fixture data.

---

### Task 4.6 — `StatsCards` component
**Depends on 4.2**

Create `src/components/cards/StatsCards.tsx`.

Props: `data: DataPoint[]`

Displays 4 cards in a horizontal row:
1. **Total Marketplace Installs** — latest `marketplace.installs` value
2. **Open VSX Downloads** — latest `openVsx.downloads` value (or "N/A" if null)
3. **Average Rating** — latest `marketplace.averageRating` formatted to 1 decimal place, with star icon
4. **Rating Count** — latest `marketplace.ratingCount`

Each card shows:
- Metric name (label)
- Current value (large)
- Delta from first data point (e.g. "+347 since tracking started")

**Done when:** Cards render correctly with fixture data and show correct deltas.

---

### Task 4.7 — Wire charts and cards into `ExtensionDetail`
**Depends on 4.2, 4.4, 4.5, 4.6**

Update `src/routes/ExtensionDetail.tsx`:
- Call `useExtensionData(extensionId)`
- Show loading spinner while `loading === true`
- Show error message if `error !== null`
- Render `<StatsCards data={data} />`
- Render `<InstallsChart data={data} />`
- Render `<RatingChart data={data} />`
- Section headings: "Installs", "Rating"

**Done when:** Full extension detail page renders with charts and cards populated from fixture or real data.

---

### Task 4.8 — Empty and edge-case states
**Depends on 4.4, 4.5, 4.6**

Handle and render gracefully:
- `data.length === 0` → show "No data yet — the collector hasn't run yet" message in place of charts
- `data.length === 1` → charts render (a single point should not crash Recharts; verify)
- `openVsx` is `null` for all points → Open VSX line/card show "Not published on Open VSX"

**Done when:** All three states render without console errors.

---

## Tests

### Unit Tests (Vitest + React Testing Library)

| Test | File | Fixture Used | Description |
|---|---|---|---|
| `useExtensionData — success` | `tests/unit/useExtensionData.test.ts` | `fixtures/data/Veverke.chatwizard.json` | Mock fetch to return fixture; assert 30 data points returned, first point `marketplace.installs` matches fixture value |
| `useExtensionData — 404` | same | none | Mock fetch to return 404; assert `error` set, `data: []` |
| `useExtensionData — malformed JSON` | same | none | Mock fetch to return `[]` (empty array); assert `data: []`, no crash |
| `toChartPoints — installs` | `tests/unit/normalize.test.ts` | `fixtures/data/Veverke.chatwizard.json` | Assert output length equals input length; first point `value` matches fixture's first `marketplace.installs`; `ts` is a positive number |
| `toChartPoints — rating` | same | same | Assert `value` values are in 0–5 range |
| `toChartPoints — openVsxDownloads` | same | same | Assert correct field extraction |
| `formatDate` | same | none | `formatDate(new Date('2026-05-15').getTime())` returns `"May 15"` |
| `StatsCards — correct values` | `tests/unit/StatsCards.test.tsx` | `fixtures/data/Veverke.chatwizard.json` | Render with fixture data; assert the latest install count text is visible and matches the last data point |
| `StatsCards — delta calculation` | same | same | Assert delta text matches `last.installs - first.installs` |
| `StatsCards — no openVsx` | same | modified fixture with `openVsx: null` | Assert "N/A" or equivalent shown |
| `InstallsChart — renders without error` | `tests/unit/InstallsChart.test.tsx` | `fixtures/data/Veverke.chatwizard.json` | Render component; assert no crash and `<svg>` is present in DOM |
| `InstallsChart — single data point` | same | single-point fixture | Assert renders without error |
| `InstallsChart — empty data` | same | none | Pass `data={[]}` and assert empty-state message appears |
| `RatingChart — renders without error` | `tests/unit/RatingChart.test.tsx` | `fixtures/data/Veverke.chatwizard.json` | Assert `<svg>` present |

**Additional fixtures needed:**
- `fixtures/data/Veverke.chatwizard.single-point.json` — array with exactly one data point (real values)
- `fixtures/data/Veverke.chatwizard.no-openvsx.json` — 30-point array where all `openVsx` fields are `null`

### E2E Tests (Playwright)

| Test | File | Description |
|---|---|---|
| Extension detail shows charts | `tests/e2e/extension-detail.spec.ts` | Navigate to `/#/extension/Veverke.chatwizard`; assert two `<svg>` elements are present (installs chart + rating chart) |
| Stats cards show numbers | same | Assert the stats cards section is visible and at least one card contains a number greater than zero |
| Loading state | same | Intercept `data/Veverke.chatwizard.json` and delay response by 1s; assert loading indicator visible; after response, assert charts appear |
| Error state | same | Intercept data file and return 500; assert error message is visible; assert no SVG elements rendered |
| Empty data state | same | Intercept data file and return `[]`; assert "No data yet" message visible |

---

## Completion Criteria

- [ ] `InstallsChart` renders Marketplace and Open VSX lines from fixture data
- [ ] `RatingChart` renders rating line and count bars
- [ ] `StatsCards` shows correct current values and deltas
- [ ] All edge cases (empty, single point, no Open VSX) handled without crashes
- [ ] All unit tests pass
- [ ] All E2E tests pass

---

## Deliverables

| Artifact | Location | Description |
|---|---|---|
| `useExtensionData` hook | `src/hooks/useExtensionData.ts` | Fetches and validates per-extension time-series JSON; loading and error states |
| Data normalization utils | `src/utils/normalize.ts` | `toChartPoints()` converts `DataPoint[]` to Recharts-compatible format; `formatDate()` for axis labels |
| `InstallsChart` | `src/components/charts/InstallsChart.tsx` | Dual-line chart (Marketplace + Open VSX), responsive, with tooltip and legend |
| `RatingChart` | `src/components/charts/RatingChart.tsx` | Rating line + rating count bars, dual Y-axis |
| `StatsCards` | `src/components/cards/StatsCards.tsx` | 4 summary cards (installs, Open VSX downloads, rating, count) with delta from start |
| Wired `ExtensionDetail` | `src/routes/ExtensionDetail.tsx` | Full detail page with all charts, cards, loading, and error states |
| Edge-case handling | same | Graceful rendering for empty data, single point, and no Open VSX data |
| Additional fixtures | `fixtures/data/Veverke.chatwizard.single-point.json`, `fixtures/data/Veverke.chatwizard.no-openvsx.json` | Edge-case test fixtures |

---

## Manual Testing Checklist

> Cumulative — includes Phase 1–3 checks. Run these after Phase 4 with the live `data/Veverke.chatwizard.json` file present.

- [ ] **Installs chart renders:** Open the ChatWizard detail page — an installs chart with a visible trend line is present
- [ ] **Rating chart renders:** A rating chart is present below (or alongside) the installs chart
- [ ] **Stats cards show real numbers:** The four stat cards display non-zero values matching the last data point in `data/Veverke.chatwizard.json`
- [ ] **Delta is correct:** The delta shown on "Total Marketplace Installs" matches `last_entry.marketplace.installs - first_entry.marketplace.installs` computed manually from the JSON file
- [ ] **Tooltip works:** Hover over a point on the installs chart — a tooltip appears showing the date and install count
- [ ] **Open VSX line:** If the extension has Open VSX data, a second (dashed) line appears on the installs chart; if not, a "Not published on Open VSX" note is shown
- [ ] **X-axis dates readable:** The X-axis shows human-readable dates (e.g. "May 15") not raw timestamp numbers
- [ ] **Empty state test:** Temporarily rename `data/Veverke.chatwizard.json` to something else so the fetch 404s — confirm "No data yet" message appears with no console errors; rename back
- [ ] **Single-point state test:** Replace `data/Veverke.chatwizard.json` with a one-entry array — confirm charts render without crashing; restore the original file
- [ ] **Charts responsive:** Resize the browser to mobile width — charts resize to fit without horizontal scroll

## Master Plan Update

On completion, update `work-plan-mvp.md` Phase 4 row to: ✅ Completed
