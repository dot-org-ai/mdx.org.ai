/**
 * @mdxdb/vectorize Worker
 *
 * Cloudflare Worker exposing Vectorize RPC functions.
 * Extends WorkerEntrypoint for true Workers RPC support.
 * Deployed via Workers for Platforms with Vectorize binding.
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
 */
function generateVectorId(thingUrl: string, chunkIndex: number): string {
  return `${thingUrl}#chunk-${chunkIndex}`
}

/**
 * Parse vector ID back to thing URL and chunk index
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
 * VectorizeDatabase Worker Entrypoint
 *
 * Extends WorkerEntrypoint to expose RPC methods directly.
 * Methods can be called via: `stub.search(options)` instead of fetch.
 *
 * Usage from another Worker:
 * ```typescript
 * interface Env {
 *   VECTORIZE_SERVICE: Service<typeof VectorizeDatabase>
 * }
 *
 * // Get stub and call methods directly
 * const results = await env.VECTORIZE_SERVICE.search({ embedding: [...] })
 * ```
 */
export class VectorizeDatabase implements VectorizeDatabaseRPC {
  protected env: VectorizeEnv
  protected namespace: string

  constructor(env: VectorizeEnv, namespace: string = 'default') {
    this.env = env
    this.namespace = namespace
  }

  /**
   * Create instance with namespace
   */
  withNamespace(namespace: string): VectorizeDatabase {
    return new VectorizeDatabase(this.env, namespace)
  }

  /**
   * Upsert vectors for things' chunks
   */
  async upsert(vectors: UpsertVectorOptions[]): Promise<{ count: number }> {
    if (vectors.length === 0) {
      return { count: 0 }
    }

    const vectorizeVectors: VectorizeVector[] = vectors.map((v) => ({
      id: generateVectorId(v.thingUrl, v.chunkIndex),
      values: v.embedding,
      namespace: this.namespace,
      metadata: {
        thingUrl: v.thingUrl,
        chunkIndex: v.chunkIndex,
        content: v.content,
        type: v.type ?? '',
        ...v.metadata,
      },
    }))

    const result = await this.env.VECTORIZE.upsert(vectorizeVectors)
    return { count: result.count }
  }

  /**
   * Search for similar vectors
   */
  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const filter: VectorizeMetadataFilter = {}

    if (options.type) {
      filter['type'] = options.type
    }

    if (options.thingUrls && options.thingUrls.length > 0) {
      filter['thingUrl'] = { $in: options.thingUrls }
    }

    const results = await this.env.VECTORIZE.query(options.embedding, {
      topK: options.topK ?? 10,
      namespace: options.namespace ?? this.namespace,
      returnMetadata: 'all',
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    })

    const minScore = options.minScore ?? 0

    return results.matches
      .filter((match) => match.score >= minScore)
      .map((match) => {
        const { thingUrl, chunkIndex } = parseVectorId(match.id)
        const metadata = match.metadata ?? {}

        return {
          thingUrl: (metadata.thingUrl as string) ?? thingUrl,
          chunkIndex: (metadata.chunkIndex as number) ?? chunkIndex,
          score: match.score,
          content: (metadata.content as string) ?? '',
          type: (metadata.type as string) || undefined,
          metadata: Object.fromEntries(
            Object.entries(metadata).filter(
              ([key]) => !['thingUrl', 'chunkIndex', 'content', 'type'].includes(key)
            )
          ) as Record<string, string | number | boolean>,
        }
      })
  }

  /**
   * Delete vectors for things
   */
  async delete(options: DeleteVectorsOptions): Promise<{ count: number }> {
    if (options.thingUrls.length === 0) {
      return { count: 0 }
    }

    // Get all vectors for these thing URLs to find their IDs
    const allIds: string[] = []

    for (const thingUrl of options.thingUrls) {
      // Query to find all chunks for this thing
      // We need to do this since Vectorize doesn't support metadata-only deletes
      const vectors = await this.getByThingUrl(thingUrl)
      allIds.push(
        ...vectors.map((v) => generateVectorId(v.thingUrl, v.chunkIndex))
      )
    }

    if (allIds.length === 0) {
      return { count: 0 }
    }

    const result = await this.env.VECTORIZE.deleteByIds(allIds)
    return { count: result.count }
  }

  /**
   * Get vectors by thing URL
   */
  async getByThingUrl(thingUrl: string): Promise<VectorSearchResult[]> {
    // Unfortunately, Vectorize doesn't have a direct "list by metadata" operation
    // We need to use the query with a filter, but that requires a vector
    // As a workaround, we'll use a zero vector query with filter
    // This is a limitation of Vectorize's API

    // First, get index info to know dimensions
    const info = await this.describe()
    const zeroVector = new Array(info.dimensions).fill(0)

    const results = await this.env.VECTORIZE.query(zeroVector, {
      topK: 1000, // Get all chunks
      namespace: this.namespace,
      returnMetadata: 'all',
      filter: { thingUrl },
    })

    return results.matches.map((match) => {
      const { chunkIndex } = parseVectorId(match.id)
      const metadata = match.metadata ?? {}

      return {
        thingUrl: (metadata.thingUrl as string) ?? thingUrl,
        chunkIndex: (metadata.chunkIndex as number) ?? chunkIndex,
        score: match.score,
        content: (metadata.content as string) ?? '',
        type: (metadata.type as string) || undefined,
        metadata: Object.fromEntries(
          Object.entries(metadata).filter(
            ([key]) => !['thingUrl', 'chunkIndex', 'content', 'type'].includes(key)
          )
        ) as Record<string, string | number | boolean>,
      }
    })
  }

  /**
   * Get index info
   */
  async describe(): Promise<VectorizeIndexDetails> {
    return this.env.VECTORIZE.describe()
  }

  /**
   * Get namespace
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
