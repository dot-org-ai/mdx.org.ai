/**
 * MDXDB Types - Database interface for MDX document storage
 *
 * Supports two interfaces:
 * 1. Database - Simple document-based interface (original)
 * 2. DBClient - Graph database interface following ai-database conventions
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'

// =============================================================================
// ai-database compatible types (DBClient interface)
// =============================================================================

/**
 * Relationship between two things (graph edge)
 *
 * Unlike mdxld's Relationship which has a strict RelationshipType,
 * this allows any string type for flexibility in graph operations.
 */
export interface Relationship<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the relationship */
  id: string
  /** Type of relationship (any string) */
  type: string
  /** Source thing URL */
  from: string
  /** Target thing URL */
  to: string
  /** When the relationship was created */
  createdAt: Date
  /** Optional relationship metadata */
  data?: T
}

/**
 * Base identifier for all entities (ai-database convention)
 */
export interface EntityId {
  /** Namespace (e.g., 'example.com', 'api.mdx.org.ai') */
  ns: string
  /** Type of the entity (e.g., 'user', 'post', 'comment') */
  type: string
  /** Unique identifier within the namespace and type */
  id: string
  /**
   * Full URL for the entity
   * Defaults to https://{ns}/{type}/{id}
   */
  url?: string
}

/**
 * A Thing is a node in the database (linked data style)
 */
export interface Thing<T extends Record<string, unknown> = Record<string, unknown>> extends EntityId {
  /** When the thing was created */
  createdAt: Date
  /** When the thing was last updated */
  updatedAt: Date
  /** Arbitrary properties */
  data: T
  /** JSON-LD context (optional) */
  '@context'?: string | Record<string, unknown>
}

/**
 * Query options for finding things
 */
export interface QueryOptions {
  /** Filter by namespace */
  ns?: string
  /** Filter by type */
  type?: string
  /** Filter by properties (exact match) */
  where?: Record<string, unknown>
  /** Order by field */
  orderBy?: string
  /** Order direction */
  order?: 'asc' | 'desc'
  /** Limit results */
  limit?: number
  /** Skip results (for pagination) */
  offset?: number
}

/**
 * Search options for semantic/text search
 */
export interface ThingSearchOptions extends QueryOptions {
  /** The search query */
  query: string
  /** Fields to search in */
  fields?: string[]
  /** Minimum relevance score (0-1) */
  minScore?: number
}

/**
 * Options for creating a thing
 */
export interface CreateOptions<T extends Record<string, unknown>> {
  /** Namespace */
  ns: string
  /** Type of the thing */
  type: string
  /** ID (auto-generated if not provided) */
  id?: string
  /** Custom URL (auto-generated if not provided) */
  url?: string
  /** Initial data */
  data: T
  /** JSON-LD context */
  '@context'?: string | Record<string, unknown>
}

/**
 * Options for updating a thing
 */
export interface UpdateOptions<T extends Record<string, unknown>> {
  /** Partial data to merge */
  data: Partial<T>
}

/**
 * Options for creating a relationship
 */
export interface RelateOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Type of relationship */
  type: string
  /** Source thing URL */
  from: string
  /** Target thing URL */
  to: string
  /** Optional relationship data */
  data?: T
}

/**
 * Resolve the URL for an entity
 */
export function resolveUrl(entity: EntityId): string {
  if (entity.url) return entity.url
  return `https://${entity.ns}/${entity.type}/${entity.id}`
}

/**
 * Resolve URL with just ns/id (no type in path)
 */
export function resolveShortUrl(entity: Pick<EntityId, 'ns' | 'id'>): string {
  return `https://${entity.ns}/${entity.id}`
}

/**
 * Parse a URL into EntityId components
 */
export function parseUrl(url: string): EntityId {
  const parsed = new URL(url)
  const parts = parsed.pathname.split('/').filter(Boolean)

  if (parts.length === 1) {
    // ns/id format
    return {
      ns: parsed.host,
      type: '',
      id: parts[0]!,
      url
    }
  }

  if (parts.length >= 2) {
    // ns/type/id format (or ns/type/.../id)
    return {
      ns: parsed.host,
      type: parts[0]!,
      id: parts.slice(1).join('/'),
      url
    }
  }

  throw new Error(`Invalid entity URL: ${url}`)
}

/**
 * Database client interface following ai-database conventions
 *
 * Provides a graph database model with Things (nodes) and Relationships (edges).
 * All methods return Promises (compatible with RpcPromise for pipelining).
 */
export interface DBClient<TData extends Record<string, unknown> = Record<string, unknown>> {
  // Thing operations
  list(options?: QueryOptions): Promise<Thing<TData>[]>
  find(options: QueryOptions): Promise<Thing<TData>[]>
  search(options: ThingSearchOptions): Promise<Thing<TData>[]>
  get(url: string): Promise<Thing<TData> | null>
  getById(ns: string, type: string, id: string): Promise<Thing<TData> | null>
  set(url: string, data: TData): Promise<Thing<TData>>
  create(options: CreateOptions<TData>): Promise<Thing<TData>>
  update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>>
  upsert(options: CreateOptions<TData>): Promise<Thing<TData>>
  delete(url: string): Promise<boolean>

  // Iteration
  forEach(
    options: QueryOptions,
    callback: (thing: Thing<TData>) => void | Promise<void>
  ): Promise<void>

  // Relationship operations (outbound)
  relate<T extends Record<string, unknown> = Record<string, unknown>>(
    options: RelateOptions<T>
  ): Promise<Relationship<T>>
  unrelate(from: string, type: string, to: string): Promise<boolean>
  related(
    url: string,
    relationshipType?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Thing<TData>[]>
  relationships(
    url: string,
    type?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Relationship[]>

  // Reference operations (inbound - backlinks)
  references(
    url: string,
    relationshipType?: string
  ): Promise<Thing<TData>[]>

  // Cleanup
  close?(): Promise<void>
}

// =============================================================================
// Original Database interface (backward compatible)
// =============================================================================

/**
 * Query options for listing documents
 */
export interface ListOptions {
  /** Maximum number of documents to return */
  limit?: number
  /** Number of documents to skip */
  offset?: number
  /** Field to sort by */
  sortBy?: string
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
  /** Filter by type */
  type?: string | string[]
  /** Filter by path prefix */
  prefix?: string
}

/**
 * Query result with pagination info
 */
export interface ListResult<TData extends MDXLDData = MDXLDData> {
  /** List of documents */
  documents: MDXLDDocument<TData>[]
  /** Total count of matching documents */
  total: number
  /** Whether there are more results */
  hasMore: boolean
}

/**
 * Search options for querying documents
 */
export interface SearchOptions extends ListOptions {
  /** Search query string */
  query: string
  /** Fields to search in */
  fields?: string[]
  /** Enable semantic/vector search */
  semantic?: boolean
}

/**
 * Search result with relevance info
 */
export interface SearchResult<TData extends MDXLDData = MDXLDData> extends ListResult<TData> {
  /** Documents with relevance scores */
  documents: Array<MDXLDDocument<TData> & { score?: number }>
}

/**
 * Get options for retrieving a document
 */
export interface GetOptions {
  /** Include AST in response */
  includeAst?: boolean
  /** Include compiled code in response */
  includeCode?: boolean
}

/**
 * Set options for storing a document
 */
export interface SetOptions {
  /** Create only if document doesn't exist */
  createOnly?: boolean
  /** Update only if document exists */
  updateOnly?: boolean
  /** Expected version for optimistic locking */
  version?: string
}

/**
 * Set result with metadata
 */
export interface SetResult {
  /** Document ID/path */
  id: string
  /** New version after update */
  version?: string
  /** Whether document was created (vs updated) */
  created: boolean
}

/**
 * Delete options
 */
export interface DeleteOptions {
  /** Soft delete (mark as deleted) */
  soft?: boolean
  /** Expected version for optimistic locking */
  version?: string
}

/**
 * Delete result
 */
export interface DeleteResult {
  /** Document ID/path that was deleted */
  id: string
  /** Whether document was found and deleted */
  deleted: boolean
}

/**
 * Database interface for MDX document storage
 *
 * All backend adapters (fs, sqlite, postgres, api, etc.) implement this interface
 *
 * @example
 * ```ts
 * // Using filesystem adapter
 * import { createFsDatabase } from '@mdxdb/fs'
 * const db = createFsDatabase({ root: './content' })
 *
 * // Using API adapter
 * import { createApiDatabase } from '@mdxdb/api'
 * const db = createApiDatabase({ baseUrl: 'https://api.example.com' })
 *
 * // Same interface regardless of backend
 * const doc = await db.get('posts/hello-world')
 * ```
 */
export interface Database<TData extends MDXLDData = MDXLDData> {
  /**
   * List documents with optional filtering and pagination
   */
  list(options?: ListOptions): Promise<ListResult<TData>>

  /**
   * Search documents by query
   */
  search(options: SearchOptions): Promise<SearchResult<TData>>

  /**
   * Get a document by ID/path
   */
  get(id: string, options?: GetOptions): Promise<MDXLDDocument<TData> | null>

  /**
   * Set/create a document
   */
  set(id: string, document: MDXLDDocument<TData>, options?: SetOptions): Promise<SetResult>

  /**
   * Delete a document
   */
  delete(id: string, options?: DeleteOptions): Promise<DeleteResult>

  /**
   * Close database connection (for cleanup)
   */
  close?(): Promise<void>
}

/**
 * Database configuration base
 */
export interface DatabaseConfig {
  /** Optional namespace/prefix for all operations */
  namespace?: string
}

/**
 * Factory function type for creating database instances
 */
export type CreateDatabase<TConfig extends DatabaseConfig = DatabaseConfig, TData extends MDXLDData = MDXLDData> = (
  config: TConfig
) => Database<TData>

// =============================================================================
// Event, Action, and Artifact types (for ai-workflows integration)
// =============================================================================

/**
 * Immutable event record
 *
 * Events are append-only records of things that happened.
 * They cannot be modified after creation.
 */
export interface Event<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the event */
  id: string
  /** Event type (e.g., 'Customer.created', 'Order.completed') */
  type: string
  /** When the event occurred */
  timestamp: Date
  /** Event source (workflow, user, system) */
  source: string
  /** Event data payload */
  data: T
  /** Optional correlation ID for tracing related events */
  correlationId?: string
  /** Optional causation ID (the event that caused this event) */
  causationId?: string
}

/**
 * Action status
 */
export type ActionStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'

/**
 * Action record for pending/active work
 *
 * Actions represent work that needs to be done or is in progress.
 * They have an actor, object, and action type following the Activity Streams pattern.
 */
export interface Action<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the action */
  id: string
  /** Actor performing the action (user URL, agent ID, 'system') */
  actor: string
  /** Object being acted upon (thing URL) */
  object: string
  /** Action type (e.g., 'approve', 'process', 'review') */
  action: string
  /** Current status */
  status: ActionStatus
  /** When the action was created */
  createdAt: Date
  /** When the action was last updated */
  updatedAt: Date
  /** When the action started (status became 'active') */
  startedAt?: Date
  /** When the action completed or failed */
  completedAt?: Date
  /** Result of the action (when completed) */
  result?: unknown
  /** Error message (when failed) */
  error?: string
  /** Additional action metadata */
  metadata?: T
}

/**
 * Artifact type
 */
export type ArtifactType = 'ast' | 'types' | 'esm' | 'cjs' | 'worker' | 'html' | 'markdown' | 'bundle' | 'sourcemap' | string

/**
 * Cached artifact for compiled/parsed content
 *
 * Artifacts are cached outputs from compilation, parsing, bundling, etc.
 * They include a source hash for cache invalidation.
 */
export interface Artifact<T = unknown> {
  /** Unique key for the artifact (usually source URL + artifact type) */
  key: string
  /** Type of artifact */
  type: ArtifactType
  /** Source URL or identifier */
  source: string
  /** Hash of the source content (for cache invalidation) */
  sourceHash: string
  /** When the artifact was created */
  createdAt: Date
  /** When the artifact expires (optional TTL) */
  expiresAt?: Date
  /** The artifact content */
  content: T
  /** Content size in bytes */
  size?: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Options for creating an event
 */
export interface CreateEventOptions<T extends Record<string, unknown>> {
  /** Event type */
  type: string
  /** Event source */
  source: string
  /** Event data */
  data: T
  /** Optional correlation ID */
  correlationId?: string
  /** Optional causation ID */
  causationId?: string
}

/**
 * Options for creating an action
 */
export interface CreateActionOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Actor performing the action */
  actor: string
  /** Object being acted upon */
  object: string
  /** Action type */
  action: string
  /** Initial status (defaults to 'pending') */
  status?: ActionStatus
  /** Additional metadata */
  metadata?: T
}

/**
 * Options for storing an artifact
 */
export interface StoreArtifactOptions<T = unknown> {
  /** Unique key for the artifact */
  key: string
  /** Type of artifact */
  type: ArtifactType
  /** Source URL or identifier */
  source: string
  /** Hash of the source content */
  sourceHash: string
  /** The artifact content */
  content: T
  /** TTL in milliseconds (optional) */
  ttl?: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Event query options
 */
export interface EventQueryOptions {
  /** Filter by event type */
  type?: string
  /** Filter by source */
  source?: string
  /** Filter by correlation ID */
  correlationId?: string
  /** Events after this timestamp */
  after?: Date
  /** Events before this timestamp */
  before?: Date
  /** Maximum number of events to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Action query options
 */
export interface ActionQueryOptions {
  /** Filter by actor */
  actor?: string
  /** Filter by object */
  object?: string
  /** Filter by action type */
  action?: string
  /** Filter by status */
  status?: ActionStatus | ActionStatus[]
  /** Maximum number of actions to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Extended DBClient with Events, Actions, and Artifacts
 */
export interface DBClientExtended<TData extends Record<string, unknown> = Record<string, unknown>> extends DBClient<TData> {
  // Event operations (immutable, append-only)
  /** Track an event (analytics-style, append-only) */
  track<T extends Record<string, unknown>>(options: CreateEventOptions<T>): Promise<Event<T>>
  getEvent(id: string): Promise<Event | null>
  queryEvents(options?: EventQueryOptions): Promise<Event[]>

  // Action operations ($.do, $.try, $.send patterns)
  /** Send an action (fire-and-forget, creates in pending state) */
  send<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>>
  /** Do an action (create and immediately start, returns in active state) */
  do<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>>
  /** Try an action (with built-in error handling) */
  try<T extends Record<string, unknown>>(options: CreateActionOptions<T>, fn: () => Promise<unknown>): Promise<Action<T>>
  getAction(id: string): Promise<Action | null>
  queryActions(options?: ActionQueryOptions): Promise<Action[]>
  startAction(id: string): Promise<Action>
  completeAction(id: string, result?: unknown): Promise<Action>
  failAction(id: string, error: string): Promise<Action>
  cancelAction(id: string): Promise<Action>

  // Artifact operations (cached content)
  storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>>
  getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null>
  getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null>
  deleteArtifact(key: string): Promise<boolean>
  cleanExpiredArtifacts(): Promise<number>
}
