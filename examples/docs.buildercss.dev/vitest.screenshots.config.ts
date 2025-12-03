import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/screenshots.test.ts'],
    testTimeout: 60000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
