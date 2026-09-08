import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Builds workspace packages that published deps link back to (mdxld) when
    // their dist is missing, so the suite is green in a fresh install without a
    // prior `pnpm build`. See tests/setup/ensure-workspace-built.ts.
    globalSetup: ['./tests/setup/ensure-workspace-built.ts'],
  },
})
