import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'cloudflare:workers': new URL('./mocks/cloudflare-workers.ts', import.meta.url).pathname,
    },
  },
})
