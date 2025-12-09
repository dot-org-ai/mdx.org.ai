import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  dts: false, // VSCode extensions don't need type declarations
  clean: true,
  sourcemap: false, // Disable sourcemaps to reduce package size
  external: ['vscode'],
  // Bundle all dependencies except vscode into the extension
  noExternal: [/^(?!vscode$).*/],
  minify: true,
  target: 'node18',
})
