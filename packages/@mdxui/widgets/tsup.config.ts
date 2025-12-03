import { defineConfig } from 'tsup'
import { resolve } from 'path'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    chatbox: 'src/components/chatbox/index.ts',
    editor: 'src/components/editor/index.ts',
    searchbox: 'src/components/searchbox/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next-themes', 'next', 'next/image', 'next/link'],
  esbuildOptions(options) {
    options.alias = {
      '@': resolve(__dirname, 'src'),
    }
  },
  banner: {
    js: '"use client";',
  },
})
