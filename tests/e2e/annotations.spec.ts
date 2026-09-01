import { test, expect } from '@playwright/test'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load fixture data via require (avoids ESM import assertion requirements)
const extensionsFixture = require('../../fixtures/data/extensions.json') as object[]
const chatwizardData = require('../../fixtures/data/Veverke.chatwizard.json') as object[]

const releasesFixture = require('../../fixtures/data/Veverke.chatwizard.releases.json') as {
  version: string
  publishedAt: string
  installsAtRelease: number
  downloadsAtRelease?: number | null
}[]

const eventsFixture = require('../../fixtures/data/events.json') as {
  ts: string
  label: string
  type: string
}[]

test.describe('Phase 6 — Annotations and Release Impact', () => {
  test.beforeEach(async ({ page }) => {
    // Stub the extension registry so tests are independent of the real
    // (mutable) data/extensions.json file.
    await page.route('**/data/extensions.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(extensionsFixture),
      })
    )

    // The app fetches time-series from the tree structure
    // (data/<namespace>/<name>/data.json).
    await page.route('**/data/Veverke/chatwizard/data.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatwizardData),
      })
    )

    // Intercept releases and events JSON with fixture data
    await page.route('**/data/Veverke/chatwizard/releases.json', (route) =>
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
    const releaseSection = page.getByRole('region', { name: 'Release Impact' })
    await expect(releaseSection.locator('table')).toBeVisible()
  })

  test('release impact table has 3 rows matching fixture', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    const releaseSection = page.getByRole('region', { name: 'Release Impact' })
    const dataRows = releaseSection.locator('tbody tr')
    await expect(dataRows).toHaveCount(releasesFixture.length)
  })

  test('best release row is highlighted (top-release class)', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    const releaseSection = page.getByRole('region', { name: 'Release Impact' })
    const firstRow = releaseSection.locator('tbody tr').first()
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
    await expect(page.getByText(/Downloads\/Day/)).toBeVisible()
  })

  test('release impact panel shows empty state when releases file is 404', async ({ page }) => {
    // Override the releases route to return 404
    await page.route('**/data/Veverke/chatwizard/releases.json', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' })
    )

    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    await expect(page.getByText('No release data available yet.')).toBeVisible()
  })
test('View diff links are absolute github.com URLs (no app-relative 404 redirects)', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('region', { name: 'Release Impact' })).toBeVisible({
      timeout: 10000,
    })

    const releaseSection = page.getByRole('region', { name: 'Release Impact' })
    const diffLinks = releaseSection.getByRole('link', { name: 'View diff' })
    await expect(diffLinks).toHaveCount(releasesFixture.length)

    const hrefs = await diffLinks.evaluateAll((links) =>
      links.map((l) => l.getAttribute('href') ?? '')
    )

    // Absolute github.com URLs (the registry stores a bare "owner/repo" string).
    for (const href of hrefs) {
      expect(href).toMatch(/^https:\/\/github\.com\/Veverke\/ChatWizard\//)
    }

    // None may be app-relative (which would resolve against the hash base → 404).
    for (const href of hrefs) {
      expect(href).toMatch(/^[a-z]+:\/\//i)
    }
  })
})