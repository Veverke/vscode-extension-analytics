import { test, expect } from '@playwright/test'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const extensionsFixture = require('../../fixtures/data/extensions.json') as object[]

test.describe('Extension detail page', () => {
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

    // Stub optional companion data files to keep the page quiet.
    await page.route('**/data/Veverke/chatwizard/releases.json', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' })
    )
    await page.route('**/data/Veverke/chatwizard/monthly.json', (route) =>
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

  test('shows charts after data loads', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    // Wait for both chart SVGs to be present
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 10000 })
    const svgCount = await page.locator('svg').count()
    expect(svgCount).toBeGreaterThanOrEqual(2)
  })

  test('stats cards section is visible and shows numbers', async ({ page }) => {
    await page.goto('/#/extension/Veverke.chatwizard')

    const stats = page.getByRole('region', { name: 'Stats' })
    await expect(stats).toBeVisible({ timeout: 10000 })

    // At least one stat card should display a value
    const statValues = stats.locator('.stat-value')
    await expect(statValues.first()).not.toBeEmpty()
  })

  test('loading state is visible during data fetch delay', async ({ page }) => {
    await page.route('**/data/Veverke/chatwizard/data.json', async route => {
      await new Promise<void>(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    await page.goto('/#/extension/Veverke.chatwizard')

    // Loading indicator should appear while extension data is fetching
    await expect(
      page.getByRole('status', { name: 'Loading extension data' }),
    ).toBeVisible({ timeout: 5000 })

    // After delay, charts should appear
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 5000 })
  })

  test('error state is shown when fetch returns 500', async ({ page }) => {
    await page.route('**/data/Veverke/chatwizard/data.json', route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    )

    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    expect(await page.locator('svg').count()).toBe(0)
  })

  test('empty data state shows "No data yet" message', async ({ page }) => {
    await page.route('**/data/Veverke/chatwizard/data.json', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    await page.goto('/#/extension/Veverke.chatwizard')

    await expect(
      page.getByText("No data yet — the collector hasn't run yet").first(),
    ).toBeVisible({ timeout: 5000 })
  })
})