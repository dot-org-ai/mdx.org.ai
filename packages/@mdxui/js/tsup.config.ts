import { defineConfig } from 'tsup'
import { readdirSync } from 'fs'
import { join } from 'path'

/**
 * Get all component files for individual bundling
 */
function getComponentEntries() {
  try {
    const componentsDir = join(__dirname, 'src/components')
    const files = readdirSync(componentsDir)

    return files
      .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
      .filter(file => file !== 'index.ts')
      .reduce((entries, file) => {
        const name = file.replace(/\.(ts|tsx)$/, '')
        entries[`components/${name}`] = `src/components/${file}`
        return entries
      }, {} as Record<string, string>)
  } catch {
    return {}
  }
}

export default defineConfig([
  // Main library build (for npm package consumers)
  {
    entry: {
      index: 'src/index.ts',
      'runtime/index': 'src/runtime/index.ts',
      'components/index': 'src/components/index.ts',
      'hooks/index': 'src/hooks/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    external: ['hono'],
    treeshake: true,
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.jsxImportSource = 'hono/jsx/dom'
    },
  },
  // Browser bundles for Cloudflare Worker static assets
  {
    entry: {
      // Runtime bundle (minimal hydration runtime with Hono JSX DOM)
      runtime: 'src/runtime/index.ts',
      // Individual component bundles (tree-shaken)
      ...getComponentEntries(),
    },
    format: ['esm'],
    dts: false,
    clean: false,
    outDir: 'dist',
    // Bundle Hono JSX DOM into runtime (no external deps in browser)
    external: [],
    noExternal: ['hono'],
    treeshake: true,
    splitting: false,
    minify: true,
    target: 'es2020',
    platform: 'browser',
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.jsxImportSource = 'hono/jsx/dom'
    },
  },
])
