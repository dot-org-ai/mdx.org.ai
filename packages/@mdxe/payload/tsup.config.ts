import { defineConfig } from 'tsup'

export default defineConfig([
  // Library builds
  {
    entry: {
      index: 'src/index.ts',
      worker: 'src/worker.ts',
      config: 'src/config.ts',
      generate: 'src/generate.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: [
      'payload',
      '@mdxdb/payload',
      '@mdxdb/sqlite',
      '@mdxdb/clickhouse',
      'mdxld',
      'miniflare',
    ],
  },
  // CLI build (ESM only, bundled)
  {
    entry: {
      cli: 'src/cli.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: [
      'miniflare',
      'payload',
    ],
  },
])
