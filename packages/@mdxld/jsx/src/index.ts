/**
 * @mdxld/jsx - JSX types and MDX compilation for MDXLD
 *
 * Default JSX runtime is Hono/JSX. Also supports React and Preact.
 *
 * ## JSX Types (Hono default)
 *
 * ```ts
 * import type { FC, HtmlEscapedString } from '@mdxld/jsx'
 * import { jsxRenderer, jsx, Fragment } from '@mdxld/jsx'
 * ```
 *
 * ## MDX Compilation
 *
 * ```ts
 * import { compileMDX } from '@mdxld/jsx'
 *
 * // Hono (default)
 * const result = await compileMDX(content)
 *
 * // React
 * const result = await compileMDX(content, { jsx: 'react' })
 *
 * // Preact
 * const result = await compileMDX(content, { jsx: 'preact' })
 * ```
 *
 * ## Build Plugins
 *
 * ```ts
 * import { mdxVitePlugin } from '@mdxld/jsx/plugin'
 * import { mdxPlugin } from '@mdxld/jsx/esbuild'
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Hono JSX Types (default runtime)
// =============================================================================

export type { FC, PropsWithChildren, Child, JSXNode } from 'hono/jsx'
export type { HtmlEscapedString } from 'hono/utils/html'
export { jsxRenderer } from 'hono/jsx-renderer'
export { jsx, Fragment } from 'hono/jsx'

/**
 * Props for MDXLD renderer components
 */
export interface MDXLDRendererProps {
  title?: string
  description?: string
  jsonld?: Record<string, unknown>
  children: unknown
  head?: unknown
  className?: string
}

/**
 * Props for MDXLD document components
 */
export interface MDXLDDocumentProps {
  frontmatter?: Record<string, unknown>
  children: unknown
  Layout?: import('hono/jsx').FC
}

// =============================================================================
// MDX Compiler
// =============================================================================

export { compileMDX, compileMDXBatch } from './compiler.js'

export type {
  CompileMDXOptions,
  CompileMDXResult,
  MDXLDFrontmatter,
  JSXRuntime,
  JSXPreset,
} from './types.js'

export { JSX_PRESETS } from './types.js'

// =============================================================================
// Build Plugins
// =============================================================================

export {
  mdxRollupPlugin,
  mdxVitePlugin,
  mdxTsupPlugin,
  mdxReactPlugin,
  mdxPreactPlugin,
  mdxHonoPlugin,
} from './plugin.js'
