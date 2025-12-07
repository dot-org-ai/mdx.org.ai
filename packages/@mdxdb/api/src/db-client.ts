/**
 * @mdxdb/api DBClient Implementation
 *
 * Fetch-based HTTP client implementing ai-database DBClient interface
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
  ActionStatus,
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
 * API response wrapper
 */
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * HTTP client implementing DBClient interface
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
    this.fetchFn = config.fetch ?? globalThis.fetch
    this.defaultHeaders = config.headers ?? {}
    this.timeout = config.timeout ?? 30000

    if (!this.fetchFn) {
      throw new Error('fetch is not available. Please provide a fetch implementation.')
    }
  }

  /**
   * Make an API request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | undefined>
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`
    if (query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.set(key, value)
        }
      }
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await this.fetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const result = (await response.json()) as ApiResponse<T>

      if (!result.success) {
        throw new Error(result.error ?? 'Unknown API error')
      }

      return result.data as T
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    return this.request<Thing<TData>[]>('GET', '/things', undefined, {
      ns: options.ns,
      type: options.type,
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
      orderBy: options.orderBy,
      order: options.order,
    })
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    return this.request<Thing<TData>[]>('GET', '/things/find', undefined, {
      ns: options.ns,
      type: options.type,
      where: options.where ? JSON.stringify(options.where) : undefined,
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
      orderBy: options.orderBy,
      order: options.order,
    })
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    return this.request<Thing<TData>[]>('GET', '/things/search', undefined, {
      query: options.query,
      ns: options.ns,
      type: options.type,
      fields: options.fields?.join(','),
      minScore: options.minScore?.toString(),
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
    })
  }

  async get(url: string): Promise<Thing<TData> | null> {
    try {
      return await this.request<Thing<TData>>('GET', `/things/${encodeURIComponent(url)}`)
    } catch (error) {
      if (String(error).includes('not found')) {
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
    // Parse URL to get ns, type, id
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const ns = parsed.host
    const type = parts[0] ?? ''
    const id = parts.slice(1).join('/')

    return this.upsert({
      ns,
      type,
      id,
      url,
      data,
    })
  }

  async create(options: CreateOptions<TData>): Promise<Thing<TData>> {
    return this.request<Thing<TData>>('POST', '/things', {
      ns: options.ns,
      type: options.type,
      id: options.id,
      url: options.url,
      data: options.data,
      '@context': options['@context'],
    })
  }

  async update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>> {
    return this.request<Thing<TData>>('PUT', `/things/${encodeURIComponent(url)}`, {
      data: options.data,
    })
  }

  async upsert(options: CreateOptions<TData>): Promise<Thing<TData>> {
    return this.request<Thing<TData>>('POST', '/things/upsert', {
      ns: options.ns,
      type: options.type,
      id: options.id,
      url: options.url,
      data: options.data,
      '@context': options['@context'],
    })
  }

  async delete(url: string): Promise<boolean> {
    const result = await this.request<{ deleted: boolean }>('DELETE', `/things/${encodeURIComponent(url)}`)
    return result.deleted
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
    return this.request<Relationship<T>>('POST', '/relationships', {
      type: options.type,
      from: options.from,
      to: options.to,
      data: options.data,
    })
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    const result = await this.request<{ removed: boolean }>('DELETE', '/relationships', undefined, {
      from,
      type,
      to,
    })
    return result.removed
  }

  async related(
    url: string,
    relationshipType?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Thing<TData>[]> {
    return this.request<Thing<TData>[]>('GET', `/things/${encodeURIComponent(url)}/related`, undefined, {
      type: relationshipType,
      direction,
    })
  }

  async relationships(
    url: string,
    type?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Relationship[]> {
    return this.request<Relationship[]>('GET', `/things/${encodeURIComponent(url)}/relationships`, undefined, {
      type,
      direction,
    })
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    return this.request<Thing<TData>[]>('GET', `/things/${encodeURIComponent(url)}/references`, undefined, {
      type: relationshipType,
    })
  }

  // ===========================================================================
  // Event Operations (Extended)
  // ===========================================================================

  async track<T extends Record<string, unknown>>(options: CreateEventOptions<T>): Promise<Event<T>> {
    return this.request<Event<T>>('POST', '/events', {
      type: options.type,
      source: options.source,
      data: options.data,
      correlationId: options.correlationId,
      causationId: options.causationId,
    })
  }

  async getEvent(id: string): Promise<Event | null> {
    try {
      return await this.request<Event>('GET', `/events/${id}`)
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    return this.request<Event[]>('GET', '/events', undefined, {
      type: options.type,
      source: options.source,
      correlationId: options.correlationId,
      after: options.after?.toISOString(),
      before: options.before?.toISOString(),
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
    })
  }

  // ===========================================================================
  // Action Operations (Extended)
  // ===========================================================================

  async send<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    return this.request<Action<T>>('POST', '/actions/send', {
      actor: options.actor,
      object: options.object,
      action: options.action,
      metadata: options.metadata,
    })
  }

  async do<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    return this.request<Action<T>>('POST', '/actions/do', {
      actor: options.actor,
      object: options.object,
      action: options.action,
      metadata: options.metadata,
    })
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
      return await this.request<Action>('GET', `/actions/${id}`)
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    return this.request<Action[]>('GET', '/actions', undefined, {
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: Array.isArray(options.status) ? options.status.join(',') : options.status,
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
    })
  }

  async startAction(id: string): Promise<Action> {
    return this.request<Action>('POST', `/actions/${id}/start`)
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    return this.request<Action>('POST', `/actions/${id}/complete`, { result })
  }

  async failAction(id: string, error: string): Promise<Action> {
    return this.request<Action>('POST', `/actions/${id}/fail`, { error })
  }

  async cancelAction(id: string): Promise<Action> {
    return this.request<Action>('POST', `/actions/${id}/cancel`)
  }

  // ===========================================================================
  // Artifact Operations (Extended)
  // ===========================================================================

  async storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>> {
    return this.request<Artifact<T>>('POST', '/artifacts', {
      key: options.key,
      type: options.type,
      source: options.source,
      sourceHash: options.sourceHash,
      content: options.content,
      ttl: options.ttl,
      metadata: options.metadata,
    })
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    try {
      return await this.request<Artifact<T>>('GET', `/artifacts/${key}`)
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    try {
      return await this.request<Artifact>('GET', `/artifacts/source/${encodeURIComponent(source)}/${type}`)
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async deleteArtifact(key: string): Promise<boolean> {
    const result = await this.request<{ deleted: boolean }>('DELETE', `/artifacts/${key}`)
    return result.deleted
  }

  async cleanExpiredArtifacts(): Promise<number> {
    const result = await this.request<{ cleaned: number }>('POST', '/artifacts/clean')
    return result.cleaned
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  async close(): Promise<void> {
    // No cleanup needed for HTTP client
  }
}

/**
 * Create a DBClient HTTP client
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
 * // List things
 * const users = await db.list({ ns: 'example.com', type: 'User' })
 *
 * // Create a thing
 * const user = await db.create({
 *   ns: 'example.com',
 *   type: 'User',
 *   id: 'user-1',
 *   data: { name: 'Alice', email: 'alice@example.com' }
 * })
 *
 * // Create relationship
 * await db.relate({
 *   type: 'author',
 *   from: 'https://example.com/Post/post-1',
 *   to: 'https://example.com/User/user-1'
 * })
 * ```
 */
export function createDBClient<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: DBClientConfig
): DBClientExtended<TData> {
  return new DBApiClient<TData>(config)
}
