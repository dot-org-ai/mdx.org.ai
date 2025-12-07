/**
 * @mdxdb/rpc Types
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'

// ============================================================================
// Database interface types (defined locally to avoid circular dependency)
// These match the types in mdxdb/src/types.ts
// ============================================================================

/**
 * Query options for listing documents
 */
export interface ListOptions {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  type?: string | string[]
  prefix?: string
}

/**
 * Query result with pagination info
 */
export interface ListResult<TData extends MDXLDData = MDXLDData> {
  documents: MDXLDDocument<TData>[]
  total: number
  hasMore: boolean
}

/**
 * Search options
 */
export interface SearchOptions extends ListOptions {
  query: string
  fields?: string[]
  semantic?: boolean
}

/**
 * Search result with relevance info
 */
export interface SearchResult<TData extends MDXLDData = MDXLDData> extends ListResult<TData> {
  documents: Array<MDXLDDocument<TData> & { score?: number }>
}

/**
 * Get options
 */
export interface GetOptions {
  includeAst?: boolean
  includeCode?: boolean
}

/**
 * Set options
 */
export interface SetOptions {
  createOnly?: boolean
  updateOnly?: boolean
  version?: string
}

/**
 * Set result
 */
export interface SetResult {
  id: string
  version?: string
  created: boolean
}

/**
 * Delete options
 */
export interface DeleteOptions {
  soft?: boolean
  version?: string
}

/**
 * Delete result
 */
export interface DeleteResult {
  id: string
  deleted: boolean
}

/**
 * Database interface
 */
export interface Database<TData extends MDXLDData = MDXLDData> {
  list(options?: ListOptions): Promise<ListResult<TData>>
  search(options: SearchOptions): Promise<SearchResult<TData>>
  get(id: string, options?: GetOptions): Promise<MDXLDDocument<TData> | null>
  set(id: string, document: MDXLDDocument<TData>, options?: SetOptions): Promise<SetResult>
  delete(id: string, options?: DeleteOptions): Promise<DeleteResult>
  close?(): Promise<void>
}

// ============================================================================
// RPC-specific types
// ============================================================================

/**
 * RPC transport type
 */
export type Transport = 'http' | 'ws' | 'websocket'

/**
 * Configuration for the RPC client
 */
export interface RpcClientConfig {
  /**
   * RPC endpoint URL
   * - For HTTP: https://api.example.com/rpc or https://rpc.do/namespace
   * - For WebSocket: wss://api.example.com/rpc or wss://rpc.do/namespace
   */
  url: string

  /**
   * Transport type (default: auto-detected from URL scheme)
   * - 'http': Use HTTP POST for each RPC call
   * - 'ws' | 'websocket': Use persistent WebSocket connection
   */
  transport?: Transport

  /** API key or token for authentication (optional) */
  apiKey?: string

  /** Custom headers for HTTP transport */
  headers?: Record<string, string>

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number

  /** WebSocket reconnect options */
  reconnect?: {
    /** Enable automatic reconnection (default: true) */
    enabled?: boolean
    /** Maximum reconnection attempts (default: 5) */
    maxAttempts?: number
    /** Base delay between attempts in ms (default: 1000) */
    delay?: number
  }
}

/**
 * JSON-RPC 2.0 request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: unknown[] | Record<string, unknown>
}

/**
 * JSON-RPC 2.0 response
 */
export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string | number | null
  result?: T
  error?: JsonRpcError
}

/**
 * JSON-RPC 2.0 error
 */
export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

/**
 * RPC method names for Database operations
 */
export type DatabaseMethod = 'list' | 'search' | 'get' | 'set' | 'delete' | 'close'

/**
 * Connection state for WebSocket transport
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

/**
 * Event types for RPC client
 */
export interface RpcClientEvents {
  connect: () => void
  disconnect: (reason?: string) => void
  error: (error: Error) => void
  reconnect: (attempt: number) => void
}
