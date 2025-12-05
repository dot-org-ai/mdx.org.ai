/**
 * Custom list views for Payload CMS
 *
 * @example Add to all collections automatically
 * ```ts
 * import { viewsPlugin } from '@mdxui/payload/views'
 *
 * export default buildConfig({
 *   plugins: [viewsPlugin()],
 * })
 * ```
 *
 * @packageDocumentation
 */

// Plugin
export { viewsPlugin, default as viewsPluginDefault } from './viewsPlugin.js'
export type { ViewsPluginOptions } from './viewsPlugin.js'

// Components
export { CardView, default as CardViewDefault } from './CardView.js'
export { ViewToggle, default as ViewToggleDefault } from './ViewToggle.js'
export { ListView, default as ListViewDefault } from './ListView.js'

// Types
export type {
  ListViewMode,
  CardSize,
  CardViewConfig,
  ListViewToggleConfig,
  ListViewProps,
  CardData,
} from './types.js'
