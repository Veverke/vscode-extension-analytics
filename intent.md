# Intent: VS Code Extension Analytics

## Problem Domain

VS Code extension authors publish extensions to two registries:
- [Visual Studio Marketplace](https://marketplace.visualstudio.com/)
- [Open VSX Registry](https://open-vsx.org/)

Both registries expose per-extension metadata (install counts, ratings, version history) via public APIs. However, **neither registry provides any historical trending, analytics, projections, or time-series insight**. A developer who wants to answer any of the following questions has no tool:

- Is my extension growing, plateauing, or declining?
- Did version 1.2.0 meaningfully increase installs?
- When did my last spike happen — and what caused it?
- Where will my install count be in 30 days if the current trend holds?
- How does my extension's install velocity compare to its own historical baseline?

---

## Problem Statement

> **Extension authors are flying blind.** The only feedback loop available is a single current-value integer on a web page. There is no historical record, no trend line, no projection, no release correlation, and no derived signal of any kind. The data exists — it simply is never collected.

---

## What This Application Solves

This application is a **developer-facing, self-hosted time-series analytics engine for VS Code extensions**. It:

1. **Collects** install counts, ratings, and rating velocity on a scheduled basis from both Marketplace and Open VSX.
2. **Stores** this data as a versioned, append-only time series in a GitHub repository — at zero infrastructure cost.
3. **Exposes** the data as a static dashboard hosted on GitHub Pages — also at zero cost.
4. **Computes derived signals** that raw data alone cannot reveal: velocity, acceleration, peaks, projections, and release impact.
5. **Auto-discovers** all VS Code extensions in a given developer's GitHub account, so tracking is automatic and maintenance-free.

---

## Goals

### Core Goals (MVP)
- Collect and persist install/download counts and ratings from both registries on an hourly/daily schedule.
- Visualize trends as time-series charts.
- Compute and display velocity (growth rate) and acceleration.
- Project future installs using linear and exponential regression models with confidence indicators (R²).
- Identify and annotate install peaks (local maxima in delta installs).
- Correlate installs with extension releases (show installs gained per version).

### Product Goals (Growth)
- Auto-discover all VS Code extensions in a developer's GitHub organization/account.
- Annotate charts with developer-defined events (blog posts, tweets, Product Hunt launches).
- Show cross-registry market split (Marketplace vs Open VSX installs as share of total).
- Support multiple forecast scenarios: optimistic (exponential), neutral (linear), pessimistic (flat).
- Provide a "momentum score" — a weighted composite of velocity, acceleration, and recency.

### Long-Term Vision (Scale)
- Support ecosystem-level tracking: aggregate trends across categories (AI tools, linters, themes).
- Enable community-facing leaderboards: trending extensions, rising stars.
- Provide embeddable badges for README files showing live stats.

---

## Non-Goals

- This is **not** a replacement for full-featured analytics platforms (Google Analytics, Mixpanel).
- This is **not** a SaaS product — it is a self-hosted, zero-cost tool per developer.
- This is **not** designed for arbitrary web app analytics — it is scoped to VS Code extension metadata from public registries.

---

## Target User

A solo developer or small team who:
- Publishes one or more VS Code extensions.
- Wants to understand growth without paying for infrastructure.
- Is comfortable creating a GitHub repository and enabling GitHub Pages.

---

## Key Constraints

| Constraint | Decision |
|---|---|
| No hosting budget | GitHub Actions (collector) + GitHub Pages (frontend) = $0 |
| Data must be persistent | Append-only JSON files committed to a git branch |
| No backend required at MVP | All analytics computed client-side in the browser |
| Must work for 1–50 extensions | Bounded dataset; no database required initially |
| Data schema must be evolvable | Per-extension JSON arrays, one file per extension |
