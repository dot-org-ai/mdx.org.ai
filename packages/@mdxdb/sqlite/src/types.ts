/**
 * @mdxdb/sqlite Types
 *
 * Type definitions for Cloudflare Durable Objects SQLite Storage.
 * Each Durable Object represents a namespace with its own SQLite database.
 * Uses Workers RPC for direct method calls on stubs.
 *
 * @packageDocumentation
 */

// =============================================================================
// Cloudflare Types
// These types are provided globally by @cloudflare/workers-types
// =============================================================================

// NOTE: DurableObjectState, DurableObjectId, DurableObjectNamespace,
// DurableObjectStub, SqlStorage, SqlStorageCursor are all available
// globally when @cloudflare/workers-types is included in tsconfig.
// We don't re-export them to avoid issues with cloudflare:workers module.

// =============================================================================
// MDXDatabase RPC Interface
// =============================================================================

/**
 * Thing entity (graph node)
 */
export interface Thing<TData = Record<string, unknown>> {
  ns: string
  type: string
  id: string
  url: string
  data: TData
  content?: string
  createdAt: Date
  updatedAt: Date
  '@context'?: string | Record<string, unknown>
}

/**
 * Relationship (graph edge)
 */
export interface Relationship<TData = Record<string, unknown>> {
  id: string
  type: string
  from: string
  to: string
  data?: TData
  createdAt: Date
}

/**
 * Event (immutable log entry)
 */
export interface Event<TData = Record<string, unknown>> {
  id: string
  type: string
  timestamp: Date
  source: string
  data: TData
  correlationId?: string
  causationId?: string
}

/**
 * Action status
 */
export type ActionStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'

/**
 * Action (pending/active work)
 */
export interface Action<TData = Record<string, unknown>> {
  id: string
  actor: string
  object: string
  action: string
  status: ActionStatus
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: unknown
  error?: string
  metadata?: TData
}

/**
 * Artifact type
 */
export type ArtifactType = 'ast' | 'types' | 'esm' | 'cjs' | 'worker' | 'html' | 'markdown' | 'bundle' | 'sourcemap' | string

/**
 * Artifact (cached compiled content)
 */
export interface Artifact<TContent = unknown> {
  key: string
  type: ArtifactType
  source: string
  sourceHash: string
  createdAt: Date
  expiresAt?: Date
  content: TContent
  size?: number
  metadata?: Record<string, unknown>
}

/**
 * Query options for listing things
 */
export interface QueryOptions {
  ns?: string
  type?: string
  where?: Record<string, unknown>
  orderBy?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string
  type?: string
  limit?: number
  offset?: number
  minScore?: number
}

/**
 * Create options
 */
export interface CreateOptions<TData = Record<string, unknown>> {
  ns: string
  type: string
  id?: string
  url?: string
  data: TData
  content?: string
  '@context'?: string | Record<string, unknown>
}

/**
 * Update options
 */
export interface UpdateOptions<TData = Record<string, unknown>> {
  data: Partial<TData>
  content?: string
}

/**
 * Relate options
 */
export interface RelateOptions<TData = Record<string, unknown>> {
  type: string
  from: string
  to: string
  data?: TData
}

/**
 * Event create options
 */
export interface CreateEventOptions<TData = Record<string, unknown>> {
  type: string
  source: string
  data: TData
  correlationId?: string
  causationId?: string
}

/**
 * Action create options
 */
export interface CreateActionOptions<TData = Record<string, unknown>> {
  actor: string
  object: string
  action: string
  status?: ActionStatus
  metadata?: TData
}

/**
 * Artifact store options
 */
export interface StoreArtifactOptions<TContent = unknown> {
  key: string
  type: ArtifactType
  source: string
  sourceHash: string
  content: TContent
  ttl?: number
  metadata?: Record<string, unknown>
}

/**
 * Event query options
 */
export interface EventQueryOptions {
  type?: string
  source?: string
  correlationId?: string
  after?: Date
  before?: Date
  limit?: number
  offset?: number
}

/**
 * Action query options
 */
export interface ActionQueryOptions {
  actor?: string
  object?: string
  action?: string
  status?: ActionStatus | ActionStatus[]
  limit?: number
  offset?: number
}

/**
 * Vector search options
 *
 * For local SQLite search, provide `embedding` directly.
 * For Cloudflare Vectorize, provide `query` and the embedding will be generated.
 */
export interface VectorSearchOptions {
  /** Text query (requires external embedding service) */
  query?: string
  /** Pre-computed embedding vector */
  embedding?: number[]
  /** Maximum results to return */
  limit?: number
  /** Minimum similarity score (0-1) */
  minScore?: number
  /** Filter by thing type */
  type?: string
  /** Filter to specific thing URLs */
  thingUrls?: string[]
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  content: string
  score: number
  thingUrl: string
  chunkIndex: number
  metadata?: Record<string, unknown>
}

/**
 * The MDXDatabase RPC interface - methods callable on the Durable Object stub
 */
export interface MDXDatabaseRPC {
  // Thing operations
  list(options?: QueryOptions): Promise<Thing[]>
  // Note: Using 'read' instead of 'get' to avoid conflict with DurableObjectNamespace.get()
  read(url: string): Promise<Thing | null>
  readById(type: string, id: string): Promise<Thing | null>
  create(options: CreateOptions): Promise<Thing>
  update(url: string, options: UpdateOptions): Promise<Thing>
  upsert(options: CreateOptions): Promise<Thing>
  // Note: Using 'remove' instead of 'delete' to avoid conflict with reserved names
  remove(url: string): Promise<boolean>
  search(options: SearchOptions): Promise<Thing[]>

  // Relationship operations
  relate(options: RelateOptions): Promise<Relationship>
  unrelate(from: string, type: string, to: string): Promise<boolean>
  related(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Promise<Thing[]>
  relationships(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Promise<Relationship[]>

  // Vector search (uses Cloudflare Vectorize via RPC)
  vectorSearch(options: VectorSearchOptions): Promise<VectorSearchResult[]>
  setEmbedding(thingUrl: string, chunkIndex: number, embedding: number[]): Promise<void>
  upsertEmbeddings(thingUrl: string, embeddings: Array<{ chunkIndex: number; embedding: number[] }>): Promise<void>
  deleteVectors(thingUrl: string): Promise<void>

  // Event operations
  track(options: CreateEventOptions): Promise<Event>
  getEvent(id: string): Promise<Event | null>
  queryEvents(options?: EventQueryOptions): Promise<Event[]>

  // Action operations
  send(options: CreateActionOptions): Promise<Action>
  do(options: CreateActionOptions): Promise<Action>
  getAction(id: string): Promise<Action | null>
  queryActions(options?: ActionQueryOptions): Promise<Action[]>
  startAction(id: string): Promise<Action>
  completeAction(id: string, result?: unknown): Promise<Action>
  failAction(id: string, error: string): Promise<Action>
  cancelAction(id: string): Promise<Action>

  // Artifact operations
  storeArtifact(options: StoreArtifactOptions): Promise<Artifact>
  getArtifact(key: string): Promise<Artifact | null>
  getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null>
  deleteArtifact(key: string): Promise<boolean>
  cleanExpiredArtifacts(): Promise<number>

  // Database info
  getDatabaseSize(): number
  getNamespace(): string
}

// =============================================================================
// Vectorize RPC Types (for integration with @mdxdb/vectorize)
// =============================================================================

/**
 * Vectorize RPC interface - methods callable on the Vectorize worker
 * This matches the VectorizeDatabaseRPC from @mdxdb/vectorize
 */
export interface VectorizeRPC {
  /**
   * Upsert vectors for a thing's chunks
   */
  upsert(vectors: VectorizeUpsertOptions[]): Promise<{ count: number }>

  /**
   * Search for similar vectors
   */
  search(options: VectorizeSearchOptions): Promise<VectorSearchResult[]>

  /**
   * Delete vectors for things
   */
  delete(options: { thingUrls: string[] }): Promise<{ count: number }>

  /**
   * Get vectors by thing URL
   */
  getByThingUrl(thingUrl: string): Promise<VectorSearchResult[]>

  /**
   * Get index info
   */
  describe(): Promise<VectorizeIndexDetails>

  /**
   * Get namespace
   */
  getNamespace(): string

  /**
   * Create instance with specific namespace
   */
  withNamespace(namespace: string): VectorizeRPC
}

/**
 * Vectorize upsert options
 */
export interface VectorizeUpsertOptions {
  thingUrl: string
  chunkIndex: number
  embedding: number[]
  content: string
  type?: string
  metadata?: Record<string, string | number | boolean>
}

/**
 * Vectorize search options (subset of VectorSearchOptions for RPC)
 */
export interface VectorizeSearchOptions {
  embedding: number[]
  topK?: number
  type?: string
  thingUrls?: string[]
  minScore?: number
  namespace?: string
}

/**
 * Vectorize index details
 */
export interface VectorizeIndexDetails {
  name: string
  dimensions: number
  metric: 'cosine' | 'euclidean' | 'dot-product'
  vectorCount: number
  config: {
    dimensions: number
    metric: 'cosine' | 'euclidean' | 'dot-product'
  }
}

// =============================================================================
// Environment Bindings
// =============================================================================

/**
 * Environment with MDXDatabase Durable Object binding
 */
export interface Env {
  /** MDXDatabase Durable Object namespace */
  MDXDB: DurableObjectNamespace<MDXDatabaseRPC>

  /**
   * Optional Vectorize RPC binding for vector search
   * This is a service binding to a Vectorize worker deployed via Workers for Platforms
   * Methods can be called directly via Workers RPC
   */
  VECTORIZE?: VectorizeRPC
}

// =============================================================================
// Database Configuration
// =============================================================================

/**
 * Configuration for MDXDatabase client
 */
export interface MDXClientConfig {
  /**
   * Namespace for the database (maps to Durable Object name)
   * e.g., 'example.com', 'myapp.dev'
   */
  namespace: string

  /**
   * For Workers: The Durable Object namespace binding
   */
  binding?: DurableObjectNamespace<MDXDatabaseRPC>

  /**
   * Vectorize RPC binding for vector search
   * When provided, vector operations are delegated to Cloudflare Vectorize
   */
  vectorize?: VectorizeRPC

  /**
   * Embedding function for vector search (client-side)
   * Used to generate embeddings before sending to Vectorize
   */
  embedFn?: (text: string) => Promise<number[]>

  /**
   * For Node.js: Use miniflare
   */
  miniflare?: boolean

  /**
   * Miniflare persistence path (default: '.mf' in cwd)
   */
  persistPath?: string
}

// =============================================================================
// Row Types (internal)
// =============================================================================

/**
 * Thing row in SQLite (graph node)
 */
export interface ThingRow {
  url: string
  ns: string
  type: string
  id: string
  context: string | null
  data: string
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  version: number
}

/**
 * Relationship row (graph edge)
 */
export interface RelationshipRow {
  id: string
  type: string
  from_url: string
  to_url: string
  data: string | null
  created_at: string
}

/**
 * Search chunk row
 */
export interface SearchRow {
  id: string
  thing_url: string
  chunk_index: number
  content: string
  embedding: string | null
  metadata: string | null
  created_at: string
}

/**
 * Event row
 */
export interface EventRow {
  id: string
  type: string
  timestamp: string
  source: string
  data: string
  correlation_id: string | null
  causation_id: string | null
}

/**
 * Action row
 */
export interface ActionRow {
  id: string
  actor: string
  object: string
  action: string
  status: ActionStatus
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  result: string | null
  error: string | null
  metadata: string | null
}

/**
 * Artifact row
 */
export interface ArtifactRow {
  key: string
  type: string
  source: string
  source_hash: string
  created_at: string
  expires_at: string | null
  content: string
  size: number | null
  metadata: string | null
}

/**
 * Content chunk for indexing
 */
export interface Chunk {
  content: string
  index: number
  start: number
  end: number
}
