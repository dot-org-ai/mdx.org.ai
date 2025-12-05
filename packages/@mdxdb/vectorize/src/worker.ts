/**
 * @mdxdb/vectorize Worker
 *
 * Cloudflare Worker exposing Vectorize RPC functions.
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
 * VectorizeDatabase Worker
 *
 * Exposes RPC methods for vector operations.
 * Methods are called directly via Workers RPC.
 */
export class VectorizeDatabase implements VectorizeDatabaseRPC {
  private env: VectorizeEnv
  private namespace: string

  constructor(env: VectorizeEnv, namespace: string) {
    this.env = env
    this.namespace = namespace
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
 * Worker entry point for Workers for Platforms deployment
 */
export default {
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
}

