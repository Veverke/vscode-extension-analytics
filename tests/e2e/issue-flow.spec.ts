import { test, expect } from '@playwright/test'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const extensionsFixture = require('../../fixtures/data/extensions-multi.json') as object[]
const chatwizardData = require('../../fixtures/data/Veverke.chatwizard.json') as object[]
const fastGrowerData = require('../../fixtures/data/Veverke.fast-grower.json') as object[]
const slowGrowerData = require('../../fixtures/data/Veverke.slow-grower.json') as object[]

/**
 * Base64-encoded package.json for a valid VS Code extension (Veverke.chatwizard).
 * {"name":"chatwizard","publisher":"Veverke","displayName":"Chat Wizard","engines":{"vscode":"^1.85.0"}}
 */
const VALID_EXTENSION_PKG = Buffer.from(
  JSON.stringify({
    name: 'chatwizard',
    publisher: 'Veverke',
    displayName: 'Chat Wizard',
    engines: { vscode: '^1.85.0' },
  }),
).toString('base64')

/**
 * Base64-encoded package.json for a non-VS Code project (no engines.vscode).
 * {"name":"some-website","engines":{}}
 */
const NON_EXTENSION_PKG = Buffer.from(
  JSON.stringify({ name: 'some-website', engines: {} }),
).toString('base64')

test.describe('Issue Flow — Track on GitHub', () => {
  test.beforeEach(async ({ page }) => {
    // Stub all data files
    await page.route('**/data/extensions.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(extensionsFixture),
      }),
    )
    await page.route('**/data/Veverke.chatwizard.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatwizardData),
      }),
    )
    await page.route('**/data/Veverke.fast-grower.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fastGrowerData),
      }),
    )
    await page.route('**/data/Veverke.slow-grower.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(slowGrowerData),
      }),
    )
    await page.route('**/data/*.releases.json', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' }),
    )
    await page.route('**/data/events.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }),
    )

    // Stub the GitHub repos API
    await page.route(/github\.com\/users\/[\w-]+\/repos/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'x-ratelimit-remaining': '59',
          'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString(),
        },
        body: JSON.stringify([
          { name: 'chatwizard', full_name: 'Veverke/chatwizard' },
          { name: 'some-website', full_name: 'Veverke/some-website' },
          { name: 'mystery', full_name: 'Veverke/mystery' },
        ]),
      }),
    )

    // Stub GitHub Contents API for package.json checks
    await page.route(/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\/package\.json/, (route) => {
      const url = route.request().url()
      // Veverke/chatwizard → valid extension
      if (url.includes('Veverke/chatwizard')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: VALID_EXTENSION_PKG,
            encoding: 'base64',
          }),
        })
      }
      // Some-website → not an extension
      if (url.includes('some-website')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: NON_EXTENSION_PKG,
            encoding: 'base64',
          }),
        })
      }
      // Mystery → 404 (no package.json)
      return route.fulfill({ status: 404, body: 'Not Found' })
    })
  })

  test('Landing → discover page shows untracked extension with Track CTA', async ({ page }) => {
    // Override extensions.json to return empty array so discovered ext appears untracked
    await page.route('**/data/extensions.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    )

    // Navigate directly to discover page with username
    await page.goto('/#/discover/Veverke')

    // Wait for discovery results to load
    await expect(
      page.locator('.discover__list'),
    ).toBeVisible({ timeout: 15000 })

    // Should find the discovered extension card
    const untrackedCard = page.locator('.untracked-card')
    await expect(untrackedCard).toBeVisible()

    // Verify card shows extension info
    await expect(untrackedCard.locator('.untracked-card__name')).toHaveText(
      'Chat Wizard',
    )
    await expect(untrackedCard.locator('.untracked-card__id')).toHaveText(
      'Veverke.chatwizard',
    )
    await expect(untrackedCard.locator('.untracked-card__repo')).toHaveText(
      'Veverke/chatwizard',
    )

    // Verify "Not Tracked" badge and CTA button
    await expect(
      untrackedCard.locator('.untracked-card__badge'),
    ).toContainText('Not Tracked')
    await expect(
      untrackedCard.locator('.untracked-card__cta'),
    ).toBeVisible()
    await expect(
      untrackedCard.locator('.untracked-card__cta'),
    ).toHaveText('Track on GitHub')
  })

  test('clicking "Track on GitHub" opens correct prefilled issue URL', async ({ page }) => {
    // Override extensions.json to return empty array so discovered ext appears untracked
    await page.route('**/data/extensions.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    )

    // Intercept window.open to capture the URL instead of opening a new tab
    page.on('popup', (popup) => popup.close())
    await page.addInitScript(() => {
      window.open = (url?: string | URL | undefined) => {
        ;(window as unknown as Record<string, string | undefined>).__capturedTrackingUrl__ =
          typeof url === 'string' ? url : (url as URL).href
        return null
      }
    })

    await page.goto('/#/discover/Veverke')

    // Wait for the card to appear
    const ctaButton = page.locator('.untracked-card__cta')
    await expect(ctaButton).toBeVisible({ timeout: 15000 })

    // Click the "Track on GitHub" button
    await ctaButton.click()

    // Evaluate the captured URL from the window
    const captured = await page.evaluate(() => {
      return (window as unknown as { __capturedTrackingUrl__?: string })
        .__capturedTrackingUrl__
    })

    expect(captured).toBeTruthy()
    expect(captured).toContain('github.com/Veverke/vscode-extension-analytics/issues/new')
    expect(captured).toContain('template=add-extension.yml')
    expect(captured).toContain('title=Add+extension%3A+Veverke.chatwizard')
    // The labels query param is intentionally NOT included — GitHub doesn't
    // reliably apply labels via URL params. The issue template frontmatter
    // handles applying the `tracking-request` label.
    expect(captured).not.toContain('labels=')
  })

  test('already-tracked extensions show "Tracked" badge instead of CTA', async ({ page }) => {
    await page.goto('/#/discover/Veverke')

    // Wait for results list specifically — not the loading skeleton
    await expect(
      page.locator('.discover__list[aria-label="Discovered extensions"]'),
    ).toBeVisible({ timeout: 15000 })

    // Since the fixture extensions-multi.json already has Veverke.chatwizard tracked,
    // and our mock returns only this one as a valid extension, it should show as tracked
    const trackedItems = page.locator('.discover__item--tracked')
    const trackedCount = await trackedItems.count()

    // There should be at least one tracked item (Veverke.chatwizard is in the registry)
    expect(trackedCount).toBeGreaterThanOrEqual(1)

    // The first tracked item should have the "Tracked" badge
    await expect(
      trackedItems.first().locator('.discover__status-tracked'),
    ).toContainText('Tracked')
  })

  test('error state when GitHub API returns 404 for user', async ({ page }) => {
    // Override the repos route for this test only
    await page.route('**/api.github.com/users/*/repos*', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        headers: {
          'x-ratelimit-remaining': '58',
          'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString(),
        },
        body: JSON.stringify({ message: 'Not Found' }),
      }),
    )

    await page.goto('/#/discover/ghost-user')

    // Error alert should appear
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('alert').locator('.discover__error-title'),
    ).toContainText('Discovery failed')

    // Verify error message mentions the user
    await expect(page.getByRole('alert')).toContainText('ghost-user')
    await expect(page.getByRole('alert')).toContainText('not found')

    // Retry button should be present
    await expect(
      page.locator('button', { hasText: 'Retry' }),
    ).toBeVisible()
  })

  test('rate limit warning shown when remaining is low', async ({ page }) => {
    // Override the repos route with low rate limit
    await page.route('**/api.github.com/users/*/repos*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'x-ratelimit-remaining': '3',
          'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString(),
        },
        body: JSON.stringify([
          { name: 'chatwizard', full_name: 'Veverke/chatwizard' },
        ]),
      }),
    )

    await page.goto('/#/discover/Veverke')

    // Rate limit warning should appear
    await expect(
      page.locator('.discover__rate-warning'),
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.locator('.discover__rate-warning'),
    ).toContainText('rate limit')
  })

  test('empty state shown when no extensions found', async ({ page }) => {
    // Override repos to return repos without VS Code package.json
    await page.route('**/api.github.com/users/*/repos*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'x-ratelimit-remaining': '57',
          'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString(),
        },
        body: JSON.stringify([
          { name: 'some-website', full_name: 'Veverke/some-website' },
        ]),
      }),
    )

    // Also return non-extension package.json for the only repo
    await page.route('**/api.github.com/repos/Veverke/some-website/contents/package.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: NON_EXTENSION_PKG,
          encoding: 'base64',
        }),
      }),
    )

    await page.goto('/#/discover/NoExtUser')

    // Empty state should appear
    await expect(
      page.locator('.discover__empty'),
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.locator('.discover__empty'),
    ).toContainText('No VS Code extensions found')

    // Back link should be present
    await expect(
      page.locator('.discover__back-link'),
    ).toHaveText('← Try another username')
  })

  test('loading state shows skeleton cards while discovering', async ({ page }) => {
    // Delay the API response to ensure loading state is visible
    await page.route('**/api.github.com/users/*/repos*', async (route) => {
      await new Promise((r) => setTimeout(r, 300))
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'x-ratelimit-remaining': '59',
          'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString(),
        },
        body: JSON.stringify([
          { name: 'chatwizard', full_name: 'Veverke/chatwizard' },
        ]),
      })
    })

    await page.goto('/#/discover/Veverke')

    // Loading indicator should be visible
    await expect(
      page.getByRole('status', { name: 'Discovering extensions' }),
    ).toBeVisible({ timeout: 5000 })

    // Skeleton cards should be present during loading
    const skeletonCards = page.locator('.skeleton-card')
    await expect(skeletonCards.first()).toBeVisible()
  })
})