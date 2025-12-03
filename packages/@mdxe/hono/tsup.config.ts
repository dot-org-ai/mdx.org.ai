import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/server.ts',
    'src/templates.ts',
    'src/styles.ts',
    'src/analytics.ts',
    'src/widgets.ts',
    'src/format.ts',
    'src/jsx.tsx',
    'src/fumadocs.css.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'hono/jsx'
  },
})
