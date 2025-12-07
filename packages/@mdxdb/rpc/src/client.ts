/**
 * @mdxdb/rpc Client Implementation
 *
 * RPC client supporting HTTP and WebSocket transports
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type {
  Database,
  ListOptions,
  ListResult,
  SearchOptions,
  SearchResult,
  GetOptions,
  SetOptions,
  SetResult,
  DeleteOptions,
  DeleteResult,
  RpcClientConfig,
  Transport,
  JsonRpcRequest,
  JsonRpcResponse,
  ConnectionState,
} from './types.js'

/**
 * Generate unique request ID
 */
let requestId = 0
function nextId(): number {
  return ++requestId
}

/**
 * RPC client for mdxdb
 *
 * Supports both HTTP and WebSocket transports for JSON-RPC 2.0 communication.
 *
 * @example
 * ```ts
 * import { createRpcClient } from '@mdxdb/rpc'
 *
 * // HTTP transport
 * const httpDb = createRpcClient({
 *   url: 'https://rpc.do/my-namespace',
 *   transport: 'http'
 * })
 *
 * // WebSocket transport (persistent connection)
 * const wsDb = createRpcClient({
 *   url: 'wss://rpc.do/my-namespace',
 *   transport: 'ws'
 * })
 *
 * // Use like any other Database implementation
 * const docs = await httpDb.list({ type: 'Post' })
 * ```
 */
export class RpcClient<TData extends MDXLDData = MDXLDData> implements Database<TData> {
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

  constructor(config: RpcClientConfig) {
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

  /**
   * Auto-detect transport from URL scheme
   */
  private detectTransport(url: string): Transport {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return 'ws'
    }
    return 'http'
  }

  /**
   * Make an RPC call via HTTP
   */
  private async callHttp<T>(method: string, params: unknown): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: nextId(),
      method: `mdxdb.${method}`,
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

  /**
   * Ensure WebSocket connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    if (this.connectionState === 'connecting') {
      // Wait for existing connection attempt
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

      this.ws.onerror = (event) => {
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

  /**
   * Handle WebSocket disconnect with optional reconnection
   */
  private handleDisconnect(): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('WebSocket disconnected'))
    }
    this.pendingRequests.clear()

    // Attempt reconnection if enabled
    if (
      this.reconnectConfig.enabled &&
      this.reconnectAttempts < this.reconnectConfig.maxAttempts
    ) {
      this.connectionState = 'reconnecting'
      this.reconnectAttempts++

      const delay = this.reconnectConfig.delay * Math.pow(2, this.reconnectAttempts - 1)
      setTimeout(() => {
        this.ensureConnection().catch(() => {
          // Reconnection failed, will retry or give up
        })
      }, delay)
    }
  }

  /**
   * Make an RPC call via WebSocket
   */
  private async callWs<T>(method: string, params: unknown): Promise<T> {
    await this.ensureConnection()

    const id = nextId()
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method: `mdxdb.${method}`,
      params: params as Record<string, unknown>,
    }

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('RPC request timeout'))
      }, this.timeout)

      // Store pending request
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

      // Send request
      this.ws!.send(JSON.stringify(request))
    })
  }

  /**
   * Make an RPC call using configured transport
   */
  private async call<T>(method: string, params: unknown): Promise<T> {
    if (this.transport === 'http') {
      return this.callHttp<T>(method, params)
    }
    return this.callWs<T>(method, params)
  }

  /**
   * Get current connection state (WebSocket only)
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * List documents with optional filtering and pagination
   */
  async list(options: ListOptions = {}): Promise<ListResult<TData>> {
    return this.call<ListResult<TData>>('list', options)
  }

  /**
   * Search documents by query
   */
  async search(options: SearchOptions): Promise<SearchResult<TData>> {
    return this.call<SearchResult<TData>>('search', options)
  }

  /**
   * Get a document by ID
   */
  async get(id: string, options: GetOptions = {}): Promise<MDXLDDocument<TData> | null> {
    try {
      return await this.call<MDXLDDocument<TData> | null>('get', { id, ...options })
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  /**
   * Set/create a document
   */
  async set(
    id: string,
    document: MDXLDDocument<TData>,
    options: SetOptions = {}
  ): Promise<SetResult> {
    return this.call<SetResult>('set', { id, document, ...options })
  }

  /**
   * Delete a document
   */
  async delete(id: string, options: DeleteOptions = {}): Promise<DeleteResult> {
    try {
      return await this.call<DeleteResult>('delete', { id, ...options })
    } catch (error) {
      if (String(error).includes('not found')) {
        return { id, deleted: false }
      }
      throw error
    }
  }

  /**
   * Close the client and WebSocket connection
   */
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
 * Create an RPC client instance
 *
 * @example
 * ```ts
 * import { createRpcClient } from '@mdxdb/rpc'
 *
 * // HTTP transport (stateless, one request per call)
 * const httpDb = createRpcClient({
 *   url: 'https://rpc.do/my-namespace',
 *   transport: 'http',
 *   apiKey: process.env.RPC_API_KEY
 * })
 *
 * // WebSocket transport (persistent connection, lower latency)
 * const wsDb = createRpcClient({
 *   url: 'wss://rpc.do/my-namespace',
 *   transport: 'ws',
 *   apiKey: process.env.RPC_API_KEY,
 *   reconnect: {
 *     enabled: true,
 *     maxAttempts: 10,
 *     delay: 500
 *   }
 * })
 *
 * // Use like any other Database
 * const { documents } = await httpDb.list({ type: 'BlogPost' })
 * const doc = await wsDb.get('posts/hello-world')
 * ```
 */
export function createRpcClient<TData extends MDXLDData = MDXLDData>(
  config: RpcClientConfig
): Database<TData> & { getConnectionState: () => ConnectionState } {
  return new RpcClient<TData>(config)
}
