import { defineConfig } from 'tsup'

export default defineConfig([
  // Main library entries
  {
    entry: [
      'src/index.ts',
      'src/server.ts',
      'src/loader.ts',
      'src/test.ts',
      'src/evaluate.ts',
      'src/extract.ts',
      'src/runner.ts',
    ],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['bun', 'bun:test'],
  },
  // CLI entry with shebang
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    external: ['bun', 'bun:test'],
    banner: {
      js: '#!/usr/bin/env bun',
    },
  },
])
