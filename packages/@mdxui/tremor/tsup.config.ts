import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'charts/index': 'src/charts/index.ts',
    'blocks/index': 'src/blocks/index.ts',
    'templates/index': 'src/templates/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', '@tremor/react'],
  treeshake: true,
})
