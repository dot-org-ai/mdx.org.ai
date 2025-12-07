/**
 * @mdxe/honox/vite - Vite plugin for HonoX + MDXLD integration
 *
 * Provides a Vite plugin that configures HonoX with MDXLD support,
 * including frontmatter processing and JSON-LD context handling.
 *
 * @packageDocumentation
 */

import type { MDXLDVitePluginOptions } from './types.js'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'

// Generic type for Vite plugins to avoid version conflicts
type VitePlugin = {
  name: string
  enforce?: 'pre' | 'post'
  [key: string]: unknown
}

// Type for unified plugins
type PluggableList = unknown[]

/**
 * Remark plugin to process MDXLD-specific frontmatter
 *
 * Transforms JSON-LD properties ($type, $id, $context) in frontmatter
 * to a standardized format for consumption in components.
 */
function remarkMdxldFrontmatter() {
  return (tree: unknown, file: { data: { frontmatter?: Record<string, unknown> } }) => {
    const frontmatter = file.data.frontmatter
    if (!frontmatter) return

    // Extract JSON-LD properties
    const ldProps: Record<string, unknown> = {}

    if (frontmatter.$type) {
      ldProps['@type'] = frontmatter.$type
      delete frontmatter.$type
    }
    if (frontmatter.$id) {
      ldProps['@id'] = frontmatter.$id
      delete frontmatter.$id
    }
    if (frontmatter.$context) {
      ldProps['@context'] = frontmatter.$context
      delete frontmatter.$context
    }

    // Add ld property if we found any JSON-LD properties
    if (Object.keys(ldProps).length > 0) {
      frontmatter._ld = ldProps
    }
  }
}

/**
 * Create MDXLD Vite plugin for HonoX
 *
 * This plugin configures MDX compilation with:
 * - YAML frontmatter parsing (remark-frontmatter)
 * - Frontmatter export (remark-mdx-frontmatter)
 * - MDXLD-specific frontmatter processing
 * - Hono JSX integration
 *
 * @param options - Plugin options
 * @returns Array of Vite plugins (MDX plugin + MDXLD plugin)
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import honox from 'honox/vite'
 * import { mdxld } from '@mdxe/honox/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     honox(),
 *     ...mdxld()
 *   ]
 * })
 * ```
 */
export function mdxld(options: MDXLDVitePluginOptions = {}): unknown[] {
  const {
    jsonld = true,
    remarkPlugins = [],
    rehypePlugins = [],
    jsxImportSource = 'hono/jsx',
    providerImportSource,
  } = options

  // Build remark plugins list
  const allRemarkPlugins: PluggableList = [
    remarkFrontmatter,
    [remarkMdxFrontmatter, { name: 'frontmatter' }],
    ...(jsonld ? [remarkMdxldFrontmatter] : []),
    ...remarkPlugins,
  ]

  // Create a lazy plugin that loads MDX
  const mdxldPlugin: VitePlugin = {
    name: '@mdxe/honox:mdxld',
    enforce: 'pre',
  }

  // Return a promise that resolves to the plugins array
  const lazyMdxPlugin = (async (): Promise<unknown> => {
    try {
      const mdxModule = await import('@mdx-js/rollup')
      const mdx = mdxModule.default as (options: Record<string, unknown>) => unknown

      return mdx({
        jsxImportSource,
        providerImportSource,
        remarkPlugins: allRemarkPlugins,
        rehypePlugins,
      })
    } catch {
      console.warn('@mdxe/honox: @mdx-js/rollup not found. MDX files will not be processed.')
      return null
    }
  })()

  return [lazyMdxPlugin, mdxldPlugin]
}

/**
 * Create a complete Vite configuration for HonoX + MDXLD
 *
 * This is a convenience function that returns a full Vite config
 * with HonoX and MDXLD plugins pre-configured.
 *
 * @param honoXOptions - HonoX Vite plugin options
 * @param mdxldOptions - MDXLD plugin options
 * @returns Vite configuration object
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import { createMdxldConfig } from '@mdxe/honox/vite'
 *
 * export default defineConfig(createMdxldConfig())
 * ```
 */
export async function createMdxldConfig(
  honoXOptions: Record<string, unknown> = {},
  mdxldOptions: MDXLDVitePluginOptions = {}
): Promise<{ plugins: unknown[] }> {
  // Dynamically import honox
  const honoxModule = await import('honox/vite')
  const honox = honoxModule.default as (options: Record<string, unknown>) => unknown

  return {
    plugins: [honox(honoXOptions), ...mdxld(mdxldOptions)],
  }
}

/**
 * Get the default remark plugins for MDXLD processing
 *
 * Useful when you need to customize the MDX pipeline but still
 * want MDXLD frontmatter processing.
 *
 * @param options - Plugin options
 * @returns Array of remark plugins
 */
export function getDefaultRemarkPlugins(options: { jsonld?: boolean } = {}): PluggableList {
  const { jsonld = true } = options

  return [remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }], ...(jsonld ? [remarkMdxldFrontmatter] : [])]
}

export default mdxld
