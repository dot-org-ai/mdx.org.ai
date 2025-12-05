/**
 * @mdxui/payload - Custom Payload CMS UI components for MDX-LD
 *
 * This package provides enhanced UI components for editing MDX-LD content
 * in Payload CMS. The plugin automatically replaces all JSON fields with
 * the MDXLD editor - no manual configuration needed.
 *
 * @example Basic Usage - All JSON fields become MDXLD editors
 * ```ts
 * import { buildConfig } from 'payload'
 * import { mdxldPlugin } from '@mdxui/payload'
 *
 * export default buildConfig({
 *   plugins: [mdxldPlugin()],
 *   collections: [...]
 * })
 * ```
 *
 * @example Opt-in Mode - Only specific fields
 * ```ts
 * mdxldPlugin({ optIn: true })
 *
 * // Then in your collection:
 * {
 *   name: 'content',
 *   type: 'json',
 *   custom: { mdxld: true }, // This field gets the MDXLD editor
 * }
 * ```
 *
 * @example With Exclusions
 * ```ts
 * mdxldPlugin({
 *   exclude: ['settings', 'rawConfig'],
 *   excludeCollections: ['system-logs'],
 * })
 * ```
 *
 * @example Opt-out Specific Fields
 * ```ts
 * // In your collection:
 * {
 *   name: 'rawData',
 *   type: 'json',
 *   custom: { mdxld: false }, // Keeps default JSON editor
 * }
 * ```
 *
 * @packageDocumentation
 */

export const name = '@mdxui/payload'

// Plugin - the main export (overrides JSON fields)
export { mdxldPlugin, default as plugin } from './plugin.js'
export type { MDXLDPluginOptions } from './plugin.js'

// Views plugin (adds card/table toggle)
export { viewsPlugin } from './views/viewsPlugin.js'
export type { ViewsPluginOptions } from './views/viewsPlugin.js'

// Components - for manual usage
export { MDXLDEditor } from './components/MDXLDEditor.js'
export { MDXLDJSONField, MDXLDJSONCell } from './components/MDXLDJSONField.js'

// View components
export { CardView } from './views/CardView.js'
export { ListView } from './views/ListView.js'
export { ViewToggle } from './views/ViewToggle.js'

// Types
export type {
  MDXLDDocument,
  EditorMode,
  EditorTheme,
  MDXLDEditorProps,
  MDXLDJSONFieldProps,
  ValidationError,
  ValidationResult,
} from './types.js'

/**
 * Helper to create a JSON field config with MDXLD editor
 *
 * Use this when you want explicit control over individual fields
 * instead of using the plugin.
 *
 * @example
 * ```ts
 * import { createMDXLDField } from '@mdxui/payload'
 *
 * const fields = [
 *   createMDXLDField({
 *     name: 'content',
 *     label: 'Content',
 *     required: true,
 *   }),
 * ]
 * ```
 */
export function createMDXLDField(options: {
  name: string
  label?: string
  description?: string
  required?: boolean
  defaultValue?: unknown
  editorMode?: 'yaml' | 'json' | 'mdx' | 'split'
}) {
  return {
    name: options.name,
    type: 'json' as const,
    label: options.label,
    required: options.required,
    defaultValue: options.defaultValue,
    admin: {
      description: options.description,
      components: {
        Field: '@mdxui/payload/components#MDXLDJSONField',
        Cell: '@mdxui/payload/components#MDXLDJSONCell',
      },
    },
    custom: {
      mdxld: true,
      editorMode: options.editorMode || 'split',
    },
  }
}
