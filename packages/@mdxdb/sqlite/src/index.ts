/**
 * @mdxdb/sqlite - Cloudflare Durable Objects SQLite adapter for mdxdb
 *
 * A Durable Objects-based implementation with:
 * - Things: Graph nodes following ai-database conventions
 * - Relationships: Graph edges between things
 * - Search: Chunked content with vector embeddings for semantic search
 * - Events: Immutable event log
 * - Actions: Durable action tracking
 * - Artifacts: Cached compiled content
 *
 * Uses Workers RPC for direct method calls on Durable Object stubs.
 * Each namespace gets its own Durable Object with isolated SQLite storage.
 *
 * @example Workers
 * ```ts
 * import { createMDXClient, MDXDatabase } from '@mdxdb/sqlite'
 *
 * // Export the Durable Object for wrangler.toml
 * export { MDXDatabase }
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const client = createMDXClient({
 *       namespace: 'example.com',
 *       binding: env.MDXDB,
 *     })
 *
 *     const posts = await client.list({ type: 'Post' })
 *     return Response.json(posts)
 *   }
 * }
 * ```
 *
 * @example Node.js with miniflare
 * ```ts
 * import { createMiniflareClient } from '@mdxdb/sqlite'
 *
 * const client = await createMiniflareClient({
 *   namespace: 'example.com',
 *   persistPath: './.data',
 * })
 *
 * await client.create({
 *   ns: 'example.com',
 *   type: 'Post',
 *   data: { title: 'Hello World' }
 * })
 * ```
 *
 * @example In-memory testing
 * ```ts
 * import { createInMemoryBinding, MDXClient } from '@mdxdb/sqlite'
 *
 * const binding = createInMemoryBinding()
 * const id = binding.idFromName('test.local')
 * const stub = binding.get(id)
 * const client = new MDXClient(stub, 'test.local')
 *
 * // Use in tests
 * const thing = await client.create({ ... })
 * ```
 *
 * @packageDocumentation
 */

export const name = '@mdxdb/sqlite'

// Durable Object class (export for Workers)
export { MDXDatabase } from './durable-object.js'

// Client for calling DO methods via RPC
export { MDXClient, createMDXClient, createMiniflareClient } from './client.js'

// Miniflare integration for Node.js
export {
  createMiniflareBinding,
  createInMemoryBinding,
  disposeMiniflare,
} from './miniflare.js'

// Sync manager for forwarding mutations
export { SyncManager, createSyncManager } from './sync.js'
export type { SyncTarget, MutationType, MutationEvent, SyncResult } from './sync.js'

// Types
export type {
  // Cloudflare types
  SqlStorageCursor,
  SqlStorage,
  DurableObjectStorage,
  DurableObjectState,
  DurableObjectId,
  DurableObjectNamespace,
  DurableObjectStub,

  // Entity types
  Thing,
  Relationship,
  Event,
  Action,
  Artifact,
  ActionStatus,
  ArtifactType,

  // Query/operation options
  QueryOptions,
  SearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  VectorSearchOptions,
  VectorSearchResult,

  // RPC interface
  MDXDatabaseRPC,

  // Environment
  Env,

  // Config
  MDXClientConfig,

  // Internal row types
  ThingRow,
  RelationshipRow,
  SearchRow,
  EventRow,
  ActionRow,
  ArtifactRow,
  Chunk,
} from './types.js'
