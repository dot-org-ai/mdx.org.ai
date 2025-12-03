/**
 * Component Type Loader
 *
 * Utilities for loading and parsing component type definitions from MDX files.
 * Reads the types/*.mdx files and provides structured component metadata.
 *
 * @packageDocumentation
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Parsed prop definition from ai-functions schema syntax
 */
export interface PropDef {
  /** Property name */
  name: string
  /** Type expression (e.g., 'string', 'Media?', "'grid' | 'list'") */
  type: string
  /** Whether the prop is required */
  required: boolean
  /** Default value if specified */
  default?: string
  /** Whether this is an array type */
  isArray: boolean
  /** Base type without modifiers */
  baseType: string
}

/**
 * Parsed CSS part definition
 */
export interface PartDef {
  /** Part name (CSS class/selector) */
  name: string
  /** Semantic HTML element */
  element: string
  /** Whether this part is optional */
  optional: boolean
}

/**
 * Parsed CSS variable definition
 */
export interface CSSVariableDef {
  /** Variable name (e.g., '--hero-padding') */
  name: string
  /** Default value */
  value: string
}

/**
 * JSON-LD field mapping
 */
export interface JSONLDMapping {
  /** Schema.org type (e.g., 'schema:Article') */
  $type?: string
  /** Field mappings (prop name -> schema.org property) */
  [key: string]: string | undefined
}

/**
 * Complete component type definition parsed from MDX
 */
export interface ComponentType {
  /** Component name */
  name: string
  /** Schema type URI */
  $type: string
  /** Schema ID URI */
  $id: string
  /** Component category */
  category: string
  /** Description */
  description: string
  /** Semantic HTML element */
  semanticElement?: string
  /** Output formats supported */
  outputs: string[]
  /** Related component names */
  related: string[]
  /** Prop definitions */
  props: PropDef[]
  /** CSS part definitions */
  parts: PartDef[]
  /** CSS variable definitions */
  cssVariables: CSSVariableDef[]
  /** JSON-LD mapping (for Thing components) */
  jsonld?: JSONLDMapping
  /** Raw frontmatter */
  frontmatter: Record<string, unknown>
  /** Markdown content (after frontmatter) */
  content: string
}

/**
 * Parse a prop definition from ai-functions schema syntax
 *
 * Examples:
 * - "title: string" -> { name: "title", type: "string", required: true }
 * - "nav: NavItem[]?" -> { name: "nav", type: "NavItem[]?", required: false, isArray: true }
 * - "layout: 'grid' | 'list' = 'grid'" -> { name: "layout", type: "'grid' | 'list'", default: "'grid'" }
 */
export function parsePropDef(line: string): PropDef | null {
  const match = line.match(/^(\w+):\s*(.+)$/)
  if (!match) return null

  const [, name, typeExpr] = match
  if (!name || !typeExpr) return null
  let type = typeExpr.trim()
  let defaultValue: string | undefined
  let required = true
  let isArray = false

  // Check for default value
  const defaultMatch = type.match(/^(.+?)\s*=\s*(.+)$/)
  if (defaultMatch && defaultMatch[1] && defaultMatch[2]) {
    type = defaultMatch[1].trim()
    defaultValue = defaultMatch[2].trim()
    required = false
  }

  // Check for optional marker
  if (type.endsWith('?')) {
    type = type.slice(0, -1)
    required = false
  }

  // Check for array type
  if (type.endsWith('[]')) {
    isArray = true
  }

  // Get base type (without [], ?, or union types)
  let baseType = type
  if (baseType.includes('|')) {
    // For union types, extract first type or leave as-is
    const firstPart = baseType.split('|')[0]
    if (firstPart) {
      baseType = firstPart.trim().replace(/^'|'$/g, '')
    }
  }
  baseType = baseType.replace('[]', '').trim()

  return {
    name,
    type,
    required,
    default: defaultValue,
    isArray,
    baseType,
  }
}

/**
 * Parse a CSS part definition
 *
 * Examples:
 * - "root: section" -> { name: "root", element: "section", optional: false }
 * - "sidebar: aside?" -> { name: "sidebar", element: "aside", optional: true }
 */
export function parsePartDef(line: string): PartDef | null {
  const match = line.match(/^([\w-]+):\s*(\w+)(\?)?$/)
  if (!match) return null

  const [, name, element, optional] = match
  if (!name || !element) return null
  return {
    name,
    element,
    optional: !!optional,
  }
}

/**
 * Parse a CSS variable definition
 *
 * Example: "--hero-padding: 4rem" -> { name: "--hero-padding", value: "4rem" }
 */
export function parseCSSVariableDef(line: string): CSSVariableDef | null {
  const match = line.match(/^(--[\w-]+):\s*(.+)$/)
  if (!match || !match[1] || !match[2]) return null

  return {
    name: match[1],
    value: match[2].trim(),
  }
}

/**
 * Parse frontmatter from MDX content
 */
export function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content }
  }

  const [, frontmatterStr, body = ''] = frontmatterMatch
  if (!frontmatterStr) {
    return { frontmatter: {}, body: content }
  }
  const frontmatter: Record<string, unknown> = {}
  const lines = frontmatterStr.split('\n')

  let currentSection: string | null = null
  let currentSectionItems: string[] = []
  let currentJsonldSection = false
  let jsonldObj: Record<string, string> = {}

  for (const line of lines) {
    // Skip empty lines (but don't end section)
    if (!line.trim()) continue

    // Check for section header (# Props, # Parts, # CSS Variables, # JSON-LD mapping)
    const sectionMatch = line.match(/^#\s+(.+)$/)
    if (sectionMatch && sectionMatch[1]) {
      // Save previous section
      if (currentSection && currentSectionItems.length > 0) {
        frontmatter[currentSection] = currentSectionItems
      }
      if (currentJsonldSection && Object.keys(jsonldObj).length > 0) {
        frontmatter['jsonld'] = jsonldObj
      }

      currentSection = sectionMatch[1].toLowerCase().replace(/\s+/g, '-')
      currentSectionItems = []
      currentJsonldSection = currentSection === 'json-ld-mapping'
      if (currentJsonldSection) {
        jsonldObj = {}
      }
      continue
    }

    // If in JSON-LD section, parse as key-value pairs
    if (currentJsonldSection) {
      const jsonldMatch = line.match(/^\s*(\$?\w+):\s*(.+)$/)
      if (jsonldMatch && jsonldMatch[1] && jsonldMatch[2]) {
        jsonldObj[jsonldMatch[1]] = jsonldMatch[2]
      }
      continue
    }

    // Check for top-level key-value pair (before any section)
    if (!currentSection) {
      const kvMatch = line.match(/^(\$?[\w-]+):\s*(.*)$/)
      if (kvMatch) {
        const [, key, value] = kvMatch
        if (!key || value === undefined) continue
        // Parse array values like [html, markdown, json]
        if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[key] = value.slice(1, -1).split(',').map((s) => s.trim())
        } else {
          frontmatter[key] = value
        }
      }
      continue
    }

    // If in a section (Props, Parts, CSS Variables), add line to section items
    if (currentSection && line.trim()) {
      currentSectionItems.push(line)
    }
  }

  // Save last section
  if (currentSection && currentSectionItems.length > 0) {
    frontmatter[currentSection] = currentSectionItems
  }
  if (currentJsonldSection && Object.keys(jsonldObj).length > 0) {
    frontmatter['jsonld'] = jsonldObj
  }

  return { frontmatter, body }
}

/**
 * Parse a component type from MDX file content
 */
export function parseComponentType(content: string, filename?: string): ComponentType {
  const { frontmatter, body } = parseFrontmatter(content)

  // Extract props
  const propsSection = frontmatter['props'] as string[] | undefined
  const props: PropDef[] = []
  if (Array.isArray(propsSection)) {
    for (const line of propsSection) {
      const prop = parsePropDef(line)
      if (prop) props.push(prop)
    }
  }

  // Extract parts
  const partsSection = frontmatter['parts'] as string[] | undefined
  const parts: PartDef[] = []
  if (Array.isArray(partsSection)) {
    for (const line of partsSection) {
      const part = parsePartDef(line)
      if (part) parts.push(part)
    }
  }

  // Extract CSS variables
  const cssSection = frontmatter['css-variables'] as string[] | undefined
  const cssVariables: CSSVariableDef[] = []
  if (Array.isArray(cssSection)) {
    for (const line of cssSection) {
      const cssVar = parseCSSVariableDef(line)
      if (cssVar) cssVariables.push(cssVar)
    }
  }

  // Extract JSON-LD mapping
  const jsonldSection = frontmatter['json-ld-mapping'] as Record<string, string> | undefined

  return {
    name: (frontmatter['name'] as string) || filename?.replace('.mdx', '') || 'Unknown',
    $type: (frontmatter['$type'] as string) || '',
    $id: (frontmatter['$id'] as string) || '',
    category: (frontmatter['category'] as string) || 'component',
    description: (frontmatter['description'] as string) || '',
    semanticElement: frontmatter['semanticElement'] as string | undefined,
    outputs: (frontmatter['outputs'] as string[]) || ['html'],
    related: (frontmatter['related'] as string[]) || [],
    props,
    parts,
    cssVariables,
    jsonld: jsonldSection,
    frontmatter,
    content: body,
  }
}

/**
 * Load all component types from a directory
 */
export function loadComponentTypes(typesDir: string): ComponentType[] {
  if (!existsSync(typesDir)) {
    return []
  }

  const files = readdirSync(typesDir).filter((f) => f.endsWith('.mdx'))
  const types: ComponentType[] = []

  for (const file of files) {
    const filepath = join(typesDir, file)
    const content = readFileSync(filepath, 'utf-8')
    const componentType = parseComponentType(content, file)
    types.push(componentType)
  }

  return types
}

/**
 * Get component type by name
 */
export function getComponentType(typesDir: string, name: string): ComponentType | undefined {
  const filepath = join(typesDir, `${name}.mdx`)
  if (!existsSync(filepath)) {
    return undefined
  }

  const content = readFileSync(filepath, 'utf-8')
  return parseComponentType(content, `${name}.mdx`)
}

/**
 * Get component types by category
 */
export function getTypesByCategory(types: ComponentType[], category: string): ComponentType[] {
  return types.filter((t) => t.category === category)
}

/**
 * Get all categories from types
 */
export function getTypeCategories(types: ComponentType[]): string[] {
  const categories = new Set<string>()
  for (const t of types) {
    categories.add(t.category)
  }
  return Array.from(categories).sort()
}

/**
 * Generate TypeScript interface from component type
 */
export function generateTypeScriptInterface(componentType: ComponentType): string {
  const lines: string[] = []

  // Add JSDoc comment
  lines.push(`/**`)
  lines.push(` * ${componentType.description}`)
  if (componentType.semanticElement) {
    lines.push(` * @semanticElement ${componentType.semanticElement}`)
  }
  lines.push(` */`)

  // Generate interface
  lines.push(`export interface ${componentType.name}Props {`)

  for (const prop of componentType.props) {
    const tsType = convertToTSType(prop.type)
    const optional = prop.required ? '' : '?'
    lines.push(`  /** ${prop.name} */`)
    lines.push(`  ${prop.name}${optional}: ${tsType}`)
  }

  lines.push(`}`)

  return lines.join('\n')
}

/**
 * Convert ai-functions type to TypeScript type
 */
function convertToTSType(type: string): string {
  // Handle union types with quotes
  if (type.includes('|')) {
    return type // Already valid TS union type
  }

  // Handle array types
  if (type.endsWith('[]')) {
    const baseType = type.slice(0, -2)
    return `${convertToTSType(baseType)}[]`
  }

  // Handle known types
  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
      return type
    case 'ReactNode':
      return 'unknown' // JSX-agnostic
    case 'MDXContent':
      return 'unknown' // Runtime-specific
    default:
      return type // Custom types like Media, Person, etc.
  }
}
