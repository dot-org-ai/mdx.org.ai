/**
 * @mdxdb/api DBClient Implementation
 *
 * Fetch-based HTTP client implementing ai-database DBClient interface
 * Uses JSON:API standard format (https://jsonapi.org/)
 *
 * @packageDocumentation
 */

import type {
  DBClient,
  DBClientExtended,
  Thing,
  Relationship,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  Event,
  Action,
  Artifact,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  ArtifactType,
} from 'ai-database'

/**
 * Configuration for the DBClient HTTP client
 */
export interface DBClientConfig {
  /** Base URL of the server (e.g., 'http://localhost:3000/api/db') */
  baseUrl: string
  /** API key for authentication */
  apiKey?: string
  /** Custom fetch implementation */
  fetch?: typeof fetch
  /** Custom headers */
  headers?: Record<string, string>
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
}

/**
 * JSON:API resource object
 */
interface JsonApiResource<T = Record<string, unknown>> {
  type: string
  id: string
  attributes?: T
  relationships?: Record<string, JsonApiRelationship>
  links?: {
    self?: string
    related?: string
  }
  meta?: Record<string, unknown>
}

/**
 * JSON:API relationship
 */
interface JsonApiRelationship {
  data: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null
  links?: {
    self?: string
    related?: string
  }
  meta?: Record<string, unknown>
}

/**
 * JSON:API resource identifier
 */
interface JsonApiResourceIdentifier {
  type: string
  id: string
}

/**
 * JSON:API document (response)
 */
interface JsonApiDocument<T = Record<string, unknown>> {
  data?: JsonApiResource<T> | JsonApiResource<T>[] | null
  errors?: JsonApiError[]
  meta?: Record<string, unknown>
  links?: {
    self?: string
    first?: string
    last?: string
    prev?: string
    next?: string
  }
  included?: JsonApiResource[]
}

/**
 * JSON:API error object
 */
interface JsonApiError {
  id?: string
  status?: string
  code?: string
  title?: string
  detail?: string
  source?: {
    pointer?: string
    parameter?: string
  }
  meta?: Record<string, unknown>
}

/**
 * JSON:API content type
 */
const JSONAPI_CONTENT_TYPE = 'application/vnd.api+json'

/**
 * HTTP client implementing DBClient interface with JSON:API format
 *
 * @example
 * ```ts
 * import { createDBClient } from '@mdxdb/api/db'
 *
 * const db = createDBClient({
 *   baseUrl: 'http://localhost:3000/api/db',
 *   apiKey: 'your-api-key'
 * })
 *
 * // Use like any DBClient
 * const things = await db.list({ ns: 'example.com', type: 'User' })
 * const thing = await db.get('https://example.com/User/123')
 * ```
 */
export class DBApiClient<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClientExtended<TData>
{
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly fetchFn: typeof fetch
  private readonly defaultHeaders: Record<string, string>
  private readonly timeout: number

  constructor(config: DBClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
    this.fetchFn = config.fetch ?? fetch
    this.defaultHeaders = {
      'Content-Type': JSONAPI_CONTENT_TYPE,
      Accept: JSONAPI_CONTENT_TYPE,
      ...config.headers,
    }
    this.timeout = config.timeout ?? 30000
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value)
        }
      }
    }

    const headers: Record<string, string> = { ...this.defaultHeaders }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await this.fetchFn(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      // Handle empty responses (e.g., 204 No Content from DELETE)
      const text = await response.text()
      if (!text) {
        return {} as unknown as T
      }

      const doc = JSON.parse(text) as JsonApiDocument

      if (doc.errors && doc.errors.length > 0) {
        const error = doc.errors[0]!
        throw new Error(error.detail || error.title || 'API Error')
      }

      return doc as unknown as T
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Convert a Thing to JSON:API resource format
   */
  private thingToResource(thing: Thing<TData>): JsonApiResource<TData> {
    return {
      type: thing.type,
      id: thing.url || `${thing.ns || ''}/${thing.type}/${thing.id}`,
      attributes: thing.data,
      links: {
        self: thing.url,
      },
      meta: {
        ns: thing.ns,
        createdAt: thing.createdAt?.toISOString(),
        updatedAt: thing.updatedAt?.toISOString(),
      },
    }
  }

  /**
   * Convert a JSON:API resource to Thing
   */
  private resourceToThing(resource: JsonApiResource<TData>): Thing<TData> {
    const now = new Date()
    // ts-japi puts domain fields in attributes, not at the top level
    const attrs = resource.attributes as Record<string, unknown> || {}
    return {
      type: (attrs.type as string) || resource.type,
      id: (attrs.id as string) || resource.id.split('/').pop() || resource.id,
      url: (attrs.url as string) || resource.id,
      ns: (attrs.ns as string) || '',
      data: (attrs.data as TData) || ({} as TData),
      createdAt: resource.meta?.createdAt ? new Date(resource.meta.createdAt as string) : now,
      updatedAt: resource.meta?.updatedAt ? new Date(resource.meta.updatedAt as string) : now,
    }
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    const doc = await this.request<JsonApiDocument<TData>>('GET', '/things', undefined, {
      'filter[ns]': options.ns,
      'filter[type]': options.type,
      'page[limit]': options.limit?.toString(),
      'page[offset]': options.offset?.toString(),
      sort: options.orderBy ? `${options.order === 'desc' ? '-' : ''}${options.orderBy}` : undefined,
    })

    if (!doc.data || !Array.isArray(doc.data)) return []
    return doc.data.map((resource) => this.resourceToThing(resource))
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    const doc = await this.request<JsonApiDocument<TData>>('GET', '/things/find', undefined, {
      'filter[ns]': options.ns,
      'filter[type]': options.type,
      'filter[where]': options.where ? JSON.stringify(options.where) : undefined,
      'page[limit]': options.limit?.toString(),
      'page[offset]': options.offset?.toString(),
    })

    if (!doc.data || !Array.isArray(doc.data)) return []
    return doc.data.map((resource) => this.resourceToThing(resource))
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    const doc = await this.request<JsonApiDocument<TData>>('GET', '/things/search', undefined, {
      query: options.query,
      ns: options.ns,
      type: options.type,
      fields: options.fields?.join(','),
      minScore: options.minScore?.toString(),
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
    })

    if (!doc.data || !Array.isArray(doc.data)) return []
    return doc.data.map((resource) => this.resourceToThing(resource))
  }

  async get(url: string): Promise<Thing<TData> | null> {
    try {
      const doc = await this.request<JsonApiDocument<TData>>(
        'GET',
        `/things/${encodeURIComponent(url)}`
      )

      if (!doc.data || Array.isArray(doc.data)) return null
      return this.resourceToThing(doc.data)
    } catch (error) {
      if (String(error).includes('not found') || String(error).includes('404')) {
        return null
      }
      throw error
    }
  }

  async getById(ns: string, type: string, id: string): Promise<Thing<TData> | null> {
    const url = `https://${ns}/${type}/${id}`
    return this.get(url)
  }

  async set(url: string, data: TData): Promise<Thing<TData>> {
    const existing = await this.get(url)
    const parsedUrl = new URL(url)
    const parts = parsedUrl.pathname.split('/').filter(Boolean)
    const type = parts[0] || 'Thing'

    const doc = await this.request<JsonApiDocument<TData>>('PATCH', `/things/${encodeURIComponent(url)}`, {
      data: {
        type,
        id: url,
        attributes: data,
      },
    })

    if (!doc.data || Array.isArray(doc.data)) {
      throw new Error('Invalid response')
    }
    return this.resourceToThing(doc.data)
  }

  async create(options: CreateOptions<TData>): Promise<Thing<TData>> {
    // Send simple JSON format (server deserializes, responds with JSON:API)
    const doc = await this.request<JsonApiDocument<TData>>('POST', '/things', {
      ns: options.ns,
      type: options.type,
      id: options.id,
      url: options.url,
      data: options.data,
      '@context': options['@context'],
    })

    if (!doc.data || Array.isArray(doc.data)) {
      throw new Error('Invalid response')
    }
    return this.resourceToThing(doc.data)
  }

  async update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>> {
    // Send simple JSON format (server deserializes, responds with JSON:API)
    const doc = await this.request<JsonApiDocument<TData>>('PATCH', `/things/${encodeURIComponent(url)}`, {
      data: options.data,
    })

    if (!doc.data || Array.isArray(doc.data)) {
      throw new Error('Invalid response')
    }
    return this.resourceToThing(doc.data)
  }

  async upsert(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const url = options.url || `https://${options.ns}/${options.type}/${options.id || ''}`
    const existing = await this.get(url)

    if (existing) {
      return this.update(url, { data: options.data })
    }
    return this.create(options)
  }

  async delete(url: string): Promise<boolean> {
    try {
      await this.request<JsonApiDocument>('DELETE', `/things/${encodeURIComponent(url)}`)
      return true
    } catch (error) {
      // Return false for "not found" errors
      if (String(error).includes('not found') || String(error).includes('404')) {
        return false
      }
      throw error
    }
  }

  async forEach(
    options: QueryOptions,
    callback: (thing: Thing<TData>) => void | Promise<void>
  ): Promise<void> {
    const things = await this.list(options)
    for (const thing of things) {
      await callback(thing)
    }
  }

  // ===========================================================================
  // Relationship Operations
  // ===========================================================================

  async relate<T extends Record<string, unknown> = Record<string, unknown>>(
    options: RelateOptions<T>
  ): Promise<Relationship<T>> {
    // Send simple JSON format
    const doc = await this.request<JsonApiDocument>('POST', '/relationships', {
      type: options.type,
      from: options.from,
      to: options.to,
      data: options.data,
    })

    return this.resourceToRelationship(doc.data as JsonApiResource) as Relationship<T>
  }

  private resourceToRelationship<T extends Record<string, unknown>>(resource: JsonApiResource): Relationship<T> {
    // ts-japi puts domain fields in attributes
    const attrs = resource.attributes as Record<string, unknown> || {}
    return {
      id: (attrs.id as string) || resource.id,
      type: (attrs.type as string) || resource.type,
      from: (attrs.from as string) || '',
      to: (attrs.to as string) || '',
      createdAt: resource.meta?.createdAt ? new Date(resource.meta.createdAt as string) : new Date(),
      data: (attrs.data as T) || ({} as T),
    }
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    // Note: Don't manually encode - searchParams.set() handles encoding
    await this.request('DELETE', '/relationships', undefined, {
      from,
      type,
      to,
    })
    return true
  }

  async related(
    url: string,
    relationshipType?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Thing<TData>[]> {
    const doc = await this.request<JsonApiDocument<TData>>(
      'GET',
      `/things/${encodeURIComponent(url)}/related`,
      undefined,
      {
        type: relationshipType,
        direction,
      }
    )

    if (!doc.data || !Array.isArray(doc.data)) return []
    return doc.data.map((resource) => this.resourceToThing(resource))
  }

  async relationships(
    url: string,
    type?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Relationship[]> {
    const doc = await this.request<JsonApiDocument>(
      'GET',
      `/things/${encodeURIComponent(url)}/relationships`,
      undefined,
      { type, direction }
    )

    if (!doc.data || !Array.isArray(doc.data)) return []
    return (doc.data as JsonApiResource[]).map((resource) => this.resourceToRelationship(resource))
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    return this.related(url, relationshipType, 'from')
  }

  // ===========================================================================
  // Event Operations (Extended)
  // ===========================================================================

  async track<T extends Record<string, unknown>>(options: CreateEventOptions<T>): Promise<Event<T>> {
    // Send simple JSON format
    const doc = await this.request<JsonApiDocument>('POST', '/events', {
      type: options.type,
      source: options.source,
      data: options.data,
      correlationId: options.correlationId,
      causationId: options.causationId,
    })

    return this.resourceToEvent(doc.data as JsonApiResource) as Event<T>
  }

  async getEvent(id: string): Promise<Event | null> {
    try {
      const doc = await this.request<JsonApiDocument>('GET', `/events/${encodeURIComponent(id)}`)

      if (!doc.data || Array.isArray(doc.data)) return null
      return this.resourceToEvent(doc.data)
    } catch (error) {
      if (String(error).includes('not found')) return null
      throw error
    }
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    const doc = await this.request<JsonApiDocument>('GET', '/events', undefined, {
      'filter[type]': options.type,
      'filter[source]': options.source,
      'filter[correlationId]': options.correlationId,
      'filter[after]': options.after?.toISOString(),
      'filter[before]': options.before?.toISOString(),
      'page[limit]': options.limit?.toString(),
      'page[offset]': options.offset?.toString(),
    })

    if (!doc.data || !Array.isArray(doc.data)) return []
    return (doc.data as JsonApiResource[]).map((resource) => this.resourceToEvent(resource))
  }

  private resourceToEvent(resource: JsonApiResource): Event {
    // ts-japi puts domain fields in attributes
    const attrs = resource.attributes as Record<string, unknown> || {}
    return {
      id: (attrs.id as string) || resource.id,
      type: (attrs.type as string) || resource.type,
      timestamp: resource.meta?.timestamp ? new Date(resource.meta.timestamp as string) : new Date(),
      source: (attrs.source as string) || '',
      data: (attrs.data as Record<string, unknown>) || {},
      correlationId: attrs.correlationId as string | undefined,
      causationId: attrs.causationId as string | undefined,
    }
  }

  // ===========================================================================
  // Action Operations (Extended)
  // ===========================================================================

  async send<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    // Send simple JSON format
    const doc = await this.request<JsonApiDocument>('POST', '/actions/send', {
      actor: options.actor,
      object: options.object,
      action: options.action,
      metadata: options.metadata,
    })

    return this.resourceToAction(doc.data as JsonApiResource) as Action<T>
  }

  async do<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    // Send simple JSON format
    const doc = await this.request<JsonApiDocument>('POST', '/actions/do', {
      actor: options.actor,
      object: options.object,
      action: options.action,
      metadata: options.metadata,
    })

    return this.resourceToAction(doc.data as JsonApiResource) as Action<T>
  }

  async try<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>,
    fn: () => Promise<unknown>
  ): Promise<Action<T>> {
    const action = await this.do<T>(options)
    try {
      const result = await fn()
      return (await this.completeAction(action.id, result)) as Action<T>
    } catch (error) {
      return (await this.failAction(action.id, String(error))) as Action<T>
    }
  }

  async getAction(id: string): Promise<Action | null> {
    try {
      const doc = await this.request<JsonApiDocument>('GET', `/actions/${encodeURIComponent(id)}`)

      if (!doc.data || Array.isArray(doc.data)) return null
      return this.resourceToAction(doc.data)
    } catch (error) {
      if (String(error).includes('not found')) return null
      throw error
    }
  }

  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    const doc = await this.request<JsonApiDocument>('GET', '/actions', undefined, {
      'filter[actor]': options.actor,
      'filter[object]': options.object,
      'filter[action]': options.action,
      'filter[status]': Array.isArray(options.status) ? options.status.join(',') : options.status,
      'page[limit]': options.limit?.toString(),
      'page[offset]': options.offset?.toString(),
    })

    if (!doc.data || !Array.isArray(doc.data)) return []
    return (doc.data as JsonApiResource[]).map((resource) => this.resourceToAction(resource))
  }

  async startAction(id: string): Promise<Action> {
    const doc = await this.request<JsonApiDocument>('POST', `/actions/${encodeURIComponent(id)}/start`)
    return this.resourceToAction(doc.data as JsonApiResource)
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    // Send simple JSON format
    const doc = await this.request<JsonApiDocument>('POST', `/actions/${encodeURIComponent(id)}/complete`, {
      result,
    })
    return this.resourceToAction(doc.data as JsonApiResource)
  }

  async failAction(id: string, error: string): Promise<Action> {
    // Send simple JSON format
    const doc = await this.request<JsonApiDocument>('POST', `/actions/${encodeURIComponent(id)}/fail`, {
      error,
    })
    return this.resourceToAction(doc.data as JsonApiResource)
  }

  async cancelAction(id: string): Promise<Action> {
    const doc = await this.request<JsonApiDocument>('POST', `/actions/${encodeURIComponent(id)}/cancel`)
    return this.resourceToAction(doc.data as JsonApiResource)
  }

  private resourceToAction(resource: JsonApiResource): Action {
    // ts-japi puts domain fields in attributes
    const attrs = resource.attributes as Record<string, unknown> || {}
    return {
      id: (attrs.id as string) || resource.id,
      actor: (attrs.actor as string) || '',
      object: (attrs.object as string) || '',
      action: (attrs.action as string) || resource.type,
      status: (attrs.status as 'pending' | 'active' | 'completed' | 'failed' | 'cancelled') || 'pending',
      createdAt: resource.meta?.createdAt ? new Date(resource.meta.createdAt as string) : new Date(),
      updatedAt: resource.meta?.updatedAt ? new Date(resource.meta.updatedAt as string) : new Date(),
      startedAt: resource.meta?.startedAt ? new Date(resource.meta.startedAt as string) : undefined,
      completedAt: resource.meta?.completedAt ? new Date(resource.meta.completedAt as string) : undefined,
      result: attrs.result,
      error: attrs.error as string | undefined,
      metadata: attrs.metadata as Record<string, unknown> | undefined,
    }
  }

  // ===========================================================================
  // Artifact Operations (Extended)
  // ===========================================================================

  async storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>> {
    // Send simple JSON format
    const doc = await this.request<JsonApiDocument>('POST', '/artifacts', {
      key: options.key,
      type: options.type,
      source: options.source,
      sourceHash: options.sourceHash,
      content: options.content,
      ttl: options.ttl,
      metadata: options.metadata,
    })

    return this.resourceToArtifact(doc.data as JsonApiResource)
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    try {
      const doc = await this.request<JsonApiDocument>('GET', `/artifacts/${encodeURIComponent(key)}`)

      if (!doc.data || Array.isArray(doc.data)) return null
      return this.resourceToArtifact(doc.data)
    } catch (error) {
      if (String(error).includes('not found')) return null
      throw error
    }
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    try {
      const doc = await this.request<JsonApiDocument>(
        'GET',
        `/artifacts/source/${encodeURIComponent(source)}/${type}`
      )

      if (!doc.data || Array.isArray(doc.data)) return null
      return this.resourceToArtifact(doc.data)
    } catch (error) {
      if (String(error).includes('not found')) return null
      throw error
    }
  }

  async deleteArtifact(key: string): Promise<boolean> {
    await this.request<JsonApiDocument>('DELETE', `/artifacts/${encodeURIComponent(key)}`)
    return true
  }

  async cleanExpiredArtifacts(): Promise<number> {
    const doc = await this.request<JsonApiDocument>('POST', '/artifacts/clean')
    return (doc.meta?.cleaned as number) || 0
  }

  private resourceToArtifact<T>(resource: JsonApiResource): Artifact<T> {
    // ts-japi puts domain fields in attributes
    const attrs = resource.attributes as Record<string, unknown> || {}
    return {
      key: (attrs.key as string) || resource.id,
      type: (attrs.type as ArtifactType) || (resource.type as ArtifactType),
      source: (attrs.source as string) || '',
      sourceHash: attrs.sourceHash as string,
      createdAt: resource.meta?.createdAt ? new Date(resource.meta.createdAt as string) : new Date(),
      expiresAt: resource.meta?.expiresAt ? new Date(resource.meta.expiresAt as string) : undefined,
      content: attrs.content as T,
      size: (attrs.size as number) || 0,
      metadata: attrs.metadata as Record<string, unknown> | undefined,
    }
  }
}

/**
 * Create a DBClient HTTP client using JSON:API format
 *
 * @example
 * ```ts
 * import { createDBClient } from '@mdxdb/api/db'
 *
 * const db = createDBClient({
 *   baseUrl: 'http://localhost:3000/api/db',
 *   apiKey: process.env.API_KEY
 * })
 *
 * // Use like any DBClient
 * const things = await db.list({ ns: 'example.com', type: 'User' })
 * const thing = await db.get('https://example.com/User/123')
 * ```
 */
export function createDBClient<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: DBClientConfig
): DBClientExtended<TData> {
  return new DBApiClient<TData>(config)
}
