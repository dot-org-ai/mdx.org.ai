import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'sync/**/*.test.ts', 'schema/**/*.test.ts', 'tests/**/*.test.ts'],
    globalSetup: ['./tests/setup.ts'],
    // Increase timeout for tests that need ClickHouse
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
