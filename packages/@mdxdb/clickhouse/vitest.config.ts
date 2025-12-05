import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'sync/**/*.test.ts', 'schema/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
