import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'backgrounds/index': 'src/backgrounds/index.ts',
    'text/index': 'src/text/index.ts',
    'effects/index': 'src/effects/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,
})
