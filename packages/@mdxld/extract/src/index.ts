/**
 * @mdxld/extract - Bi-directional MDX ↔ Markdown translation
 *
 * Extract structured data from rendered markdown using MDX templates.
 * Enables round-trip editing where changes to rendered content can be
 * synced back to the source MDX/frontmatter.
 *
 * ## Key Features
 *
 * - **Pattern-based extraction**: Convert templates to regex patterns for fast extraction
 * - **Component extractors**: Define custom render/extract pairs for components
 * - **Diff, apply and 3-way merge**: `@mdxld/diff`'s path primitives, re-exported as
 *   `diff` / `applyExtract` / `mergeExtract` (one diff implementation in the repo)
 * - **Template validation**: Check if templates are extractable
 * - **AI-assisted extraction**: `extractWithAI` puts the slots the matcher cannot reverse
 *   (conditionals, loops, components without an extractor) to `ai-functions` `generateObject`
 *
 * ## Basic Usage
 *
 * @example
 * ```ts
 * import { extract } from '@mdxld/extract'
 *
 * const result = extract({
 *   template: '# {data.title}\n\n{data.content}',
 *   rendered: '# Hello\n\nWorld'
 * })
 *
 * console.log(result.data)
 * // { data: { title: 'Hello', content: 'World' } }
 * ```
 *
 * ## Round-Trip Components
 *
 * @example
 * ```ts
 * import { roundTripComponent } from '@mdxld/extract'
 *
 * const Table = roundTripComponent({
 *   render: (props) => `| ${props.headers.join(' | ')} |\n...`,
 *   extract: (content) => parseMarkdownTable(content)
 * })
 *
 * // Now Table can be rendered AND reversed
 * const rendered = Table.render(props)
 * const extracted = Table.extract(rendered)
 * ```
 *
 * ## Diff, Apply and 3-Way Merge
 *
 * @example
 * ```ts
 * import { extract, diff, applyExtract, mergeExtract } from '@mdxld/extract'
 *
 * const original = { title: 'Hello', content: 'Original' }
 * const extracted = extract({ template, rendered: editedMarkdown })
 *
 * const changes = diff(original, extracted.data)
 * console.log(changes.modified) // { title: { from: 'Hello', to: 'Updated' } }
 *
 * const merged = applyExtract(original, extracted.data)
 *
 * // When the record changed too since the markdown was rendered:
 * const { merged: both, conflicts } = mergeExtract(original, currentRecord, extracted.data)
 * ```
 *
 * @packageDocumentation
 */

// Core extraction
export {
  extract,
  extractWithAI,
  expressionPath,
  parseTemplateSlots,
  validateTemplate,
  type ExtractOptions,
  type ExtractWithAIOptions,
  type AIGenerate,
  type AIGenerateArgs,
  type ExtractResult,
  type ExtractDebugInfo,
  type TemplateSlot,
} from './extract.js'

// Component utilities
export {
  roundTripComponent,
  type ComponentExtractor,
} from './extract.js'

// Diff, apply and 3-way merge (implemented once, in @mdxld/diff)
export {
  diff,
  applyExtract,
  mergeExtract,
  type ExtractDiff,
  type MergeExtractOptions,
} from './extract.js'
export type { ObjectMergeResult, ObjectConflict, ApplyPathsOptions } from '@mdxld/diff'

// Errors
export {
  ExtractError,
} from './extract.js'

// Entity components for relationship rendering/extraction
export {
  createEntityComponent,
  getEntityComponent,
  createEntityExtractors,
  parseMarkdownTable,
  renderMarkdownTable,
  renderMarkdownList,
  diffEntities,
  type EntityItem,
  type EntityComponentProps,
  type EntityRenderOptions,
  type ExtractedEntities,
  type RelationshipChange,
} from './entity.js'
