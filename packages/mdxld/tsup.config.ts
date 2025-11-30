import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ast: 'src/ast.ts',
    compile: 'src/compile.ts',
    types: 'src/types.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
})
