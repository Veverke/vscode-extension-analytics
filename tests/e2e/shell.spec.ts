import { test, expect } from '@playwright/test'

test.describe('App shell', () => {
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
    const firstLink = nav.getByRole('link').first()
    const linkText = await firstLink.textContent()
    await firstLink.click()
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
    // Intercept the extensions fetch and delay it by 500ms
    await page.route('**/data/extensions.json', async route => {
      await new Promise<void>(resolve => setTimeout(resolve, 500))
      await route.continue()
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
