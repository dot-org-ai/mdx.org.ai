/**
 * Vite Plugin for MDXUI Storybook
 *
 * Watches MDX files and generates stories on the fly.
 */

import type { Plugin, HmrContext } from 'vite'
import { loadMDXFiles, filterWithLayouts } from './loader'
import { generateStory } from './generator'

export interface MDXUIStorybookPluginOptions {
  /** Glob patterns for MDX files */
  include?: string[]
  /** Glob patterns to exclude */
  exclude?: string[]
  /** Category prefix for generated stories */
  categoryPrefix?: string
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Vite plugin for auto-generating Storybook stories from MDX
 *
 * @example
 * ```ts
 * // .storybook/main.ts
 * import { mdxuiStorybookPlugin } from '@mdxui/storybook/plugin'
 *
 * export default {
 *   viteFinal: (config) => {
 *     config.plugins?.push(mdxuiStorybookPlugin({
 *       include: ['examples/sites/**\/*.mdx'],
 *     }))
 *     return config
 *   }
 * }
 * ```
 */
export function mdxuiStorybookPlugin(options: MDXUIStorybookPluginOptions = {}): Plugin {
  const {
    include = ['examples/**/*.mdx', 'content/**/*.mdx'],
    exclude = ['**/node_modules/**'],
    categoryPrefix = 'Examples',
    verbose = false,
  } = options

  const virtualModulePrefix = 'virtual:mdxui-story:'

  // Cache for generated stories
  const storyCache = new Map<string, string>()

  return {
    name: 'mdxui-storybook',

    async buildStart() {
      if (verbose) {
        console.log('[mdxui-storybook] Scanning for MDX files...')
      }

      const files = await loadMDXFiles(include, { exclude })
      const withLayouts = filterWithLayouts(files)

      if (verbose) {
        console.log(`[mdxui-storybook] Found ${withLayouts.length} MDX files with layouts`)
      }

      for (const file of withLayouts) {
        const story = generateStory(file, { categoryPrefix })
        if (story) {
          const moduleId = `${virtualModulePrefix}${file.relativePath}`
          storyCache.set(moduleId, story.content)

          if (verbose) {
            console.log(`[mdxui-storybook] Generated story: ${story.title}`)
          }
        }
      }
    },

    resolveId(id: string) {
      if (id.startsWith(virtualModulePrefix)) {
        return id
      }
      return null
    },

    load(id: string) {
      if (storyCache.has(id)) {
        return storyCache.get(id)
      }
      return null
    },

    handleHotUpdate({ file, server }: HmrContext) {
      if (file.endsWith('.mdx')) {
        // Invalidate cached story and reload
        const moduleId = `${virtualModulePrefix}${file}`
        if (storyCache.has(moduleId)) {
          storyCache.delete(moduleId)

          // Trigger HMR
          const mod = server.moduleGraph.getModuleById(moduleId)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
            return [mod]
          }
        }
      }
      return undefined
    },
  }
}

export default mdxuiStorybookPlugin
