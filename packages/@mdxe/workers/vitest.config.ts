import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 30000,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@mdxe/test-utils': resolve(__dirname, '../test-utils/src'),
    },
  },
})
