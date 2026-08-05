import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // Generous timeout: the first tests hit a cold Vite dev server that
  // must compile all JS modules on-demand, which can take >60s.
  timeout: 120_000,
  workers: 2,
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: process.env.CI
      ? 'npx vite preview --port 5173 --strictPort'
      : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
