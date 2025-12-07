/**
 * @mdxdb/server - HTTP API server for mdxdb
 *
 * A Hono-based REST API server that exposes any mdxdb Database implementation.
 * Works with any backend (fs, sqlite, postgres, etc.) and any runtime (Node.js, Cloudflare Workers, Deno, Bun).
 *
 * @example
 * ```ts
 * import { createServer } from '@mdxdb/server'
 * import { createFsDatabase } from '@mdxdb/fs'
 * import { serve } from '@hono/node-server'
 *
 * const db = createFsDatabase({ root: './content' })
 * const app = createServer({ database: db })
 *
 * serve({ fetch: app.fetch, port: 3000 })
 * ```
 *
 * @packageDocumentation
 */

export { createServer, createApiServer } from './server.js'
export type { Server, ApiServer } from './server.js'

export type {
  ServerConfig,
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
