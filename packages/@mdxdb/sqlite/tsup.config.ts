import { defineConfig } from 'tsup'

export default defineConfig([
  // Main build with code splitting
  {
    entry: {
      index: 'src/index.ts',
      'durable-object': 'src/durable-object.ts',
      client: 'src/client.ts',
      types: 'src/types.ts',
      schema: 'src/schema/index.ts',
      // package.json exports "./miniflare" -> dist/miniflare.js; without this entry the
      // subpath resolves to nothing and the SQLite fallback in @mdxdb/api and @mdxdb/rpc
      // integration tests fails to load.
      miniflare: 'src/miniflare.ts',
    },
    format: ['esm', 'cjs'],
    dts: false,
    clean: true,
    sourcemap: true,
    external: ['miniflare', 'cloudflare:workers', '@mdxe/isolate'],
  },
  // Bundled durable-object for miniflare
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
      options.external = ['cloudflare:workers', '@mdxe/isolate']
    },
  },
])
