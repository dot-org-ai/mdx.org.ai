/**
 * Views Plugin for Payload CMS
 *
 * Automatically adds card/table toggle to all collections.
 *
 * @example
 * ```ts
 * import { buildConfig } from 'payload'
 * import { viewsPlugin } from '@mdxui/payload/views'
 *
 * export default buildConfig({
 *   plugins: [viewsPlugin()],
 *   collections: [...],
 * })
 * ```
 */

import type { Config, CollectionConfig } from 'payload'
import type { CardViewConfig, ListViewToggleConfig } from './types.js'

/**
 * Plugin options
 */
export interface ViewsPluginOptions {
  /**
   * Default toggle configuration for all collections
   */
  defaults?: ListViewToggleConfig

  /**
   * Default card configuration for all collections
   */
  cardDefaults?: CardViewConfig

  /**
   * Per-collection configuration
   */
  collections?: Record<string, {
    toggle?: ListViewToggleConfig
    card?: CardViewConfig
    /** Disable for this collection */
    disabled?: boolean
  }>

  /**
   * Collections to exclude
   */
  excludeCollections?: string[]

  /**
   * Enable debug logging
   */
  debug?: boolean
}

/**
 * Process a collection to add the custom list view
 */
function processCollection(
  collection: CollectionConfig,
  options: ViewsPluginOptions,
  debug: (msg: string) => void
): CollectionConfig {
  // Check if excluded
  if (options.excludeCollections?.includes(collection.slug)) {
    debug(`Excluding collection: ${collection.slug}`)
    return collection
  }

  // Check collection-specific config
  const collectionConfig = options.collections?.[collection.slug]
  if (collectionConfig?.disabled) {
    debug(`Collection disabled: ${collection.slug}`)
    return collection
  }

  debug(`Processing collection: ${collection.slug}`)

  // Merge configurations
  const toggleConfig: ListViewToggleConfig = {
    ...options.defaults,
    ...collectionConfig?.toggle,
  }

  const cardConfig: CardViewConfig = {
    ...options.cardDefaults,
    ...collectionConfig?.card,
  }

  // Add custom list view component
  return {
    ...collection,
    admin: {
      ...collection.admin,
      components: {
        ...collection.admin?.components,
        views: {
          ...collection.admin?.components?.views,
          list: {
            ...(typeof collection.admin?.components?.views?.list === 'object'
              ? collection.admin?.components?.views?.list
              : {}),
            Component: '@mdxui/payload/views#ListView',
          },
        },
      },
    },
    custom: {
      ...(collection as CollectionConfig & { custom?: Record<string, unknown> }).custom,
      mdxuiViews: {
        toggle: toggleConfig,
        card: cardConfig,
      },
    },
  }
}

/**
 * Views Plugin
 *
 * Adds card/table toggle to all collections automatically.
 *
 * @example Basic usage
 * ```ts
 * viewsPlugin()
 * ```
 *
 * @example With custom defaults
 * ```ts
 * viewsPlugin({
 *   defaults: {
 *     defaultMode: 'card',
 *     cardThreshold: 4,
 *   },
 *   cardDefaults: {
 *     size: 'medium',
 *   },
 * })
 * ```
 *
 * @example Per-collection config
 * ```ts
 * viewsPlugin({
 *   collections: {
 *     media: {
 *       toggle: { defaultMode: 'card' },
 *       card: { imageField: 'url' },
 *     },
 *     users: { disabled: true },
 *   },
 * })
 * ```
 */
export function viewsPlugin(options: ViewsPluginOptions = {}) {
  const debug = options.debug
    ? (msg: string) => console.log(`[@mdxui/payload/views] ${msg}`)
    : () => {}

  return (config: Config): Config => {
    debug('Initializing views plugin')

    const newConfig = { ...config }

    // Process all collections
    if (newConfig.collections) {
      newConfig.collections = newConfig.collections.map((collection) =>
        processCollection(collection, options, debug)
      )
    }

    debug('Views plugin initialization complete')

    return newConfig
  }
}

export default viewsPlugin
