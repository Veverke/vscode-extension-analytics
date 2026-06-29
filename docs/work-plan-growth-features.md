# Growth Features — Work Plan

## Overview

This plan covers five features that extend the MVP into a richer analytics and comparison tool. Each feature is scoped as an independent phase so they can be delivered in any order. All phases share the same cross-phase standards as the MVP (unit tests, E2E tests, fixture data, no TypeScript errors).

| Phase | Feature | Est. Effort | Status |
|---|---|---|---|
| 1 | Monthly Statistics Persistence + Export Report | Medium | ⬜ Not started |
| 2 | Formula Tooltips on Metrics | Small | ⬜ Not started |
| 3 | Configurable N-Month Projection | Small | ⬜ Not started |
| 4 | Tracking Start Date Card | Tiny | ⬜ Not started |
| 5 | Competitor Extension Comparison | Large | ⬜ Not started |

---

## Phase 1 — Monthly Statistics Persistence + Export Report

### Motivation

The raw time series captures every collector run (~4×/day). For long-term trend analysis, monthly rollups are more useful: they smooth out intra-day noise and give a canonical "month-end" snapshot. An exportable report (CSV or JSON) also lets the owner share or archive data outside the dashboard.

### Changes Required

#### Collector (`collect/`)

- **New file: `collect/monthly.ts`**
  - Function `computeMonthlyRollup(data: DataPoint[]): MonthlyRollup[]` — groups data points by calendar month (UTC) and produces one summary record per month:
    - `yearMonth`: `"2026-05"`
    - `installsEndOfMonth`: last `marketplace.installs` value in that month
    - `installsGained`: `installsEndOfMonth - installsEndOfPreviousMonth`
    - `avgRating`: average of `marketplace.averageRating` across all points in the month
    - `ratingCountEndOfMonth`: last `marketplace.ratingCount` value
    - `openVsxDownloadsEndOfMonth`: last `openVsx.downloads` value
    - `dataPointsInMonth`: count of raw data points collected
  - Function `writeMonthlyRollup(extensionId, rollups)` — writes to `data/<ns>.<name>.monthly.json`
  - Function `readMonthlyRollup(extensionId): MonthlyRollup[]`

- **Modify `collect/index.ts` (`runCollector`)**
  - After appending the data point and releasing, re-compute the monthly rollup and write `*.monthly.json`.

- **New schema type in `src/types/schema.ts`**
  ```ts
  export interface MonthlyRollup {
    yearMonth: string; // "2026-05"
    installsEndOfMonth: number;
    installsGained: number;
    avgRating: number;
    ratingCountEndOfMonth: number;
    openVsxDownloadsEndOfMonth: number;
    dataPointsInMonth: number;
  }
  ```

#### Frontend

- **New hook: `src/hooks/useMonthlyRollups.ts`**
  - Loads `data/<ns>.<name>.monthly.json`, returns typed `MonthlyRollup[]`.

- **New component: `src/components/charts/MonthlyInstallsChart.tsx`**
  - Bar or stepped area chart showing monthly installs gained (installsGained) per month.
  - Uses Recharts `BarChart` with one bar per month.

- **New component: `src/components/cards/MonthlyTableCard.tsx`**
  - Table view of all monthly rollups with columns: Month, Installs (EOM), Gained, Avg Rating, Data Points.
  - Sortable by month (newest first).

- **Export button: Add to the extension detail page**
  - Button "Export Report (CSV)" next to the monthly table.
  - Converts `MonthlyRollup[]` to CSV and triggers a browser download via `Blob` + `URL.createObjectURL`.
  - Also offer "Export Raw Data (JSON)" option.

- **Modify `src/routes/ExtensionDetail.tsx`**
  - Add a "Monthly" section below the existing charts with the monthly chart, table, and export button.
  - Load `useMonthlyRollups` alongside existing data hooks.

#### Data Files Created by Collector

- `data/Veverke.chatwizard.monthly.json`
- `data/Veverke.copilot-reviewer-assistant.monthly.json`

#### Tests

- **Unit:** `collect/__tests__/monthly.test.ts` — tests `computeMonthlyRollup` with real fixture data.
- **Unit:** `tests/unit/useMonthlyRollups.test.ts` — tests hook loads and returns data.
- **Unit:** `tests/unit/MonthlyInstallsChart.test.tsx` — tests chart renders with fixture data.
- **E2E:** Verify monthly table and export button work on a detail page.

---

## Phase 2 — Formula Tooltips on Metrics

### Motivation

Metrics like "Current Velocity", "Momentum Score", and "R²" are not self-explanatory. Adding tooltips that explain the formula in plain English (with the mathematical expression) helps the owner understand what they're looking at.

### Changes Required

#### New Component: `src/components/annotations/FormulaTooltip.tsx`

```tsx
interface Props {
  label: string          // "Velocity"
  formula: string        // "Δinstalls / Δtime"
  description: string    // "How fast installs are growing per hour"
  children: React.ReactNode   // The value being displayed
}
```

- Renders a small `ⓘ` icon next to the child content.
- On hover/focus, shows a popover with:
  - The metric `label`
  - The formula (rendered as readable text, e.g. `Velocity = (installsₜ − installsₜ₋₁) / hours`)
  - A plain-English `description` of what it means.

#### Modified Components

- **`src/components/cards/MetricsPanel.tsx`**
  - Wrap each metric value in `<FormulaTooltip>` with appropriate formula/description:
    - **Current Velocity:** `Velocity = (installsₜ − installsₜ₋₁) / Δhours`. "How fast installs are growing per hour, averaged over the most recent collection interval."
    - **Acceleration:** `Acceleration = velocityₜ − velocityₜ₋₁`. "Whether growth is speeding up (positive) or slowing down (negative)."
    - **Momentum Score:** `Score = 0.5 × norm(velocity) + 0.3 × norm(acceleration) + 0.2 × recency`. "A 0–100 composite that ranks growth intensity. Higher is faster-growing."
    - **30-day Projection:** `Linear regression: y = mx + b`. "Predicted installs in 30 days if current linear trend continues. R² shows confidence (1.0 = perfect fit)."

- **`src/components/charts/InstallsChart.tsx`**
  - Add tooltip on the R² label explaining: "R² = coefficient of determination. Values near 1.0 mean the trend line closely fits the data."

- **`src/components/cards/StatsCards.tsx`**
  - Optionally add tooltip on the delta line: "Change since the first recorded data point."

#### Tests

- **Unit:** `tests/unit/FormulaTooltip.test.tsx` — tests popover shows/hides on interaction.
- **Visual regression:** Check tooltip positioning doesn't overflow in mobile viewport.

---

## Phase 3 — Configurable N-Month Projection

### Motivation

The current projection is hard-coded to 30 days. The owner may want to see projections at different horizons (e.g., "How many installs in 6 months?"). This adds a numeric input on the detail page that lets the user set `N` months, and the projection lines re-compute accordingly.

### Changes Required

#### Modify `src/routes/ExtensionDetail.tsx`

- Add a state variable `projectionMonths: number` (default `1`).
- Add an input field (or slider) in the "Installs" chart section:
  - Label: "Projection horizon (months)"
  - Type: `<input type="number" min={1} max={24} value={projectionMonths} onChange={...} />`
  - Days are computed as `projectionMonths * 30`.

- Pass `projectionMonths * 30` instead of hard-coded `30` to `computeProjection()`:

```tsx
const [projectionMonths, setProjectionMonths] = useState(1)

const daysAhead = projectionMonths * 30

const projections = [
  computeProjection(data, 'linear', daysAhead),
  computeProjection(data, 'exponential', daysAhead),
].filter((p): p is NonNullable<typeof p> => p !== null)
```

#### Modify `src/components/cards/MetricsPanel.tsx`

- The "30-day Projection" card should reflect the user's chosen horizon:
  - Change label to `"N-month Projection"` where `N` is the current input value.
  - Pass `projectionMonths` as a prop and use the same `daysAhead` for the displayed value.

#### Optional Enhancement: Slider

- Replace the plain number input with a styled slider (0.5–24 months, step 0.5) for a better UX.
- Add a "Reset" button to go back to 1 month.

#### Tests

- **Unit:** `tests/unit/ExtensionDetail.test.tsx` — changing the input re-renders projection values.
- **E2E:** Set projection to 6 months, verify chart shows extended dashed lines and metric panel updates.

---

## Phase 4 — Tracking Start Date Card

### Motivation

It's useful to see at a glance when tracking began for an extension. The `ExtensionEntry.trackedSince` field already exists — it just isn't displayed in the UI.

### Changes Required

#### Modify `src/components/cards/StatsCards.tsx`

- Add a fifth `StatCard` at the end:
  - **Label:** "Tracking Started"
  - **Value:** Formatted date (e.g., `May 28, 2026`)
  - **Delta:** How long ago (e.g., "13 months ago") — compute as relative time from `data[0].ts` (first data point timestamp) or `extension.trackedSince`.
  - If data is empty, show "N/A".

#### Modify `src/routes/ExtensionDetail.tsx`

- Pass `trackedSince` from the `extension` object to `StatsCards`:

```tsx
<StatsCards data={data} trackedSince={extension.trackedSince} />
```

#### Modify `StatsCards` Props Interface

```ts
interface Props {
  data: DataPoint[]
  trackedSince?: string
}
```

#### Tests

- **Unit:** `tests/unit/StatsCards.test.tsx` — verify the new card renders with a known date and relative time.
- **Visual:** Card should match the existing four-card layout (responsive to 5 columns on wide screens, wraps on narrow).

---

## Phase 5 — Competitor Extension Comparison

### Motivation

The owner needs to benchmark their extension against competitors. This feature lets them enter any VS Marketplace extension ID (e.g., `ms-python.python`), load its public stats, and view the competitor's data in a side-by-side or tabbed comparison view.

### Constraints

- The collector does **not** persist competitor data (to avoid unbounded storage). Competitor data is fetched live from the Marketplace API on demand in the browser.
- Rate limiting: VS Marketplace API is generous for single queries, but we debounce and cache in `sessionStorage` to avoid redundant fetches during a session.
- Only Marketplace data is available (no Open VSX for arbitrary third-party extensions unless they publish there).

### Changes Required

#### New API Utility: `src/utils/marketplaceApi.ts`

- Function `fetchCompetitorStats(extensionId: string): Promise<MarketplaceSnapshot>` — calls the same VS Marketplace API endpoint as the collector (`POST .../extensionquery`) but from the browser.
- Function `fetchCompetitorReleases(extensionId: string): Promise<ReleaseEntry[]>` — fetches version history for the competitor.
- `sessionStorage` cache layer: keyed by `competitor:${extensionId}`, invalidated after 1 hour (or on page reload new session).

#### New Schema Type: `src/types/schema.ts`

```ts
export interface CompetitorEntry {
  id: string;          // "ms-python.python"
  displayName: string; // fetched from API
  data: DataPoint[];   // single data point with current stats
  releases: ReleaseEntry[];
}
```

Since competitors have no historical data, we create synthetic `DataPoint[]` with a single point at the current timestamp. This lets existing charts render them with a single marker (or a note "Only current data available — add to tracking for history").

#### New Hook: `src/hooks/useCompetitor.ts`

- `useCompetitor(extensionId: string | null)` — returns `{ data, releases, displayName, loading, error }`.
- Fetches from Marketplace API via `fetchCompetitorStats`.
- Stores result in session state (so switching tabs doesn't re-fetch).

#### New Route / Tab in Extension Detail

- **Modify `src/routes/ExtensionDetail.tsx`**
  - Add a "Competitors" section below the existing charts.
  - An input field with a button: "Add competitor by extension ID (e.g. `ms-python.python`)"
  - When entered, validate the ID format (`<namespace>.<name>`), call `useCompetitor`.
  - Show the competitor in a horizontally split comparison card:
    - Left side: Your extension's current stats (installs, rating, rating count).
    - Right side: Competitor's current stats — same fields side by side.
    - Color-coded: green if your value is higher, red if lower, gray if equal.

- **New component: `src/components/cards/CompetitorComparisonCard.tsx`**
  ```tsx
  interface Competitor {
    id: string
    displayName: string
    installs: number
    rating: number | undefined
    ratingCount: number
  }

  interface Props {
    yourExtension: Competitor
    competitor: Competitor
    onRemove: () => void
  }
  ```
  - Shows a table with rows: "Installs", "Rating", "Rating Count".
  - Each row shows your value, competitor value, and a diff (absolute and %).
  - A "Remove" button to stop comparing.

- **New component: `src/components/cards/CompetitorList.tsx`**
  - Allows adding multiple competitors.
  - Shows a list of active comparisons, each with a remove button.
  - Uses `sessionStorage` to remember competitors across page reloads within the session.

#### Modifications to App Layout

- The competitors section is only available on the extension detail page, not on the overview.
- Competitors are identified by `extensionId + competitorId` in session storage.

#### UI State Management

- Store competitor list in component state, persisted to `sessionStorage`:

```ts
const [competitorIds, setCompetitorIds] = useState<string[]>(() => {
  const stored = sessionStorage.getItem(`competitors:${extensionId}`)
  return stored ? JSON.parse(stored) : []
})
```

#### Tests

- **Unit:** `tests/unit/marketplaceApi.test.ts` — tests `fetchCompetitorStats` with fixture response.
- **Unit:** `tests/unit/CompetitorComparisonCard.test.tsx` — tests side-by-side rendering with known values.
- **Unit:** `tests/unit/useCompetitor.test.ts` — tests loading, success, error states.
- **E2E:** Enter a competitor ID, verify comparison card appears with data, remove it.

---

## Cross-Phase Standards

- Every phase includes unit tests (Vitest) and E2E tests (Playwright) where applicable.
- Tests use real-world fixture data derived from actual API responses, not invented numbers.
- Each phase ends with the corresponding row in the table above being marked ✅ Completed.
- No phase is considered complete if there are failing tests or TypeScript errors.
- Frontend changes use the existing design system (CSS variables, card layout, responsive grid) from `src/styles/global.css`.
- New data files created by the collector follow the same naming convention as existing files (`data/<ns>.<name>.<type>.json`).
- All new frontend components are added to the appropriate subdirectory under `src/components/`.