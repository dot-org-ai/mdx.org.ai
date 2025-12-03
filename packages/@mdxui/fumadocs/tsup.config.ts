import { defineConfig } from 'tsup'

export default defineConfig([
  // React components (index.ts and components.tsx)
  {
    entry: ['src/index.ts', 'src/components.tsx'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['fumadocs-core', 'fumadocs-ui', 'next', 'react', 'mdxld', '@mdxdb/fumadocs'],
    esbuildOptions(options) {
      options.jsx = 'automatic'
    },
  },
  // Hono JSX components (separate build with Hono JSX runtime)
  {
    entry: ['src/hono.tsx'],
    format: ['esm', 'cjs'],
    dts: false, // Skip DTS - types conflict between Hono and React JSX
    clean: false, // Don't clean on second build
    sourcemap: true,
    external: ['fumadocs-core', 'fumadocs-ui', 'next', 'react', 'mdxld', '@mdxdb/fumadocs', 'hono'],
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.jsxImportSource = 'hono/jsx'
    },
  },
])
