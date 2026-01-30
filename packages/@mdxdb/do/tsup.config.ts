import { defineConfig } from 'tsup'

export default defineConfig([
  // Main build with code splitting
  {
    entry: {
      index: 'src/index.ts',
      'durable-object': 'src/durable-object.ts',
      client: 'src/client.ts',
      types: 'src/types.ts',
      hierarchy: 'src/hierarchy.ts',
      'hibernatable-ws': 'src/hibernatable-ws.ts',
      'parquet-export': 'src/parquet-export.ts',
      schema: 'src/schema/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: false,
    clean: true,
    sourcemap: true,
    external: ['cloudflare:workers', '@mdxdb/sqlite', '@mdxdb/parquet', '@mdxe/isolate', 'rpc.do'],
  },
  // Bundled durable-object for deployment
  {
    entry: {
      'durable-object.bundled': 'src/durable-object.ts',
    },
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    splitting: false,
    noExternal: [/^(?!cloudflare:).*/],
    bundle: true,
    esbuildOptions(options) {
      options.mainFields = ['module', 'main']
      options.external = ['cloudflare:workers', '@mdxdb/parquet', '@mdxe/isolate', 'rpc.do']
    },
  },
])
