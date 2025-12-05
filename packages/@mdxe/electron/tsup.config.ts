import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/main.ts', 'src/preload.ts', 'src/renderer.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['electron'],
})
