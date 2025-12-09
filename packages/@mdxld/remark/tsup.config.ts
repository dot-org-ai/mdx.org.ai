import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/typescript.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['remark', 'typescript'],
})
