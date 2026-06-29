import { test, expect } from '@playwright/test'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load fixture data via require (avoids ESM import assertion requirements)
const releasesFixture = require('../../fixtures/data/Veverke.chatwizard.releases.json') as {
  version: string
  publishedAt: string
  installsAtRelease: number
}[]

const eventsFixture = require('../../fixtures/data/events.json') as {
  ts: string
  label: string
  type: string
}[]

test.describe('Phase 6 — Annotations and Release Impact', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept releases and events JSON with fixture data
    await page.route('**/data/Veverke.chatwizard.releases.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(releasesFixture),
      })
    )
    await page.route('**/data/events.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(eventsFixture),
      })
    )
  })

  test('annotation lines on installs chart — dashed line elements present', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    // Wait for the installs chart section to render
    await expect(page.getByRole('region', { name: 'Installs' })).toBeVisible({
      timeout: 10000,
    })

    // SVG <line> elements with stroke-dasharray are rendered by Recharts ReferenceLine.
    // Playwright cannot assess "visibility" of SVG lines the same way as HTML elements,
    // so we assert DOM presence (attached) and count >= 1.
    const dashedLines = page.locator('svg line[stroke-dasharray]')
    await expect(dashedLines.first()).toBeAttached({ timeout: 10000 })
    const count = await dashedLines.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('release impact panel visible with heading and table', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    await expect(page.getByText('Release Impact')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('release impact table has 3 rows matching fixture', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    const dataRows = page.locator('tbody tr')
    await expect(dataRows).toHaveCount(releasesFixture.length)
  })

  test('best release row is highlighted (top-release class)', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    const firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toHaveClass(/top-release/)
  })

  test('release impact table shows all expected columns', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    await expect(page.getByText('Version')).toBeVisible()
    await expect(page.getByText('Released')).toBeVisible()
    await expect(page.getByText(/Installs at Release/)).toBeVisible()
    await expect(page.getByText(/Installs Gained/)).toBeVisible()
    await expect(page.getByText(/Days Active/)).toBeVisible()
    await expect(page.getByText(/Installs\/Day/)).toBeVisible()
  })

  test('release impact panel shows empty state when releases file is 404', async ({ page }) => {
    // Override the releases route to return 404
    await page.route('**/data/Veverke.chatwizard.releases.json', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' })
    )

    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    await expect(page.getByText('No release data available yet.')).toBeVisible()
  })
})