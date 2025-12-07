/**
 * @mdxdb/clickhouse View Manager
 *
 * Implements bi-directional view rendering and sync for ClickHouse storage.
 * Optimized for analytics and large-scale relationship queries.
 *
 * @packageDocumentation
 */

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
import type { ClickHouseDatabase } from './index.js'

// =============================================================================
// Relationship Inference
// =============================================================================

function pluralize(word: string): string {
  if (word.endsWith('y')) return word.slice(0, -1) + 'ies'
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es'
  }
  return word + 's'
}

function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('es') && !word.endsWith('ses')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

function inferPredicate(contextType: string, componentType: string): string {
  return componentType.toLowerCase()
}

function inferReversePredicate(contextType: string, componentType: string): string {
  return pluralize(contextType.toLowerCase())
}

// =============================================================================
// View Parser
// =============================================================================

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

function parseColumnsProp(propsStr: string): string[] | undefined {
  const match = propsStr.match(/columns=\{?\[([^\]]+)\]\}?/)
  if (!match) return undefined

  return match[1]!
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(Boolean)
}

function parseFormatProp(propsStr: string): 'table' | 'list' | 'cards' | undefined {
  const match = propsStr.match(/format=['"]?(table|list|cards)['"]?/)
  return match ? match[1] as 'table' | 'list' | 'cards' : undefined
}

// =============================================================================
// View Manager Implementation
// =============================================================================

/**
 * ClickHouse-based view manager
 *
 * Uses SQL queries for efficient relationship traversal.
 * Views are stored as Things with type='View'.
 */
export class ClickHouseViewManager implements ViewManager {
  private db: ClickHouseDatabase
  private ns: string
  private viewCache: Map<string, ViewDocument> = new Map()

  constructor(db: ClickHouseDatabase, ns: string = 'localhost') {
    this.db = db
    this.ns = ns
  }

  /**
   * Discover view documents stored in ClickHouse
   */
  async discoverViews(): Promise<ViewDocument[]> {
    const things = await this.db.list({
      ns: this.ns,
      type: 'View',
    })

    return things.map(thing => {
      const data = thing.data as Record<string, unknown>
      return {
        id: thing.id,
        entityType: (data.entityType as string) ?? '',
        template: (data.template as string) ?? '',
        components: parseComponents((data.template as string) ?? ''),
      }
    })
  }

  /**
   * Get a view by ID
   */
  async getView(viewId: string): Promise<ViewDocument | null> {
    // Check cache
    if (this.viewCache.has(viewId)) {
      return this.viewCache.get(viewId)!
    }

    // Try to get from database
    const thing = await this.db.getById(this.ns, 'View', viewId)
    if (!thing) {
      // Try without brackets for [Posts] -> Posts lookup
      const normalizedId = viewId.replace(/^\[|\]$/g, '')
      const altThing = await this.db.getById(this.ns, 'View', normalizedId)
      if (!altThing) return null

      const data = altThing.data as Record<string, unknown>
      const view: ViewDocument = {
        id: viewId,
        entityType: (data.entityType as string) ?? singularize(normalizedId),
        template: (data.template as string) ?? '',
        components: parseComponents((data.template as string) ?? ''),
      }

      this.viewCache.set(viewId, view)
      return view
    }

    const data = thing.data as Record<string, unknown>
    const view: ViewDocument = {
      id: viewId,
      entityType: (data.entityType as string) ?? '',
      template: (data.template as string) ?? '',
      components: parseComponents((data.template as string) ?? ''),
    }

    this.viewCache.set(viewId, view)
    return view
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
      // Get related entities using ClickHouse relationship queries
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
    const forwardPredicate = inferPredicate(contextType, componentName)

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

    return { predicate: inferReversePredicate(contextType, componentType), direction: 'reverse' }
  }

  /**
   * Apply mutations to the database
   */
  async applyMutations(mutations: ViewRelationshipMutation[]): Promise<void> {
    for (const mutation of mutations) {
      if (mutation.type === 'add') {
        await this.db.relate({
          type: mutation.predicate,
          from: mutation.from,
          to: mutation.to,
          data: mutation.data,
        })
      } else if (mutation.type === 'remove') {
        await this.db.unrelate(mutation.from, mutation.predicate, mutation.to)
      } else if (mutation.type === 'update') {
        // For updates, we update the target entity
        await this.db.update(mutation.to, { data: mutation.data as Record<string, unknown> })
      }
    }
  }

  /**
   * Create entities that were discovered during sync
   */
  async createEntities(entities: ViewEntityItem[]): Promise<void> {
    for (const entity of entities) {
      await this.db.create({
        ns: this.ns,
        type: entity.$type ?? 'Unknown',
        id: entity.$id,
        data: entity as Record<string, unknown>,
      })
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async getEntityFromUrl(url: string): Promise<ViewEntityItem | null> {
    const thing = await this.db.get(url)
    if (!thing) return null

    return {
      $id: thing.id,
      $type: thing.type,
      ...thing.data,
    } as ViewEntityItem
  }

  private buildEntityUrl(type: string, id: string): string {
    return `https://${this.ns}/${type}/${id}`
  }

  private async getRelatedEntities(
    contextUrl: string,
    contextType: string,
    component: ViewComponent
  ): Promise<ViewEntityItem[]> {
    // Infer relationship direction
    const relationship = await this.inferRelationship(contextType, component.name)
    const predicate = component.relationship ?? relationship?.predicate ?? inferPredicate(contextType, component.name)
    const direction = relationship?.direction ?? 'forward'

    // Use ClickHouse's efficient relationship queries
    const things = await this.db.related(
      contextUrl,
      predicate,
      direction === 'forward' ? 'to' : 'from'
    )

    return things.map(thing => ({
      $id: thing.id,
      $type: thing.type,
      ...thing.data,
    })) as ViewEntityItem[]
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
    const selfClosingRegex = new RegExp(`<${componentName}\\s*[^/>]*/>`, 'g')
    template = template.replace(selfClosingRegex, rendered)

    const blockRegex = new RegExp(`<${componentName}\\s*[^>]*>[\\s\\S]*?<\\/${componentName}>`, 'g')
    template = template.replace(blockRegex, rendered)

    return template
  }

  private replaceExpressions(template: string, entity: ViewEntityItem): string {
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

    if (data.data && typeof data.data === 'object') {
      return this.findExtractedComponent(data.data as Record<string, unknown>, componentName)
    }

    return undefined
  }

  private async entityExists(type: string, id: string): Promise<boolean> {
    const url = this.buildEntityUrl(type, id)
    const thing = await this.db.get(url)
    return thing !== null
  }
}

/**
 * Create a view manager for ClickHouse storage
 */
export function createClickHouseViewManager(
  db: ClickHouseDatabase,
  ns?: string
): ClickHouseViewManager {
  return new ClickHouseViewManager(db, ns)
}
