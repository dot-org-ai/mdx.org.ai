/**
 * Payload Plugin for MDXLD
 *
 * Automatically replaces all JSON fields with the MDXLD editor.
 *
 * @example
 * ```ts
 * import { buildConfig } from 'payload'
 * import { mdxldPlugin } from '@mdxui/payload'
 *
 * export default buildConfig({
 *   plugins: [mdxldPlugin()],
 *   collections: [...],
 * })
 * ```
 */

import type { Config, Field, CollectionConfig, GlobalConfig } from 'payload'
import type { EditorMode } from './types.js'

/**
 * Plugin options
 */
export interface MDXLDPluginOptions {
  /**
   * Only apply to fields with custom.mdxld = true
   * When false (default), ALL JSON fields get the MDXLD editor
   * @default false
   */
  optIn?: boolean

  /**
   * Default editor mode for all JSON fields
   * @default 'split'
   */
  defaultMode?: EditorMode

  /**
   * Fields to exclude by name (supports glob patterns)
   * @example ['settings', 'config.*']
   */
  exclude?: string[]

  /**
   * Collections to exclude entirely
   */
  excludeCollections?: string[]

  /**
   * Globals to exclude entirely
   */
  excludeGlobals?: string[]

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean
}

/**
 * Check if a field name matches any exclude pattern
 */
function matchesExclude(name: string, path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple glob matching
    if (pattern === name) return true
    if (pattern === path) return true
    if (pattern.endsWith('*') && (name.startsWith(pattern.slice(0, -1)) || path.startsWith(pattern.slice(0, -1)))) {
      return true
    }
    if (pattern.startsWith('*') && (name.endsWith(pattern.slice(1)) || path.endsWith(pattern.slice(1)))) {
      return true
    }
  }
  return false
}

/**
 * Recursively process fields and replace JSON fields with MDXLD editor
 */
function processFields(
  fields: Field[],
  options: MDXLDPluginOptions,
  path: string = '',
  debug: (msg: string) => void
): Field[] {
  return fields.map((field) => {
    // Get field name if it exists (some fields like collapsible, row don't have names)
    const fieldName = 'name' in field ? (field as { name: string }).name : ''
    const fieldPath = path && fieldName ? `${path}.${fieldName}` : fieldName || path

    // Handle group, array, and other container fields
    if ('fields' in field && Array.isArray((field as { fields: Field[] }).fields)) {
      const containerField = field as { fields: Field[] }
      return {
        ...field,
        fields: processFields(containerField.fields, options, fieldPath, debug),
      } as Field
    }

    // Handle tabs
    if (field.type === 'tabs' && 'tabs' in field) {
      const tabsField = field as { tabs: Array<{ fields: Field[] }> }
      return {
        ...field,
        tabs: tabsField.tabs.map((tab) => ({
          ...tab,
          fields: processFields(tab.fields, options, fieldPath, debug),
        })),
      } as Field
    }

    // Handle blocks
    if (field.type === 'blocks' && 'blocks' in field) {
      const blocksField = field as { blocks: Array<{ slug: string; fields: Field[] }> }
      return {
        ...field,
        blocks: blocksField.blocks.map((block) => ({
          ...block,
          fields: processFields(block.fields, options, `${fieldPath}.${block.slug}`, debug),
        })),
      } as Field
    }

    // Only process JSON fields (they always have a name)
    if (field.type !== 'json') {
      return field
    }

    // JSON fields always have a name
    const jsonField = field as Field & { name: string; admin?: { components?: Record<string, unknown> }; custom?: Record<string, unknown> }

    // Check exclusion
    if (options.exclude && matchesExclude(jsonField.name, fieldPath, options.exclude)) {
      debug(`Excluding field: ${fieldPath}`)
      return field
    }

    // Check opt-in mode
    if (options.optIn) {
      if (!jsonField.custom?.mdxld) {
        debug(`Skipping field (opt-in mode): ${fieldPath}`)
        return field
      }
    }

    // Check if field explicitly opts out
    if (jsonField.custom?.mdxld === false) {
      debug(`Skipping field (opted out): ${fieldPath}`)
      return field
    }

    debug(`Converting JSON field to MDXLD: ${fieldPath}`)

    // Get editor mode from custom config or use default
    const editorMode = (jsonField.custom?.editorMode as EditorMode) || options.defaultMode || 'split'

    // Return the modified field with MDXLD components
    return {
      ...jsonField,
      admin: {
        ...(jsonField.admin || {}),
        components: {
          ...(jsonField.admin?.components || {}),
          Field: '@mdxui/payload/components#MDXLDJSONField',
          Cell: '@mdxui/payload/components#MDXLDJSONCell',
        },
      },
      custom: {
        ...jsonField.custom,
        mdxld: true,
        editorMode,
      },
    } as Field
  })
}

/**
 * Process a collection config
 */
function processCollection(
  collection: CollectionConfig,
  options: MDXLDPluginOptions,
  debug: (msg: string) => void
): CollectionConfig {
  // Check if collection is excluded
  if (options.excludeCollections?.includes(collection.slug)) {
    debug(`Excluding collection: ${collection.slug}`)
    return collection
  }

  debug(`Processing collection: ${collection.slug}`)

  return {
    ...collection,
    fields: processFields(collection.fields, options, '', debug),
  }
}

/**
 * Process a global config
 */
function processGlobal(
  global: GlobalConfig,
  options: MDXLDPluginOptions,
  debug: (msg: string) => void
): GlobalConfig {
  // Check if global is excluded
  if (options.excludeGlobals?.includes(global.slug)) {
    debug(`Excluding global: ${global.slug}`)
    return global
  }

  debug(`Processing global: ${global.slug}`)

  return {
    ...global,
    fields: processFields(global.fields, options, '', debug),
  }
}

/**
 * MDXLD Plugin for Payload CMS
 *
 * Automatically replaces all JSON fields with the MDXLD editor.
 *
 * @example Basic usage - all JSON fields become MDXLD editors
 * ```ts
 * import { buildConfig } from 'payload'
 * import { mdxldPlugin } from '@mdxui/payload'
 *
 * export default buildConfig({
 *   plugins: [mdxldPlugin()],
 * })
 * ```
 *
 * @example Opt-in mode - only fields with custom.mdxld = true
 * ```ts
 * mdxldPlugin({ optIn: true })
 * ```
 *
 * @example With exclusions
 * ```ts
 * mdxldPlugin({
 *   exclude: ['settings', 'rawConfig'],
 *   excludeCollections: ['system-logs'],
 * })
 * ```
 *
 * @example Opt-out specific fields
 * ```ts
 * // In your collection:
 * {
 *   name: 'rawData',
 *   type: 'json',
 *   custom: { mdxld: false }, // Keeps default JSON editor
 * }
 * ```
 */
export function mdxldPlugin(options: MDXLDPluginOptions = {}) {
  const debug = options.debug
    ? (msg: string) => console.log(`[@mdxui/payload] ${msg}`)
    : () => {}

  return (config: Config): Config => {
    debug('Initializing MDXLD plugin')

    const newConfig = { ...config }

    // Process all collections
    if (newConfig.collections) {
      newConfig.collections = newConfig.collections.map((collection) =>
        processCollection(collection, options, debug)
      )
    }

    // Process all globals
    if (newConfig.globals) {
      newConfig.globals = newConfig.globals.map((global) =>
        processGlobal(global, options, debug)
      )
    }

    debug('MDXLD plugin initialization complete')

    return newConfig
  }
}

export default mdxldPlugin
