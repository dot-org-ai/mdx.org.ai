import { defineConfig } from 'vitest/config'

/**
 * Node pool: pure-JS tests (schema, client wrapper).
 *
 * Durable Object tests import `cloudflare:workers`, which only workerd
 * provides, so they live under tests/workers/ and run through
 * vitest.workers.config.ts (@cloudflare/vitest-pool-workers).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/workers/**'],
  },
})
