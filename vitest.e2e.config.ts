import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 60000,
  },
  resolve: {
    alias: {
      // Core packages
      'mdxld': path.resolve(__dirname, 'packages/mdxld/src/index.ts'),
      'mdxe': path.resolve(__dirname, 'packages/mdxe/src/index.ts'),
      'mdxdb': path.resolve(__dirname, 'packages/mdxdb/src/index.ts'),
      'mdxui': path.resolve(__dirname, 'packages/mdxui/src/index.ts'),
      'mdxai': path.resolve(__dirname, 'packages/mdxai/src/index.ts'),

      // @mdxe packages
      '@mdxe/hono': path.resolve(__dirname, 'packages/@mdxe/hono/src/index.ts'),
      '@mdxe/ink': path.resolve(__dirname, 'packages/@mdxe/ink/src/index.ts'),

      // @mdxui packages
      '@mdxui/markdown': path.resolve(__dirname, 'packages/@mdxui/markdown/src/index.ts'),

      // @mdxdb packages
      '@mdxdb/fs': path.resolve(__dirname, 'packages/@mdxdb/fs/src/index.ts'),
      '@mdxdb/sqlite': path.resolve(__dirname, 'packages/@mdxdb/sqlite/src/index.ts'),
      '@mdxdb/api': path.resolve(__dirname, 'packages/@mdxdb/api/src/index.ts'),

      // @mdxai packages
      '@mdxai/claude': path.resolve(__dirname, 'packages/@mdxai/claude/src/index.ts'),
    },
  },
})
