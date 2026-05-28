# Phase 7 — Multi-Extension Overview Dashboard

## Goal
Build the multi-extension Overview dashboard that aggregates data across all tracked extensions into a single view. By this phase, `data/extensions.json` is already populated by the discovery pipeline built in Phase 2. This phase is purely the UI layer: sparklines, velocity badges, momentum scores, sortable columns, and per-row error isolation.

---

## Atomic Tasks

---

### Task 7.1 — Overview data aggregation hook
**Depends on Phase 3 `useExtensions`, Phase 4 `useExtensionData`**

Create `src/hooks/useAllExtensionsData.ts`.

Logic:
- Accept `extensions: ExtensionEntry[]`
- For each extension, call `useExtensionData` (or fetch directly — parallel `Promise.all`)
- Return `{ results: ExtensionSummary[], loading: boolean, errors: Record<string, string> }`

Where `ExtensionSummary`:
```ts
interface ExtensionSummary {
  extension: ExtensionEntry;
  data: DataPoint[];
  currentInstalls: number;
  velocity: number;       // most recent velocity value
  momentum: number;       // computeMomentum result
  sparklinePoints: number[];  // last 14 install values for sparkline
}
```

**Done when:** Hook returns correct summaries for all extensions in the registry.

---

### Task 7.2 — Sparkline component
**Independent**

Create `src/components/charts/Sparkline.tsx`.

Props: `points: number[]`, `width?: number`, `height?: number`, `color?: string`

Renders a minimal SVG polyline (no axes, no tooltip, no labels) suitable for embedding in a table cell. Normalizes the input points to fit within the given dimensions.

This is a pure SVG implementation — do NOT use Recharts for this (overhead too high for many instances on the overview page).

**Done when:** Renders correctly for increasing, decreasing, and flat input sequences.

---

### Task 7.3 — `VelocityBadge` component
**Independent**

Create `src/components/cards/VelocityBadge.tsx`.

Props: `velocity: number`

Renders a small colored pill:
- Positive velocity: green, "▲ +N"
- Zero: gray, "→ 0"
- Negative: red, "▼ -N"

**Done when:** Renders correct color and text for positive, zero, and negative inputs.

---

### Task 7.4 — `MomentumBadge` component
**Independent**

Create `src/components/cards/MomentumBadge.tsx`.

Props: `score: number`

Renders a 0–100 score with color coding:
- 67–100: green
- 34–66: yellow
- 0–33: red

Optionally renders a small bar/gauge beneath the number.

**Done when:** Renders correctly for scores 0, 50, 100.

---

### Task 7.5 — Overview dashboard component
**Depends on 7.1, 7.2, 7.3, 7.4**

Update `src/routes/Overview.tsx`.

Renders:
- Page heading: "Your Extensions"
- A responsive grid/table of `ExtensionSummary` items, one row per extension:
  - Extension icon (from VS Marketplace, if available — `displayName` fallback)
  - Extension name (linked to detail page)
  - Current marketplace installs (formatted)
  - Sparkline of last 14 install values
  - `<VelocityBadge velocity={summary.velocity} />`
  - `<MomentumBadge score={summary.momentum} />`
- Default sort: descending by momentum score
- Column headers are clickable to sort by that column (client-side sort)
- Loading state: skeleton rows while data loads
- Error per-extension: if one extension fails to load, show an error icon in its row; other extensions still render

**Done when:** Overview shows all extensions with sparklines and badges, sorted by momentum.

---

### Task 7.6 — Update navigation to reflect Overview as home
**Depends on 7.5, Phase 3 Task 3.2**

Update `src/components/Layout.tsx`:
- "VS Code Extension Analytics" header links to `/` (Overview)
- If exactly one extension is tracked, navigate directly to that extension's detail page instead of showing an empty overview

**Done when:** Navigation behavior is correct for 1-extension and multi-extension scenarios.

---

## Tests

### Unit Tests (Vitest)

**New fixtures needed:**
- `fixtures/data/extensions-multi.json` — 3 extensions (Veverke.chatwizard + 2 synthetic plausible extensions) to test multi-extension behavior

| Test | File | Fixture | Description |
|---|---|---|---|
| `discoverVSCodeExtensions — filters by engines.vscode` | `collect/__tests__/github.test.ts` | `fixtures/data/github-repos-response.json`, both package.json fixtures | Mock GitHub API; assert only the extension repo is returned |
| `discoverVSCodeExtensions — extracts correct fields` | same | same | Assert `extensionId`, `namespace`, `name`, `displayName` match the `package.json` publisher+name+displayName |
| `discoverVSCodeExtensions — pagination` | same | two-page repos response fixture | Assert extensions from both pages are returned |
| `discoverVSCodeExtensions — repo without package.json` | same | 404 on package.json | Assert repo is skipped, not thrown |
| `Sparkline — SVG points correct` | `tests/unit/Sparkline.test.tsx` | none | Render with `[0, 50, 100]`; assert SVG polyline has 3 points; first point y-coordinate is highest (0 maps to bottom) |
| `Sparkline — single point` | same | none | Does not crash; renders a dot or line |
| `VelocityBadge — positive` | `tests/unit/VelocityBadge.test.tsx` | none | `velocity=42` → green class, text contains "+42" |
| `VelocityBadge — negative` | same | none | `velocity=-5` → red class, text contains "-5" |
| `MomentumBadge — high score` | `tests/unit/MomentumBadge.test.tsx` | none | `score=80` → green class |
| `MomentumBadge — low score` | same | none | `score=20` → red class |
| `useAllExtensionsData — loads all extensions` | `tests/unit/useAllExtensionsData.test.ts` | `fixtures/data/extensions-multi.json`, individual data fixtures | Mock fetches for all 3 extensions; assert 3 summaries returned, each with correct `currentInstalls` |
| `useAllExtensionsData — partial failure` | same | 2 fixtures succeed, 1 returns 404 | Assert `errors` has one entry, `results` has 2 |
| `Overview — sorted by momentum` | `tests/unit/Overview.test.tsx` | fixtures for 3 extensions with different momentums | Assert first row corresponds to highest-momentum extension |
| `Overview — column sort` | same | same | Click "Installs" column header; assert rows reorder by installs descending |
| `Overview — error row` | same | one extension fails | Assert error icon visible in that row; other two rows render normally |

### E2E Tests (Playwright)

| Test | File | Description |
|---|---|---|
| Overview loads with all extensions | `tests/e2e/overview.spec.ts` | Intercept all `data/*.json` fetches with fixtures; navigate to `/`; assert 3 rows visible in the overview table |
| Sparklines rendered | same | Assert SVG elements within each table row |
| Velocity badges colored | same | Assert green badge for extension with positive velocity fixture |
| Click extension navigates to detail | same | Click first extension name link; assert URL changes to `#/extension/...` and detail page loads |
| Overview sorted by default | same | Assert first row has highest momentum score (numerical check) |
| Sort by installs | same | Click "Installs" column header; assert first row now shows highest install count |
| Loading skeletons | same | Delay all data fetches by 1s; assert skeleton rows visible before data loads |

---

## Completion Criteria

- [ ] Overview dashboard renders all extensions with sparklines, velocity badges, and momentum scores
- [ ] Overview default-sorted by momentum; columns sortable
- [ ] Partial load failures show per-row error state without breaking the whole page
- [ ] All unit tests pass
- [ ] All E2E tests pass

---

## Deliverables

| Artifact | Location | Description |
|---|---|---|
| `useAllExtensionsData` hook | `src/hooks/useAllExtensionsData.ts` | Loads data for all registered extensions in parallel; returns `ExtensionSummary[]` with per-row error isolation |
| `Sparkline` component | `src/components/charts/Sparkline.tsx` | Minimal pure-SVG sparkline for embedding in table cells |
| `VelocityBadge` component | `src/components/cards/VelocityBadge.tsx` | Color-coded pill showing velocity direction and magnitude |
| `MomentumBadge` component | `src/components/cards/MomentumBadge.tsx` | 0–100 score with green/yellow/red color coding |
| Overview dashboard | `src/routes/Overview.tsx` | Full multi-extension table: sparklines, velocity badges, momentum scores, sortable columns, per-row error state, loading skeletons |
| Updated navigation | `src/components/Layout.tsx` | Header links home; single-extension shortcut to detail page |
| Multi-extension fixtures | `fixtures/data/extensions-multi.json`, `fixtures/data/github-repos-response.json`, `fixtures/data/package.json-extension.json`, `fixtures/data/package.json-non-extension.json` | Test data for discovery and overview tests |

---

## Manual Testing Checklist

> Cumulative — includes Phase 1–6 checks. By this phase, auto-discovery from Phase 2 is already operational. To test the overview with multiple extensions, ensure Phase 2’s discovery pipeline has run and at least two extensions are registered in `data/extensions.json`.

- [ ] **Overview shows all extensions:** Open the app — the Overview (home) page lists all extensions in `data/extensions.json` as table rows
- [ ] **Sparklines visible:** Each row in the overview table shows a small sparkline graphic reflecting the recent install trend
- [ ] **Velocity badges colored correctly:** An extension that has been gaining installs shows a green "▲ +N" badge; inspect `data/<id>.json` to verify the badge value matches the last velocity computation
- [ ] **Momentum scores differentiate extensions:** If two extensions are tracked, their momentum scores are different and reflect which is growing faster
- [ ] **Overview sorted by momentum by default:** The extension with the higher momentum score is in the first row on initial load
- [ ] **Sort by installs:** Click the "Installs" column header — rows reorder with the most-installed extension first
- [ ] **Sort by installs (reverse):** Click the "Installs" header again — rows reverse to least-installed first
- [ ] **Click navigates to detail:** Click an extension name in the overview table — navigates to that extension's detail page
- [ ] **Per-row error isolation:** Temporarily corrupt one extension's data file with invalid JSON — the overview still loads; the broken extension row shows an error icon while other rows render normally; restore the file
- [ ] **Single-extension shortcut:** If `data/extensions.json` contains only one extension, confirm the app navigates directly to that extension's detail page instead of showing the overview table
- [ ] **Loading skeletons:** Throttle network to "Slow 3G" in DevTools; reload the overview — skeleton rows appear while data loads, then resolve to real content

## Master Plan Update

On completion, update `work-plan-mvp.md` Phase 7 row to: ✅ Completed
