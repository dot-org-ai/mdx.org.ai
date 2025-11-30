import type { MDXLDDocument, MDXLDData, ParseOptions } from './types.js'

// Matches YAML frontmatter: ---\n<content>\n--- or ---\n--- (empty)
const YAML_FRONTMATTER_REGEX = /^---(?:\r?\n([\s\S]*?))?\r?\n---(?:\r?\n|$)/

/**
 * Simple YAML parser for frontmatter
 * Handles basic key-value pairs, arrays, and nested objects
 */
function parseYaml(yaml: string): MDXLDData {
  const result: MDXLDData = {}
  const lines = yaml.split('\n')
  const stack: { indent: number; obj: Record<string, unknown>; key?: string }[] = [{ indent: -1, obj: result }]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.trim() === '' || line.trim().startsWith('#')) continue

    const indent = line.search(/\S/)
    const trimmed = line.trim()

    // Pop stack until we find the right parent
    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop()
    }

    const current = stack[stack.length - 1]!

    // Array item
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim()
      const parent = current.obj
      const key = current.key

      if (key && Array.isArray(parent[key])) {
        if (value.includes(':')) {
          // Nested object in array
          const obj: Record<string, unknown> = {}
          const [k, v] = value.split(':').map((s) => s.trim())
          if (k) obj[k] = parseValue(v || '')
          ;(parent[key] as unknown[]).push(obj)
          stack.push({ indent, obj, key })
        } else {
          ;(parent[key] as unknown[]).push(parseValue(value))
        }
      }
      continue
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim()
      const value = trimmed.slice(colonIndex + 1).trim()

      if (value === '') {
        // Check if next line is array or object
        const nextLine = lines[i + 1]
        if (nextLine && nextLine.trim().startsWith('- ')) {
          current.obj[key] = []
          stack.push({ indent, obj: current.obj, key })
        } else {
          current.obj[key] = {}
          stack.push({ indent, obj: current.obj[key] as Record<string, unknown> })
        }
      } else {
        current.obj[key] = parseValue(value)
      }
    }
  }

  return result
}

/**
 * Parse a YAML value string into its JavaScript type
 */
function parseValue(value: string): unknown {
  if (value === '' || value === '~' || value === 'null') return null
  if (value === 'true') return true
  if (value === 'false') return false

  // Quoted string
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  // Number
  const num = Number(value)
  if (!isNaN(num) && value !== '') return num

  // Inline array
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim()
    if (inner === '') return []
    return inner.split(',').map((s) => parseValue(s.trim()))
  }

  return value
}

/**
 * Extract LD properties from data object
 */
function extractLDProperties(data: MDXLDData): {
  id?: string
  type?: string | string[]
  context?: string | string[] | Record<string, unknown>
  rest: MDXLDData
} {
  const { $id, $type, $context, ...rest } = data
  return {
    id: $id,
    type: $type,
    context: $context,
    rest: rest as MDXLDData,
  }
}

/**
 * Parse MDXLD content into a document
 *
 * @param content - Raw MDXLD string content
 * @param options - Parse options
 * @returns Parsed MDXLD document
 *
 * @example
 * ```ts
 * const doc = parse(`---
 * $id: https://example.com/doc
 * $type: Article
 * title: Hello World
 * ---
 *
 * # Hello World
 * `)
 *
 * // Expanded mode (default):
 * // { id: 'https://example.com/doc', type: 'Article', data: { title: 'Hello World' }, content: '# Hello World\n' }
 *
 * // Flat mode:
 * // { data: { $id: 'https://example.com/doc', $type: 'Article', title: 'Hello World' }, content: '# Hello World\n' }
 * ```
 */
export function parse(content: string, options: ParseOptions = {}): MDXLDDocument {
  const { mode = 'expanded' } = options

  const match = content.match(YAML_FRONTMATTER_REGEX)
  let data: MDXLDData = {}
  let mdxContent = content

  if (match) {
    const yamlContent = match[1] || ''
    data = parseYaml(yamlContent)
    mdxContent = content.slice(match[0].length)
  }

  if (mode === 'flat') {
    return {
      data,
      content: mdxContent,
    }
  }

  // Expanded mode - extract $id, $type, $context to root level
  const { id, type, context, rest } = extractLDProperties(data)

  return {
    ...(id !== undefined && { id }),
    ...(type !== undefined && { type }),
    ...(context !== undefined && { context }),
    data: rest,
    content: mdxContent,
  }
}
