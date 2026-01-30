/**
 * @mdxdb/rpc DBClient Implementation
 *
 * RPC client implementing ai-database DBClient interface using rpc.do
 * Uses HTTP transport for stateless requests
 *
 * @packageDocumentation
 */

import { RPC, http, ws, capnweb, type Transport, type RPCProxy, type RPCPromise } from 'rpc.do'
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
 * ThingRef - A Thing that supports calling exported functions directly
 *
 * With capnweb's RPCPromise pipelining, you can call methods on a Thing
 * without awaiting, and they get batched into a single round trip.
 *
 * @example
 * ```ts
 * const thing = db.get('https://example.com/Post/hello')
 *
 * // Call exported functions directly - pipelined!
 * const result = await thing.add(1, 2)
 *
 * // Chain multiple calls - still one round trip
 * const doubled = await thing.add(1, 2).then(r => thing.multiply(r, 2))
 *
 * // Use .map() to run transforms server-side
 * const titles = await db.list().map(t => t.data.title)
 * ```
 */
export type ThingRef<TData extends Record<string, unknown> = Record<string, unknown>> =
  Thing<TData> & {
    /** Call any exported function - routes through RPC */
    [key: string]: ((...args: unknown[]) => RPCPromise<unknown>) | unknown
  }

/**
 * RPC transport type
 *
 * - 'http' - Simple HTTP POST (stateless)
 * - 'ws' - WebSocket (persistent, message correlation)
 * - 'capnweb' - capnweb RPC (pipelining, .map(), pass-by-reference)
 */
export type TransportType = 'http' | 'ws' | 'capnweb'

/**
 * Configuration for the DBClient RPC client
 */
export interface DBRpcClientConfig {
  /** RPC endpoint URL */
  url: string
  /** Transport type (default: 'capnweb') */
  transport?: TransportType
  /** API key or token for authentication */
  apiKey?: string
}

/**
 * DBClient RPC interface - methods exposed by the server
 */
/**
 * Call options for executing exported functions
 */
interface CallOptions {
  fn: string
  args?: unknown[]
  timeout?: number
}

/**
 * Result from calling a function
 */
interface CallResult<T = unknown> {
  result: T
  duration: number
  logs?: string[]
}

interface DBClientRPC<TData extends Record<string, unknown> = Record<string, unknown>> {
  db: {
    // Thing operations
    list(options?: QueryOptions): Thing<TData>[]
    find(options: QueryOptions): Thing<TData>[]
    search(options: ThingSearchOptions): Thing<TData>[]
    get(url: string): Thing<TData> | null
    getById(ns: string, type: string, id: string): Thing<TData> | null
    set(url: string, data: TData): Thing<TData>
    create(options: CreateOptions<TData>): Thing<TData>
    update(url: string, options: UpdateOptions<TData>): Thing<TData>
    upsert(options: CreateOptions<TData>): Thing<TData>
    delete(url: string): boolean

    // Code execution
    call<T = unknown>(url: string, options: CallOptions): CallResult<T>

    // Relationship operations
    relate<T extends Record<string, unknown>>(options: RelateOptions<T>): Relationship<T>
    unrelate(from: string, type: string, to: string): boolean
    related(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Thing<TData>[]
    relationships(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Relationship[]
    references(url: string, type?: string): Thing<TData>[]

    // Event operations
    track<T extends Record<string, unknown>>(options: CreateEventOptions<T>): Event<T>
    getEvent(id: string): Event | null
    queryEvents(options?: EventQueryOptions): Event[]

    // Action operations
    send<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Action<T>
    do<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Action<T>
    getAction(id: string): Action | null
    queryActions(options?: ActionQueryOptions): Action[]
    startAction(id: string): Action
    completeAction(id: string, result?: unknown): Action
    failAction(id: string, error: string): Action
    cancelAction(id: string): Action

    // Artifact operations
    storeArtifact<T>(options: StoreArtifactOptions<T>): Artifact<T>
    getArtifact<T>(key: string): Artifact<T> | null
    getArtifactBySource(source: string, type: ArtifactType): Artifact | null
    deleteArtifact(key: string): boolean
    cleanExpiredArtifacts(): number
  }
}

/**
 * RPC client implementing DBClient interface using rpc.do
 *
 * @example
 * ```ts
 * import { createDBRpcClient } from '@mdxdb/rpc/db'
 *
 * // HTTP transport
 * const db = createDBRpcClient({
 *   url: 'https://rpc.do/namespace',
 *   apiKey: process.env.RPC_API_KEY
 * })
 *
 * // Use like any DBClient
 * const things = await db.list({ ns: 'example.com', type: 'User' })
 * ```
 */
export class DBRpcClient<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClientExtended<TData>
{
  private readonly rpc: RPCProxy<DBClientRPC<TData>>
  private readonly transport: Transport

  constructor(config: DBRpcClientConfig) {
    const authProvider = config.apiKey ? () => config.apiKey : undefined
    const transportType = config.transport ?? 'capnweb'

    switch (transportType) {
      case 'ws':
        this.transport = ws(config.url, authProvider)
        break
      case 'http':
        this.transport = http(config.url, authProvider)
        break
      case 'capnweb':
      default:
        this.transport = capnweb(config.url)
        break
    }

    this.rpc = RPC<DBClientRPC<TData>>(this.transport)
  }

  // ===========================================================================
  // Date Conversion Helpers (JSON serialization loses Date types)
  // ===========================================================================

  private convertThingDates(thing: Thing<TData> | null): Thing<TData> | null {
    if (!thing) return null
    return {
      ...thing,
      createdAt: thing.createdAt ? new Date(thing.createdAt as unknown as string) : new Date(),
      updatedAt: thing.updatedAt ? new Date(thing.updatedAt as unknown as string) : new Date(),
    }
  }

  private convertThingsDates(things: Thing<TData>[]): Thing<TData>[] {
    return things.map((thing) => this.convertThingDates(thing)!)
  }

  private convertRelationshipDates<T extends Record<string, unknown>>(rel: Relationship<T> | null): Relationship<T> | null {
    if (!rel) return null
    return {
      ...rel,
      createdAt: rel.createdAt ? new Date(rel.createdAt as unknown as string) : new Date(),
    }
  }

  private convertRelationshipsDates<T extends Record<string, unknown>>(rels: Relationship<T>[]): Relationship<T>[] {
    return rels.map((rel) => this.convertRelationshipDates(rel)!)
  }

  private convertEventDates<T extends Record<string, unknown>>(event: Event<T> | null): Event<T> | null {
    if (!event) return null
    return {
      ...event,
      timestamp: event.timestamp ? new Date(event.timestamp as unknown as string) : new Date(),
    }
  }

  private convertEventsDates<T extends Record<string, unknown>>(events: Event<T>[]): Event<T>[] {
    return events.map((event) => this.convertEventDates(event)!)
  }

  private convertActionDates<T extends Record<string, unknown>>(action: Action<T> | null): Action<T> | null {
    if (!action) return null
    return {
      ...action,
      createdAt: action.createdAt ? new Date(action.createdAt as unknown as string) : new Date(),
      updatedAt: action.updatedAt ? new Date(action.updatedAt as unknown as string) : new Date(),
      startedAt: action.startedAt ? new Date(action.startedAt as unknown as string) : undefined,
      completedAt: action.completedAt ? new Date(action.completedAt as unknown as string) : undefined,
    }
  }

  private convertActionsDates<T extends Record<string, unknown>>(actions: Action<T>[]): Action<T>[] {
    return actions.map((action) => this.convertActionDates(action)!)
  }

  private convertArtifactDates<T>(artifact: Artifact<T> | null): Artifact<T> | null {
    if (!artifact) return null
    return {
      ...artifact,
      createdAt: artifact.createdAt ? new Date(artifact.createdAt as unknown as string) : new Date(),
      expiresAt: artifact.expiresAt ? new Date(artifact.expiresAt as unknown as string) : undefined,
    }
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  /**
   * List things with optional filtering
   *
   * Returns an RPCPromise that supports .map() for server-side transforms.
   *
   * @example
   * ```ts
   * // Get all titles - .map() runs server-side!
   * const titles = await db.list({ type: 'Post' }).map(t => t.data.title)
   * ```
   */
  list(options: QueryOptions = {}): RPCPromise<Thing<TData>[]> {
    return this.rpc.db.list(options) as RPCPromise<Thing<TData>[]>
  }

  /**
   * Find things matching criteria
   *
   * Returns an RPCPromise that supports .map() for server-side transforms.
   */
  find(options: QueryOptions): RPCPromise<Thing<TData>[]> {
    return this.rpc.db.find(options) as RPCPromise<Thing<TData>[]>
  }

  /**
   * Search things by query
   *
   * Returns an RPCPromise that supports .map() for server-side transforms.
   */
  search(options: ThingSearchOptions): RPCPromise<Thing<TData>[]> {
    return this.rpc.db.search(options) as RPCPromise<Thing<TData>[]>
  }

  /**
   * Get a Thing reference by URL
   *
   * Returns an RPCPromise that supports pipelining - you can call methods
   * on it without awaiting first, and they'll be batched into a single round trip.
   *
   * @example
   * ```ts
   * // These get pipelined into a single round trip
   * const thing = db.get('https://example.com/Post/hello')
   * const result = await thing.add(1, 2)
   *
   * // Or with .map() which runs server-side
   * const items = await db.list().map(t => t.data.title)
   * ```
   */
  get(url: string): RPCPromise<Thing<TData> | null> & ThingRef<TData> {
    // Return the RPC promise directly - capnweb handles pipelining
    // Any method calls on this will be proxied to the server
    return this.rpc.db.get(url) as RPCPromise<Thing<TData> | null> & ThingRef<TData>
  }

  /**
   * Call an exported function on a thing
   */
  call<T = unknown>(url: string, options: CallOptions): RPCPromise<CallResult<T>> {
    return this.rpc.db.call(url, options) as RPCPromise<CallResult<T>>
  }

  /**
   * Get a Thing reference by namespace, type, and id
   *
   * Like get(), supports pipelining for direct method calls.
   */
  getById(ns: string, type: string, id: string): RPCPromise<Thing<TData> | null> & ThingRef<TData> {
    return this.rpc.db.getById(ns, type, id) as RPCPromise<Thing<TData> | null> & ThingRef<TData>
  }

  async set(url: string, data: TData): Promise<Thing<TData>> {
    const thing = await this.rpc.db.set(url, data)
    return this.convertThingDates(thing)!
  }

  async create(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const thing = await this.rpc.db.create(options)
    return this.convertThingDates(thing)!
  }

  async update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>> {
    const thing = await this.rpc.db.update(url, options)
    return this.convertThingDates(thing)!
  }

  async upsert(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const thing = await this.rpc.db.upsert(options)
    return this.convertThingDates(thing)!
  }

  async delete(url: string): Promise<boolean> {
    return this.rpc.db.delete(url)
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
    const rel = await this.rpc.db.relate(options)
    return this.convertRelationshipDates(rel as Relationship<T>)!
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    return this.rpc.db.unrelate(from, type, to)
  }

  async related(
    url: string,
    relationshipType?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Thing<TData>[]> {
    const things = await this.rpc.db.related(url, relationshipType, direction)
    return this.convertThingsDates(things)
  }

  async relationships(
    url: string,
    type?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Relationship[]> {
    const rels = await this.rpc.db.relationships(url, type, direction)
    return this.convertRelationshipsDates(rels)
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    const things = await this.rpc.db.references(url, relationshipType)
    return this.convertThingsDates(things)
  }

  // ===========================================================================
  // Event Operations (Extended)
  // ===========================================================================

  async track<T extends Record<string, unknown>>(options: CreateEventOptions<T>): Promise<Event<T>> {
    const event = await this.rpc.db.track(options)
    return this.convertEventDates(event as Event<T>)!
  }

  async getEvent(id: string): Promise<Event | null> {
    const event = await this.rpc.db.getEvent(id)
    return this.convertEventDates(event)
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    const events = await this.rpc.db.queryEvents(options)
    return this.convertEventsDates(events)
  }

  // ===========================================================================
  // Action Operations (Extended)
  // ===========================================================================

  async send<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    const action = await this.rpc.db.send(options)
    return this.convertActionDates(action as Action<T>)!
  }

  async do<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    const action = await this.rpc.db.do(options)
    return this.convertActionDates(action as Action<T>)!
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
    const action = await this.rpc.db.getAction(id)
    return this.convertActionDates(action)
  }

  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    const actions = await this.rpc.db.queryActions(options)
    return this.convertActionsDates(actions)
  }

  async startAction(id: string): Promise<Action> {
    const action = await this.rpc.db.startAction(id)
    return this.convertActionDates(action)!
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    const action = await this.rpc.db.completeAction(id, result)
    return this.convertActionDates(action)!
  }

  async failAction(id: string, error: string): Promise<Action> {
    const action = await this.rpc.db.failAction(id, error)
    return this.convertActionDates(action)!
  }

  async cancelAction(id: string): Promise<Action> {
    const action = await this.rpc.db.cancelAction(id)
    return this.convertActionDates(action)!
  }

  // ===========================================================================
  // Artifact Operations (Extended)
  // ===========================================================================

  async storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>> {
    const artifact = await this.rpc.db.storeArtifact(options)
    return this.convertArtifactDates(artifact as Artifact<T>)!
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    const artifact = await this.rpc.db.getArtifact(key)
    return this.convertArtifactDates(artifact as Artifact<T> | null)
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    const artifact = await this.rpc.db.getArtifactBySource(source, type)
    return this.convertArtifactDates(artifact)
  }

  async deleteArtifact(key: string): Promise<boolean> {
    return this.rpc.db.deleteArtifact(key)
  }

  async cleanExpiredArtifacts(): Promise<number> {
    return this.rpc.db.cleanExpiredArtifacts()
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  async close(): Promise<void> {
    if (this.transport.close) {
      this.transport.close()
    }
  }
}

/**
 * Create a DBClient RPC client using rpc.do
 *
 * @example
 * ```ts
 * import { createDBRpcClient } from '@mdxdb/rpc/db'
 *
 * // HTTP transport
 * const db = createDBRpcClient({
 *   url: 'https://rpc.do/namespace',
 *   apiKey: process.env.RPC_API_KEY
 * })
 *
 * // Use like any DBClient
 * const things = await db.list({ ns: 'example.com', type: 'User' })
 * const thing = await db.get('https://example.com/User/123')
 * ```
 */
export function createDBRpcClient<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: DBRpcClientConfig
): DBClientExtended<TData> {
  return new DBRpcClient<TData>(config)
}
