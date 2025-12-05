/**
 * MDX Layout Parser
 *
 * Extracts layout information from MDXLD documents.
 */

import { parse } from 'mdxld'
import { getLayoutMapping, type LayoutType, type LayoutMapping } from './layouts'

export interface LayoutInfo {
  /** Layout type (e.g., 'scalar', 'dusk') */
  type: LayoutType
  /** Layout component mapping */
  mapping: LayoutMapping
  /** Props extracted from MDX */
  props: Record<string, unknown>
  /** Frontmatter metadata */
  frontmatter: Record<string, unknown>
  /** Site/App name */
  name: string
  /** Title */
  title: string
  /** Description */
  description: string
}

/**
 * Parse layout information from MDX content
 */
export function parseLayoutFromMDX(content: string, filePath?: string): LayoutInfo | null {
  try {
    const doc = parse(content)

    // Get layout from frontmatter
    const layout = doc.data.layout as string | undefined
    if (!layout) {
      // Try to infer from $type
      const docType = Array.isArray(doc.type) ? doc.type[0] : doc.type
      const type = docType?.toLowerCase()
      if (type !== 'site' && type !== 'app') {
        return null
      }
    }

    const layoutType = (layout?.toLowerCase() || 'scalar') as LayoutType
    const mapping = getLayoutMapping(layoutType)

    if (!mapping) {
      console.warn(`Unknown layout type: ${layout} in ${filePath}`)
      return null
    }

    // Extract props from content
    const props = extractPropsFromContent(doc.content)

    return {
      type: layoutType,
      mapping,
      props,
      frontmatter: doc.data,
      name: (doc.data.name as string) || 'Example',
      title: (doc.data.title as string) || 'Untitled',
      description: (doc.data.description as string) || '',
    }
  } catch (error) {
    console.error(`Error parsing MDX: ${filePath}`, error)
    return null
  }
}

/**
 * Extract a balanced brace expression starting at given index
 */
function extractBalancedBraces(str: string, startIdx: number): string | null {
  if (str[startIdx] !== '{') return null

  let depth = 0
  let inString = false
  let stringChar = ''
  let escaped = false

  for (let i = startIdx; i < str.length; i++) {
    const char = str[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (inString) {
      if (char === stringChar) {
        inString = false
      }
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true
      stringChar = char
      continue
    }

    if (char === '{') depth++
    if (char === '}') depth--

    if (depth === 0) {
      return str.slice(startIdx, i + 1)
    }
  }

  return null
}

/**
 * Extract layout props from MDX content
 *
 * Looks for JSX component usage and extracts props.
 */
function extractPropsFromContent(content: string): Record<string, unknown> {
  // Match layout component with props - find the start
  const layoutMatch = content.match(/<(\w+Layout)\s+/)
  if (!layoutMatch) {
    return {}
  }

  const startIdx = (layoutMatch.index || 0) + layoutMatch[0].length
  const propsSection = content.slice(startIdx)

  const props: Record<string, unknown> = {}

  // Match prop names and extract their balanced brace values
  const propNameRegex = /(\w+)=\{/g
  let match

  while ((match = propNameRegex.exec(propsSection)) !== null) {
    const propName = match[1]
    const braceStartIdx = match.index + match[0].length - 1
    const braceContent = extractBalancedBraces(propsSection, braceStartIdx)

    if (braceContent && propName) {
      // Remove outer braces
      const innerContent = braceContent.slice(1, -1).trim()

      try {
        // Try to evaluate as JSON-like structure
        const cleanValue = innerContent
          .replace(/(\w+):/g, '"$1":') // Quote keys
          .replace(/'/g, '"') // Single to double quotes
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/`([^`]*)`/g, (_, s) => JSON.stringify(s)) // Convert template literals

        props[propName] = JSON.parse(cleanValue)
      } catch {
        // Store as string if can't parse
        props[propName] = innerContent
      }
    }
  }

  return props
}

/**
 * Check if content contains a layout component
 */
export function hasLayoutComponent(content: string): boolean {
  return /<\w+Layout\s/.test(content)
}

/**
 * Get import statements from MDX content
 */
export function extractImports(content: string): string[] {
  const imports: string[] = []
  const importMatches = content.matchAll(/^import\s+.*$/gm)

  for (const match of importMatches) {
    imports.push(match[0])
  }

  return imports
}
