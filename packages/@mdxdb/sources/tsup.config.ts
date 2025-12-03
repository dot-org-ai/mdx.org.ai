import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    rest: 'src/rest.ts',
    graphql: 'src/graphql.ts',
    scraper: 'src/scraper.ts',
    jsonld: 'src/jsonld.ts',
    csv: 'src/csv.ts',
    cache: 'src/cache.ts',
    proxy: 'src/proxy.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  external: ['mdxdb', 'playwright'],
})
