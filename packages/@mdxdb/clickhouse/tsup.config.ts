import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'schema/index.ts',
    'schema/migrate.ts',
    'sync/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['chdb'], // Optional peer dependency
})
