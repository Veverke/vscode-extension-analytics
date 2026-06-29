import { test, expect } from '@playwright/test'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const extensionsMulti = require('../../fixtures/data/extensions-multi.json') as {
  id: string
  displayName: string
}[]

const chatwizardData = require('../../fixtures/data/Veverke.chatwizard.json') as object[]
const fastGrowerData = require('../../fixtures/data/Veverke.fast-grower.json') as object[]
const slowGrowerData = require('../../fixtures/data/Veverke.slow-grower.json') as object[]
const singleExtension = require('../../fixtures/data/extensions.json') as {
  id: string
  displayName: string
}[]

test.describe('Overview Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Serve the multi-extension registry
    await page.route('**/data/extensions.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(extensionsMulti),
      })
    )

    // Serve time-series data for each extension
    await page.route('**/data/Veverke.chatwizard.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatwizardData),
      })
    )
    await page.route('**/data/Veverke.fast-grower.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fastGrowerData),
      })
    )
    await page.route('**/data/Veverke.slow-grower.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(slowGrowerData),
      })
    )

    // Stub releases and events to avoid 404 console noise
    await page.route('**/data/*.releases.json', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' })
    )
    await page.route('**/data/events.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    )
  })

  test('overview loads with all 3 extensions as table rows', async ({ page }) => {
    await page.goto('/#/overview')

    await expect(page.getByRole('heading', { name: 'Your Extensions' })).toBeVisible({
      timeout: 10000,
    })

    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(3)
  })

  test('sparklines rendered in each row', async ({ page }) => {
    await page.goto('/#/overview')

    await expect(page.getByRole('heading', { name: 'Your Extensions' })).toBeVisible({
      timeout: 10000,
    })

    const sparklines = page.locator('svg[aria-label="sparkline"]')
    await expect(sparklines.first()).toBeAttached({ timeout: 10000 })
    const count = await sparklines.count()
    expect(count).toBe(3)
  })

  test('velocity badges visible in rows', async ({ page }) => {
    await page.goto('/#/overview')

    await expect(page.getByRole('heading', { name: 'Your Extensions' })).toBeVisible({
      timeout: 10000,
    })

    // At least one velocity badge with positive velocity (fast-grower should have ▲)
    const positiveBadge = page.locator('[class*="velocity-badge--positive"]').first()
    await expect(positiveBadge).toBeAttached({ timeout: 10000 })
  })

  test('clicking extension name navigates to detail page', async ({ page }) => {
    await page.goto('/#/overview')

    await expect(page.getByRole('heading', { name: 'Your Extensions' })).toBeVisible({
      timeout: 10000,
    })

    // Click the Chat Wizard link
    await page.getByRole('link', { name: 'Chat Wizard' }).first().click()

    // Should navigate to extension detail page
    await expect(page).toHaveURL(/#\/extension\/Veverke\.chatwizard/)
    await expect(
      page.getByRole('heading', { name: 'Chat Wizard' })
    ).toBeVisible({ timeout: 10000 })
  })

  test('overview sorted by momentum by default — highest momentum score in first row', async ({ page }) => {
    await page.goto('/#/overview')

    await expect(page.getByRole('heading', { name: 'Your Extensions' })).toBeVisible({
      timeout: 10000,
    })

    // Get all momentum badge labels
    const momentumBadges = page.locator('[aria-label^="momentum "]')
    await expect(momentumBadges.first()).toBeAttached({ timeout: 10000 })

    const count = await momentumBadges.count()
    expect(count).toBe(3)

    // First badge score should be >= last badge score
    const firstLabel = await momentumBadges.nth(0).getAttribute('aria-label')
    const lastLabel = await momentumBadges.nth(count - 1).getAttribute('aria-label')
    const firstScore = parseInt(firstLabel?.replace('momentum ', '') ?? '0')
    const lastScore = parseInt(lastLabel?.replace('momentum ', '') ?? '0')
    expect(firstScore).toBeGreaterThanOrEqual(lastScore)
  })

  test('sort by installs — highest install count row appears first', async ({ page }) => {
    await page.goto('/#/overview')

    await expect(page.getByRole('heading', { name: 'Your Extensions' })).toBeVisible({
      timeout: 10000,
    })

    // Click Installs column header
    await page.getByRole('columnheader', { name: /Installs/ }).click()

    // Fast Grower has 11750 installs — should be first after sort
    const firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toContainText('Fast Grower')
  })

  test('loading skeletons visible before data loads', async ({ page }) => {
    // Delay all extension data fetches by 1.5s
    await page.route('**/data/Veverke.*.json', async (route) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 1500))
      const url = route.request().url()
      let body: object[] = []
      if (url.includes('fast-grower')) body = fastGrowerData
      else if (url.includes('slow-grower')) body = slowGrowerData
      else body = chatwizardData
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    })

    await page.goto('/#/overview')

    // Skeleton rows should appear during loading
    const skeletonRows = page.locator('.overview__skeleton-row')
    await expect(skeletonRows.first()).toBeAttached({ timeout: 5000 })

    // After delay, real rows should appear
    const rows = page.locator('tbody tr:not(.overview__skeleton-row)')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
  })

  test('per-row error isolation: broken extension shows error icon, others render', async ({ page }) => {
    // Override slow-grower to return 500
    await page.route('**/data/Veverke.slow-grower.json', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )

    await page.goto('/#/overview')

    await expect(page.getByRole('heading', { name: 'Your Extensions' })).toBeVisible({
      timeout: 10000,
    })

    // Wait for loading to complete — 2 rows succeed, 1 shows error
    // Scope to the overview table to avoid matching sidebar links
    const table = page.getByRole('table', { name: 'Extensions overview' })
    await expect(table.getByRole('link', { name: 'Chat Wizard' })).toBeVisible({
      timeout: 10000,
    })
    await expect(table.getByRole('link', { name: 'Fast Grower' })).toBeVisible()

    // Error icon should be visible
    await expect(page.getByRole('img', { name: 'error' })).toBeVisible()
  })

  test('sort by installs reverse — click twice toggles ascending', async ({ page }) => {
    await page.goto('/#/overview')

    await expect(page.getByRole('heading', { name: 'Your Extensions' })).toBeVisible({
      timeout: 10000,
    })

    // First click: descending (highest first)
    await page.getByRole('columnheader', { name: /Installs/ }).click()
    let firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toContainText('Fast Grower') // 11750 installs

    // Second click: ascending (lowest first)
    await page.getByRole('columnheader', { name: /Installs/ }).click()
    firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toContainText('Slow Grower') // 115 installs
  })

  test('single-extension redirect — navigates directly to detail page', async ({ page }) => {
    // Override extensions.json to only have one extension
    await page.route('**/data/extensions.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([singleExtension[0]]),
      })
    )

    // Also serve the chatwizard data directly
    await page.route('**/data/Veverke.chatwizard.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatwizardData),
      })
    )

    // Remove routes for the other extensions — stub them to avoid unmocked fetches
    await page.route('**/data/Veverke.fast-grower.json', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' })
    )
    await page.route('**/data/Veverke.slow-grower.json', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' })
    )

    await page.goto('/#/overview')

    // Should have redirected to the detail page (not showing overview table)
    await expect(page).toHaveURL(/#\/extension\/Veverke\.chatwizard/)
    await expect(page.getByRole('heading', { name: 'Chat Wizard' })).toBeVisible({
      timeout: 10000,
    })
  })
})
