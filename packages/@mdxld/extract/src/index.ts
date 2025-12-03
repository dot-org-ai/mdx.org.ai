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
 * - **Diff utilities**: Track changes between original and extracted data
 * - **Template validation**: Check if templates are extractable
 * - **AI-assisted extraction**: Fall back to AI for complex patterns (conditionals, loops)
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
 * ## Diff and Apply
 *
 * @example
 * ```ts
 * import { extract, diff, applyExtract } from '@mdxld/extract'
 *
 * const original = { title: 'Hello', content: 'Original' }
 * const extracted = extract({ template, rendered: editedMarkdown })
 *
 * const changes = diff(original, extracted.data)
 * console.log(changes.modified) // { title: { from: 'Hello', to: 'Updated' } }
 *
 * const merged = applyExtract(original, extracted.data)
 * ```
 *
 * @packageDocumentation
 */

// Core extraction
export {
  extract,
  extractWithAI,
  parseTemplateSlots,
  validateTemplate,
  type ExtractOptions,
  type ExtractResult,
  type ExtractDebugInfo,
  type TemplateSlot,
} from './extract.js'

// Component utilities
export {
  roundTripComponent,
  type ComponentExtractor,
} from './extract.js'

// Diff utilities
export {
  diff,
  applyExtract,
  type ExtractDiff,
} from './extract.js'

// Errors
export {
  ExtractError,
} from './extract.js'
