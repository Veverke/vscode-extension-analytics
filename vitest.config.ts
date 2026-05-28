import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'collect/__tests__/**/*.test.ts',
    ],
    environmentMatchGlobs: [['collect/__tests__/**', 'node']],
    coverage: {
      provider: 'v8',
      include: ['collect/**'],
      exclude: [
        'collect/__tests__/**',
        'node_modules/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
})
