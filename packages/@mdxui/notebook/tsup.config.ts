import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/components/index.ts',
    'src/execution/index.ts',
    'src/outputs/index.ts',
    'src/hooks/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,
})
