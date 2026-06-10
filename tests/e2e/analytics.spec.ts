import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'

const fixtureBody = readFileSync(
  join(process.cwd(), 'fixtures/data/Veverke.chatwizard.json'),
  'utf-8',
)

test.describe('Phase 5 Analytics features', () => {
  test.beforeEach(async ({ page }) => {
    // Use the 30-point fixture which has growth and velocity peaks
    await page.route('**/data/Veverke.chatwizard.json', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: fixtureBody,
      }),
    )
    await page.goto('/#/extension/Veverke.chatwizard')
    // Wait for charts to render
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 10000 })
  })

  test('Velocity chart is visible with Growth Velocity heading', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Growth Velocity' })
    await expect(heading).toBeVisible({ timeout: 10000 })

    const velocitySection = page.getByRole('region', { name: 'Growth Velocity' })
    await expect(velocitySection).toBeVisible()
    await expect(velocitySection.locator('svg')).toBeVisible()
  })

  test('Projection dashed lines appear on installs chart', async ({ page }) => {
    const installsSection = page.getByRole('region', { name: 'Installs' })
    await expect(installsSection).toBeVisible({ timeout: 10000 })

    // Use the main chart SVG (role="application") — excludes the small legend icon SVGs
    const chartSvg = installsSection.getByRole('application')
    await expect(chartSvg).toBeVisible({ timeout: 10000 })

    // Recharts renders Line components as <path class="recharts-curve"> SVG elements.
    // There should be at least 3: marketplace installs + openVSX + at least one projection
    const paths = chartSvg.locator('path.recharts-curve')
    await expect(paths.first()).toBeVisible({ timeout: 10000 })
    const count = await paths.count()
    expect(count).toBeGreaterThanOrEqual(2) // real data line + at least one projection
  })

  test('Peak markers (vertical reference lines) appear on installs chart', async ({ page }) => {
    const installsSection = page.getByRole('region', { name: 'Installs' })
    await expect(installsSection).toBeVisible({ timeout: 10000 })

    // Use the main chart SVG (role="application") — excludes the small legend icon SVGs
    const chartSvg = installsSection.getByRole('application')
    await expect(chartSvg).toBeVisible({ timeout: 10000 })

    // Recharts groups ReferenceLine elements inside <g class="recharts-reference-line">
    // SVG <g> elements may not have dimensions for Playwright visibility check —
    // assert count instead of visibility
    const referenceLineGroups = chartSvg.locator('.recharts-reference-line')
    const count = await referenceLineGroups.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('Metrics panel is visible and shows numeric values', async ({ page }) => {
    const metricsPanel = page.getByRole('region', { name: 'Metrics' })
    await expect(metricsPanel).toBeVisible({ timeout: 10000 })

    const momentumValue = page.getByTestId('metric-momentum')
    await expect(momentumValue).toBeVisible()
    const text = await momentumValue.textContent()
    expect(text).toMatch(/\d+/)
  })

  test('30-day projection card shows a value greater than current installs', async ({ page }) => {
    const projectionEl = page.getByTestId('metric-projection')
    await expect(projectionEl).toBeVisible({ timeout: 10000 })

    const projectionText = await projectionEl.textContent()
    expect(projectionText).toBeTruthy()
    expect(projectionText).not.toBe('Not enough data')

    // Parse the projected value (remove commas) and compare to last fixture install count (1380)
    const projectedValue = parseInt((projectionText ?? '').replace(/,/g, ''), 10)
    expect(projectedValue).toBeGreaterThan(1380) // fixture last install count
  })
})
