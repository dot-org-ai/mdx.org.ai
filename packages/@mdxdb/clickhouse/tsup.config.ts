import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/worker.ts',
    'src/server.ts',
    'schema/index.ts',
    'schema/migrate.ts',
    'sync/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [], // No external dependencies
})
