/**
 * @mdxdb/vectorize Worker
 *
 * Cloudflare Worker exposing Vectorize RPC functions.
 * Extends WorkerEntrypoint for true Workers RPC support.
 * Deployed via Workers for Platforms with Vectorize binding.
 *
 * Architecture:
 * - VectorizeDatabase: Core class implementing vector operations
 * - VectorizeDatabaseEntrypoint: RPC-enabled entrypoint for Workers
 * - Default export: Worker with both RPC and HTTP fallback support
 *
 * The class provides:
 * - Vector upsert/update operations with metadata
 * - Similarity search with cosine/euclidean distance
 * - Namespace isolation for multi-tenancy
 * - Metadata filtering for scoped queries
 * - Batch operations for performance
 *
 * @packageDocumentation
 */

import type {
  VectorizeEnv,
  VectorizeDatabaseRPC,
  UpsertVectorOptions,
  VectorSearchOptions,
  VectorSearchResult,
  DeleteVectorsOptions,
  VectorizeIndexDetails,
  VectorizeVector,
  VectorizeMetadataFilter,
} from './types.js'

/**
 * Generate vector ID from thing URL and chunk index
 * Format: {thingUrl}#chunk-{index}
 *
 * @example
 * generateVectorId('https://example.com/doc/1', 0)
 * // => 'https://example.com/doc/1#chunk-0'
 */
function generateVectorId(thingUrl: string, chunkIndex: number): string {
  return `${thingUrl}#chunk-${chunkIndex}`
}

/**
 * Parse vector ID back to thing URL and chunk index
 * Handles both chunked IDs and plain URLs
 *
 * @example
 * parseVectorId('https://example.com/doc/1#chunk-5')
 * // => { thingUrl: 'https://example.com/doc/1', chunkIndex: 5 }
 */
function parseVectorId(id: string): { thingUrl: string; chunkIndex: number } {
  const match = id.match(/^(.+)#chunk-(\d+)$/)
  if (!match) {
    return { thingUrl: id, chunkIndex: 0 }
  }
  return {
    thingUrl: match[1]!,
    chunkIndex: parseInt(match[2]!, 10),
  }
}

/**
 * Validate vector dimensions match index
 */
function validateVectorDimensions(vector: number[], expected: number, id?: string): void {
  if (vector.length !== expected) {
    throw new Error(
      `Vector dimension mismatch${id ? ` for ${id}` : ''}: expected ${expected}, got ${vector.length}`
    )
  }
}

/**
 * Normalize metadata values for Vectorize
 * Converts complex types to strings
 */
function normalizeMetadata(
  metadata: Record<string, unknown>
): Record<string, string | number | boolean | string[]> {
  const normalized: Record<string, string | number | boolean | string[]> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) {
      continue
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(v => String(v))
    } else {
      // Convert objects to JSON strings
      normalized[key] = JSON.stringify(value)
    }
  }

  return normalized
}

/**
 * VectorizeDatabase Worker Entrypoint
 *
 * Provides vector search operations using Cloudflare Vectorize.
 * Supports both Workers RPC (direct method calls) and HTTP fallback.
 *
 * Features:
 * - Upsert vectors with automatic ID generation
 * - Similarity search with configurable distance metrics
 * - Namespace-based isolation for multi-tenancy
 * - Metadata filtering and enrichment
 * - Batch operations for improved performance
 * - Dimension validation for data integrity
 *
 * @example Workers RPC
 * ```typescript
 * interface Env {
 *   VECTORIZE_SERVICE: Service<typeof VectorizeDatabase>
 * }
 *
 * export default {
 *   async fetch(request, env: Env) {
 *     // Direct RPC call - no HTTP overhead
 *     const results = await env.VECTORIZE_SERVICE
 *       .withNamespace('docs')
 *       .search({ embedding: [...], topK: 10 })
 *
 *     return Response.json(results)
 *   }
 * }
 * ```
 *
 * @example HTTP Fetch
 * ```typescript
 * const response = await fetch('https://vectorize.example.workers.dev', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     method: 'search',
 *     params: [{ embedding: [...], topK: 10 }]
 *   })
 * })
 * ```
 */
export class VectorizeDatabase implements VectorizeDatabaseRPC {
  protected env: VectorizeEnv
  protected namespace: string
  private indexInfo?: VectorizeIndexDetails

  constructor(env: VectorizeEnv, namespace: string = 'default') {
    this.env = env
    this.namespace = namespace
  }

  /**
   * Create instance with namespace
   * Enables multi-tenant vector search with namespace isolation
   */
  withNamespace(namespace: string): VectorizeDatabase {
    return new VectorizeDatabase(this.env, namespace)
  }

  /**
   * Get cached index info
   * @internal
   */
  private async getIndexInfo(): Promise<VectorizeIndexDetails> {
    if (!this.indexInfo) {
      this.indexInfo = await this.env.VECTORIZE.describe()
    }
    return this.indexInfo
  }

  /**
   * Upsert vectors for things' chunks
   *
   * Supports batching for improved performance.
   * Validates vector dimensions against index configuration.
   * Automatically normalizes metadata for Vectorize compatibility.
   *
   * @param vectors - Array of vectors to upsert
   * @returns Number of vectors upserted
   *
   * @example
   * ```typescript
   * await db.upsert([
   *   {
   *     thingUrl: 'https://example.com/doc/1',
   *     chunkIndex: 0,
   *     embedding: [0.1, 0.2, ...],
   *     content: 'Chapter 1: Introduction...',
   *     type: 'Document',
   *     metadata: { author: 'John', section: 'intro' }
   *   }
   * ])
   * ```
   */
  async upsert(vectors: UpsertVectorOptions[]): Promise<{ count: number }> {
    if (vectors.length === 0) {
      return { count: 0 }
    }

    // Get index info for dimension validation
    const info = await this.getIndexInfo()

    // Validate all vectors have correct dimensions
    for (const v of vectors) {
      validateVectorDimensions(
        v.embedding,
        info.dimensions,
        `${v.thingUrl}#chunk-${v.chunkIndex}`
      )
    }

    // Convert to Vectorize format
    const vectorizeVectors: VectorizeVector[] = vectors.map((v) => {
      const baseMetadata = {
        thingUrl: v.thingUrl,
        chunkIndex: v.chunkIndex,
        content: v.content,
        type: v.type ?? '',
      }

      // Merge and normalize all metadata
      const fullMetadata = normalizeMetadata({
        ...baseMetadata,
        ...(v.metadata ?? {}),
      })

      return {
        id: generateVectorId(v.thingUrl, v.chunkIndex),
        values: v.embedding,
        namespace: this.namespace,
        metadata: fullMetadata,
      }
    })

    // Batch upsert (Vectorize handles batching internally)
    const result = await this.env.VECTORIZE.upsert(vectorizeVectors)
    return { count: result.count }
  }

  /**
   * Search for similar vectors using cosine/euclidean similarity
   *
   * Performs semantic search over indexed vectors using the configured
   * distance metric (cosine, euclidean, or dot-product).
   *
   * Supports:
   * - Metadata filtering by type and thing URLs
   * - Namespace isolation
   * - Score thresholding
   * - Configurable result limits
   *
   * @param options - Search configuration
   * @returns Array of matching vectors with similarity scores
   *
   * @example Basic search
   * ```typescript
   * const results = await db.search({
   *   embedding: [0.1, 0.2, ...],
   *   topK: 10,
   *   minScore: 0.7
   * })
   * ```
   *
   * @example Filtered search
   * ```typescript
   * const results = await db.search({
   *   embedding: queryEmbedding,
   *   topK: 5,
   *   type: 'Document',
   *   thingUrls: ['https://example.com/doc/1', 'https://example.com/doc/2'],
   *   minScore: 0.8
   * })
   * ```
   */
  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    // Validate embedding dimensions
    const info = await this.getIndexInfo()
    validateVectorDimensions(options.embedding, info.dimensions, 'query vector')

    // Build metadata filter
    const filter: VectorizeMetadataFilter = {}

    if (options.type) {
      filter['type'] = options.type
    }

    if (options.thingUrls && options.thingUrls.length > 0) {
      // Filter by specific thing URLs
      if (options.thingUrls.length === 1) {
        filter['thingUrl'] = options.thingUrls[0]!
      } else {
        filter['thingUrl'] = { $in: options.thingUrls }
      }
    }

    // Execute vector search
    const results = await this.env.VECTORIZE.query(options.embedding, {
      topK: options.topK ?? 10,
      namespace: options.namespace ?? this.namespace,
      returnMetadata: 'all',
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    })

    const minScore = options.minScore ?? 0

    // Transform results to standard format
    return results.matches
      .filter((match) => match.score >= minScore)
      .map((match) => {
        const { thingUrl, chunkIndex } = parseVectorId(match.id)
        const metadata = match.metadata ?? {}

        // Extract standard fields
        const result: VectorSearchResult = {
          thingUrl: (metadata.thingUrl as string) ?? thingUrl,
          chunkIndex: (metadata.chunkIndex as number) ?? chunkIndex,
          score: match.score,
          content: (metadata.content as string) ?? '',
        }

        // Add optional fields
        if (metadata.type && metadata.type !== '') {
          result.type = metadata.type as string
        }

        // Filter out standard fields from metadata
        const customMetadata = Object.fromEntries(
          Object.entries(metadata).filter(
            ([key]) => !['thingUrl', 'chunkIndex', 'content', 'type'].includes(key)
          )
        ) as Record<string, string | number | boolean>

        if (Object.keys(customMetadata).length > 0) {
          result.metadata = customMetadata
        }

        return result
      })
  }

  /**
   * Delete vectors for things
   *
   * Removes all vector chunks associated with the specified thing URLs.
   * Note: Vectorize requires vector IDs for deletion, so this method
   * first queries for all chunks, then deletes them by ID.
   *
   * @param options - Thing URLs to delete vectors for
   * @returns Number of vectors deleted
   *
   * @example
   * ```typescript
   * // Delete vectors for specific documents
   * await db.delete({
   *   thingUrls: [
   *     'https://example.com/doc/1',
   *     'https://example.com/doc/2'
   *   ]
   * })
   * ```
   */
  async delete(options: DeleteVectorsOptions): Promise<{ count: number }> {
    if (options.thingUrls.length === 0) {
      return { count: 0 }
    }

    // Collect all vector IDs for deletion
    // Vectorize doesn't support metadata-only deletes, so we need IDs
    const allIds: string[] = []

    for (const thingUrl of options.thingUrls) {
      // Query to find all chunks for this thing
      const vectors = await this.getByThingUrl(thingUrl)
      allIds.push(
        ...vectors.map((v) => generateVectorId(v.thingUrl, v.chunkIndex))
      )
    }

    if (allIds.length === 0) {
      return { count: 0 }
    }

    // Batch delete by IDs
    const result = await this.env.VECTORIZE.deleteByIds(allIds)
    return { count: result.count }
  }

  /**
   * Get all vectors for a thing URL
   *
   * Retrieves all chunked vectors associated with a specific thing.
   * Useful for:
   * - Verifying indexed content
   * - Debugging vector storage
   * - Bulk operations on a document's vectors
   *
   * Note: Uses a zero-vector query with metadata filter due to
   * Vectorize API limitations (no direct metadata-only listing).
   *
   * @param thingUrl - The thing URL to retrieve vectors for
   * @returns Array of all vector chunks for the thing
   *
   * @example
   * ```typescript
   * const chunks = await db.getByThingUrl('https://example.com/doc/1')
   * console.log(`Found ${chunks.length} chunks`)
   * for (const chunk of chunks) {
   *   console.log(`Chunk ${chunk.chunkIndex}: ${chunk.content.slice(0, 50)}...`)
   * }
   * ```
   */
  async getByThingUrl(thingUrl: string): Promise<VectorSearchResult[]> {
    // Vectorize doesn't have direct "list by metadata" operation
    // Workaround: Use zero-vector query with metadata filter
    // This is a known limitation of the Vectorize API

    // Get index dimensions
    const info = await this.getIndexInfo()
    const zeroVector = new Array(info.dimensions).fill(0)

    // Query with zero vector and metadata filter
    const results = await this.env.VECTORIZE.query(zeroVector, {
      topK: 1000, // Get all chunks (max supported)
      namespace: this.namespace,
      returnMetadata: 'all',
      filter: { thingUrl },
    })

    // Transform results
    return results.matches.map((match) => {
      const { chunkIndex } = parseVectorId(match.id)
      const metadata = match.metadata ?? {}

      const result: VectorSearchResult = {
        thingUrl: (metadata.thingUrl as string) ?? thingUrl,
        chunkIndex: (metadata.chunkIndex as number) ?? chunkIndex,
        score: match.score,
        content: (metadata.content as string) ?? '',
      }

      if (metadata.type && metadata.type !== '') {
        result.type = metadata.type as string
      }

      const customMetadata = Object.fromEntries(
        Object.entries(metadata).filter(
          ([key]) => !['thingUrl', 'chunkIndex', 'content', 'type'].includes(key)
        )
      ) as Record<string, string | number | boolean>

      if (Object.keys(customMetadata).length > 0) {
        result.metadata = customMetadata
      }

      return result
    })
  }

  /**
   * Get index information
   *
   * Returns metadata about the Vectorize index including:
   * - Vector dimensions
   * - Distance metric (cosine, euclidean, dot-product)
   * - Total vector count
   * - Index configuration
   *
   * Results are cached for performance.
   *
   * @returns Index metadata
   *
   * @example
   * ```typescript
   * const info = await db.describe()
   * console.log(`Index: ${info.name}`)
   * console.log(`Dimensions: ${info.dimensions}`)
   * console.log(`Metric: ${info.metric}`)
   * console.log(`Vectors: ${info.vectorCount}`)
   * ```
   */
  async describe(): Promise<VectorizeIndexDetails> {
    return this.getIndexInfo()
  }

  /**
   * Get current namespace
   *
   * @returns The namespace string for this instance
   */
  getNamespace(): string {
    return this.namespace
  }
}

/**
 * RPC-enabled Worker Entrypoint
 *
 * This class extends VectorizeDatabase and can be used as a WorkerEntrypoint.
 * When used as a service binding, methods are callable directly via RPC.
 *
 * For Workers RPC, the class is exported directly and Cloudflare handles
 * the RPC serialization automatically.
 */
export class VectorizeDatabaseEntrypoint extends VectorizeDatabase {
  constructor(env: VectorizeEnv) {
    super(env, 'default')
  }

  /**
   * Set namespace for subsequent calls (for RPC use)
   */
  setNamespace(namespace: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).namespace = namespace
  }
}

/**
 * Worker export for Workers for Platforms
 *
 * Supports both:
 * 1. Workers RPC: Call methods directly on the stub
 * 2. HTTP fallback: JSON-RPC style POST requests
 */
export default {
  /**
   * Fetch handler for HTTP fallback
   */
  async fetch(request: Request, env: VectorizeEnv): Promise<Response> {
    // Extract namespace from request URL or header
    const url = new URL(request.url)
    const namespace = url.searchParams.get('namespace') ?? request.headers.get('X-MDXDB-Namespace') ?? 'default'

    // Create database instance
    const db = new VectorizeDatabase(env, namespace)

    // Handle JSON-RPC style requests
    if (request.method === 'POST') {
      try {
        const body = await request.json() as { method: string; params: unknown[] }
        const { method, params } = body

        // Route to method
        let result: unknown
        switch (method) {
          case 'upsert':
            result = await db.upsert(params[0] as UpsertVectorOptions[])
            break
          case 'search':
            result = await db.search(params[0] as VectorSearchOptions)
            break
          case 'delete':
            result = await db.delete(params[0] as DeleteVectorsOptions)
            break
          case 'getByThingUrl':
            result = await db.getByThingUrl(params[0] as string)
            break
          case 'describe':
            result = await db.describe()
            break
          case 'getNamespace':
            result = db.getNamespace()
            break
          default:
            return new Response(JSON.stringify({ error: `Unknown method: ${method}` }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({ result }), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', namespace }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405 })
  },

  /**
   * RPC handler - returns class instance for RPC calls
   * This allows service bindings to call methods directly
   */
  newInstance(env: VectorizeEnv, namespace: string = 'default'): VectorizeDatabase {
    return new VectorizeDatabase(env, namespace)
  },
}
