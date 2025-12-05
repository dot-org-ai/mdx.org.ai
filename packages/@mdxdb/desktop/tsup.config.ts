import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/main.ts', 'src/renderer.ts', 'src/preload.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['electron', 'mdxld'],
})
