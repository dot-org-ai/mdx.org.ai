/**
 * @mdxdb/rpc - RPC client for mdxdb
 *
 * Supports both HTTP and WebSocket transports for JSON-RPC 2.0 communication.
 * Compatible with rpc.do services.
 *
 * Supports two interfaces:
 * - `createRpcClient()` - Simple Database interface for MDX documents
 * - `createDBRpcClient()` - ai-database DBClient interface for Things, Relationships, Events, Actions, Artifacts
 *
 * @example Simple Database interface
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
 * @example DBClient interface (ai-database compatible)
 * ```ts
 * import { createDBRpcClient } from '@mdxdb/rpc/db'
 *
 * const db = createDBRpcClient({
 *   url: 'https://rpc.do/namespace',
 *   apiKey: process.env.API_KEY
 * })
 *
 * // Use like any DBClient implementation
 * const things = await db.list({ ns: 'example.com', type: 'User' })
 * ```
 *
 * @packageDocumentation
 */

// Simple Database interface client
export { RpcClient, createRpcClient } from './client.js'

// DBClient interface client (ai-database compatible)
export { DBRpcClient, createDBRpcClient } from './db-client.js'
export type { DBRpcClientConfig } from './db-client.js'

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
