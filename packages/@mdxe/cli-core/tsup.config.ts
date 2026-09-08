import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    context: 'src/context.ts',
    caller: 'src/caller.ts',
    errors: 'src/errors.ts',
    tokens: 'src/tokens.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  // The optional, lazily imported precise-BPE backend: never bundled, never required at install.
  external: ['js-tiktoken'],
})
