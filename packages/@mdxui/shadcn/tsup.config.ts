import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    themes: 'src/themes/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', '@mdxui/jsx', '@mdxui/jsx/primitives', '@mdxui/radix', '@mdxui/vaul', '@mdxui/cmdk', '@mdxui/sonner'],
  banner: {
    js: '"use client";',
  },
})
