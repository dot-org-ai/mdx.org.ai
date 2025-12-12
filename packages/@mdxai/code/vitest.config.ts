import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/dist/**',
        '**/node_modules/**',
        'src/test-setup.ts',
        // CLI entry points that parse argv - tested via commander integration
        'src/cli/index.ts',
        'src/cli/run.ts',
        'src/cli/watch.ts',
        'src/cli/list.ts',
        // Process spawn - requires real process execution
        'src/runner/spawn.ts',
        'src/runner/index.ts',
        // Re-exports only
        'src/index.ts',
        'src/types.ts',
      ],
    },
  },
})
