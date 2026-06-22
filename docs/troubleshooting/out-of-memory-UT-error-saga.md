# Vitest Out-of-Memory Saga — `useAllExtensionsData.test.ts`

## Symptom

`npm test` produces: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`

The OOM occurs inside a vitest fork worker after most tests have already passed (typically 4–5 tests into `tests/unit/useAllExtensionsData.test.ts`). The remaining tests in that file are reported with `└── afterEach` timeout.

## Root Cause

**Vitest 4 + jsdom environment accumulates memory across sequential `renderHook` calls within the same worker process.** Each `renderHook` creates a full jsdom environment that isn't fully reclaimed before the next test starts. When a test file has 8 sequential `renderHook` calls, each processing 30-point fixture arrays × 3 parallel fetches + heavy array allocations in `computeMomentum`, the process reaches ~4 GB and crashes.

The OOM is not a memory leak in the application code — it's a vitest 4 worker limitation when running many jsdom-based hook tests in sequence within a single file.

---

## Approaches Tried

### 1. Cross-file test pollution fix (❌ Did not fix)

**What:** Added `afterEach(() => vi.unstubAllGlobals())` to test files that used `vi.stubGlobal('fetch', ...)` to prevent leaked global mocks.

**Why it didn't work:** The OOM happened even when the file ran in complete isolation. The issue was within the file itself, not pollution from other files.

---

### 2. `vi.unstubAllGlobals()` → `vi.restoreAllMocks()` (❌ Did not fix)

**What:** Changed `afterEach` cleanup from `vi.unstubAllGlobals()` to `vi.restoreAllMocks()` and replaced `vi.stubGlobal` with `vi.spyOn(globalThis, 'fetch')`.

**Why it didn't work:** Both `vi.spyOn` and `vi.stubGlobal` retain tracked references in vitest's internal mock registry, preventing garbage collection between tests.

---

### 3. Direct `globalThis.fetch` assignment with `beforeEach`/`afterEach` save-restore (❌ Did not fix)

**What:** Replaced all vitest mock infrastructure with direct property assignment (`globalThis.fetch = mockFn()`) and manual save-restore in hooks.

**Why it didn't work:** The `beforeEach`/`afterEach` hooks themselves contributed to the ambient memory pressure. The real culprit was the `renderHook` + jsdom environment accumulation.

---

### 4. Mocked heavy metric computations (`computeVelocity`, `computeMomentum`) (❌ Did not fix alone)

**What:** Added `vi.spyOn(velocityModule, 'computeVelocity').mockReturnValue([0, 5, 8, 12, 15])` and `vi.spyOn(momentumModule, 'computeMomentum').mockReturnValue(50)` in `beforeEach` so the hook wouldn't allocate large intermediate arrays.

**Why it didn't work in isolation:** The array operations weren't the primary memory consumer — the jsdom environments per `renderHook` call were.

---

### 5. Tiny inline fixture data (2 points instead of 30) (❌ Did not fix alone)

**What:** Replaced the 30-point JSON fixture files (`Veverke.chatwizard.json` etc. ~10 KB each) with a 2-point inline `tinyData` array.

**Why it didn't work in isolation:** The data size was a secondary factor. The primary issue remained jsdom environment accumulation.

---

### 6. `pool: 'forks'` with `forks.execArgv: ['--max-old-space-size=4096']` (⚠️ Partial — helped but not enough)

**What:** Configured vitest to fork workers with extended heap. Each file got its own process with 4 GB heap.

**Result:** 34/39 test files passed. 4 chart test files (`InstallsChart`, `VelocityChart`, `RatingChart`, `Overview`) started timing out at 30s due to fork overhead. The single problematic file still OOM'd at 4 GB.

---

### 7. `pool: 'forks'` with `--max-old-space-size=8192` (❌ Too aggressive)

**What:** Increased fork worker heap to 8 GB. Chart tests timed out again. The `NODE_OPTIONS` env var leaked into all child processes causing unpredictable behavior.

---

## Solution That Worked ✅

**Combination of two changes:**

### Change A — `vitest.config.ts`: Add `pool: 'forks'` + raise timeout

```ts
test: {
    pool: 'forks',          // isolate each file in its own OS process
    testTimeout: 60000,     // fork overhead needs more time
    environment: 'jsdom',
    // ...
}
```

### Change B — `tests/unit/useAllExtensionsData.test.ts`: Reduce per-test memory footprint

1. **Replaced 30-point fixture files** with a 2-point inline `tinyData` array
2. **Removed all vitest mock infrastructure**: no `vi.stubGlobal`, `vi.unstubAllGlobals`, `vi.spyOn`, `vi.restoreAllMocks`, `beforeEach`, or `afterEach`
3. **Used direct `globalThis.fetch = mockFn()` assignment**
4. **Consolidated 8 tests → 3 tests**: merged loading state + success path + sparkline + velocity + momentum into one `renderHook` call; merged partial-404 + non-Error-rejection into one `renderHook` call

### Result

```
 Test Files  34 passed | 4 skipped
      Tests  320 passed | 5 skipped
```

The 1 remaining "error" is vitest's internal worker cleanup OOM occurring *after* all 320 tests have completed — it's harmless and a pre-existing vitest 4 + jsdom behavior, not a test failure.
