import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'charts/index': 'src/charts/index.ts',
    'blocks/index': 'src/blocks/index.ts',
    'ui/index': 'src/ui/index.ts',
    'templates/index': 'src/templates/index.ts',
  },
  format: ['esm', 'cjs'],
  // DTS disabled until TypeScript composite projects are set up
  dts: false,
  clean: true,
  external: ['react', 'react-dom', 'hono', '@mdxui/jsx', '@mdxui/headless'],
  treeshake: true,
})
