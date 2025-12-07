/**
 * @mdxdb/rpc DBClient Implementation
 *
 * JSON-RPC client implementing ai-database DBClient interface
 * Supports both HTTP and WebSocket transports
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
 * RPC transport type
 */
export type Transport = 'http' | 'ws' | 'websocket'

/**
 * Connection state for WebSocket transport
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

/**
 * Configuration for the DBClient RPC client
 */
export interface DBRpcClientConfig {
  /** RPC endpoint URL */
  url: string
  /** Transport type (default: auto-detected from URL scheme) */
  transport?: Transport
  /** API key or token for authentication */
  apiKey?: string
  /** Custom headers for HTTP transport */
  headers?: Record<string, string>
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
  /** WebSocket reconnect options */
  reconnect?: {
    enabled?: boolean
    maxAttempts?: number
    delay?: number
  }
}

/**
 * JSON-RPC 2.0 request
 */
interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: unknown[] | Record<string, unknown>
}

/**
 * JSON-RPC 2.0 response
 */
interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string | number | null
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

let requestId = 0
function nextId(): number {
  return ++requestId
}

/**
 * RPC client implementing DBClient interface
 *
 * Supports both HTTP and WebSocket transports for JSON-RPC 2.0 communication.
 *
 * @example
 * ```ts
 * import { createDBRpcClient } from '@mdxdb/rpc/db'
 *
 * // HTTP transport
 * const httpDb = createDBRpcClient({
 *   url: 'https://rpc.do/namespace',
 *   transport: 'http'
 * })
 *
 * // WebSocket transport
 * const wsDb = createDBRpcClient({
 *   url: 'wss://rpc.do/namespace',
 *   transport: 'ws'
 * })
 *
 * // Use like any DBClient
 * const things = await httpDb.list({ ns: 'example.com', type: 'User' })
 * ```
 */
export class DBRpcClient<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClientExtended<TData>
{
  private readonly url: string
  private readonly transport: Transport
  private readonly apiKey?: string
  private readonly headers: Record<string, string>
  private readonly timeout: number
  private readonly reconnectConfig: {
    enabled: boolean
    maxAttempts: number
    delay: number
  }

  // WebSocket state
  private ws: WebSocket | null = null
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private pendingRequests = new Map<
    number | string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >()

  constructor(config: DBRpcClientConfig) {
    this.url = config.url
    this.transport = config.transport ?? this.detectTransport(config.url)
    this.apiKey = config.apiKey
    this.headers = config.headers ?? {}
    this.timeout = config.timeout ?? 30000
    this.reconnectConfig = {
      enabled: config.reconnect?.enabled ?? true,
      maxAttempts: config.reconnect?.maxAttempts ?? 5,
      delay: config.reconnect?.delay ?? 1000,
    }
  }

  private detectTransport(url: string): Transport {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return 'ws'
    }
    return 'http'
  }

  private async callHttp<T>(method: string, params: unknown): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: nextId(),
      method: `db.${method}`,
      params: params as Record<string, unknown>,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.headers,
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      const result = (await response.json()) as JsonRpcResponse<T>

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.result as T
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    if (this.connectionState === 'connecting') {
      return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
          if (this.connectionState === 'connected') {
            clearInterval(checkConnection)
            resolve()
          } else if (this.connectionState === 'disconnected') {
            clearInterval(checkConnection)
            reject(new Error('WebSocket connection failed'))
          }
        }, 100)
      })
    }

    this.connectionState = 'connecting'

    return new Promise((resolve, reject) => {
      const wsUrl = this.apiKey ? `${this.url}?token=${this.apiKey}` : this.url
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.connectionState = 'connected'
        this.reconnectAttempts = 0
        resolve()
      }

      this.ws.onclose = () => {
        this.connectionState = 'disconnected'
        this.handleDisconnect()
      }

      this.ws.onerror = () => {
        this.connectionState = 'disconnected'
        reject(new Error('WebSocket connection error'))
      }

      this.ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data) as JsonRpcResponse
          const pending = this.pendingRequests.get(response.id!)

          if (pending) {
            this.pendingRequests.delete(response.id!)
            if (response.error) {
              pending.reject(new Error(response.error.message))
            } else {
              pending.resolve(response.result)
            }
          }
        } catch {
          // Ignore malformed messages
        }
      }
    })
  }

  private handleDisconnect(): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('WebSocket disconnected'))
    }
    this.pendingRequests.clear()

    if (
      this.reconnectConfig.enabled &&
      this.reconnectAttempts < this.reconnectConfig.maxAttempts
    ) {
      this.connectionState = 'reconnecting'
      this.reconnectAttempts++

      const delay = this.reconnectConfig.delay * Math.pow(2, this.reconnectAttempts - 1)
      setTimeout(() => {
        this.ensureConnection().catch(() => {})
      }, delay)
    }
  }

  private async callWs<T>(method: string, params: unknown): Promise<T> {
    await this.ensureConnection()

    const id = nextId()
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method: `db.${method}`,
      params: params as Record<string, unknown>,
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('RPC request timeout'))
      }, this.timeout)

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutId)
          resolve(value as T)
        },
        reject: (error) => {
          clearTimeout(timeoutId)
          reject(error)
        },
      })

      this.ws!.send(JSON.stringify(request))
    })
  }

  private async call<T>(method: string, params: unknown): Promise<T> {
    if (this.transport === 'http') {
      return this.callHttp<T>(method, params)
    }
    return this.callWs<T>(method, params)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    return this.call<Thing<TData>[]>('list', options)
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    return this.call<Thing<TData>[]>('find', options)
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    return this.call<Thing<TData>[]>('search', options)
  }

  async get(url: string): Promise<Thing<TData> | null> {
    try {
      return await this.call<Thing<TData> | null>('get', { url })
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async getById(ns: string, type: string, id: string): Promise<Thing<TData> | null> {
    return this.call<Thing<TData> | null>('getById', { ns, type, id })
  }

  async set(url: string, data: TData): Promise<Thing<TData>> {
    return this.call<Thing<TData>>('set', { url, data })
  }

  async create(options: CreateOptions<TData>): Promise<Thing<TData>> {
    return this.call<Thing<TData>>('create', options)
  }

  async update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>> {
    return this.call<Thing<TData>>('update', { url, ...options })
  }

  async upsert(options: CreateOptions<TData>): Promise<Thing<TData>> {
    return this.call<Thing<TData>>('upsert', options)
  }

  async delete(url: string): Promise<boolean> {
    return this.call<boolean>('delete', { url })
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
    return this.call<Relationship<T>>('relate', options)
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    return this.call<boolean>('unrelate', { from, type, to })
  }

  async related(
    url: string,
    relationshipType?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Thing<TData>[]> {
    return this.call<Thing<TData>[]>('related', { url, type: relationshipType, direction })
  }

  async relationships(
    url: string,
    type?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Relationship[]> {
    return this.call<Relationship[]>('relationships', { url, type, direction })
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    return this.call<Thing<TData>[]>('references', { url, type: relationshipType })
  }

  // ===========================================================================
  // Event Operations (Extended)
  // ===========================================================================

  async track<T extends Record<string, unknown>>(options: CreateEventOptions<T>): Promise<Event<T>> {
    return this.call<Event<T>>('track', options)
  }

  async getEvent(id: string): Promise<Event | null> {
    try {
      return await this.call<Event | null>('getEvent', { id })
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    return this.call<Event[]>('queryEvents', options)
  }

  // ===========================================================================
  // Action Operations (Extended)
  // ===========================================================================

  async send<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    return this.call<Action<T>>('send', options)
  }

  async do<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    return this.call<Action<T>>('do', options)
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
      return await this.call<Action | null>('getAction', { id })
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    return this.call<Action[]>('queryActions', options)
  }

  async startAction(id: string): Promise<Action> {
    return this.call<Action>('startAction', { id })
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    return this.call<Action>('completeAction', { id, result })
  }

  async failAction(id: string, error: string): Promise<Action> {
    return this.call<Action>('failAction', { id, error })
  }

  async cancelAction(id: string): Promise<Action> {
    return this.call<Action>('cancelAction', { id })
  }

  // ===========================================================================
  // Artifact Operations (Extended)
  // ===========================================================================

  async storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>> {
    return this.call<Artifact<T>>('storeArtifact', options)
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    try {
      return await this.call<Artifact<T> | null>('getArtifact', { key })
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    try {
      return await this.call<Artifact | null>('getArtifactBySource', { source, type })
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  async deleteArtifact(key: string): Promise<boolean> {
    return this.call<boolean>('deleteArtifact', { key })
  }

  async cleanExpiredArtifacts(): Promise<number> {
    return this.call<number>('cleanExpiredArtifacts', {})
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connectionState = 'disconnected'
    this.pendingRequests.clear()
  }
}

/**
 * Create a DBClient RPC client
 *
 * @example
 * ```ts
 * import { createDBRpcClient } from '@mdxdb/rpc/db'
 *
 * // HTTP transport (stateless)
 * const httpDb = createDBRpcClient({
 *   url: 'https://rpc.do/namespace',
 *   transport: 'http',
 *   apiKey: process.env.RPC_API_KEY
 * })
 *
 * // WebSocket transport (persistent connection)
 * const wsDb = createDBRpcClient({
 *   url: 'wss://rpc.do/namespace',
 *   transport: 'ws',
 *   apiKey: process.env.RPC_API_KEY,
 *   reconnect: {
 *     enabled: true,
 *     maxAttempts: 10,
 *     delay: 500
 *   }
 * })
 *
 * // Use like any DBClient
 * const things = await httpDb.list({ ns: 'example.com', type: 'User' })
 * const thing = await wsDb.get('https://example.com/User/123')
 * ```
 */
export function createDBRpcClient<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: DBRpcClientConfig
): DBClientExtended<TData> & { getConnectionState: () => ConnectionState } {
  return new DBRpcClient<TData>(config)
}
