/**
 * Universal MDX plugin - works with tsup, vite, and rollup
 *
 * Provides a unified interface for MDX compilation across build tools.
 */

import { compileMDX } from './compiler.js'
import type { CompileMDXOptions } from './types.js'

export interface MDXPluginOptions extends Omit<CompileMDXOptions, 'filepath'> {
  /**
   * File extensions to process
   * @default ['.mdx']
   */
  extensions?: string[]

  /**
   * Include pattern (glob)
   */
  include?: string | RegExp | (string | RegExp)[]

  /**
   * Exclude pattern (glob)
   */
  exclude?: string | RegExp | (string | RegExp)[]
}

/**
 * Create a rollup/vite compatible plugin for MDX
 *
 * @example With Vite
 * ```ts
 * import { mdxRollupPlugin } from '@mdxld/jsx/plugin'
 *
 * export default defineConfig({
 *   plugins: [mdxRollupPlugin()],
 * })
 * ```
 *
 * @example With custom JSX runtime
 * ```ts
 * export default defineConfig({
 *   plugins: [mdxRollupPlugin({ jsx: 'preact' })],
 * })
 * ```
 */
export function mdxRollupPlugin(options: MDXPluginOptions = {}) {
  const { extensions = ['.mdx'], include, exclude, ...compileOptions } = options

  const filter = createFilter(extensions)

  return {
    name: 'mdxld-jsx',

    async transform(code: string, id: string) {
      if (!filter(id)) return null

      try {
        const result = await compileMDX(code, {
          ...compileOptions,
          filepath: id,
        })

        return {
          code: result.code,
          map: result.map ? JSON.parse(result.map) : null,
        }
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error))
      }
    },
  }
}

/**
 * Create a tsup plugin for MDX
 *
 * Note: tsup uses esbuild under the hood, so this wraps the esbuild plugin.
 *
 * @example
 * ```ts
 * import { mdxTsupPlugin } from '@mdxld/jsx/plugin'
 *
 * export default defineConfig({
 *   esbuildPlugins: [mdxTsupPlugin()],
 * })
 * ```
 */
export function mdxTsupPlugin(options: MDXPluginOptions = {}) {
  // tsup uses esbuild, so we delegate to the esbuild plugin
  const { mdxPlugin } = require('./esbuild.js') as typeof import('./esbuild.js')
  return mdxPlugin(options)
}

/**
 * Create a vite plugin for MDX
 *
 * This is an alias for mdxRollupPlugin since Vite uses Rollup.
 */
export const mdxVitePlugin = mdxRollupPlugin

/**
 * Create a filter function for file matching
 */
function createFilter(extensions: string[]) {
  const regex = new RegExp(`(${extensions.map((e) => e.replace('.', '\\.')).join('|')})$`)
  return (id: string) => regex.test(id)
}

// Named exports for different runtimes
export function mdxReactPlugin(options: Omit<MDXPluginOptions, 'jsx'> = {}) {
  return mdxRollupPlugin({ ...options, jsx: { importSource: 'react' } })
}

export function mdxPreactPlugin(options: Omit<MDXPluginOptions, 'jsx'> = {}) {
  return mdxRollupPlugin({ ...options, jsx: { importSource: 'preact' } })
}

export function mdxHonoPlugin(options: Omit<MDXPluginOptions, 'jsx'> = {}) {
  return mdxRollupPlugin({ ...options, jsx: { importSource: 'hono/jsx' } })
}

// Default export
export default mdxRollupPlugin
