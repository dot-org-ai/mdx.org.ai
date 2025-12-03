import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/components.tsx', 'src/hono.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['fumadocs-core', 'fumadocs-ui', 'next', 'react', 'mdxld', '@mdxdb/fumadocs', 'hono'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'hono/jsx'
  },
})
