# Phase 5 — Derived Analytics (Velocity, Projections, Peaks)

## Goal
Implement all computed metric functions (velocity, acceleration, projections, peak detection) with full unit test coverage using known inputs and known expected outputs. Wire these metrics into the frontend as chart overlays and dedicated components. The fixture data must be rich enough to produce visible, verifiable results for all metrics.

---

## Atomic Tasks

All metric function tasks (5.1–5.4) are fully independent of each other and can be implemented in parallel.

---

### Task 5.1 — Velocity metric
**Independent**

Create `src/metrics/velocity.ts`.

```ts
/**
 * Returns the absolute change in installs between consecutive data points.
 * velocity[0] = 0 (no previous point to compare against).
 */
export function computeVelocity(data: DataPoint[]): number[]
```

- Uses `marketplace.installs` as the signal
- Result: array of length `data.length`; index 0 is always `0`
- Each value: `data[i].marketplace.installs - data[i-1].marketplace.installs`
- Also export `computeVelocityNormalized(data, windowHours)` — divides each raw velocity value by the time difference in hours between the two data points, yielding installs/hour

**Done when:** Unit tests pass for known input/output pairs.

---

### Task 5.2 — Acceleration metric
**Independent**

Create `src/metrics/acceleration.ts`.

```ts
/**
 * Returns the change in velocity between consecutive velocity values.
 * acceleration[0] = 0, acceleration[1] = 0 (need at least 2 velocity values).
 */
export function computeAcceleration(velocity: number[]): number[]
```

- Input: the output of `computeVelocity`
- Result: array of same length; first two values are `0`
- Positive acceleration = growth is speeding up; negative = slowing down

**Done when:** Unit tests pass.

---

### Task 5.3 — Projection metric
**Independent**

Install: `regression-js`

Create `src/metrics/projections.ts`.

```ts
export type RegressionModel = 'linear' | 'exponential' | 'polynomial';

export interface ProjectionResult {
  model: RegressionModel;
  r2: number;                    // goodness of fit, 0–1
  points: { ts: number; value: number }[];  // projected future points
  equation: string;              // human-readable e.g. "y = 1.2x + 500"
}

/**
 * Fits a regression model to install counts over time.
 * Returns projected values for the next `daysAhead` days.
 */
export function computeProjection(
  data: DataPoint[],
  model: RegressionModel,
  daysAhead: number
): ProjectionResult
```

Implementation notes:
- X axis: integer index (0, 1, 2…) for regression input; convert back to timestamps for output
- Minimum data points required: 3 (return `null` if fewer)
- `polynomial` uses degree 2
- Use the last data point's `ts` as the reference point for projecting forward

**Done when:** Unit tests confirm correct R² range and projected values trend in the expected direction.

---

### Task 5.4 — Peak detection
**Independent**

Create `src/metrics/peaks.ts`.

```ts
/**
 * Returns the indices of local maxima in the velocity signal.
 * A peak is a point where velocity[i] > velocity[i-1] AND velocity[i] > velocity[i+1].
 * Optionally filter by minimum threshold: only report peaks where velocity[i] >= minThreshold.
 */
export function detectPeaks(velocity: number[], minThreshold?: number): number[]
```

- Returns an array of indices into the velocity array
- Also export `peakDataPoints(data: DataPoint[], peakIndices: number[]): DataPoint[]` — convenience wrapper returning the actual data points at peak indices

**Done when:** Unit tests confirm correct peak indices for a known velocity sequence.

---

### Task 5.5 — Momentum score
**Independent**

Create `src/metrics/momentum.ts`.

```ts
/**
 * Computes a 0–100 momentum score for an extension based on recent metrics.
 * Higher = faster growing, accelerating, and recently active.
 */
export function computeMomentum(data: DataPoint[]): number
```

Formula:
```
recentVelocity = mean(last 7 velocity values)
recentAcceleration = mean(last 7 acceleration values)
recencyFactor = days since last data point (clamped 0–1, inverted: 1 = fresh data)

rawScore = 0.5 * normalize(recentVelocity) 
         + 0.3 * normalize(recentAcceleration)
         + 0.2 * recencyFactor

score = clamp(rawScore * 100, 0, 100)
```

Normalization is within-dataset (min-max across all 7 values). If `data.length < 7`, use all available points.

**Done when:** Unit tests confirm score is in [0, 100] range for all fixture inputs.

---

### Task 5.6 — `VelocityChart` component
**Depends on 5.1**

Create `src/components/charts/VelocityChart.tsx`.

Props: `data: DataPoint[]`

Renders:
- `BarChart` or `AreaChart` of velocity values over time
- Zero reference line (`ReferenceLine y={0}` dashed)
- Bars/area colored green for positive velocity, red for negative
- `Tooltip` showing date and installs gained/lost
- `XAxis` time-formatted, `YAxis` auto-scaled
- Responsive wrapper

**Done when:** Component renders with fixture data showing visible bars/area.

---

### Task 5.7 — Projection overlay on `InstallsChart`
**Depends on 5.3, Phase 4 Task 4.4**

Update `src/components/charts/InstallsChart.tsx` to accept optional `projections` prop:

```ts
interface InstallsChartProps {
  data: DataPoint[];
  projections?: ProjectionResult[];  // up to 3 models
}
```

For each projection:
- Add a dashed `Line` in a distinct color (linear = blue-dashed, exponential = orange-dashed)
- Add a `Label` at the end of the line showing the model name and R² (e.g. "Linear R²=0.94")
- Projected points connect to the last real data point seamlessly

**Done when:** Chart shows real data as solid line and projected future data as dashed lines.

---

### Task 5.8 — Peak markers on `InstallsChart`
**Depends on 5.4, Phase 4 Task 4.4**

Update `src/components/charts/InstallsChart.tsx` to accept optional `peaks` prop:

```ts
interface InstallsChartProps {
  data: DataPoint[];
  projections?: ProjectionResult[];
  peaks?: number[];  // indices of peak data points
}
```

For each peak index:
- Add a `ReferenceLine` (vertical, dashed, color: amber) at the peak's timestamp
- Add a label on the reference line showing the velocity at that point (e.g. "+42 installs")

**Done when:** The two velocity peaks in the fixture data appear as amber vertical lines on the chart.

---

### Task 5.9 — `MetricsPanel` component
**Depends on 5.1, 5.2, 5.3, 5.5**

Create `src/components/cards/MetricsPanel.tsx`.

Props: `data: DataPoint[]`

Renders a row of metric cards:
1. **Current Velocity** — `computeVelocityNormalized` of last point (installs/hour), formatted as "±X /hour"
2. **Acceleration** — last acceleration value, formatted as "↑ speeding up" or "↓ slowing down" or "→ stable"
3. **Momentum Score** — `computeMomentum` value as a 0–100 gauge (simple colored number: green >66, yellow 33–66, red <33)
4. **30-day Projection** — linear model projected value at +30 days, with R² shown in a muted color

**Done when:** Panel renders with correct values from fixture data.

---

### Task 5.10 — Wire all Phase 5 components into `ExtensionDetail`
**Depends on 5.6, 5.7, 5.8, 5.9**

Update `src/routes/ExtensionDetail.tsx`:
- Add `<MetricsPanel data={data} />` below `<StatsCards>`
- Update `<InstallsChart>` call to pass `projections` (linear + exponential) and `peaks`
- Add `<VelocityChart data={data} />` section with heading "Growth Velocity"

**Done when:** Full extension detail page shows all Phase 5 components correctly populated.

---

## Tests

### Unit Tests (Vitest)

All metric tests use the 30-point fixture (`fixtures/data/Veverke.chatwizard.json`) plus purpose-built synthetic sequences for edge cases.

| Test | File | Input | Expected |
|---|---|---|---|
| `computeVelocity — length` | `tests/unit/velocity.test.ts` | 30-point fixture | Output length === 30 |
| `computeVelocity — first is zero` | same | 30-point fixture | `result[0] === 0` |
| `computeVelocity — known delta` | same | synthetic: `[{installs:100}, {installs:142}]` | `result[1] === 42` |
| `computeVelocity — declining` | same | synthetic: `[{installs:500}, {installs:480}]` | `result[1] === -20` |
| `computeAcceleration — length` | `tests/unit/acceleration.test.ts` | output of velocity on fixture | Output length === 30 |
| `computeAcceleration — first two zero` | same | same | `result[0] === 0`, `result[1] === 0` |
| `computeAcceleration — known value` | same | velocity `[0, 10, 20]` | `result[2] === 10` |
| `computeProjection — linear R² on growing data` | `tests/unit/projections.test.ts` | synthetic perfectly linear data: installs grows by exactly 10 per point | `r2 >= 0.99` |
| `computeProjection — projected value is higher` | same | 30-point fixture | `projectedValue(+30) > data[last].marketplace.installs` (for growing dataset) |
| `computeProjection — insufficient data` | same | `data.length === 2` | Returns `null` |
| `computeProjection — exponential R²` | same | synthetic exponential growth | exponential `r2` > linear `r2` |
| `detectPeaks — known sequence` | `tests/unit/peaks.test.ts` | velocity `[0, 5, 20, 8, 3, 15, 7, 2]` | Returns indices `[2, 5]` |
| `detectPeaks — no peaks` | same | velocity `[1, 1, 1, 1]` | Returns `[]` |
| `detectPeaks — minThreshold filters small peaks` | same | velocity `[0, 5, 4, 3, 50, 48]` | With threshold=10, returns only `[4]` |
| `detectPeaks — fixture data produces peaks` | same | velocity from 30-point fixture | Returns at least 1 peak (fixture was designed with 2 peaks) |
| `computeMomentum — range` | `tests/unit/momentum.test.ts` | 30-point fixture | Score is in [0, 100] |
| `computeMomentum — higher for faster-growing data` | same | two synthetic datasets: one with 2x velocity | Higher velocity dataset scores higher |
| `computeMomentum — single point` | same | 1-point dataset | Does not crash; returns a valid number |

### E2E Tests (Playwright)

| Test | File | Description |
|---|---|---|
| Velocity chart visible | `tests/e2e/analytics.spec.ts` | Navigate to extension detail; assert a "Growth Velocity" heading and `<svg>` exist |
| Projection line on chart | same | Assert dashed line elements exist in the installs chart SVG (check for Recharts stroke-dasharray attribute) |
| Peak markers visible | same | Assert vertical reference line elements exist in installs chart (fixture has 2 peaks; assert at least 1 reference line) |
| Metrics panel shows values | same | Assert momentum score element is present and contains a numeric value |
| 30-day projection card shows future value | same | Assert projection card value is greater than the "current installs" card value |

---

## Completion Criteria

- [ ] `computeVelocity`, `computeAcceleration`, `computeProjection`, `detectPeaks`, `computeMomentum` all pass unit tests
- [ ] `VelocityChart` renders with fixture data
- [ ] Projection overlays appear on `InstallsChart` for linear and exponential models
- [ ] Peak markers appear at correct positions on `InstallsChart`
- [ ] `MetricsPanel` shows all four derived metric cards
- [ ] All unit tests pass
- [ ] All E2E tests pass

---

## Deliverables

| Artifact | Location | Description |
|---|---|---|
| Velocity metric | `src/metrics/velocity.ts` | `computeVelocity()` and `computeVelocityNormalized()` — absolute and per-hour install growth |
| Acceleration metric | `src/metrics/acceleration.ts` | `computeAcceleration()` — change in velocity over time |
| Projection metric | `src/metrics/projections.ts` | `computeProjection()` — linear, exponential, polynomial regression with R² using `regression-js` |
| Peak detection | `src/metrics/peaks.ts` | `detectPeaks()` with optional minimum threshold; `peakDataPoints()` convenience wrapper |
| Momentum score | `src/metrics/momentum.ts` | `computeMomentum()` — 0–100 composite score of velocity, acceleration, recency |
| `VelocityChart` | `src/components/charts/VelocityChart.tsx` | Bar/area chart of velocity over time with zero reference line, color-coded positive/negative |
| Projection overlay | `InstallsChart.tsx` updated | Dashed projection lines (linear = blue, exponential = orange) with R² label extending from last real data point |
| Peak markers | `InstallsChart.tsx` updated | Amber vertical reference lines at velocity peak indices with gain label |
| `MetricsPanel` | `src/components/cards/MetricsPanel.tsx` | Four metric cards: current velocity, acceleration direction, momentum score, 30-day projection |
| Wired `ExtensionDetail` | `src/routes/ExtensionDetail.tsx` updated | MetricsPanel, VelocityChart, and annotated InstallsChart all wired in |

---

## Manual Testing Checklist

> Cumulative — includes Phase 1–4 checks. Focus on visually verifying the derived signal quality using the real ChatWizard data.

- [ ] **Velocity chart visible:** Open the ChatWizard detail page — a "Growth Velocity" section with a bar or area chart is present below the installs chart
- [ ] **Velocity chart polarity:** Days with more installs than the previous day show green bars; if any downward movement exists in the data, those bars are red
- [ ] **Projection lines appear:** On the installs chart, two dashed lines extend past the last real data point — one blue (linear), one orange (exponential)
- [ ] **R² labels visible:** Each projection line has a label showing its model name and R² score (e.g. "Linear R²=0.91")
- [ ] **Projections trend upward:** Since ChatWizard is growing, both projection lines should slope upward — confirm visually
- [ ] **Peak markers present:** At least one amber vertical dashed line appears on the installs chart at a point that visually corresponds to a velocity spike
- [ ] **Peak label shows gain:** Hovering or inspecting the peak marker label shows the install gain at that point (e.g. "+42 installs")
- [ ] **Metrics panel cards populated:** All four metric cards show non-default values — velocity shows ±N/hour, acceleration shows direction, momentum shows a 0–100 score, projection card shows a future install count
- [ ] **Momentum score is colored:** The momentum score is green (>66), yellow (33–66), or red (<33) based on the actual computed value
- [ ] **Insufficient data graceful:** Temporarily replace `data/Veverke.chatwizard.json` with a 2-point array — projection should show a "not enough data" state rather than crashing; restore the original
- [ ] **R² reflects fit quality:** If you inspect the fixture data shape (linear vs exponential growth), the model with higher R² should visually match the trend better

## Master Plan Update

On completion, update `work-plan-mvp.md` Phase 5 row to: ✅ Completed
