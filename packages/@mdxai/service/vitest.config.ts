import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/agent/**', // Agent module not yet fully implemented
        'src/__testing__/**', // Testing utilities
        'src/integration/**', // Integration tests
        'src/e2e/**', // E2E tests
      ],
    },
  },
})
