import { defineConfig } from 'vitest/config'

/**
 * Repo-level invariants (workspace layout, dependency policy).
 * Run with `pnpm test:repo`; chained into `pnpm test` and `pnpm test:unit`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/repo/**/*.test.ts'],
  },
})
