# Phase 7 — Multi-Extension Overview & Auto-Discovery

## Goal
Build the GitHub API auto-discovery pipeline that automatically detects VS Code extensions in a developer's GitHub repos and registers them for tracking. Add the multi-extension Overview dashboard with sparklines, velocity badges, and momentum scores, giving the developer a single view across all their extensions.

---

## Atomic Tasks

---

### Task 7.1 — GitHub API client for repo discovery
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
6. Rate limit: GitHub's token-authenticated rate limit is 5,000 req/hour; with pagination and package.json fetches for ~50 repos, this is well within limits

**Done when:** Function returns at least `Veverke.chatwizard` when called with the correct GitHub user.

---

### Task 7.2 — Auto-discovery GitHub Actions workflow
**Depends on 7.1**

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

Create `collect/discover.ts`:
- Entry point for the discover workflow
- Calls `discoverVSCodeExtensions`
- Merges discovered extensions with existing `data/extensions.json` (no duplicates, no removals — only additions)
- Writes updated registry

**Done when:** Workflow file is valid YAML and `collect/discover.ts` runs without errors.

---

### Task 7.3 — Overview data aggregation hook
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

### Task 7.4 — Sparkline component
**Independent**

Create `src/components/charts/Sparkline.tsx`.

Props: `points: number[]`, `width?: number`, `height?: number`, `color?: string`

Renders a minimal SVG polyline (no axes, no tooltip, no labels) suitable for embedding in a table cell. Normalizes the input points to fit within the given dimensions.

This is a pure SVG implementation — do NOT use Recharts for this (overhead too high for many instances on the overview page).

**Done when:** Renders correctly for increasing, decreasing, and flat input sequences.

---

### Task 7.5 — `VelocityBadge` component
**Independent**

Create `src/components/cards/VelocityBadge.tsx`.

Props: `velocity: number`

Renders a small colored pill:
- Positive velocity: green, "▲ +N"
- Zero: gray, "→ 0"
- Negative: red, "▼ -N"

**Done when:** Renders correct color and text for positive, zero, and negative inputs.

---

### Task 7.6 — `MomentumBadge` component
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

### Task 7.7 — Overview dashboard component
**Depends on 7.3, 7.4, 7.5, 7.6**

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

### Task 7.8 — Update navigation to reflect Overview as home
**Depends on 7.7, Phase 3 Task 3.2**

Update `src/components/Layout.tsx`:
- "VS Code Extension Analytics" header links to `/` (Overview)
- If exactly one extension is tracked, navigate directly to that extension's detail page instead of showing an empty overview

**Done when:** Navigation behavior is correct for 1-extension and multi-extension scenarios.

---

## Tests

### Unit Tests (Vitest)

**New fixtures needed:**
- `fixtures/data/extensions-multi.json` — 3 extensions (Veverke.chatwizard + 2 synthetic plausible extensions) to test multi-extension behavior
- `fixtures/data/github-repos-response.json` — raw GitHub API response for `/users/<user>/repos` listing repos that include a VS Code extension
- `fixtures/data/package.json-extension.json` — a real `package.json` from a VS Code extension (base64-encoded as GitHub API returns it)
- `fixtures/data/package.json-non-extension.json` — a `package.json` that does NOT have `engines.vscode` (to test filtering)

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
| Auto-discovery adds extension | `tests/e2e/discovery.spec.ts` | Intercept GitHub API calls with fixtures; run discovery endpoint logic; assert new extension appears in `data/extensions.json` |

---

## Completion Criteria

- [ ] `discoverVSCodeExtensions` correctly identifies VS Code extension repos and extracts publisher/name/displayName
- [ ] `collect/discover.ts` merges discovered extensions into registry without duplicates
- [ ] Discovery GitHub Actions workflow is valid YAML
- [ ] Overview dashboard renders all extensions with sparklines, velocity badges, and momentum scores
- [ ] Overview default-sorted by momentum; columns sortable
- [ ] Partial load failures show per-row error state without breaking the whole page
- [ ] All unit tests pass
- [ ] All E2E tests pass

---

## Deliverables

| Artifact | Location | Description |
|---|---|---|
| GitHub API discovery client | `collect/github.ts` | `discoverVSCodeExtensions()` — enumerates user repos, identifies VS Code extensions by `engines.vscode` in `package.json` |
| Discovery entry point | `collect/discover.ts` | Merges discovered extensions into `data/extensions.json` without duplicates or removals |
| Discovery workflow | `.github/workflows/discover.yml` | Weekly cron that runs `collect/discover.ts` and commits any registry changes |
| `useAllExtensionsData` hook | `src/hooks/useAllExtensionsData.ts` | Loads data for all registered extensions in parallel; returns `ExtensionSummary[]` with per-row error isolation |
| `Sparkline` component | `src/components/charts/Sparkline.tsx` | Minimal pure-SVG sparkline for embedding in table cells |
| `VelocityBadge` component | `src/components/cards/VelocityBadge.tsx` | Color-coded pill showing velocity direction and magnitude |
| `MomentumBadge` component | `src/components/cards/MomentumBadge.tsx` | 0–100 score with green/yellow/red color coding |
| Overview dashboard | `src/routes/Overview.tsx` | Full multi-extension table: sparklines, velocity badges, momentum scores, sortable columns, per-row error state, loading skeletons |
| Updated navigation | `src/components/Layout.tsx` | Header links home; single-extension shortcut to detail page |
| Multi-extension fixtures | `fixtures/data/extensions-multi.json`, `fixtures/data/github-repos-response.json`, `fixtures/data/package.json-extension.json`, `fixtures/data/package.json-non-extension.json` | Test data for discovery and overview tests |

---

## Manual Testing Checklist

> Cumulative — includes Phase 1–6 checks. This phase is best tested by adding a second real extension to `data/extensions.json` and running the collector, or by triggering the discovery workflow manually.

- [ ] **Discovery workflow runs:** In the GitHub repository, go to Actions → "Discover VS Code Extensions" → "Run workflow" — workflow completes without error
- [ ] **Discovery adds extensions:** After the discovery run, inspect `data/extensions.json` — all VS Code extension repos from the configured GitHub user are listed (including `Veverke.chatwizard`)
- [ ] **Discovery does not duplicate:** Run the discovery workflow a second time — `data/extensions.json` still has the same number of entries, not doubled
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
