# Phase 3 — Frontend Shell & GitHub Pages Deployment

## Goal
Build the React application skeleton: routing, layout, navigation sidebar, and the mechanism by which the app dynamically loads `data/extensions.json` to enumerate tracked extensions. No charts or analytics are built in this phase — only the structural shell and its deployment pipeline.

---

## Atomic Tasks

---

### Task 3.1 — Install and configure React Router
**Independent**

- Install: `react-router-dom`
- Configure hash-based routing (`createHashRouter`) in `src/main.tsx` — required for GitHub Pages, which does not support server-side rewrites
- Define two top-level routes:
  - `/` → `<Overview />` (placeholder: "Overview — coming soon")
  - `/extension/:extensionId` → `<ExtensionDetail />` (placeholder: "Extension detail — coming soon")

**Done when:** Navigating to `/#/` and `/#/extension/Veverke.chatwizard` renders different placeholder text without a 404.

---

### Task 3.2 — Create Layout component
**Depends on 3.1**

Create `src/components/Layout.tsx`:
- Top header bar: app name "VS Code Extension Analytics"
- Left sidebar (collapsible on narrow viewports): list of tracked extensions as navigation links
- Main content area: renders the active route's component via `<Outlet />`

The sidebar extension list is passed as props; actual data loading is in Task 3.3.

**Done when:** Layout renders with static mock extension names and navigation links work.

---

### Task 3.3 — `useExtensions` hook (loads extensions registry)
**Independent of 3.2**

Create `src/hooks/useExtensions.ts`.

Logic:
- `fetch('./data/extensions.json')` (relative path, works on GH Pages)
- Returns `{ extensions: ExtensionEntry[], loading: boolean, error: string | null }`
- On error (network fail, malformed JSON, or empty file): set `error` state; do not crash
- Memoize: only fetches once per app mount

**Done when:** Hook returns the `Veverke.chatwizard` entry when run against the real `data/extensions.json`.

---

### Task 3.4 — Wire `useExtensions` into Layout
**Depends on 3.2, 3.3**

Update `src/App.tsx` to:
- Call `useExtensions()`
- Pass the loaded `extensions` array to `<Layout>`
- Show a loading spinner while `loading === true`
- Show an error message if `error !== null`
- Pass extensions to the router so `<ExtensionDetail>` can look up the correct entry by `extensionId` param

**Done when:** Sidebar populates from `data/extensions.json` in the browser.

---

### Task 3.5 — Overview route placeholder
**Depends on 3.1**

Create `src/routes/Overview.tsx`:
- For now: renders a `<h1>Overview</h1>` and a list of `<Link>` elements to each extension's detail page
- Accepts `extensions: ExtensionEntry[]` as a prop

**Done when:** Overview page renders links to all tracked extensions.

---

### Task 3.6 — ExtensionDetail route placeholder
**Depends on 3.1**

Create `src/routes/ExtensionDetail.tsx`:
- Reads `:extensionId` from the URL params
- Renders the extension's `displayName` as an `<h1>`
- Shows placeholder sections: "Charts", "Metrics", "Projections" (all empty for now)

**Done when:** Navigating to `/#/extension/Veverke.chatwizard` shows "ChatWizard" as the heading.

---

### Task 3.7 — Basic CSS / design tokens
**Independent**

- Install: `@fontsource/inter` or use system font stack
- Create `src/styles/global.css`:
  - CSS custom properties for colors, spacing, font sizes
  - Reset / normalize
  - Basic layout: flex sidebar + main, responsive breakpoint at 768px
- Import in `src/main.tsx`

No UI framework (no Material UI, no Tailwind) — vanilla CSS only for MVP to minimize bundle size. Can be revisited in Growth phase.

**Done when:** App has a clean, readable layout with sidebar and main area visually distinct.

---

### Task 3.8 — Vite build and GH Pages path configuration
**Depends on 3.2**

- Confirm `vite.config.ts` has `base: './'` (already set in Phase 1; verify it still works after routing is added)
- Confirm `dist/` after `npm run build` contains a correctly linked `index.html`
- Add `public/404.html` that redirects to `index.html` with the path encoded as a query string (standard GH Pages SPA workaround); add corresponding decode script in `index.html`

**Done when:** `npm run build` + `npx serve dist` serves the app correctly at all routes without a 404 on browser refresh.

---

## Tests

### Unit Tests (Vitest + React Testing Library)

| Test | File | Fixture Used | Description |
|---|---|---|---|
| `useExtensions — success` | `tests/unit/useExtensions.test.ts` | `fixtures/data/extensions.json` (a copy of `data/extensions.json`) | Mock `fetch` to return the fixture; assert hook returns `extensions` array with correct length and the `Veverke.chatwizard` entry present |
| `useExtensions — fetch error` | same | none | Mock `fetch` to reject; assert `error` is set and `extensions` is `[]` |
| `useExtensions — malformed JSON` | same | none | Mock `fetch` to return `{ ok: true, json: () => Promise.resolve("not an array") }`; assert `error` is set |
| `Layout renders sidebar links` | `tests/unit/Layout.test.tsx` | fixture extensions array | Render `<Layout>` with fixture data; assert each extension's `displayName` appears in a nav link |
| `Overview renders extension links` | `tests/unit/Overview.test.tsx` | fixture extensions array | Render `<Overview>` with fixture data; assert `href` links contain each extension ID |
| `ExtensionDetail renders display name` | `tests/unit/ExtensionDetail.test.tsx` | fixture extensions array | Render with `extensionId = "Veverke.chatwizard"` in router context; assert "ChatWizard" heading appears |
| `ExtensionDetail — unknown extension` | same | none | Render with unknown `extensionId`; assert a "not found" message appears instead of crashing |

**Fixture to create:** `fixtures/data/extensions.json` — copy of `data/extensions.json`, used in unit tests to avoid coupling tests to the live data file.

### E2E Tests (Playwright)

| Test | File | Description |
|---|---|---|
| App loads with sidebar | `tests/e2e/shell.spec.ts` | Navigate to `/`; assert sidebar nav contains at least one extension link |
| Navigate to extension detail | same | Click the first extension link in the sidebar; assert the URL changes to `#/extension/...` and the heading shows the extension's display name |
| Direct URL navigation | same | Navigate directly to `/#/extension/Veverke.chatwizard`; assert page loads correctly (no 404, heading visible) |
| Unknown extension shows error | same | Navigate to `/#/extension/does.not.exist`; assert "not found" message is visible |
| Loading state appears briefly | same | Slow the `fetch` by intercepting the network request with a 500ms delay; assert a loading spinner/indicator is visible before data arrives |

---

## Completion Criteria

- [ ] Sidebar lists extensions loaded from `data/extensions.json`
- [ ] Clicking an extension navigates to its detail page with the correct title
- [ ] App builds with `npm run build` and no TypeScript errors
- [ ] App serves correctly from `dist/` with hash routing (no 404 on refresh)
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] The deploy GitHub Actions workflow successfully deploys to GitHub Pages on push to `main`

## Master Plan Update

On completion, update `work-plan-mvp.md` Phase 3 row to: ✅ Completed
