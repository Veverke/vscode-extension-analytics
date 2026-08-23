import { test, expect } from '@playwright/test'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const extensionsFixture = require('../../fixtures/data/extensions.json') as object[]
const chatwizardData = require('../../fixtures/data/Veverke.chatwizard.json') as object[]

test.describe('App shell', () => {
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

    // Stub time-series and companion data files so detail pages load.
    await page.route('**/data/Veverke/chatwizard/data.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatwizardData),
      })
    )
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

  test('app loads with sidebar containing at least one extension link', async ({ page }) => {
    await page.goto('/#/overview')
    const nav = page.getByRole('navigation', { name: 'Extension navigation' })
    await expect(nav).toBeVisible()
    const links = nav.getByRole('link')
    await expect(links).not.toHaveCount(0)
  })

  test('clicking an extension link navigates to its detail page', async ({ page }) => {
    await page.goto('/#/overview')
    const nav = page.getByRole('navigation', { name: 'Extension navigation' })
    // The sidebar contains an "Overview" link first, then extension links.
    // Target only the extension links (href contains /extension/).
    const firstExtensionLink = nav.locator('a[href*="/extension/"]').first()
    const linkText = await firstExtensionLink.textContent()
    await firstExtensionLink.click()
    await expect(page).toHaveURL(/#\/extension\//)
    await expect(page.getByRole('heading', { name: linkText ?? '' })).toBeVisible()
  })

  test('navigating directly to extension detail URL loads the page correctly', async ({
    page,
  }) => {
    await page.goto('/#/extension/Veverke.chatwizard')
    await expect(page.getByRole('heading', { name: 'Chat Wizard' })).toBeVisible()
  })

  test('unknown extension shows "not found" message', async ({ page }) => {
    await page.goto('/#/extension/does.not.exist')
    await expect(page.getByText('Extension not found')).toBeVisible()
  })

  test('loading indicator is visible before data arrives', async ({ page }) => {
    // Intercept the extensions fetch and delay it by 500ms, then serve the
    // fixture registry (not the real file, which may be empty).
    await page.route('**/data/extensions.json', async route => {
      await new Promise<void>(resolve => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(extensionsFixture),
      })
    })

    await page.goto('/#/overview')

    // The loading indicator should be visible immediately
    await expect(page.getByRole('status')).toBeVisible()

    // After data loads, the navigation should appear
    await expect(
      page.getByRole('navigation', { name: 'Extension navigation' }),
    ).toBeVisible({ timeout: 5000 })
  })
})