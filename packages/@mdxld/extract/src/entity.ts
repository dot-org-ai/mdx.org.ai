/**
 * Entity Components for @mdxld/extract
 *
 * Provides round-trip components for rendering and extracting entity relationships.
 * These components enable bi-directional sync between MDX views and structured data.
 *
 * ## Design Principles
 *
 * 1. **Convention over configuration**: `<Tags />` just works
 * 2. **Type as component name**: Component name = entity type (singular or plural)
 * 3. **Auto-inferred relationships**: mdxdb infers from schema
 * 4. **Optional filters**: `<Tags published={true} />`
 * 5. **Optional column override**: `<Tags columns={['name', 'slug']} />`
 *
 * @packageDocumentation
 */

import { roundTripComponent, type ComponentExtractor } from './extract.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Entity item with optional metadata
 */
export interface EntityItem {
  /** Entity ID (URL or slug) */
  $id: string
  /** Entity type */
  $type?: string
  /** Entity data fields */
  [key: string]: unknown
}

/**
 * Props for entity components like <Tags />, <Posts />, <Authors />
 */
export interface EntityComponentProps {
  /** Items to render (injected by view resolver) */
  items?: EntityItem[]
  /** Columns to display (auto-detected from items if not provided) */
  columns?: string[]
  /** Filter props (e.g., published={true}) */
  [key: string]: unknown
}

/**
 * Render options for entity tables
 */
export interface EntityRenderOptions {
  /** Render as table (default) or list */
  format?: 'table' | 'list' | 'cards'
  /** Show ID column */
  showId?: boolean
  /** Link pattern for IDs (e.g., '/posts/{$id}') */
  linkPattern?: string
  /** Maximum items to show */
  limit?: number
}

/**
 * Extracted entity data from rendered markdown
 */
export interface ExtractedEntities {
  /** The extracted entity items */
  items: EntityItem[]
  /** Columns that were detected */
  columns: string[]
  /** Any filter props that were specified */
  filters?: Record<string, unknown>
}

// =============================================================================
// Table Parsing Utilities
// =============================================================================

/**
 * Parse a markdown table into structured data
 */
export function parseMarkdownTable(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.trim().split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }

  // Parse header row
  const headerLine = lines[0]!
  const headers = headerLine
    .split('|')
    .filter(Boolean)
    .map(cell => cell.trim())

  // Skip separator row (|---|---|)
  const dataLines = lines.slice(2)

  // Parse data rows
  const rows = dataLines.map(line => {
    const cells = line.split('|').filter(Boolean).map(cell => cell.trim())
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? ''
    })
    return row
  })

  return { headers, rows }
}

/**
 * Render entities as a markdown table
 */
export function renderMarkdownTable(
  items: EntityItem[],
  columns?: string[],
  options: EntityRenderOptions = {}
): string {
  if (items.length === 0) {
    return '_No items_'
  }

  // Auto-detect columns from first item if not provided
  const cols = columns ?? detectColumns(items[0]!)

  if (cols.length === 0) {
    return '_No columns_'
  }

  // Build header
  const header = `| ${cols.join(' | ')} |`
  const separator = `|${cols.map(() => '---').join('|')}|`

  // Build rows
  const rows = items.slice(0, options.limit).map(item => {
    const cells = cols.map(col => {
      const value = item[col]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
    return `| ${cells.join(' | ')} |`
  })

  return [header, separator, ...rows].join('\n')
}

/**
 * Render entities as a markdown list
 */
export function renderMarkdownList(
  items: EntityItem[],
  options: EntityRenderOptions = {}
): string {
  if (items.length === 0) {
    return '_No items_'
  }

  const displayField = detectDisplayField(items[0]!)

  return items.slice(0, options.limit).map(item => {
    const display = item[displayField] ?? item.$id
    if (options.linkPattern) {
      const link = options.linkPattern.replace('{$id}', item.$id)
      return `- [${display}](${link})`
    }
    return `- ${display}`
  }).join('\n')
}

/**
 * Detect columns from entity item (excludes $ prefixed and common meta fields)
 */
function detectColumns(item: EntityItem): string[] {
  const skipFields = new Set(['$id', '$type', '$context', 'createdAt', 'updatedAt', '_content'])

  return Object.keys(item)
    .filter(key => !skipFields.has(key) && !key.startsWith('$'))
    .slice(0, 5) // Limit to 5 columns for readability
}

/**
 * Detect the best display field for an entity
 */
function detectDisplayField(item: EntityItem): string {
  const preferredFields = ['name', 'title', 'label', 'displayName', 'slug', '$id']

  for (const field of preferredFields) {
    if (field in item && item[field]) {
      return field
    }
  }

  // Fall back to first non-$ field
  const firstField = Object.keys(item).find(k => !k.startsWith('$'))
  return firstField ?? '$id'
}

// =============================================================================
// Entity Component Factory
// =============================================================================

/**
 * Create a round-trip component for an entity type
 *
 * @example
 * ```ts
 * // Simple usage - auto-detects columns
 * const Tags = createEntityComponent('Tag')
 *
 * // Render: <Tags items={[{ $id: '1', name: 'JavaScript' }]} />
 * // Output: "| name |\n|---|\n| JavaScript |"
 *
 * // Extract: parses markdown table back to items
 * const { items } = Tags.extract(renderedMarkdown)
 * ```
 */
export function createEntityComponent(
  entityType: string,
  options: EntityRenderOptions = {}
): {
  type: string
  render: (props: EntityComponentProps) => string
  extract: (content: string) => ExtractedEntities
  extractor: ComponentExtractor<ExtractedEntities>
} {
  const render = (props: EntityComponentProps): string => {
    const { items = [], columns, ...filters } = props
    const format = options.format ?? 'table'

    // Filter items if filter props provided
    let filteredItems = items
    if (Object.keys(filters).length > 0) {
      filteredItems = items.filter(item => {
        return Object.entries(filters).every(([key, value]) => item[key] === value)
      })
    }

    if (format === 'list') {
      return renderMarkdownList(filteredItems, options)
    }

    return renderMarkdownTable(filteredItems, columns, options)
  }

  const extract = (content: string): ExtractedEntities => {
    const trimmed = content.trim()

    // Handle empty states
    if (trimmed === '_No items_' || trimmed === '_No columns_') {
      return { items: [], columns: [] }
    }

    // Check if it's a list format
    if (trimmed.startsWith('-')) {
      const lines = trimmed.split('\n')
      const items: EntityItem[] = lines.map(line => {
        // Parse "- [Name](link)" or "- Name"
        const linkMatch = line.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/)
        if (linkMatch) {
          const [, name, link] = linkMatch
          const id = link!.split('/').pop() ?? link
          return { $id: id!, name: name!, $type: entityType }
        }
        const textMatch = line.match(/^-\s*(.+)$/)
        if (textMatch) {
          return { $id: textMatch[1]!, name: textMatch[1]!, $type: entityType }
        }
        return { $id: '', $type: entityType }
      }).filter(item => item.$id)

      return { items, columns: ['name'] }
    }

    // Parse as table
    const { headers, rows } = parseMarkdownTable(trimmed)

    const items: EntityItem[] = rows.map((row, index) => {
      const item: EntityItem = {
        $id: row['id'] ?? row['$id'] ?? row['slug'] ?? String(index),
        $type: entityType,
      }
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'id' && key !== '$id') {
          item[key] = value
        }
      }
      return item
    })

    return { items, columns: headers }
  }

  return {
    type: entityType,
    render,
    extract,
    extractor: { extract }
  }
}

// =============================================================================
// Pre-built Entity Components Registry
// =============================================================================

/**
 * Registry of entity components by type name
 */
const componentRegistry = new Map<string, ReturnType<typeof createEntityComponent>>()

/**
 * Get or create an entity component for a type
 *
 * @example
 * ```ts
 * const Tags = getEntityComponent('Tags')
 * const Posts = getEntityComponent('Posts')
 * ```
 */
export function getEntityComponent(
  typeName: string,
  options?: EntityRenderOptions
): ReturnType<typeof createEntityComponent> {
  // Normalize type name (handle plural forms)
  const normalizedType = normalizeTypeName(typeName)

  const cacheKey = `${normalizedType}:${JSON.stringify(options ?? {})}`

  if (!componentRegistry.has(cacheKey)) {
    componentRegistry.set(cacheKey, createEntityComponent(normalizedType, options))
  }

  return componentRegistry.get(cacheKey)!
}

/**
 * Normalize type name (singular form)
 */
function normalizeTypeName(name: string): string {
  // Simple singularization rules
  if (name.endsWith('ies')) {
    return name.slice(0, -3) + 'y' // Categories -> Category
  }
  if (name.endsWith('es') && !name.endsWith('ses')) {
    return name.slice(0, -2) // Boxes -> Box, but not Classes -> Clas
  }
  if (name.endsWith('s') && !name.endsWith('ss')) {
    return name.slice(0, -1) // Tags -> Tag, but not Class -> Clas
  }
  return name
}

/**
 * Create extractors map for all entity components in a template
 *
 * @example
 * ```ts
 * const template = `
 * # Post: {data.title}
 *
 * ## Tags
 * <Tags />
 *
 * ## Related Posts
 * <Posts published={true} />
 * `
 *
 * const components = createEntityExtractors(template)
 * // { Tags: TagsExtractor, Posts: PostsExtractor }
 * ```
 */
export function createEntityExtractors(
  template: string
): Record<string, ComponentExtractor<ExtractedEntities>> {
  const extractors: Record<string, ComponentExtractor<ExtractedEntities>> = {}

  // Find all <ComponentName ... /> patterns where ComponentName starts with uppercase
  const componentPattern = /<([A-Z][a-zA-Z]*)\s*([^/>]*)\/>/g
  let match

  while ((match = componentPattern.exec(template)) !== null) {
    const componentName = match[1]!
    if (!extractors[componentName]) {
      extractors[componentName] = getEntityComponent(componentName).extractor
    }
  }

  // Also find block components <ComponentName>...</ComponentName>
  const blockPattern = /<([A-Z][a-zA-Z]*)\s*[^>]*>[\s\S]*?<\/\1>/g
  while ((match = blockPattern.exec(template)) !== null) {
    const componentName = match[1]!
    if (!extractors[componentName]) {
      extractors[componentName] = getEntityComponent(componentName).extractor
    }
  }

  return extractors
}

// =============================================================================
// Relationship Diffing
// =============================================================================

/**
 * Relationship change between two entity lists
 */
export interface RelationshipChange {
  type: 'add' | 'remove' | 'update'
  entityId: string
  entityType: string
  data?: Record<string, unknown>
  previousData?: Record<string, unknown>
}

/**
 * Diff two entity lists to find relationship changes
 */
export function diffEntities(
  before: EntityItem[],
  after: EntityItem[]
): RelationshipChange[] {
  const changes: RelationshipChange[] = []

  const beforeMap = new Map(before.map(e => [e.$id, e]))
  const afterMap = new Map(after.map(e => [e.$id, e]))

  // Find additions
  for (const [id, entity] of afterMap) {
    if (!beforeMap.has(id)) {
      changes.push({
        type: 'add',
        entityId: id,
        entityType: entity.$type ?? '',
        data: entity,
      })
    }
  }

  // Find removals
  for (const [id, entity] of beforeMap) {
    if (!afterMap.has(id)) {
      changes.push({
        type: 'remove',
        entityId: id,
        entityType: entity.$type ?? '',
        previousData: entity,
      })
    }
  }

  // Find updates
  for (const [id, afterEntity] of afterMap) {
    const beforeEntity = beforeMap.get(id)
    if (beforeEntity) {
      // Check if data changed (excluding $id, $type)
      const { $id: _bid, $type: _btype, ...beforeData } = beforeEntity
      const { $id: _aid, $type: _atype, ...afterData } = afterEntity

      if (JSON.stringify(beforeData) !== JSON.stringify(afterData)) {
        changes.push({
          type: 'update',
          entityId: id,
          entityType: afterEntity.$type ?? '',
          data: afterEntity,
          previousData: beforeEntity,
        })
      }
    }
  }

  return changes
}
