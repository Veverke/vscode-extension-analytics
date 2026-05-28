# Phase 1 — Repository & Infrastructure Setup

## Goal
Establish the complete project skeleton: directory layout, TypeScript toolchain, test runners, and GitHub Actions pipelines for both data collection and GitHub Pages deployment. No application logic is written in this phase.

---

## Atomic Tasks

Tasks in this phase are largely independent and can be executed in parallel unless a dependency is noted.

---

### Task 1.1 — Initialize npm package and TypeScript
**Independent**

- `npm init -y`
- Install: `typescript`, `@types/node`
- Create `tsconfig.json` with strict mode, `moduleResolution: bundler`, `target: ES2022`
- Create `tsconfig.node.json` for Node/collect scripts (CommonJS or ESM as needed)

**Done when:** `npx tsc --noEmit` exits 0 on an empty project.

---

### Task 1.2 — Scaffold React/Vite frontend
**Depends on 1.1**

- Install: `vite`, `react`, `react-dom`, `@types/react`, `@types/react-dom`
- Create `vite.config.ts`:
  - `base: './'` (required for GitHub Pages sub-path compatibility)
  - `build.outDir: 'dist'`
- Create minimal `index.html`, `src/main.tsx`, `src/App.tsx`

**Done when:** `npm run dev` serves a blank React page at `localhost:5173`.

---

### Task 1.3 — Configure ESLint and Prettier
**Independent of 1.2**

- Install: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react-hooks`, `prettier`, `eslint-config-prettier`
- Create `.eslintrc.json` and `.prettierrc`
- Add `lint` and `format` scripts to `package.json`

**Done when:** `npm run lint` exits 0 on the empty scaffold.

---

### Task 1.4 — Configure Vitest for unit tests
**Depends on 1.2**

- Install: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`
- Create `vitest.config.ts`:
  - `environment: 'jsdom'`
  - `globals: true`
  - `coverage.provider: 'v8'`
- Create `tests/unit/` directory
- Write a trivial passing test: `expect(1 + 1).toBe(2)` — verifies runner is wired correctly

**Done when:** `npm run test` exits 0.

---

### Task 1.5 — Configure Playwright for E2E tests
**Depends on 1.2**

- Install: `@playwright/test`
- Run `npx playwright install --with-deps chromium` (CI-safe; only Chromium needed)
- Create `playwright.config.ts`:
  - `baseURL: 'http://localhost:5173'`
  - `webServer` block that runs `npm run dev` before tests
  - `testDir: 'tests/e2e'`
- Create `tests/e2e/` directory
- Write a smoke E2E test: navigate to `/`, assert page title is not empty

**Done when:** `npm run test:e2e` opens Chromium and the smoke test passes.

---

### Task 1.6 — Create directory structure
**Independent**

Create all directories that will be populated in later phases so the structure is established:

```
collect/
collect/__tests__/
data/
src/routes/
src/components/charts/
src/components/cards/
src/components/annotations/
src/metrics/
src/hooks/
src/types/
tests/unit/
tests/e2e/
fixtures/data/
```

Also create a `.gitkeep` in `data/` and `fixtures/data/` so they are committed.

**Done when:** All directories exist in git.

---

### Task 1.7 — Create seed fixture files
**Independent of all code tasks**

Create real-world fixture files derived from actual API responses for use across all phases. These are committed to `fixtures/data/` and are the single source of truth for tests.

Files to create:
- `fixtures/data/marketplace-response.json` — raw response from VS Marketplace `extensionquery` endpoint for `Veverke.chatwizard`
- `fixtures/data/openvsx-response.json` — raw response from `https://open-vsx.org/api/Veverke/chatwizard`
- `fixtures/data/Veverke.chatwizard.json` — a realistic synthetic time series: 30 data points at 6-hour intervals, with realistic install growth (start: ~500, end: ~1400), a rating that fluctuates between 4.1–4.5, and two visible velocity peaks

**Done when:** All three files exist in `fixtures/data/` and are valid JSON.

**Note:** Fetch the real API responses at the time of task execution. The fixture files must contain real API field names and real response structures so that parser tests are valid.

---

### Task 1.8 — GitHub Actions: collect workflow
**Independent**

Create `.github/workflows/collect.yml`:

```yaml
name: Collect Extension Stats

on:
  schedule:
    - cron: "0 */6 * * *"  # every 6 hours
  workflow_dispatch:         # allow manual trigger

jobs:
  collect:
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
      - run: node --loader ts-node/esm collect/index.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Commit and push data
        run: |
          git config user.name "analytics-bot"
          git config user.email "analytics-bot@users.noreply.github.com"
          git add data/
          git diff --staged --quiet || git commit -m "chore: update extension stats [skip ci]"
          git push
```

**Done when:** File exists and is valid YAML (`yamllint`-clean).

---

### Task 1.9 — GitHub Actions: deploy workflow
**Depends on 1.2**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths-ignore:
      - "data/**"
      - "collect/**"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Done when:** File exists and is valid YAML. A push to `main` triggers the workflow (can be validated in GH Actions UI).

---

### Task 1.10 — .gitignore and README stub
**Independent**

- `.gitignore`: `node_modules/`, `dist/`, `coverage/`, `.env`, `*.local`
- `README.md` stub: one-line description and "Work in progress" note

**Done when:** Files exist.

---

## Tests

### Unit Tests (Vitest)

| Test | File | Description |
|---|---|---|
| Toolchain smoke | `tests/unit/smoke.test.ts` | `expect(1 + 1).toBe(2)` — confirms Vitest runs |

### E2E Tests (Playwright)

| Test | File | Description |
|---|---|---|
| App loads | `tests/e2e/smoke.spec.ts` | Navigate to `/`; assert `<body>` exists and contains at least one element |

---

## Completion Criteria

- [ ] `npm run dev` serves the app with no console errors
- [ ] `npm run build` produces `dist/` with no TypeScript errors
- [ ] `npm run lint` exits 0
- [ ] `npm run test` passes (Vitest smoke test)
- [ ] `npm run test:e2e` passes (Playwright smoke test)
- [ ] All directories in the target structure exist in git
- [ ] All three fixture files exist in `fixtures/data/`
- [ ] Both GitHub Actions workflow files exist

## Master Plan Update

On completion, update `work-plan-mvp.md` Phase 1 row to: ✅ Completed
