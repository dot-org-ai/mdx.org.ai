/**
 * @mdxdb/rpc - RPC client for mdxdb
 *
 * Supports both HTTP and WebSocket transports for JSON-RPC 2.0 communication.
 * Compatible with rpc.do services.
 *
 * @example
 * ```ts
 * import { createRpcClient } from '@mdxdb/rpc'
 *
 * // HTTP transport (stateless)
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
 * const doc = await wsDb.get('posts/hello-world')
 * ```
 *
 * @packageDocumentation
 */

export { RpcClient, createRpcClient } from './client.js'

export type {
  // Database types
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
  // RPC types
  RpcClientConfig,
  Transport,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  DatabaseMethod,
  ConnectionState,
  RpcClientEvents,
} from './types.js'

// Re-export for convenience
export type { MDXLDDocument, MDXLDData } from 'mdxld'
