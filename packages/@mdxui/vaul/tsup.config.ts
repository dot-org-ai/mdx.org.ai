import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', '@mdxui/jsx', '@mdxui/radix'],
  banner: {
    js: '"use client";',
  },
})
