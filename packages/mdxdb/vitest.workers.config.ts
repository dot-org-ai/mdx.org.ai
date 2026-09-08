import { fileURLToPath } from 'node:url'
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url))

/**
 * Workers pool: the contract suite and the CLAUDE.md example run inside
 * workerd via @cloudflare/vitest-pool-workers against the real
 * `@mdxdb/do` MDXDurableObject declared in wrangler.test.jsonc.
 *
 * Workspace siblings resolve to their *sources* so the suite exercises the
 * current code without a prior `pnpm build` of @mdxdb/do, @mdxdb/sqlite or
 * @mdxdb/parquet. The DO's code-execution path (compile/call/meta/render)
 * is overridden to throw in @mdxdb/do, so @mdxe/isolate is stubbed.
 */
export default defineWorkersConfig({
  resolve: {
    alias: [
      { find: /^@mdxdb\/do\/durable-object$/, replacement: here('../@mdxdb/do/src/durable-object.ts') },
      { find: /^@mdxdb\/do$/, replacement: here('../@mdxdb/do/src/index.ts') },
      { find: /^@mdxdb\/sqlite\/durable-object$/, replacement: here('../@mdxdb/sqlite/src/durable-object.ts') },
      { find: /^@mdxdb\/sqlite\/types$/, replacement: here('../@mdxdb/sqlite/src/types.ts') },
      { find: /^@mdxdb\/sqlite$/, replacement: here('../@mdxdb/sqlite/src/index.ts') },
      { find: /^@mdxdb\/parquet$/, replacement: here('../@mdxdb/parquet/src/index.ts') },
      { find: /^@mdxe\/isolate$/, replacement: here('./test/stubs/mdxe-isolate.ts') },
    ],
  },
  test: {
    include: ['test/workers/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.test.jsonc' },
        // Isolated storage cannot snapshot SQLite-backed DOs on this pool
        // (WAL side-files fail its `.sqlite` suffix assertion — see
        // mdx-8je.23 / mdx-82u). Storage is shared for the run; every test
        // uses a fresh DO name instead.
        isolatedStorage: false,
      },
    },
  },
})
