import { defineConfig } from 'tsup'

export default defineConfig([
  // Library build
  {
    entry: {
      index: 'src/index.ts',
      types: 'src/types.ts',
      'commands/deploy': 'src/commands/deploy.ts',
      'cloudflare/api': 'src/cloudflare/api.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['mdxld'],
  },
  // CLI build
  {
    entry: {
      cli: 'src/cli.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    external: ['mdxld'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
])
