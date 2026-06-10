import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
    test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'collect/__tests__/**/*.test.ts',
    ],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['collect/**', 'src/**/*.{ts,tsx}'],
      exclude: [
        'collect/__tests__/**',
        'node_modules/**',
        'src/main.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/styles/**',
        'src/types/**',
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
