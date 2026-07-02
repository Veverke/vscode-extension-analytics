/**
 * Generates .monthly.json fixture files from existing .json data files.
 * Run: node scripts/generate-monthly.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const dataDir = resolve(root, 'data')
const fixturesDir = resolve(root, 'fixtures', 'data')

function computeMonthlyRollup(data) {
  if (!Array.isArray(data) || data.length === 0) return []

  const sorted = [...data].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  )

  const grouped = new Map()
  for (const point of sorted) {
    const d = new Date(point.ts)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(point)
  }

  const months = Array.from(grouped.keys()).sort()
  const rollups = []

  for (let i = 0; i < months.length; i++) {
    const yearMonth = months[i]
    const points = grouped.get(yearMonth)
    const lastPoint = points[points.length - 1]

    let installsGained = 0
    if (i > 0) {
      const prevMonth = months[i - 1]
      const prevPoints = grouped.get(prevMonth)
      const prevLastPoint = prevPoints[prevPoints.length - 1]
      installsGained = lastPoint.marketplace.installs - prevLastPoint.marketplace.installs
    }

    const ratings = points
      .map((p) => p.marketplace.averageRating)
      .filter((r) => r !== undefined && r !== null)
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0

    rollups.push({
      yearMonth,
      installsEndOfMonth: lastPoint.marketplace.installs,
      installsGained: Math.max(0, installsGained),
      avgRating: Math.round(avgRating * 100) / 100,
      ratingCountEndOfMonth: lastPoint.marketplace.ratingCount,
      openVsxDownloadsEndOfMonth: lastPoint.openVsx?.downloads ?? 0,
      dataPointsInMonth: points.length,
    })
  }

  return rollups
}

function processFile(filePath, extId) {
  if (!existsSync(filePath)) {
    console.log(`  ⚠  ${filePath} not found, skipping`)
    return
  }

  const raw = readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)
  const rollups = computeMonthlyRollup(data)

  // Write to data/
  const dataTarget = resolve(dataDir, `${extId}.monthly.json`)
  writeFileSync(dataTarget, JSON.stringify(rollups, null, 2), 'utf-8')
  console.log(`  ✓ Generated data/${extId}.monthly.json (${rollups.length} months)`)

  // Write to fixtures/data/
  const fixturesTarget = resolve(fixturesDir, `${extId}.monthly.json`)
  writeFileSync(fixturesTarget, JSON.stringify(rollups, null, 2), 'utf-8')
  console.log(`  ✓ Generated fixtures/data/${extId}.monthly.json (${rollups.length} months)`)
}

console.log('Generating monthly rollup fixtures...')

processFile(
  resolve(fixturesDir, 'Veverke.chatwizard.json'),
  'Veverke.chatwizard'
)
processFile(
  resolve(fixturesDir, 'Veverke.copilot-reviewer-assistant.json'),
  'Veverke.copilot-reviewer-assistant'
)

console.log('Done.')