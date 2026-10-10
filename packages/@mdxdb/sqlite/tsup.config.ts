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
      miniflare: 'src/miniflare.ts',
    },
    format: ['esm', 'cjs'],
    // Emitted .d.ts files refer to the ambient DurableObjectNamespace / SqlStorage /
    // Rpc globals, so carry the workers-types reference so consumers (mdxai) resolve
    // them without configuring `types` themselves. rollup-plugin-dts drops a source-
    // level triple-slash directive, hence the banner.
    dts: { banner: '/// <reference types="@cloudflare/workers-types" />' },
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
