import { test, expect } from '@playwright/test'

test('app loads', async ({ page }) => {
  await page.goto('/')
  const body = page.locator('body')
  await expect(body).toBeVisible()
  const content = await body.innerHTML()
  expect(content.length).toBeGreaterThan(0)
})
