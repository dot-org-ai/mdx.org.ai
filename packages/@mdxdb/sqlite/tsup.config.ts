import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'durable-object': 'src/durable-object.ts',
    client: 'src/client.ts',
    miniflare: 'src/miniflare.ts',
    sync: 'src/sync.ts',
    types: 'src/types.ts',
    schema: 'schema/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['miniflare'],
})
