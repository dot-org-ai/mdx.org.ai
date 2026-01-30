import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/runtime.ts',
    'src/build-entry.ts',
    'src/local.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    // Node.js modules are external for the runtime build
    'node:fs',
    'node:path',
    'node:crypto',
    'node:os',
    'node:child_process',
    // Miniflare is external - dynamically imported in local.ts
    'miniflare',
  ],
})
