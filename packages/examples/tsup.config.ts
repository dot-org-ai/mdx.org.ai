import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'sites/agentic': 'src/sites/agentic.tsx',
    'sites/api-ht': 'src/sites/api-ht.tsx',
    'sites/db-ht': 'src/sites/db-ht.tsx',
    'sites/scrape': 'src/sites/scrape.tsx',
    'sites/workflow': 'src/sites/workflow.tsx',
    'sites/headless': 'src/sites/headless.tsx',
    'sites/advertis': 'src/sites/advertis.tsx',
    'sites/markt': 'src/sites/markt.tsx',
  },
  format: ['esm', 'cjs'],
  dts: false, // Skip DTS for now - layouts are still being developed
  clean: true,
  external: ['react', '@mdxui/*'],
  splitting: true,
  target: 'es2022',
})
