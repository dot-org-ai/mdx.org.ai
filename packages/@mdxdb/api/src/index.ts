/**
 * @mdxdb/api - HTTP API server for mdxdb
 *
 * A Hono-based REST API server that exposes any mdxdb Database implementation.
 * Works with any backend (fs, sqlite, postgres, etc.) and any runtime (Node.js, Cloudflare Workers, Deno, Bun).
 *
 * @packageDocumentation
 */

export const name = '@mdxdb/api'

// Main exports
export { createApiServer } from './server.js'
export type { ApiServer } from './server.js'

// Types
export type {
  ApiServerConfig,
  ApiResponse,
  ListQuery,
  SearchQuery,
  SetBody,
  DeleteQuery,
} from './types.js'

// Re-export for convenience
export type { Database } from 'mdxdb'
export type { MDXLDDocument, MDXLDData } from 'mdxld'
