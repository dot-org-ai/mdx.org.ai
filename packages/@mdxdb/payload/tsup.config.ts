import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    sqlite: 'src/sqlite.ts',
    clickhouse: 'src/clickhouse.ts',
    collections: 'src/collections.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: [
    'payload',
    '@mdxdb/sqlite',
    '@mdxdb/clickhouse',
  ],
})
