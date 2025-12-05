import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/index': 'src/components/index.ts',
    'templates/index': 'src/templates/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', '@mantine/core', '@mantine/hooks'],
  treeshake: true,
})
