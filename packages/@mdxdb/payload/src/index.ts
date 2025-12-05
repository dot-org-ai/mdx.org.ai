/**
 * @mdxdb/payload - Payload CMS database adapter for mdxdb
 *
 * Provides database adapters that use mdxdb's graph-based storage:
 * - SQLite adapter using Cloudflare Durable Objects
 * - ClickHouse adapter using HTTP client
 *
 * Also exposes mdxdb's native entities as Payload collections:
 * - Things (graph nodes)
 * - Relationships (graph edges)
 * - Search (indexed content with embeddings)
 * - Events (immutable event log)
 * - Actions (jobs/tasks/workflows queue)
 * - Artifacts (cached compiled content)
 *
 * @example SQLite on Workers
 * ```ts
 * import { sqliteAdapter, getNativeCollections } from '@mdxdb/payload'
 *
 * export default buildConfig({
 *   db: sqliteAdapter({
 *     binding: env.MDXDB,
 *     namespace: 'example.com',
 *   }),
 *   collections: [
 *     ...getNativeCollections(),
 *     Posts,
 *     Authors,
 *   ],
 * })
 * ```
 *
 * @example ClickHouse
 * ```ts
 * import { clickhouseAdapter } from '@mdxdb/payload/clickhouse'
 *
 * export default buildConfig({
 *   db: clickhouseAdapter({
 *     url: env.CLICKHOUSE_URL,
 *     username: env.CLICKHOUSE_USERNAME,
 *     password: env.CLICKHOUSE_PASSWORD,
 *   }),
 *   collections: [Posts, Authors],
 * })
 * ```
 *
 * @packageDocumentation
 */

export const name = '@mdxdb/payload'

// SQLite adapter (default)
export { sqliteAdapter, SQLiteClient } from './sqlite.js'

// ClickHouse adapter
export { clickhouseAdapter, ClickHouseClient } from './clickhouse.js'

// Native mdxdb collections
export {
  getNativeCollections,
  createVirtualCollection,
  ThingsCollection,
  RelationshipsCollection,
  SearchCollection,
  EventsCollection,
  ActionsCollection,
  ArtifactsCollection,
} from './collections.js'

export type { NativeCollectionsOptions } from './collections.js'

// Types
export type {
  // Environment
  SQLiteEnv,
  ClickHouseEnv,
  MDXDBEnv,

  // Configuration
  BaseMDXDBAdapterConfig,
  SQLiteAdapterConfig,
  ClickHouseAdapterConfig,

  // Adapter interface
  MDXDBAdapter,
  MDXDBClient,

  // Entity types
  Thing,
  Relationship,

  // Query options
  QueryOptions,
  SearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,

  // Payload integration
  CollectionMapping,
  RelationshipMapping,
  MigrationResult,
} from './types.js'
