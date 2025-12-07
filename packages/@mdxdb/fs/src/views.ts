/**
 * @mdxdb/fs View Manager
 *
 * Implements bi-directional view rendering and sync for filesystem storage.
 *
 * ## Design Principles
 *
 * 1. **Convention over configuration**: `<Tags />` just works
 * 2. **Auto-discovery**: Views are discovered from `[Type].mdx` files
 * 3. **Auto-inferred relationships**: Uses schema to determine predicates
 * 4. **Simple component syntax**: `<Posts />`, `<Tags published={true} />`
 *
 * ## View File Format
 *
 * ```mdx
 * ---
 * $type: View
 * entityType: Tag
 * ---
 *
 * # {name}
 *
 * {description}
 *
 * ## Posts with this tag
 *
 * <Posts />
 * ```
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parse, stringify } from 'mdxld'
import {
  extract,
  createEntityExtractors,
  getEntityComponent,
  renderMarkdownTable,
  diffEntities,
  type ExtractedEntities,
} from '@mdxld/extract'
import type {
  ViewManager,
  ViewDocument,
  ViewComponent,
  ViewContext,
  ViewRenderResult,
  ViewSyncResult,
  ViewEntityItem,
  ViewRelationshipMutation,
} from 'mdxdb'
import type { FsProvider } from './provider.js'
import type { FsDatabaseConfig } from './types.js'

// =============================================================================
// Relationship Inference
// =============================================================================

/**
 * Simple pluralization for relationship inference
 */
function pluralize(word: string): string {
  if (word.endsWith('y')) return word.slice(0, -1) + 'ies'
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es'
  }
  return word + 's'
}

/**
 * Simple singularization for relationship inference
 */
function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('es') && !word.endsWith('ses')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/**
 * Infer predicate from entity types
 *
 * Examples:
 * - (Post, Tags) -> 'tags' (Post has tags)
 * - (Tag, Posts) -> 'posts' or reverse lookup
 */
function inferPredicate(contextType: string, componentType: string): string {
  // Component name is usually plural (Posts, Tags)
  // Predicate is lowercase plural: 'tags', 'posts', 'authors'
  return componentType.toLowerCase()
}

/**
 * Infer reverse predicate
 */
function inferReversePredicate(contextType: string, componentType: string): string {
  // Reverse: what predicate would point TO this context type
  // e.g., if we're in Tag looking at Posts, reverse is 'tags' on Post
  return pluralize(contextType.toLowerCase())
}

// =============================================================================
// View Parser
// =============================================================================

/**
 * Parse component from template
 */
function parseComponents(template: string): ViewComponent[] {
  const components: ViewComponent[] = []
  const seen = new Set<string>()

  // Self-closing: <Posts /> or <Posts published={true} />
  const selfClosingRegex = /<([A-Z][a-zA-Z]*)\s*([^/>]*)\/>/g
  let match

  while ((match = selfClosingRegex.exec(template)) !== null) {
    const name = match[1]!
    if (seen.has(name)) continue
    seen.add(name)

    const propsStr = match[2] || ''
    const columns = parseColumnsProp(propsStr)
    const format = parseFormatProp(propsStr)

    components.push({
      name,
      entityType: singularize(name),
      columns,
      format,
    })
  }

  // Block: <Posts>...</Posts>
  const blockRegex = /<([A-Z][a-zA-Z]*)\s*([^>]*)>[\s\S]*?<\/\1>/g
  while ((match = blockRegex.exec(template)) !== null) {
    const name = match[1]!
    if (seen.has(name)) continue
    seen.add(name)

    const propsStr = match[2] || ''
    const columns = parseColumnsProp(propsStr)
    const format = parseFormatProp(propsStr)

    components.push({
      name,
      entityType: singularize(name),
      columns,
      format,
    })
  }

  return components
}

/**
 * Parse columns prop from component string
 */
function parseColumnsProp(propsStr: string): string[] | undefined {
  const match = propsStr.match(/columns=\{?\[([^\]]+)\]\}?/)
  if (!match) return undefined

  return match[1]!
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(Boolean)
}

/**
 * Parse format prop from component string
 */
function parseFormatProp(propsStr: string): 'table' | 'list' | 'cards' | undefined {
  const match = propsStr.match(/format=['"]?(table|list|cards)['"]?/)
  return match ? match[1] as 'table' | 'list' | 'cards' : undefined
}

/**
 * Parse filter props from component string
 */
function parseFilterProps(propsStr: string): Record<string, unknown> {
  const filters: Record<string, unknown> = {}

  // Match prop={value} or prop="value" or prop='value' or prop={true}
  const propRegex = /(\w+)=(?:\{([^}]+)\}|"([^"]+)"|'([^']+)')/g
  let match

  while ((match = propRegex.exec(propsStr)) !== null) {
    const key = match[1]!
    if (key === 'columns' || key === 'format') continue

    const value = match[2] ?? match[3] ?? match[4]
    if (value === 'true') filters[key] = true
    else if (value === 'false') filters[key] = false
    else if (!isNaN(Number(value))) filters[key] = Number(value)
    else filters[key] = value
  }

  return filters
}

// =============================================================================
// View Manager Implementation
// =============================================================================

/**
 * Filesystem-based view manager
 */
export class FsViewManager implements ViewManager {
  private root: string
  private provider: FsProvider
  private extensions: string[]
  private encoding: BufferEncoding
  private viewCache: Map<string, ViewDocument> = new Map()

  constructor(config: FsDatabaseConfig, provider: FsProvider) {
    this.root = path.resolve(config.root)
    this.provider = provider
    this.extensions = config.extensions ?? ['.mdx', '.md']
    this.encoding = config.encoding ?? 'utf-8'
  }

  /**
   * Discover view files matching [Type].mdx pattern
   */
  async discoverViews(): Promise<ViewDocument[]> {
    const views: ViewDocument[] = []

    try {
      const entries = await fs.readdir(this.root, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isFile()) continue

        // Check for [Type].mdx pattern
        const match = entry.name.match(/^\[([A-Z][a-zA-Z]*)\](\.mdx?)?$/)
        if (!match) continue

        const viewId = `[${match[1]}]`
        const view = await this.getView(viewId)
        if (view) views.push(view)
      }
    } catch {
      // Directory doesn't exist
    }

    return views
  }

  /**
   * Get a view by ID
   */
  async getView(viewId: string): Promise<ViewDocument | null> {
    // Check cache
    if (this.viewCache.has(viewId)) {
      return this.viewCache.get(viewId)!
    }

    // Find view file
    const filePath = await this.findViewFile(viewId)
    if (!filePath) return null

    try {
      const content = await fs.readFile(filePath, this.encoding)
      const doc = parse(content)

      // Extract entity type from frontmatter or filename
      const entityType = doc.data.$type === 'View'
        ? (doc.data.entityType as string)
        : this.inferEntityTypeFromViewId(viewId)

      if (!entityType) return null

      // Parse components from template
      const components = parseComponents(doc.content)

      const view: ViewDocument = {
        id: viewId,
        entityType,
        template: doc.content,
        components,
      }

      this.viewCache.set(viewId, view)
      return view
    } catch {
      return null
    }
  }

  /**
   * Render a view for a specific entity context
   */
  async render(viewId: string, context: ViewContext): Promise<ViewRenderResult> {
    const view = await this.getView(viewId)
    if (!view) {
      throw new Error(`View not found: ${viewId}`)
    }

    // Get the context entity
    const contextEntity = await this.getEntityFromUrl(context.entityUrl)
    if (!contextEntity) {
      throw new Error(`Entity not found: ${context.entityUrl}`)
    }

    // Render each component
    const entities: Record<string, ViewEntityItem[]> = {}
    let markdown = view.template

    for (const component of view.components) {
      // Get related entities
      const related = await this.getRelatedEntities(
        context.entityUrl,
        view.entityType,
        component
      )

      // Apply filters from context
      let filtered = related
      if (context.filters) {
        filtered = related.filter(entity =>
          Object.entries(context.filters!).every(([key, value]) => entity[key] === value)
        )
      }

      entities[component.name] = filtered

      // Render component to markdown
      const rendered = this.renderComponent(component, filtered)

      // Replace component in template
      markdown = this.replaceComponent(markdown, component.name, rendered)
    }

    // Replace expression slots with entity data
    markdown = this.replaceExpressions(markdown, contextEntity)

    return { markdown, entities }
  }

  /**
   * Extract and sync changes from edited view markdown
   */
  async sync(
    viewId: string,
    context: ViewContext,
    editedMarkdown: string
  ): Promise<ViewSyncResult> {
    const view = await this.getView(viewId)
    if (!view) {
      throw new Error(`View not found: ${viewId}`)
    }

    // Get current entities for comparison
    const currentRender = await this.render(viewId, context)

    // Create extractors for all components
    const componentExtractors = createEntityExtractors(view.template)

    // Extract data from edited markdown
    // Note: Type assertion needed due to generic variance in ComponentExtractor
    const extractResult = extract({
      template: view.template,
      rendered: editedMarkdown,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      components: componentExtractors as any,
    })

    const mutations: ViewRelationshipMutation[] = []
    const created: ViewEntityItem[] = []
    const updated: ViewEntityItem[] = []

    // Process each component's extracted data
    for (const component of view.components) {
      const currentEntities = currentRender.entities[component.name] ?? []

      // Find the extracted entities for this component
      const extractedData = this.findExtractedComponent(
        extractResult.data,
        component.name
      )

      if (!extractedData) continue

      const extractedEntities = extractedData.items ?? []

      // Diff to find changes
      const changes = diffEntities(currentEntities, extractedEntities)

      // Infer relationship
      const relationship = await this.inferRelationship(view.entityType, component.name)
      const predicate = relationship?.predicate ?? inferPredicate(view.entityType, component.name)

      // Convert to mutations
      for (const change of changes) {
        const toUrl = this.buildEntityUrl(component.entityType!, change.entityId)

        if (change.type === 'add') {
          mutations.push({
            type: 'add',
            predicate,
            from: context.entityUrl,
            to: toUrl,
            data: change.data,
          })

          // Check if entity exists, if not mark as created
          const exists = await this.entityExists(component.entityType!, change.entityId)
          if (!exists) {
            created.push({
              $id: change.entityId,
              $type: component.entityType,
              ...change.data,
            })
          }
        } else if (change.type === 'remove') {
          mutations.push({
            type: 'remove',
            predicate,
            from: context.entityUrl,
            to: toUrl,
            previousData: change.previousData,
          })
        } else if (change.type === 'update') {
          mutations.push({
            type: 'update',
            predicate,
            from: context.entityUrl,
            to: toUrl,
            data: change.data,
            previousData: change.previousData,
          })
          updated.push({
            $id: change.entityId,
            $type: component.entityType,
            ...change.data,
          })
        }
      }
    }

    return { mutations, created, updated }
  }

  /**
   * Infer relationship predicate between types
   */
  async inferRelationship(
    contextType: string,
    componentName: string
  ): Promise<{ predicate: string; direction: 'forward' | 'reverse' } | null> {
    const componentType = singularize(componentName)

    // Try forward relationship first: contextType has componentType
    const forwardPredicate = inferPredicate(contextType, componentName)

    // Check if this relationship exists in data
    // For now, use convention-based inference
    // In a full implementation, this would check the schema

    // If context is the "owner" of the relationship
    // e.g., Post -> Tags (Post owns tags)
    const contextLower = contextType.toLowerCase()
    const componentLower = componentType.toLowerCase()

    // Common ownership patterns
    const ownershipPatterns: Record<string, string[]> = {
      post: ['tag', 'author', 'category', 'comment'],
      article: ['tag', 'author', 'category'],
      product: ['category', 'tag', 'review'],
      user: ['post', 'comment', 'order'],
      author: ['post', 'article', 'book'],
    }

    if (ownershipPatterns[contextLower]?.includes(componentLower)) {
      return { predicate: forwardPredicate, direction: 'forward' }
    }

    // Otherwise assume reverse relationship
    return { predicate: inferReversePredicate(contextType, componentType), direction: 'reverse' }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async findViewFile(viewId: string): Promise<string | null> {
    // viewId is like "[Posts]"
    for (const ext of this.extensions) {
      const filePath = path.join(this.root, `${viewId}${ext}`)
      try {
        await fs.access(filePath)
        return filePath
      } catch {
        continue
      }
    }
    return null
  }

  private inferEntityTypeFromViewId(viewId: string): string | null {
    // [Posts] -> Post
    const match = viewId.match(/^\[([A-Z][a-zA-Z]*)\]$/)
    return match ? singularize(match[1]!) : null
  }

  private async getEntityFromUrl(url: string): Promise<ViewEntityItem | null> {
    // Parse URL to get type and id
    const parsed = this.parseEntityUrl(url)
    if (!parsed) return null

    const entity = await this.provider.get(parsed.type, parsed.id)
    if (!entity) return null

    return {
      $id: parsed.id,
      $type: parsed.type,
      ...entity,
    } as ViewEntityItem
  }

  private parseEntityUrl(url: string): { type: string; id: string } | null {
    try {
      const parsed = new URL(url)
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        return { type: parts[0]!, id: parts.slice(1).join('/') }
      }
      if (parts.length === 1) {
        return { type: '', id: parts[0]! }
      }
      return null
    } catch {
      // Not a URL, try as type/id
      const parts = url.split('/')
      if (parts.length >= 2) {
        return { type: parts[0]!, id: parts.slice(1).join('/') }
      }
      return null
    }
  }

  private buildEntityUrl(type: string, id: string): string {
    return `https://localhost/${type}/${id}`
  }

  private async getRelatedEntities(
    contextUrl: string,
    contextType: string,
    component: ViewComponent
  ): Promise<ViewEntityItem[]> {
    const parsed = this.parseEntityUrl(contextUrl)
    if (!parsed) return []

    // Get relationship info
    const relationship = await this.inferRelationship(contextType, component.name)
    const predicate = component.relationship ?? relationship?.predicate ?? inferPredicate(contextType, component.name)

    // Fetch related entities
    const related = await this.provider.related(parsed.type, parsed.id, predicate)

    return related.map(entity => ({
      $id: entity.$id as string,
      $type: entity.$type as string,
      ...entity,
    }))
  }

  private renderComponent(component: ViewComponent, entities: ViewEntityItem[]): string {
    const format = component.format ?? 'table'

    if (format === 'list') {
      const entityComponent = getEntityComponent(component.name, { format: 'list' })
      return entityComponent.render({ items: entities })
    }

    return renderMarkdownTable(entities, component.columns)
  }

  private replaceComponent(template: string, componentName: string, rendered: string): string {
    // Replace self-closing: <ComponentName ... />
    const selfClosingRegex = new RegExp(`<${componentName}\\s*[^/>]*/>`, 'g')
    template = template.replace(selfClosingRegex, rendered)

    // Replace block: <ComponentName>...</ComponentName>
    const blockRegex = new RegExp(`<${componentName}\\s*[^>]*>[\\s\\S]*?<\\/${componentName}>`, 'g')
    template = template.replace(blockRegex, rendered)

    return template
  }

  private replaceExpressions(template: string, entity: ViewEntityItem): string {
    // Replace {field} expressions with entity data
    return template.replace(/\{([^{}]+)\}/g, (match, path: string) => {
      const value = this.getNestedValue(entity, path.trim())
      if (value === undefined || value === null) return match
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined
      }
      current = (current as Record<string, unknown>)[part]
    }

    return current
  }

  private findExtractedComponent(
    data: Record<string, unknown>,
    componentName: string
  ): ExtractedEntities | undefined {
    // Look for component data in extracted result
    const key = `component_${componentName.toLowerCase()}`
    const altKey = componentName.toLowerCase()

    for (const k of [key, altKey, componentName]) {
      if (data[k] && typeof data[k] === 'object') {
        const value = data[k] as Record<string, unknown>
        if ('items' in value) {
          return value as unknown as ExtractedEntities
        }
      }
    }

    // Check nested data
    if (data.data && typeof data.data === 'object') {
      return this.findExtractedComponent(data.data as Record<string, unknown>, componentName)
    }

    return undefined
  }

  private async entityExists(type: string, id: string): Promise<boolean> {
    const entity = await this.provider.get(type, id)
    return entity !== null
  }
}

/**
 * Create a view manager for filesystem storage
 */
export function createFsViewManager(
  config: FsDatabaseConfig,
  provider: FsProvider
): FsViewManager {
  return new FsViewManager(config, provider)
}
