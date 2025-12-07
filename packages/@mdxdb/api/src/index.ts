/**
 * @mdxdb/api - HTTP API client for mdxdb
 *
 * A fetch-based REST client that connects to a mdxdb server.
 * Supports both the simple Database interface and the ai-database DBClient interface.
 *
 * @example Simple Database interface
 * ```ts
 * import { createClient } from '@mdxdb/api'
 *
 * const db = createClient({
 *   baseUrl: 'https://api.example.com/api/mdxdb',
 *   apiKey: process.env.MDXDB_API_KEY
 * })
 *
 * // Use like any other Database implementation
 * const docs = await db.list({ type: 'Post' })
 * const doc = await db.get('posts/hello-world')
 * ```
 *
 * @example DBClient interface (ai-database compatible)
 * ```ts
 * import { createDBClient } from '@mdxdb/api/db'
 *
 * const db = createDBClient({
 *   baseUrl: 'http://localhost:3000/api/db',
 *   apiKey: process.env.API_KEY
 * })
 *
 * // Use like any DBClient implementation
 * const things = await db.list({ ns: 'example.com', type: 'User' })
 * const thing = await db.get('https://example.com/User/123')
 * ```
 *
 * @packageDocumentation
 */

// Simple Database interface client
export { ApiClient, createClient, createApiClient } from './client.js'

// DBClient interface client (ai-database compatible)
export { DBApiClient, createDBClient } from './db-client.js'
export type { DBClientConfig } from './db-client.js'

export type {
  ClientConfig,
  ApiClientConfig,
  ApiResponse,
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
} from './types.js'

// Re-export for convenience
export type { MDXLDDocument, MDXLDData } from 'mdxld'
