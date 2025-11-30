import type { MDXLDDocument, MDXLDData, StringifyOptions } from './types.js'

/**
 * Convert a value to YAML string representation
 */
function valueToYaml(value: unknown, indent: number = 0): string {
  const spaces = '  '.repeat(indent)

  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string') {
    // Check if string needs quoting
    if (
      value === '' ||
      value === 'true' ||
      value === 'false' ||
      value === 'null' ||
      value.includes(':') ||
      value.includes('#') ||
      value.includes('\n') ||
      value.startsWith(' ') ||
      value.endsWith(' ') ||
      /^[\d.]+$/.test(value)
    ) {
      // Use single quotes, escape internal single quotes
      return `'${value.replace(/'/g, "''")}'`
    }
    return value
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }

    // Check if all items are simple values (not objects)
    const allSimple = value.every((v) => typeof v !== 'object' || v === null)

    if (allSimple && value.length <= 5) {
      // Inline array for short simple arrays
      return `[${value.map((v) => valueToYaml(v)).join(', ')}]`
    }

    // Multi-line array
    return value.map((item) => `\n${spaces}- ${valueToYaml(item, indent + 1).trimStart()}`).join('')
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return '{}'
    }

    return entries.map(([k, v]) => `\n${spaces}${k}: ${valueToYaml(v, indent + 1).trimStart()}`).join('')
  }

  return String(value)
}

/**
 * Convert data object to YAML frontmatter string
 */
function dataToYaml(data: MDXLDData): string {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return ''
  }

  const lines: string[] = []

  for (const [key, value] of entries) {
    const yamlValue = valueToYaml(value, 1)

    if (yamlValue.startsWith('\n')) {
      // Multi-line value
      lines.push(`${key}:${yamlValue}`)
    } else {
      lines.push(`${key}: ${yamlValue}`)
    }
  }

  return lines.join('\n')
}

/**
 * Merge LD properties into data object for flat mode output
 */
function mergeLDProperties(doc: MDXLDDocument): MDXLDData {
  const result: MDXLDData = {}

  if (doc.id !== undefined) {
    result.$id = doc.id
  }
  if (doc.type !== undefined) {
    result.$type = doc.type
  }
  if (doc.context !== undefined) {
    result.$context = doc.context
  }

  return { ...result, ...doc.data }
}

/**
 * Stringify an MDXLD document back to string
 *
 * @param doc - MDXLD document to stringify
 * @param options - Stringify options
 * @returns String representation with YAML frontmatter and MDX content
 *
 * @example
 * ```ts
 * const content = stringify({
 *   id: 'https://example.com/doc',
 *   type: 'Article',
 *   data: { title: 'Hello World' },
 *   content: '# Hello World\n'
 * })
 *
 * // Output:
 * // ---
 * // $id: https://example.com/doc
 * // $type: Article
 * // title: Hello World
 * // ---
 * //
 * // # Hello World
 * ```
 */
export function stringify(doc: MDXLDDocument, options: StringifyOptions = {}): string {
  const { mode = 'expanded' } = options

  let data: MDXLDData

  if (mode === 'flat') {
    // In flat mode, just use the data as-is
    data = doc.data
  } else {
    // In expanded mode, merge root LD properties back into data with $ prefix
    data = mergeLDProperties(doc)
  }

  const yaml = dataToYaml(data)
  const content = doc.content

  if (!yaml) {
    return content
  }

  // Ensure content starts with newline for proper formatting
  const contentWithNewline = content.startsWith('\n') ? content : `\n${content}`

  return `---\n${yaml}\n---${contentWithNewline}`
}
