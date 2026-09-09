import { defineConfig } from 'vitest/config'

/**
 * Node pool: URL parsing, resolution, the DO provider against an in-process
 * fake stub, and the contract suite on the memory and filesystem providers.
 *
 * The workers pool (vitest.workers.config.ts) runs the same contract against
 * the real @mdxdb/do Durable Object inside workerd.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['test/workers/**', '**/node_modules/**'],
  },
})
