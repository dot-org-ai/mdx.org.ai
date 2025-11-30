import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
])
