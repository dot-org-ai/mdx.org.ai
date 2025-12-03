import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
    functions: 'src/functions.ts',
    database: 'src/database.ts',
    workflows: 'src/workflows.ts',
  },
  format: ['esm', 'cjs'],
  dts: {
    resolve: [
      // Don't resolve optional peer dependencies - they're re-exported as-is
      'ai-functions',
      'ai-database',
      'ai-workflows',
    ],
  },
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  skipNodeModulesBundle: true,
  external: [
    'ai-functions',
    'ai-database',
    'ai-workflows',
  ],
})
