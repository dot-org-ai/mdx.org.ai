/**
 * @mdxui/storybook
 *
 * Auto-generate Storybook stories from MDXLD documents.
 *
 * ## Features
 *
 * - Scan directories for MDX files with Site/App layouts
 * - Extract layout props and generate stories automatically
 * - Support for multiple layout types (Scalar, Sonic, Lumen, Dusk, Mist, etc.)
 * - Vite plugin for hot-reload during development
 *
 * ## Usage
 *
 * ```ts
 * // .storybook/main.ts
 * import { mdxuiStorybookPlugin } from '@mdxui/storybook/plugin'
 *
 * export default {
 *   // ...
 *   viteFinal: (config) => {
 *     config.plugins.push(mdxuiStorybookPlugin({
 *       include: ['examples/sites/**\/*.mdx'],
 *     }))
 *     return config
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

export { generateStory, generateStories, generateStoriesIndex, type StoryGeneratorOptions, type GeneratedStory } from './generator'
export { parseLayoutFromMDX, type LayoutInfo } from './parser'
export { loadMDXFiles, filterWithLayouts, groupByCategory, groupByLayout, type MDXFile, type LoadOptions } from './loader'
export { LAYOUT_MAPPING, type LayoutType } from './layouts'

// Dynamic story creation from site registries
export {
  createSiteStoryModule,
  createSiteStories,
  createCombinedSiteStories,
  getLayoutComponent,
  type SiteEntry,
  type CreateSiteStoriesOptions,
  type GeneratedStoryModule,
} from './createSiteStories'

// Generator functions for CLI/scripts
export {
  generateSiteStoryContent,
  generateStoriesFromRegistry,
  generateCombinedStoriesFile,
  type SiteEntry as RegistrySiteEntry,
  type GenerateOptions,
} from './generateFromRegistry'
