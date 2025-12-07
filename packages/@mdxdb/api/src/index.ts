/**
 * @mdxdb/api - HTTP API client for mdxdb
 *
 * A fetch-based REST client that connects to a mdxdb server.
 * Implements the Database interface for seamless integration.
 *
 * @example
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
 * @packageDocumentation
 */

export { ApiClient, createClient, createApiClient } from './client.js'

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
