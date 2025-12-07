/**
 * @mdxdb/server - HTTP API server for mdxdb
 *
 * A Hono-based REST API server that exposes any mdxdb Database implementation.
 * Works with any backend (fs, sqlite, postgres, etc.) and any runtime (Node.js, Cloudflare Workers, Deno, Bun).
 *
 * Supports two interfaces:
 * - `createServer()` - Simple Database interface for MDX documents
 * - `createDBServer()` - ai-database DBClient interface for Things, Relationships, Events, Actions, Artifacts
 *
 * @example Simple Database interface
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
 * @example DBClient interface (ai-database compatible)
 * ```ts
 * import { createDBServer } from '@mdxdb/server'
 * import { createClickHouseDatabase } from '@mdxdb/clickhouse'
 * import { serve } from '@hono/node-server'
 *
 * const db = await createClickHouseDatabase({ url: 'http://localhost:8123' })
 * const app = createDBServer({ client: db })
 *
 * serve({ fetch: app.fetch, port: 3000 })
 * ```
 *
 * @packageDocumentation
 */

// Simple Database interface server
export { createServer, createApiServer } from './server.js'
export type { Server, ApiServer } from './server.js'

// DBClient interface server (ai-database compatible)
export { createDBServer } from './db-server.js'
export type { DBServer } from './db-server.js'

export type {
  // Simple interface types
  ServerConfig,
  ApiServerConfig,
  ApiResponse,
  ListQuery,
  SearchQuery,
  SetBody,
  DeleteQuery,
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
  // DBClient interface types
  DBServerConfig,
  ThingQuery,
  ThingFindQuery,
  ThingSearchQuery,
  CreateThingBody,
  UpdateThingBody,
  RelateBody,
  EventQuery,
  CreateEventBody,
  ActionQuery,
  CreateActionBody,
  CompleteActionBody,
  FailActionBody,
  StoreArtifactBody,
  // Re-export ai-database types
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
} from './types.js'

// Re-export for convenience
export type { MDXLDDocument, MDXLDData } from 'mdxld'
