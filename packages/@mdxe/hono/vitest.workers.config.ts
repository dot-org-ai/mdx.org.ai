import { fileURLToPath } from 'node:url'
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url))

/**
 * Workers pool: the text registers (mdx-8je.18) are served from workerd via
 * @cloudflare/vitest-pool-workers, so the response headers are verified in
 * the runtime that serves them in production — not only under node.
 *
 * `@mdxe/cli-core` resolves to its sources so the suite exercises the token
 * oracle as written without a prior build. `mdxld` and `@mdxui/text` resolve
 * through their package exports.
 */
export default defineWorkersConfig({
  resolve: {
    alias: [
      { find: /^@mdxe\/cli-core\/tokens$/, replacement: here('../cli-core/src/tokens.ts') },
      { find: /^@mdxe\/cli-core\/errors$/, replacement: here('../cli-core/src/errors.ts') },
      { find: /^@mdxe\/cli-core$/, replacement: here('../cli-core/src/index.ts') },
      // The optional precise backend is absent here by design: see test/stubs/js-tiktoken.ts.
      { find: /^js-tiktoken$/, replacement: here('./test/stubs/js-tiktoken.ts') },
    ],
  },
  test: {
    include: ['test/workers/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.test.jsonc' },
      },
    },
  },
})
