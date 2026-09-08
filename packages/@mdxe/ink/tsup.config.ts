import { defineConfig } from 'tsup'

// ESM only: ink 7 is ESM-only and the package exposes `import` conditions alone.
export default defineConfig({
  entry: ['src/index.ts', 'src/viewer.ts', 'src/bench.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
})
