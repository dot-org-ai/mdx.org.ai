import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    fixtures: 'src/fixtures.ts',
    mocks: 'src/mocks.ts',
    matchers: 'src/matchers.ts',
    ports: 'src/ports.ts',
    timing: 'src/timing.ts',
    logging: 'src/logging.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['vitest', 'miniflare'],
})
