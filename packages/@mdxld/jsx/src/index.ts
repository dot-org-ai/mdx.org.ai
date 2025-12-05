/**
 * @mdxld/jsx - MDX compilation and build tooling
 *
 * Provides JSX-runtime agnostic MDX compilation for React, Preact, and Hono/JSX.
 *
 * ## Key Features
 * - Compile MDX files to JavaScript
 * - Support for React, Preact, Hono/JSX via automatic JSX runtime
 * - esbuild/tsup/vite plugins
 * - TypeScript type generation from MDX frontmatter
 *
 * ## Basic Usage
 *
 * ```ts
 * import { compileMDX } from '@mdxld/jsx'
 *
 * const result = await compileMDX(mdxContent)
 * console.log(result.code)
 * ```
 *
 * ## With Different Runtimes
 *
 * ```ts
 * // React (default)
 * const result = await compileMDX(content)
 *
 * // Preact
 * const result = await compileMDX(content, { jsx: 'preact' })
 *
 * // Hono/JSX
 * const result = await compileMDX(content, { jsx: 'hono' })
 * ```
 *
 * ## Build Plugins
 *
 * ```ts
 * // esbuild
 * import { mdxPlugin } from '@mdxld/jsx/esbuild'
 *
 * // Vite/Rollup
 * import { mdxVitePlugin } from '@mdxld/jsx/plugin'
 *
 * // tsup
 * import { mdxTsupPlugin } from '@mdxld/jsx/plugin'
 * ```
 *
 * ## Runtime Agnostic Builds
 *
 * For maximum compatibility, compile without specifying a runtime:
 *
 * ```ts
 * const result = await compileMDX(content, {
 *   jsx: { importSource: undefined }
 * })
 * ```
 *
 * Then consumers can use bundler aliases:
 * - React: (default, no config needed)
 * - Preact: `alias: { 'react': 'preact/compat' }`
 * - Hono: `alias: { 'react': 'hono/jsx' }`
 *
 * @packageDocumentation
 */

// Core compiler
export { compileMDX, compileMDXBatch } from './compiler.js'

// Types
export type {
  CompileMDXOptions,
  CompileMDXResult,
  MDXLDFrontmatter,
  JSXRuntime,
  JSXPreset,
} from './types.js'

// JSX presets
export { JSX_PRESETS } from './types.js'

// Plugin re-exports for convenience
export {
  mdxRollupPlugin,
  mdxVitePlugin,
  mdxTsupPlugin,
  mdxReactPlugin,
  mdxPreactPlugin,
  mdxHonoPlugin,
} from './plugin.js'
