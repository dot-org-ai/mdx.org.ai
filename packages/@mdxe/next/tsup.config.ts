import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/widgets.ts', 'src/app.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
})
