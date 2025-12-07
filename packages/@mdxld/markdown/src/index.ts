/**
 * @mdxld/markdown
 *
 * Bi-directional conversion between Objects and Markdown.
 * Convention-based automatic layouts from object structure.
 */

import type { DocumentFormat, FormatFetchOptions } from '@mdxld/types'

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

export interface DiffResult {
  added: Record<string, unknown>
  modified: Record<string, { from: unknown; to: unknown }>
  removed: string[]
  hasChanges: boolean
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
      lines.push('| Property | Type | Required | Description |')
      lines.push('|----------|------|----------|-------------|')
      for (const prop of props) {
        const req = prop.required ? '✓' : ''
        lines.push(`| ${prop.name} | ${prop.type || ''} | ${req} | ${prop.description || ''} |`)
      }
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
  let inTable = false
  let tableHeaders: string[] = []

  for (const line of lines) {
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
      inTable = false
      continue
    }

    // Parse table headers
    if (line.includes('|') && !inTable) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
      if (cells.length > 0 && !line.includes('---')) {
        tableHeaders = cells.map((c) => c.toLowerCase())
        inTable = true
        continue
      }
    }

    // Skip table separator
    if (line.match(/^\|[\s-|]+\|$/)) {
      continue
    }

    // Parse table rows
    if (inTable && line.includes('|')) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
      if (cells.length > 0) {
        const prop: { name: string; type?: string; required?: boolean; description?: string } = {
          name: cells[0] || '',
        }
        if (tableHeaders.includes('type') && cells[1]) {
          prop.type = cells[1]
        }
        if (tableHeaders.includes('required') && cells[2]) {
          prop.required = cells[2] === '✓' || cells[2].toLowerCase() === 'yes'
        }
        if (tableHeaders.includes('description') && cells[3]) {
          prop.description = cells[3]
        }
        properties.push(prop)
      }
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

/**
 * Compute the diff between original and extracted data.
 *
 * @example
 * ```ts
 * const changes = diff(original, updated)
 * if (changes.hasChanges) {
 *   console.log('Modified:', Object.keys(changes.modified))
 * }
 * ```
 */
export function diff<T extends object>(original: T, extracted: T): DiffResult {
  const added: Record<string, unknown> = {}
  const modified: Record<string, { from: unknown; to: unknown }> = {}
  const removed: string[] = []

  const origKeys = new Set(Object.keys(original))
  const extractedKeys = new Set(Object.keys(extracted))

  // Find added keys
  for (const key of extractedKeys) {
    if (!origKeys.has(key)) {
      added[key] = (extracted as Record<string, unknown>)[key]
    }
  }

  // Find removed keys
  for (const key of origKeys) {
    if (!extractedKeys.has(key)) {
      removed.push(key)
    }
  }

  // Find modified keys
  for (const key of origKeys) {
    if (extractedKeys.has(key)) {
      const origValue = (original as Record<string, unknown>)[key]
      const extractedValue = (extracted as Record<string, unknown>)[key]
      if (JSON.stringify(origValue) !== JSON.stringify(extractedValue)) {
        modified[key] = { from: origValue, to: extractedValue }
      }
    }
  }

  return {
    added,
    modified,
    removed,
    hasChanges: Object.keys(added).length > 0 || Object.keys(modified).length > 0 || removed.length > 0,
  }
}

/**
 * Apply extracted data to original document.
 */
export function applyExtract<T extends object>(
  original: T,
  extracted: Partial<T>,
  options: { paths?: string[]; arrayMerge?: 'replace' | 'append' | 'prepend' } = {}
): T {
  const { paths, arrayMerge = 'replace' } = options
  const result = { ...original }

  for (const [key, value] of Object.entries(extracted)) {
    if (paths && !paths.includes(key)) {
      continue
    }

    const origValue = (original as Record<string, unknown>)[key]

    if (Array.isArray(origValue) && Array.isArray(value)) {
      if (arrayMerge === 'append') {
        ;(result as Record<string, unknown>)[key] = [...origValue, ...value]
      } else if (arrayMerge === 'prepend') {
        ;(result as Record<string, unknown>)[key] = [...value, ...origValue]
      } else {
        ;(result as Record<string, unknown>)[key] = value
      }
    } else {
      ;(result as Record<string, unknown>)[key] = value
    }
  }

  return result
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
      signal: controller.signal,
    })

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
