import { fileURLToPath } from 'node:url'
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

/**
 * Workers pool: Durable Object tests run inside workerd via
 * @cloudflare/vitest-pool-workers, with the MDXDatabase class declared
 * in wrangler.test.jsonc (SQLite-backed DO).
 */
export default defineWorkersConfig({
  resolve: {
    alias: {
      // Optional peer, only dynamically imported by the code-execution path.
      // Aliased to a throwing stub so the pool does not require the workspace
      // package to be built (see tests/workers/stubs/mdxe-isolate.ts).
      '@mdxe/isolate': fileURLToPath(
        new URL('./tests/workers/stubs/mdxe-isolate.ts', import.meta.url)
      ),
    },
  },
  test: {
    include: ['tests/workers/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.test.jsonc' },
        // The pool's isolated-storage stack cannot snapshot SQLite-backed DOs
        // reliably ("Expected .sqlite, got ....sqlite-shm" on pop), so storage
        // is shared for the run and each test uses its own DO name instead.
        isolatedStorage: false,
      },
    },
  },
})
