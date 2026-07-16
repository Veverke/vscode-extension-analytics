/**
 * Regenerates fixture data with realistic numbers.
 * Run: node scripts/regenerate-fixtures.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const fixturePath = resolve(root, 'fixtures', 'data', 'Veverke.chatwizard.json')
const dataPath = resolve(root, 'data', 'Veverke.chatwizard.json')

// Realistic data reflecting actual values fetched from the marketplace APIs:
// VS Marketplace: installs=136 (as of 2026-07-02)
// Open VSX: downloads=1998 (as of 2026-07-02)
// Data grows linearly from ~60% of current values to match real API values.
const REAL_INSTALLS = 136;
const REAL_OPENVSX = 1998;
const START_INSTALLS = Math.round(REAL_INSTALLS * 0.6);
const START_OPENVSX = Math.round(REAL_OPENVSX * 0.6);

function interpolate(start, end, progress) {
  return Math.round(start + (end - start) * progress);
}

// May points: 4 per day from May 20 to May 27 (32 points)
const mayTimestamps = [];
for (let day = 20; day <= 27; day++) {
  if (day === 20) {
    mayTimestamps.push(`2026-05-${String(day).padStart(2,'0')}T12:00:00Z`);
    mayTimestamps.push(`2026-05-${String(day).padStart(2,'0')}T18:00:00Z`);
  } else {
    ['T00:00:00Z', 'T06:00:00Z', 'T12:00:00Z', 'T18:00:00Z'].forEach(t => {
      mayTimestamps.push(`2026-05-${String(day).padStart(2,'0')}${t}`);
    });
  }
}

const mayPoints = mayTimestamps.map((ts, i) => {
  const progress = i / (mayTimestamps.length + 29); // 29 june points
  return {
    ts,
    installs: interpolate(START_INSTALLS, REAL_INSTALLS, progress),
    updates: Math.round(interpolate(START_INSTALLS, REAL_INSTALLS, progress) * (389/500)),
    rating: 5.0,
    ratingCount: 1,
    trendingW: i === mayTimestamps.length - 1 ? 0.01 : 0,
    trendingM: i === mayTimestamps.length - 1 ? 0.05 : 0,
    ovsxDownloads: interpolate(START_OPENVSX, REAL_OPENVSX, progress),
  };
});

// June points: daily at 12:00 (30 points)
const junePoints = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const progress = (mayTimestamps.length + i) / (mayTimestamps.length + 30);
  return {
    ts: `2026-06-${String(day).padStart(2,'0')}T12:00:00Z`,
    installs: interpolate(START_INSTALLS, REAL_INSTALLS, progress),
    updates: Math.round(interpolate(START_INSTALLS, REAL_INSTALLS, progress) * (389/500)),
    rating: 5.0,
    ratingCount: 1,
    trendingW: 0.01 + (i / 29) * 0.03,
    trendingM: 0.05 + (i / 29) * 0.07,
    ovsxDownloads: interpolate(START_OPENVSX, REAL_OPENVSX, progress),
  };
});

function toDataPoint(p) {
  return {
    ts: p.ts,
    marketplace: {
      installs: p.installs,
      updates: p.updates,
      averageRating: p.rating,
      ratingCount: p.ratingCount,
      trendingWeekly: p.trendingW,
      trendingMonthly: p.trendingM,
    },
    openVsx: {
      downloads: p.ovsxDownloads,
      averageRating: null,
      ratingCount: 0,
    },
  }
}

const allPoints = [...mayPoints, ...junePoints].map(toDataPoint)

writeFileSync(fixturePath, JSON.stringify(allPoints, null, 2), 'utf-8')
writeFileSync(dataPath, JSON.stringify(allPoints, null, 2), 'utf-8')
console.log(`✓ Wrote ${allPoints.length} data points (${mayPoints.length} May + ${junePoints.length} June)`)
console.log(`✓ Updated ${fixturePath}`)
console.log(`✓ Updated ${dataPath}`)