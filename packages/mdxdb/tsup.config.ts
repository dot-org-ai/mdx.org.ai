import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    tests: 'src/tests.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  // Adapters are optional peers loaded on demand; never bundle them.
  external: [
    'ai-database',
    'vitest',
    '@mdxdb/fs',
    '@mdxdb/clickhouse',
    '@mdxdb/api',
    '@mdxdb/api/db',
    '@mdxdb/do',
    'cloudflare:workers',
  ],
})
