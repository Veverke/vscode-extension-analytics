# User Guide — VS Code Extension Analytics

A comprehensive guide to using the analytics dashboard, understanding the metrics, and interpreting the charts.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Landing Page & Session Management](#2-landing-page--session-management)
3. [Auto-Discovery](#3-auto-discovery)
4. [Overview Dashboard](#4-overview-dashboard)
5. [Extension Detail Page](#5-extension-detail-page)
6. [Charts & Metrics Explained](#6-charts--metrics-explained)
7. [Monthly Statistics](#7-monthly-statistics)
8. [Competitor Analysis](#8-competitor-analysis)
9. [Event Annotations](#9-event-annotations)
10. [Exporting Data](#10-exporting-data)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Getting Started

The dashboard is a static web application served via GitHub Pages. To use it:

1. Navigate to your deployed GitHub Pages URL (e.g., `https://<your-username>.github.io/vscode-extension-analytics`).
2. Enter your GitHub username on the landing page.
3. The app will load your tracked extensions and display the overview dashboard.

> **Note:** The username is stored in `localStorage` on your browser. It is never sent to any server — the app is fully client-side.

---

## 2. Landing Page & Session Management

### First Visit

When you first open the app, you'll see a landing page with a single input field for your GitHub username.

```
┌─────────────────────────────────────┐
│          📊                          │
│  VS Code Extension Analytics         │
│                                      │
│  Discover and track analytics for    │
│  your VS Code extensions.            │
│                                      │
│  GitHub Username                     │
│  ┌─────────────────────────────┐     │
│  │ e.g. Veverke                │     │
│  └─────────────────────────────┘     │
│                                      │
│  [ Discover My Extensions ]          │
│                                      │
│  Your username is stored locally     │
│  and is never sent to our servers.   │
└─────────────────────────────────────┘
```

### Returning Users

If you've already entered a username, the app automatically redirects you to the overview dashboard on subsequent visits.

### Session Controls

- **Switch user:** Navigate back to the landing page and enter a different username.
- **Clear session:** The username persists in `localStorage`. To clear it, use your browser's "Clear Site Data" or remove the key `vscode-ext-analytics-username` from `localStorage`.

---

## 3. Auto-Discovery

The auto-discovery feature scans all public repositories of a GitHub user to find VS Code extensions.

### How to Use

1. From the overview dashboard, click the "discover extensions" link, or navigate directly to `/discover/<username>`.
2. The app scans each repository's `package.json` for an `engines.vscode` field.
3. Results are displayed as a list of discovered extensions.

### Result States

| State | Meaning |
|---|---|
| **✅ Tracked** | The extension is already in the registry and being tracked. |
| **⬜ Not Tracked** | The extension was found but is not yet being tracked. |

### Requesting Tracking

For untracked extensions, click **"Track on GitHub"** — or open an issue manually using the **Request Extension Tracking** template. Both approaches create a GitHub issue with a `[Tracking Request]` title and the `tracking-request` label.

#### Issue Fields

| Field | Required | Description |
|---|---|---|
| **Extension ID** | ✅ | The unique extension identifier in `publisher.name` format (e.g., `Veverke.chatwizard`) |
| **GitHub Repository** | Optional | URL of the extension's source repository |
| **Notes** | Optional | Additional context about the extension |

#### Issue Request Workflow

1. **Submit the request** — open the issue with the extension ID (and optional repository/notes). The `tracking-request` label is applied automatically.
2. **Automatic processing** — the **Process Tracking Requests** GitHub Action triggers on issue open/reopen, parses the issue body, and validates the extension ID.
3. **Registry update** — on success, the extension is added to `data/extensions.json` and committed to the repository.
4. **Completion comment** — a comment is posted on the issue: ✅ if the extension was added, or ℹ️ if it was already tracked.
5. **Issue closed** — the issue is closed automatically on success.
6. **Analytics appear** — the extension's charts populate on the dashboard after the next data collection run (every 6 hours).
7. **Failure handling** — if processing fails (e.g., invalid extension ID), the issue is reopened with a ⚠️ comment explaining the error; fix the issue details and it will be re-processed on reopen.

> **Note:** You'll receive a GitHub notification whenever a tracking request is submitted or processed.

---

## 4. Overview Dashboard

The overview dashboard shows all tracked extensions in a sortable table.

### Table Columns

| Column | Description | Sortable |
|---|---|---|
| **Extension** | Display name of the extension | ✅ |
| **Installs** | Current install count from VS Marketplace | ✅ |
| **Trend** | Sparkline chart showing recent install trend | ❌ |
| **Velocity** | Badge indicating growth rate (green = growing, red = declining) | ✅ |
| **Momentum** | Badge showing the composite momentum score | ✅ |

### Sorting

Click any column header to sort. Click again to toggle ascending/descending order.

### User-Scoped Filtering

- By default, only extensions you requested tracking for are shown.
- Toggle **"Show all tracked extensions"** to see every extension in the registry.

### Single-Extension Shortcut

If only one extension is tracked, the overview automatically redirects to its detail page.

---

## 5. Extension Detail Page

Click any extension in the overview table to open its detail page. This page contains all charts and metrics for a single extension.

### Page Layout

```
┌─────────────────────────────────────────────┐
│  [Icon]  Extension Name                      │
│          namespace.name                      │
│          [↗ VS Marketplace] [↗ Open VSX]    │
│          [↗ GitHub Repo]                     │
├─────────────────────────────────────────────┤
│  Stats Cards                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Instls│ │Rating│ │Stars │ │Veloc │       │
│  └──────┘ └──────┘ └──────┘ └──────┘       │
├─────────────────────────────────────────────┤
│  Metrics Panel                               │
│  Momentum: 0.74  Velocity: +45/day          │
│  Projection: 12,500 in 30 days (R²=0.92)   │
├─────────────────────────────────────────────┤
│  Installs Chart (with projections & peaks)  │
│  ┌──────────────────────────────────────┐   │
│  │  📈  ── Marketplace  ── Open VSX     │   │
│  │      ╌╌ Linear Proj  ╌╌ Expo Proj   │   │
│  │      │ peak │ release │ event        │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Growth Velocity Chart                       │
│  ┌──────────────────────────────────────┐   │
│  │  📊  bars showing installs/day       │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Rating Chart                                │
│  ┌──────────────────────────────────────┐   │
│  │  ⭐  Marketplace  ── Open VSX        │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  GitHub Chart                                │
│  ┌──────────────────────────────────────┐   │
│  │  ★ Stars  🍴 Forks  👥 Contribs     │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Release Impact Panel                        │
│  ┌──────────┬──────────┬──────────┐         │
│  │ Version  │ Gained   │ /day     │         │
│  ├──────────┼──────────┼──────────┤         │
│  │ 2.0.0    │ +5,200   │ +173     │         │
│  │ 1.5.0    │ +2,100   │ +35      │         │
│  └──────────┴──────────┴──────────┘         │
├─────────────────────────────────────────────┤
│  Monthly Statistics                          │
│  ┌──────────────────────────────────────┐   │
│  │  📊 Monthly installs bar chart       │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────┬──────┬──────┬──────┐          │
│  │ Month    │ Gain │ Rate │ Avg  │          │
│  ├──────────┼──────┼──────┼──────┤          │
│  │ 2026-05  │ 2340 │ +78/d│ 4.3  │          │
│  │ 2026-06  │ 3100 │ +103/│ 4.5  │          │
│  └──────────┴──────┴──────┴──────┘          │
├─────────────────────────────────────────────┤
│  Competitor Analysis                         │
│  ┌──────────────────────────────────────┐   │
│  │  Compare against other extensions    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 6. Charts & Metrics Explained

This section explains each chart and metric with concrete examples.

### 6.1 Installs Chart

**What it shows:** The cumulative install count over time from both the VS Marketplace and Open VSX registry.

**Example:**

```
Installs
  ^
  │
  │        ╱╲     ╱╲
  │       ╱  ╲   ╱  ╲  ╌╌╌╌  (exponential projection)
  │      ╱    ╲ ╱    ╲
  │  ╱╲╱      ╲╱      ╲  ╌╌╌  (linear projection)
  │ ╱                  ╲
  │╱                    ╲
  │                      ╲
  │                       │ peak
  │                        │ release v2.0
  └───────────────────────────────────────► Time
```

**Key features:**
- **Two lines:** Marketplace installs (solid) and Open VSX downloads (dashed).
- **Projection lines:** Dashed lines extending into the future (see §6.4).
- **Peak markers:** Vertical lines at detected install spike events (see §6.5).
- **Release markers:** Vertical lines at each version release date.
- **Event annotations:** Custom dashed lines for developer-defined events.

### 6.2 Growth Velocity Chart

**What it shows:** The rate of install growth between consecutive data points.

**Formula:**

```
Velocity[i] = Installs[i] - Installs[i-1]
```

Where `Installs[i]` is the install count at data point `i`.

**Example:**

```
Velocity
(installs/day)
  ^
  │  ██
  │  ██  ██
  │  ██  ██  ██
  │  ██  ██  ██  ██
  │  ██  ██  ██  ██  ██
  │  ██  ██  ██  ██  ██  ██
  └──────────────────────────► Time
```

**Interpretation:**
- **Positive bars (green):** The extension is gaining installs.
- **Negative bars (red):** The extension is losing installs (rare — usually indicates a data correction).
- **Taller bars:** Faster growth.
- **Shorter bars:** Slower growth.

**Example scenario:** If your extension had 1,000 installs on Monday and 1,050 on Tuesday, the velocity for Tuesday is `1,050 - 1,000 = +50 installs/day`.

### 6.3 Acceleration

**What it shows:** The change in velocity — whether growth is speeding up or slowing down.

**Formula:**

```
Acceleration[i] = Velocity[i] - Velocity[i-1]
```

**Example:**

| Day | Installs | Velocity | Acceleration | Signal |
|---|---|---|---|---|
| Mon | 1,000 | — | — | — |
| Tue | 1,050 | +50 | 0 | Baseline |
| Wed | 1,120 | +70 | +20 | 🟢 Speeding up |
| Thu | 1,200 | +80 | +10 | 🟢 Still accelerating |
| Fri | 1,250 | +50 | -30 | 🔴 Slowing down |
| Sat | 1,270 | +20 | -30 | 🔴 Decelerating |

**Interpretation:**
- **Positive acceleration:** Growth is accelerating (the extension is gaining momentum).
- **Negative acceleration:** Growth is decelerating (the extension is losing momentum, even if still growing).
- **Zero acceleration:** Steady growth rate.

### 6.4 Projections (30-Day Forecast)

**What it shows:** Predicted install counts for the next N days (default: 30) using regression models.

**Two models:**

| Model | Description | Best For |
|---|---|---|
| **Linear** | Assumes constant growth rate | Mature extensions with steady growth |
| **Exponential** | Assumes growth proportional to current size | Rapidly growing extensions |

**Confidence indicator (R²):**

R² (R-squared) measures how well the model fits the historical data:
- **R² = 1.00:** Perfect fit (rare with real data).
- **R² ≥ 0.90:** Excellent fit — projection is highly reliable.
- **R² ≥ 0.70:** Good fit — projection is reasonably reliable.
- **R² < 0.50:** Poor fit — projection should be treated with caution.

**Example:**

```
Projection Summary
──────────────────────────────────────────
Linear:      12,500 installs (+2,500 from today) · R²=0.95
Exponential: 14,200 installs (+4,200 from today) · R²=0.88
```

**Interpretation:** If the linear model (R²=0.95) fits well, you can expect ~12,500 installs in 30 days. The exponential model predicts higher growth (14,200) but with slightly lower confidence (R²=0.88).

**Adjusting the horizon:** Use the "Projection horizon" input to change the forecast period (1–24 months).

### 6.5 Peak Detection

**What it shows:** Automatic identification of install spike events in the velocity signal.

**Algorithm:** A peak is detected at index `i` when:

```
Velocity[i] > Velocity[i-1]  AND  Velocity[i] > Velocity[i+1]
```

In other words, a data point is a peak if it's higher than both its immediate neighbors.

**Example:**

```
Velocity
  ^
  │        ██
  │       ████
  │      ██████
  │  ████████████  ← peak detected here
  │ ██████████████
  │████████████████
  └────────────────────► Time
       ↑
    peak marker
```

**Use case:** Peaks often correlate with:
- A new version release.
- A blog post or social media mention.
- Being featured in a "VS Code extensions worth trying" list.
- A conference talk or newsletter mention.

### 6.6 Momentum Score

**What it shows:** A composite score in the range [-1, +1] that summarizes an extension's recent growth health.

**Formula:**

```
Momentum = 0.5 × mean(Velocity) + 0.3 × mean(Acceleration) + 0.2 × RecencyFactor
```

Where:
- **Velocity** is normalized to [-1, +1] range.
- **Acceleration** is normalized to [-1, +1] range.
- **RecencyFactor** = `max(0, 1 - daysSinceLastDataPoint / 30)` — penalizes stale data.

**Interpretation:**

| Score Range | Label | Meaning |
|---|---|---|
| +0.5 to +1.0 | 🟢 Strong | Rapidly growing, accelerating |
| +0.1 to +0.5 | 🟢 Positive | Growing steadily |
| -0.1 to +0.1 | ⚪ Neutral | Flat — no significant change |
| -0.5 to -0.1 | 🔴 Negative | Declining |
| -1.0 to -0.5 | 🔴 Critical | Rapidly declining |

**Example:** A momentum score of **0.74** means the extension is growing strongly with positive velocity and acceleration.

### 6.7 Release Impact

**What it shows:** How many installs each version contributed, sorted by impact.

**Formula:**

```
InstallsGained[version] = NextReleaseInstalls - ThisReleaseInstalls
```

For the latest version: `InstallsGained = CurrentInstalls - ThisReleaseInstalls`

**Example:**

```
Release Impact (sorted by installs gained)
┌──────────┬──────────────┬──────────┬──────────────┐
│ Version  │ Published    │ Gained   │ Per Day      │
├──────────┼──────────────┼──────────┼──────────────┤
│ 2.0.0    │ 2026-06-01   │ +5,200   │ +173/day     │
│ 1.5.0    │ 2026-04-15   │ +2,100   │ +35/day      │
│ 1.0.0    │ 2026-03-01   │ +800     │ +10/day      │
└──────────┴──────────────┴──────────┴──────────────┘
```

**Interpretation:** Version 2.0.0 drove the most installs (5,200 gained at 173/day), suggesting it was a significant release that attracted new users.

### 6.8 Rating Chart

**What it shows:** The average rating over time from both the VS Marketplace and Open VSX.

**Example:**

```
Rating
  ^
5 │  ⭐⭐⭐⭐⭐
  │         ╱╲
4 │  ╱╲    ╱  ╲  ╱╲
  │ ╱  ╲  ╱    ╲╱  ╲
3 │╱    ╲╱          ╲
  │
  └──────────────────────────► Time
```

**Interpretation:** A declining rating trend may indicate user dissatisfaction with recent changes. A rising trend suggests improvements are well-received.

### 6.9 GitHub Chart

**What it shows:** GitHub stars, forks, and community contributions over time.

**Data points:**
- **Stars:** Number of GitHub stars.
- **Forks:** Number of repository forks.
- **Contributions:** Total contributions by non-owner contributors (PRs + commits + issues + reviews).

**Example:**

```
GitHub
  ^
  │  ★★★★★★★★★★★★
  │  ★★★★★★★★★★★★  🍴🍴🍴
  │  ★★★★★★★★★★★★  🍴🍴🍴  👥👥
  │  ★★★★★★★★★★★★  🍴🍴🍴  👥👥👥
  └──────────────────────────► Time
     Stars          Forks     Contribs
```

---

## 7. Monthly Statistics

The monthly statistics section provides aggregated data per calendar month.

### Monthly Bar Chart

Shows installs gained each month as a bar chart, making it easy to spot seasonal trends.

### Monthly Table

| Column | Description |
|---|---|
| **YearMonth** | The calendar month (e.g., "2026-05") |
| **Installs End of Month** | Total installs at month end |
| **Installs Gained** | New installs during the month |
| **Avg Rating** | Average rating during the month |
| **Rating Count** | Number of ratings at month end |
| **Open VSX Downloads** | Open VSX downloads at month end |
| **Data Points** | Number of collector runs in the month |
| **Stars** | GitHub stars at month end |
| **Forks** | GitHub forks at month end |
| **Contributions** | Community contributions at month end |

**Example:**

```
Monthly Statistics
┌──────────┬────────┬──────┬─────┬─────┬──────┬────┐
│ Month    │ Gain   │ Rate │ Avg │ Rtg │ VSX  │ ★  │
│          │        │ /day │ Rtg │ Cnt │ Dnld │    │
├──────────┼────────┼──────┼─────┼─────┼──────┼────┤
│ 2026-05  │ 2,340  │ +78  │ 4.3 │ 12  │ 9,876│ 150│
│ 2026-06  │ 3,100  │ +103 │ 4.5 │ 18  │ 11,20│ 180│
│ 2026-07  │ 1,800  │ +60  │ 4.2 │ 15  │ 12,50│ 200│
└──────────┴────────┴──────┴─────┴─────┴──────┴────┘
```

**Interpretation:** June had the strongest growth (3,100 installs gained at 103/day). July slowed down, possibly due to summer seasonality.

---

## 8. Competitor Analysis

The competitor analysis section lets you compare your extension against other extensions from the VS Marketplace.

### How to Use

1. On the extension detail page, scroll to the **Competitors** section.
2. Enter a competitor's extension ID (e.g., `ms-python.python`) in the input field.
3. The dashboard fetches the competitor's data and displays a comparison.

### Comparison Metrics

| Metric | Description |
|---|---|
| **Installs** | Current install count |
| **Rating** | Average rating |
| **Rating Count** | Number of ratings |
| **GitHub Stars** | Repository stars |
| **Velocity** | Growth rate comparison |
| **Momentum** | Momentum score comparison |

**Example:**

```
Competitors
┌──────────────────────┬──────────┬───────┬──────┬──────┐
│ Extension            │ Installs │ Rtg   │ ★    │ Vel  │
├──────────────────────┼──────────┼───────┼──────┼──────┤
│ Your Extension       │ 12,500   │ 4.5   │ 200  │ +83  │
│ ms-python.python     │ 150M     │ 4.8   │ 5.2K │ +2K  │
│ esbenp.prettier-vsc  │ 98M      │ 4.6   │ 3.1K │ +1.5K│
└──────────────────────┴──────────┴───────┴──────┴──────┘
```

---

## 9. Event Annotations

Event annotations let you overlay custom events on the installs chart to correlate install activity with external events.

### Event Types

| Type | Description | Example |
|---|---|---|
| `release` | Version release | "v2.0.0 published" |
| `marketing` | Marketing campaign | "Product Hunt launch" |
| `blog` | Blog post | "How we built X on Dev.to" |
| `social` | Social media | "Tweet by @influencer" |
| `other` | Other events | "Conference talk" |

### How to Add Events

Events are defined in a JSON file (`data/events.json`) in the repository:

```json
[
  {
    "ts": "2026-06-15T12:00:00Z",
    "label": "Blog post on Dev.to",
    "type": "blog",
    "url": "https://dev.to/..."
  },
  {
    "ts": "2026-07-01T08:00:00Z",
    "label": "v2.0.0 released",
    "type": "release"
  }
]
```

### Visual Representation

On the installs chart, events appear as dashed vertical lines with labels:

```
Installs
  ^
  │        ╱╲
  │       ╱  ╲  ╱╲
  │  ╱╲╱    ╲╱  ╲
  │ ╱              ╲
  │╱                ╲
  │  ┊         ┊      ╲
  │  ┊         ┊
  │ Blog     v2.0.0
  └────────────────────────► Time
```

---

## 10. Exporting Data

The monthly statistics section provides two export options:

### CSV Export

Exports the monthly rollup data as a CSV file suitable for spreadsheet applications (Excel, Google Sheets, etc.).

**File name:** `<extension-id>-monthly.csv`

**Columns:** `YearMonth, InstallsEndOfMonth, InstallsGained, AvgRating, RatingCountEndOfMonth, OpenVsxDownloadsEndOfMonth, DataPointsInMonth`

### JSON Export

Exports the raw monthly rollup data as a JSON file for programmatic analysis.

**File name:** `<extension-id>-monthly.json`

---

## 11. Troubleshooting

### "No extensions found"

- Ensure your extensions are published to the VS Marketplace.
- Run auto-discovery to scan your GitHub repositories.
- Verify that `data/extensions.json` contains your extension entries.

### "Extension not found"

- The extension ID in the URL may be incorrect.
- The extension may not be in the registry yet — use auto-discovery to add it.

### "GitHub API rate limit reached"

- Unauthenticated requests are limited to 60/hour.
- Add a `GITHUB_TOKEN` to your fork's repository secrets for higher limits.
- For local development, use a personal access token.

### Charts not loading

- Check that the collector has run at least once (check GitHub Actions).
- Verify that the data files exist in the `data/` directory.
- Check the browser console for network errors (F12 → Console).

### Projection shows "N/A"

- Projections require at least 3 data points.
- If your extension was recently added, wait for more collector runs.

### Momentum shows 0

- Momentum requires at least 2 data points to compute velocity.
- If all recent velocity values are zero (flat data), momentum returns 0.

---

## Appendix: Metric Formulas Reference

| Metric | Formula | Range |
|---|---|---|
| **Velocity** | `Installs[i] - Installs[i-1]` | (-∞, +∞) |
| **Velocity (normalized)** | `Velocity / max(abs(Velocity))` | [-1, +1] |
| **Acceleration** | `Velocity[i] - Velocity[i-1]` | (-∞, +∞) |
| **Momentum** | `0.5 × mean(Velocity) + 0.3 × mean(Acceleration) + 0.2 × RecencyFactor` | [-1, +1] |
| **Installs gained (release)** | `NextReleaseInstalls - ThisReleaseInstalls` | [0, +∞) |
| **Installs per day (release)** | `InstallsGained / DaysElapsed` | [0, +∞) |
| **Recency factor** | `max(0, 1 - daysSinceLastPoint / 30)` | [0, +1] |
| **R² (linear regression)** | Coefficient of determination | [0, +1] |