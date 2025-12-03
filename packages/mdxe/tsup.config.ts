import { defineConfig } from 'tsup'

export default defineConfig([
  // Library build
  {
    entry: {
      index: 'src/index.ts',
      types: 'src/types.ts',
      sdk: 'src/sdk.ts',
      'sdk-provider': 'src/sdk-provider.ts',
      'commands/deploy': 'src/commands/deploy.ts',
      'cloudflare/api': 'src/cloudflare/api.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: [
      'mdxld',
      'mdxdb',
      '@mdxdb/fs',
      '@mdxdb/sqlite',
      '@mdxdb/postgres',
      '@mdxdb/mongo',
      '@mdxdb/clickhouse',
      'ai-sandbox',
      'ai-functions',
      'ai-workflows',
    ],
  },
  // CLI build
  {
    entry: {
      cli: 'src/cli.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    external: [
      'mdxld',
      'mdxdb',
      '@mdxdb/fs',
      '@mdxdb/sqlite',
      '@mdxdb/postgres',
      '@mdxdb/mongo',
      '@mdxdb/clickhouse',
      'ai-sandbox',
      'ai-functions',
      'ai-workflows',
    ],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
])
