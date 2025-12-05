import { defineConfig } from 'tsup'
import { mdxPlugin } from '@mdxld/jsx/esbuild'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
  esbuildPlugins: [mdxPlugin()],
  onSuccess: async () => {
    // Copy CSS and SVG assets to dist
    mkdirSync(join(__dirname, 'dist'), { recursive: true })
    mkdirSync(join(__dirname, 'dist/assets'), { recursive: true })
    copyFileSync(
      join(__dirname, 'src/ontology.css'),
      join(__dirname, 'dist/ontology.css')
    )
    copyFileSync(
      join(__dirname, 'src/assets/org-ai.svg'),
      join(__dirname, 'dist/assets/org-ai.svg')
    )
    console.log('Assets copied to dist/')
  },
})
