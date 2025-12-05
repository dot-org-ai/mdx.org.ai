/**
 * esbuild plugin for MDX files
 *
 * Compiles .mdx files to JavaScript with JSX runtime support.
 * Works with React, Preact, Hono/JSX via bundler aliases.
 */

import { readFile } from 'node:fs/promises'
import { compileMDX } from './compiler.js'
import type { CompileMDXOptions } from './types.js'
import type { Plugin, OnLoadArgs, OnLoadResult } from 'esbuild'

export interface MDXPluginOptions extends Omit<CompileMDXOptions, 'filepath'> {
  /**
   * File extensions to process
   * @default ['.mdx']
   */
  extensions?: string[]
}

/**
 * Create an esbuild plugin for MDX files
 *
 * @example Basic usage (React)
 * ```ts
 * import { mdxPlugin } from '@mdxld/jsx/esbuild'
 *
 * await esbuild.build({
 *   plugins: [mdxPlugin()],
 * })
 * ```
 *
 * @example With Preact
 * ```ts
 * await esbuild.build({
 *   plugins: [mdxPlugin({ jsx: 'preact' })],
 *   alias: { 'react': 'preact/compat' },
 * })
 * ```
 *
 * @example With Hono/JSX
 * ```ts
 * await esbuild.build({
 *   plugins: [mdxPlugin({ jsx: 'hono' })],
 * })
 * ```
 */
export function mdxPlugin(options: MDXPluginOptions = {}): Plugin {
  const { extensions = ['.mdx'], ...compileOptions } = options

  return {
    name: 'mdxld-jsx',
    setup(build) {
      // Filter for MDX files
      const filter = new RegExp(`(${extensions.map((e) => e.replace('.', '\\.')).join('|')})$`)

      build.onLoad({ filter }, async (args: OnLoadArgs): Promise<OnLoadResult> => {
        const content = await readFile(args.path, 'utf-8')

        try {
          const result = await compileMDX(content, {
            ...compileOptions,
            filepath: args.path,
          })

          return {
            contents: result.code,
            loader: 'jsx',
            warnings: result.warnings.map((text) => ({ text })),
          }
        } catch (error) {
          return {
            errors: [
              {
                text: error instanceof Error ? error.message : String(error),
                location: { file: args.path },
              },
            ],
          }
        }
      })
    },
  }
}

/**
 * Create an esbuild plugin configured for React
 */
export function mdxReactPlugin(options: Omit<MDXPluginOptions, 'jsx'> = {}): Plugin {
  return mdxPlugin({ ...options, jsx: { importSource: 'react' } })
}

/**
 * Create an esbuild plugin configured for Preact
 */
export function mdxPreactPlugin(options: Omit<MDXPluginOptions, 'jsx'> = {}): Plugin {
  return mdxPlugin({ ...options, jsx: { importSource: 'preact' } })
}

/**
 * Create an esbuild plugin configured for Hono/JSX
 */
export function mdxHonoPlugin(options: Omit<MDXPluginOptions, 'jsx'> = {}): Plugin {
  return mdxPlugin({ ...options, jsx: { importSource: 'hono/jsx' } })
}

// Default export
export default mdxPlugin
