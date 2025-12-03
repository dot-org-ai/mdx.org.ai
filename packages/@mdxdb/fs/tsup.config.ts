import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    database: 'src/database.ts',
    types: 'src/types.ts',
  },
  format: ['esm', 'cjs'],
  // DTS temporarily disabled due to ai-database dependency in provider.ts
  // Enable when ai-database types are available in workspace
  dts: false,
  clean: true,
  sourcemap: true,
  external: ['mdxdb', 'mdxld', '@mdxld/extract', 'ai-database'],
})
