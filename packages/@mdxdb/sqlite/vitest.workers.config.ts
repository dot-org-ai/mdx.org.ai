import { fileURLToPath } from 'node:url'
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url))

/**
 * Workers pool: Durable Object tests run inside workerd via
 * @cloudflare/vitest-pool-workers, with the MDXDatabase class declared
 * in wrangler.test.jsonc (SQLite-backed DO + a Worker Loader binding).
 */
export default defineWorkersConfig({
  resolve: {
    alias: [
      // Optional peer, dynamically imported by the code-execution path
      // (compile/call/meta/render). Resolved to workspace *sources* so the
      // suite exercises the real compiler without requiring `pnpm build`
      // of @mdxe/isolate or its mdxld dependency first.
      { find: /^@mdxe\/isolate$/, replacement: here('../../@mdxe/isolate/src/index.ts') },
      { find: /^mdxld$/, replacement: here('../../mdxld/src/index.ts') },
    ],
  },
  test: {
    include: ['tests/workers/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.test.jsonc' },
        // Isolated storage is unusable with SQLite-backed DOs on this pool:
        // the stack push/pop copies every file under the DO's persist dir and
        // asserts a `.sqlite` suffix, so a WAL side-file (`-shm`/`-wal`) still
        // present after abortAllDurableObjects() aborts the run ("Expected
        // .sqlite, got ....sqlite-shm"). Re-checked 2026-09-08: the assertion
        // is unchanged through 0.12.21 (the last release supporting vitest 2/3);
        // 0.13+ requires vitest ^4.1. Storage is therefore shared for the run
        // and each test uses its own DO name instead. See mdx-8je.23 / mdx-82u.
        isolatedStorage: false,
      },
    },
  },
})
