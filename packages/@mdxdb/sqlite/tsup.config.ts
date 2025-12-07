import { defineConfig } from 'tsup'

export default defineConfig([
  // Main build with code splitting for npm package
  {
    entry: {
      index: 'src/index.ts',
      'durable-object': 'src/durable-object.ts',
      client: 'src/client.ts',
      miniflare: 'src/miniflare.ts',
      sync: 'src/sync.ts',
      types: 'src/types.ts',
      schema: 'src/schema/index.ts',
    },
    format: ['esm', 'cjs'],
    // DTS disabled - requires significant refactoring for @cloudflare/workers-types v4
    // The new workers-types requires Rpc.DurableObjectBranded and index signatures
    dts: false,
    clean: true,
    sourcemap: true,
    external: ['miniflare', 'cloudflare:workers'],
  },
  // Bundled durable-object for miniflare (no code splitting)
  {
    entry: {
      'durable-object.bundled': 'src/durable-object.ts',
    },
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    splitting: false,
    // Bundle everything except cloudflare:workers (provided by runtime)
    noExternal: [/^(?!cloudflare:).*/],
    bundle: true,
    esbuildOptions(options) {
      options.mainFields = ['module', 'main']
      options.external = ['cloudflare:workers']
    },
  },
])
