/**
 * @mdxld/markdown
 *
 * Bi-directional conversion between Objects and Markdown.
 * Convention-based automatic layouts from object structure.
 *
 * Diffing and merging of the objects that come back out is not this package's job:
 * `diffPaths` / `applyPaths` / `merge3wayObjects` live in `@mdxld/diff` (the one diff
 * implementation in the repo, mdx-8je.12) and `@mdxld/extract` re-exports them as
 * `diff` / `applyExtract` / `mergeExtract`.
 */

import type { DocumentFormat, FormatFetchOptions } from '@mdxld/types'
import { isTableRow, isTableSeparator, parseTable, renderTable } from './table.js'

export {
  parseTable,
  renderTable,
  isTableRow,
  isTableSeparator,
  cellText,
  type MarkdownTable,
  type RenderTableOptions,
} from './table.js'

export interface ToMarkdownOptions {
  /** Starting heading depth (default: 1) */
  headingDepth?: number
  /** Include table of contents */
  toc?: boolean
  /** Use frontmatter for metadata */
  frontmatter?: boolean
  /** Table style: 'github' | 'simple' */
  tableStyle?: 'github' | 'simple'
  /** List style: 'dash' | 'asterisk' | 'plus' */
  listStyle?: 'dash' | 'asterisk' | 'plus'
}

export interface FromMarkdownOptions {
  /** Expected type for validation */
  type?: string
  /** Strict mode - throw on parse errors */
  strict?: boolean
}

/**
 * Convert an object to Markdown using convention-based layout.
 *
 * @example
 * ```ts
 * const md = toMarkdown({
 *   name: 'Customer',
 *   properties: [{ name: 'email', type: 'string' }]
 * })
 * ```
 */
export function toMarkdown<T extends object>(
  object: T,
  options: ToMarkdownOptions = {}
): string {
  const { headingDepth = 1, tableStyle = 'github', listStyle = 'dash' } = options

  // Detect object shape and apply conventions
  const lines: string[] = []

  // Handle named entities (has 'name' property)
  if ('name' in object && typeof object.name === 'string') {
    const prefix = '#'.repeat(headingDepth)
    lines.push(`${prefix} ${object.name}`)
    lines.push('')
  }

  // Handle description
  if ('description' in object && typeof object.description === 'string') {
    lines.push(object.description)
    lines.push('')
  }

  // Handle properties array
  if ('properties' in object && Array.isArray(object.properties)) {
    const props = object.properties as Array<{
      name: string
      type?: string
      required?: boolean
      description?: string
    }>

    if (tableStyle === 'github') {
      lines.push(
        renderTable(
          ['Property', 'Type', 'Required', 'Description'],
          props.map((prop) => [prop.name, prop.type || '', prop.required ? '✓' : '', prop.description || '']),
          { separator: 'padded' }
        )
      )
    } else {
      for (const prop of props) {
        const bullet = listStyle === 'dash' ? '-' : listStyle === 'asterisk' ? '*' : '+'
        lines.push(`${bullet} **${prop.name}**${prop.type ? ` (${prop.type})` : ''}: ${prop.description || ''}`)
      }
    }
    lines.push('')
  }

  // Handle sections/children
  if ('sections' in object && Array.isArray(object.sections)) {
    for (const section of object.sections as Array<{ name: string; content?: string }>) {
      const prefix = '#'.repeat(headingDepth + 1)
      lines.push(`${prefix} ${section.name}`)
      lines.push('')
      if (section.content) {
        lines.push(section.content)
        lines.push('')
      }
    }
  }

  // Handle items/list
  if ('items' in object && Array.isArray(object.items)) {
    const bullet = listStyle === 'dash' ? '-' : listStyle === 'asterisk' ? '*' : '+'
    for (const item of object.items) {
      lines.push(`${bullet} ${String(item)}`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * Extract an object from Markdown using convention-based parsing.
 *
 * @example
 * ```ts
 * const obj = fromMarkdown<Customer>(markdown)
 * ```
 */
export function fromMarkdown<T = Record<string, unknown>>(
  markdown: string,
  _options: FromMarkdownOptions = {}
): T {
  const result: Record<string, unknown> = {}
  const lines = markdown.split('\n')

  let currentSection: string | null = null
  const sections: Array<{ name: string; content: string }> = []
  const properties: Array<{ name: string; type?: string; required?: boolean; description?: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // Parse headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()

      if (level === 1 && !result.name) {
        result.name = text
      } else {
        if (currentSection) {
          sections.push({ name: currentSection, content: '' })
        }
        currentSection = text
      }
      continue
    }

    // Parse a table: the contiguous run of `|` rows starting here, through the shared primitive
    if (isTableRow(line) && !isTableSeparator(line)) {
      let end = i + 1
      while (end < lines.length && isTableRow(lines[end]!)) end++
      const { headers, rows } = parseTable(lines.slice(i, end).join('\n'))
      const byLowerHeader = (row: Record<string, string>, name: string): string | undefined => {
        const header = headers.find((h) => h.toLowerCase() === name)
        return header === undefined ? undefined : row[header]
      }
      for (const row of rows) {
        const cells = headers.map((h) => row[h] ?? '')
        const prop: { name: string; type?: string; required?: boolean; description?: string } = {
          name: cells[0] || '',
        }
        const type = byLowerHeader(row, 'type')
        if (type) prop.type = type
        const required = byLowerHeader(row, 'required')
        if (required !== undefined) {
          prop.required = required === '✓' || required.toLowerCase() === 'yes'
        }
        const description = byLowerHeader(row, 'description')
        if (description) prop.description = description
        properties.push(prop)
      }
      i = end - 1
      continue
    }

    // Parse list items
    const listMatch = line.match(/^[-*+]\s+(.+)$/)
    if (listMatch && listMatch[1]) {
      if (!result.items) {
        result.items = []
      }
      ;(result.items as string[]).push(listMatch[1])
      continue
    }

    // Regular paragraph (could be description)
    if (line.trim() && !result.description && !currentSection) {
      result.description = line.trim()
    }
  }

  if (properties.length > 0) {
    result.properties = properties
  }

  if (sections.length > 0) {
    result.sections = sections
  }

  return result as T
}

// ============================================================================
// Fetch
// ============================================================================

/**
 * Fetch Markdown from URL and parse.
 *
 * @example
 * ```ts
 * const doc = await fetchMarkdown('https://example.com/README.md')
 * ```
 */
export async function fetchMarkdown<T = Record<string, unknown>>(
  url: string,
  options: FormatFetchOptions & FromMarkdownOptions = {}
): Promise<T> {
  const { headers: requestHeaders, timeout, fetch: customFetch, ...parseOptions } = options
  const fetchFn = customFetch ?? globalThis.fetch

  const controller = new AbortController()
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined

  try {
    const response = await fetchFn(url, {
      headers: requestHeaders,
      signal: controller.signal as AbortSignal,
    } as RequestInit)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    return fromMarkdown<T>(text, parseOptions)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ============================================================================
// Format Object
// ============================================================================

/**
 * Markdown Format object implementing the standard Format interface.
 *
 * @example
 * ```ts
 * import { Markdown } from '@mdxld/markdown'
 *
 * const data = Markdown.parse('# Title\n\nContent')
 * const str = Markdown.stringify(data)
 * const remote = await Markdown.fetch('https://example.com/README.md')
 * ```
 */
export const Markdown: DocumentFormat<Record<string, unknown>, FromMarkdownOptions, ToMarkdownOptions> = {
  name: 'markdown',
  mimeTypes: ['text/markdown', 'text/x-markdown'] as const,
  extensions: ['md', 'markdown', 'mdx'] as const,
  parse: fromMarkdown,
  stringify: toMarkdown,
  fetch: fetchMarkdown,
  extractMeta(input: string): Record<string, unknown> {
    // Extract YAML frontmatter if present
    const match = input.match(/^---\n([\s\S]*?)\n---\n/)
    if (match && match[1]) {
      try {
        // Simple YAML parsing for frontmatter
        const lines = match[1].split('\n')
        const meta: Record<string, unknown> = {}
        for (const line of lines) {
          const colonIndex = line.indexOf(':')
          if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim()
            const value = line.slice(colonIndex + 1).trim()
            meta[key] = value
          }
        }
        return meta
      } catch {
        return {}
      }
    }
    return {}
  },
}

// Default export
export default Markdown
