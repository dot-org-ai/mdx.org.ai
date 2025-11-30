import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      'mdxld': path.resolve(__dirname, '../../mdxld/src/index.ts'),
      'mdxdb': path.resolve(__dirname, '../../mdxdb/src/index.ts'),
      '@mdxdb/fumadocs': path.resolve(__dirname, '../../@mdxdb/fumadocs/src/index.ts'),
    },
  },
})
