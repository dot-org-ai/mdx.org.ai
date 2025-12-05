/**
 * @mdxdb/vectorize Types
 *
 * Type definitions for Cloudflare Vectorize integration.
 * Workers RPC interface for vector search operations.
 *
 * @packageDocumentation
 */

// =============================================================================
// Cloudflare Vectorize Types
// =============================================================================

/**
 * Vectorize index binding from Cloudflare
 */
export interface VectorizeIndex {
  /**
   * Insert vectors into the index
   */
  insert(vectors: VectorizeVector[]): Promise<VectorizeVectorMutation>

  /**
   * Upsert vectors (insert or update)
   */
  upsert(vectors: VectorizeVector[]): Promise<VectorizeVectorMutation>

  /**
   * Query vectors by similarity
   */
  query(
    vector: number[],
    options?: VectorizeQueryOptions
  ): Promise<VectorizeMatches>

  /**
   * Get vectors by IDs
   */
  getByIds(ids: string[]): Promise<VectorizeVector[]>

  /**
   * Delete vectors by IDs
   */
  deleteByIds(ids: string[]): Promise<VectorizeVectorMutation>

  /**
   * Describe index metadata
   */
  describe(): Promise<VectorizeIndexDetails>
}

/**
 * Vector with ID, values, and optional metadata
 */
export interface VectorizeVector {
  /** Unique vector ID */
  id: string
  /** Vector values (embeddings) */
  values: number[]
  /** Optional metadata */
  metadata?: VectorizeMetadata
  /** Optional namespace */
  namespace?: string
}

/**
 * Vector metadata (arbitrary key-value pairs)
 */
export type VectorizeMetadata = Record<string, string | number | boolean | string[]>

/**
 * Query options for vector search
 */
export interface VectorizeQueryOptions {
  /** Number of results to return */
  topK?: number
  /** Filter by namespace */
  namespace?: string
  /** Whether to include vector values in results */
  returnValues?: boolean
  /** Whether to include metadata in results */
  returnMetadata?: 'all' | 'indexed' | 'none'
  /** Metadata filter */
  filter?: VectorizeMetadataFilter
}

/**
 * Metadata filter for queries
 */
export type VectorizeMetadataFilter = Record<string, string | number | boolean | VectorizeFilterOp>

/**
 * Filter operations
 */
export interface VectorizeFilterOp {
  $eq?: string | number | boolean
  $ne?: string | number | boolean
  $in?: (string | number | boolean)[]
  $nin?: (string | number | boolean)[]
}

/**
 * Query match result
 */
export interface VectorizeMatch {
  /** Vector ID */
  id: string
  /** Similarity score (0-1, higher is more similar) */
  score: number
  /** Vector values (if returnValues=true) */
  values?: number[]
  /** Metadata (if returnMetadata != 'none') */
  metadata?: VectorizeMetadata
}

/**
 * Query results
 */
export interface VectorizeMatches {
  /** Matching vectors */
  matches: VectorizeMatch[]
  /** Total count (if available) */
  count?: number
}

/**
 * Mutation result
 */
export interface VectorizeVectorMutation {
  /** IDs of mutated vectors */
  ids: string[]
  /** Number of vectors mutated */
  count: number
}

/**
 * Index details
 */
export interface VectorizeIndexDetails {
  /** Index name */
  name: string
  /** Vector dimensions */
  dimensions: number
  /** Distance metric */
  metric: 'cosine' | 'euclidean' | 'dot-product'
  /** Vector count */
  vectorCount: number
  /** Index config */
  config: {
    dimensions: number
    metric: 'cosine' | 'euclidean' | 'dot-product'
  }
}

// =============================================================================
// RPC Interface
// =============================================================================

/**
 * Vector to upsert
 */
export interface UpsertVectorOptions {
  /** Thing URL this vector belongs to */
  thingUrl: string
  /** Chunk index within the thing */
  chunkIndex: number
  /** Vector embedding */
  embedding: number[]
  /** Text content for this chunk */
  content: string
  /** Entity type (e.g., 'Post', 'Document') */
  type?: string
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>
}

/**
 * Search options
 */
export interface VectorSearchOptions {
  /** Query embedding */
  embedding: number[]
  /** Number of results */
  topK?: number
  /** Filter by type */
  type?: string
  /** Filter by thing URLs */
  thingUrls?: string[]
  /** Minimum similarity score (0-1) */
  minScore?: number
  /** Namespace to search */
  namespace?: string
}

/**
 * Search result
 */
export interface VectorSearchResult {
  /** Thing URL */
  thingUrl: string
  /** Chunk index */
  chunkIndex: number
  /** Similarity score (0-1) */
  score: number
  /** Chunk content */
  content: string
  /** Entity type */
  type?: string
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>
}

/**
 * Delete options
 */
export interface DeleteVectorsOptions {
  /** Thing URLs to delete vectors for */
  thingUrls: string[]
}

/**
 * The VectorizeDatabase RPC interface - methods callable on the Worker stub
 */
export interface VectorizeDatabaseRPC {
  /**
   * Upsert vectors for a thing's chunks
   */
  upsert(vectors: UpsertVectorOptions[]): Promise<{ count: number }>

  /**
   * Search for similar vectors
   */
  search(options: VectorSearchOptions): Promise<VectorSearchResult[]>

  /**
   * Delete vectors for things
   */
  delete(options: DeleteVectorsOptions): Promise<{ count: number }>

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
}

// =============================================================================
// Environment & Configuration
// =============================================================================

/**
 * Environment with Vectorize binding
 */
export interface VectorizeEnv {
  /** Vectorize index binding */
  VECTORIZE: VectorizeIndex
  /** Optional AI binding for embeddings */
  AI?: {
    run(model: string, inputs: { text: string[] }): Promise<{ data: number[][] }>
  }
}

/**
 * Configuration for Vectorize client
 */
export interface VectorizeClientConfig {
  /**
   * Namespace for vectors (maps to Vectorize namespace)
   */
  namespace: string

  /**
   * Worker URL for RPC calls
   */
  workerUrl?: string

  /**
   * Service binding for Worker-to-Worker RPC
   */
  binding?: {
    fetch(request: Request): Promise<Response>
  }

  /**
   * Embedding function for automatic embedding
   */
  embedFn?: (text: string) => Promise<number[]>
}

// =============================================================================
// Cloudflare API Types (for index management)
// =============================================================================

/**
 * Create index options
 */
export interface CreateIndexOptions {
  /** Index name */
  name: string
  /** Vector dimensions */
  dimensions: number
  /** Distance metric */
  metric?: 'cosine' | 'euclidean' | 'dot-product'
  /** Description */
  description?: string
}

/**
 * Cloudflare API response
 */
export interface CloudflareApiResponse<T> {
  success: boolean
  result: T
  errors: Array<{ code: number; message: string }>
  messages: string[]
}
