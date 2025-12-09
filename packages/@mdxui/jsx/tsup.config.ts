import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
    hono: 'src/hono.ts',
    'hooks/index': 'src/hooks/index.ts',
    'hooks/hono': 'src/hooks/hono.ts',
    'primitives/index': 'src/primitives/index.ts',
    'utils/index': 'src/utils/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'hono'],
  treeshake: true,
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'react'
  },
})
