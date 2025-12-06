/**
 * @mdxld/markdown
 *
 * Bi-directional conversion between Objects and Markdown.
 * Convention-based automatic layouts from object structure.
 */

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
