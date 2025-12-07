import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/vite.ts', 'src/server.ts', 'src/client.ts', 'src/renderer.tsx'],
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      skipLibCheck: true,
    },
  },
  clean: true,
  sourcemap: true,
  external: ['hono', 'honox', 'vite', '@mdx-js/rollup'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'hono/jsx'
  },
})
