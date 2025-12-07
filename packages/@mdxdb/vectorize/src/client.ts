/**
 * @mdxdb/vectorize Client
 *
 * Client for interacting with VectorizeDatabase Worker.
 * Supports both HTTP and service binding modes.
 *
 * @packageDocumentation
 */

import type {
  VectorizeClientConfig,
  VectorizeDatabaseRPC,
  UpsertVectorOptions,
  VectorSearchOptions,
  VectorSearchResult,
  DeleteVectorsOptions,
  VectorizeIndexDetails,
  VectorizeRPCStub,
} from './types.js'

/**
 * Check if binding is an RPC stub (has direct methods)
 */
function isRPCStub(binding: unknown): binding is VectorizeRPCStub {
  return (
    binding !== null &&
    typeof binding === 'object' &&
    'search' in binding &&
    typeof (binding as VectorizeRPCStub).search === 'function'
  )
}

/**
 * VectorizeClient
 *
 * Client for calling Vectorize worker.
 * Supports three modes:
 * 1. Direct RPC stub - methods called directly on the stub
 * 2. Service binding with fetch - JSON-RPC over HTTP
 * 3. Worker URL - JSON-RPC over HTTP
 */
export class VectorizeClient implements VectorizeDatabaseRPC {
  private config: VectorizeClientConfig
  private embedFn?: (text: string) => Promise<number[]>
  private rpcStub?: VectorizeRPCStub

  constructor(config: VectorizeClientConfig) {
    this.config = config
    this.embedFn = config.embedFn

    // Check if we have a direct RPC stub
    if (config.rpcStub) {
      this.rpcStub = config.rpcStub.withNamespace(config.namespace)
    } else if (config.binding && isRPCStub(config.binding)) {
      this.rpcStub = config.binding.withNamespace(config.namespace)
    }
  }

  /**
   * Make RPC call to worker via fetch (fallback)
   */
  private async fetchRpc<T>(method: string, params: unknown[]): Promise<T> {
    const body = JSON.stringify({ method, params })
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-MDXDB-Namespace': this.config.namespace,
    }

    let response: Response

    if (this.config.binding && 'fetch' in this.config.binding) {
      // Use service binding (Worker-to-Worker) with fetch
      const binding = this.config.binding as { fetch(request: Request): Promise<Response> }
      response = await binding.fetch(
        new Request(`https://vectorize.internal/?namespace=${this.config.namespace}`, {
          method: 'POST',
          headers,
          body,
        })
      )
    } else if (this.config.workerUrl) {
      // Use HTTP
      const url = new URL(this.config.workerUrl)
      url.searchParams.set('namespace', this.config.namespace)

      response = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body,
      })
    } else {
      throw new Error('No workerUrl or binding configured')
    }

    if (!response.ok) {
      const error = await response.json() as { error: string }
      throw new Error(error.error ?? `HTTP ${response.status}`)
    }

    const result = await response.json() as { result: T; error?: string }
    if (result.error) {
      throw new Error(result.error)
    }

    return result.result
  }

  /**
   * Upsert vectors
   */
  async upsert(vectors: UpsertVectorOptions[]): Promise<{ count: number }> {
    // Use direct RPC if available
    if (this.rpcStub) {
      return this.rpcStub.upsert(vectors)
    }
    return this.fetchRpc('upsert', [vectors])
  }

  /**
   * Upsert text content (auto-embeds)
   */
  async upsertText(
    thingUrl: string,
    content: string,
    options?: { type?: string; metadata?: Record<string, string | number | boolean> }
  ): Promise<{ count: number }> {
    if (!this.embedFn) {
      throw new Error('No embedding function configured')
    }

    // Chunk content
    const chunks = this.chunkContent(content)

    // Embed all chunks
    const vectors: UpsertVectorOptions[] = await Promise.all(
      chunks.map(async (chunk, index) => ({
        thingUrl,
        chunkIndex: index,
        embedding: await this.embedFn!(chunk),
        content: chunk,
        type: options?.type,
        metadata: options?.metadata,
      }))
    )

    return this.upsert(vectors)
  }

  /**
   * Search for similar vectors
   */
  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    // Use direct RPC if available
    if (this.rpcStub) {
      return this.rpcStub.search(options)
    }
    return this.fetchRpc('search', [options])
  }

  /**
   * Search by text (auto-embeds query)
   */
  async searchText(
    query: string,
    options?: Omit<VectorSearchOptions, 'embedding'>
  ): Promise<VectorSearchResult[]> {
    if (!this.embedFn) {
      throw new Error('No embedding function configured')
    }

    const embedding = await this.embedFn(query)
    return this.search({ ...options, embedding })
  }

  /**
   * Delete vectors for things
   */
  async delete(options: DeleteVectorsOptions): Promise<{ count: number }> {
    // Use direct RPC if available
    if (this.rpcStub) {
      return this.rpcStub.delete(options)
    }
    return this.fetchRpc('delete', [options])
  }

  /**
   * Get vectors by thing URL
   */
  async getByThingUrl(thingUrl: string): Promise<VectorSearchResult[]> {
    // Use direct RPC if available
    if (this.rpcStub) {
      return this.rpcStub.getByThingUrl(thingUrl)
    }
    return this.fetchRpc('getByThingUrl', [thingUrl])
  }

  /**
   * Get index info
   */
  async describe(): Promise<VectorizeIndexDetails> {
    // Use direct RPC if available
    if (this.rpcStub) {
      return this.rpcStub.describe()
    }
    return this.fetchRpc('describe', [])
  }

  /**
   * Get namespace
   */
  getNamespace(): string {
    // This is synchronous, just return config namespace
    return this.config.namespace
  }

  /**
   * Check if using direct RPC
   */
  isUsingRPC(): boolean {
    return this.rpcStub !== undefined
  }

  /**
   * Chunk content into smaller pieces
   */
  private chunkContent(content: string, size = 1000, overlap = 200): string[] {
    if (!content || content.length === 0) return []

    const chunks: string[] = []
    let start = 0

    while (start < content.length) {
      let end = Math.min(start + size, content.length)

      if (end < content.length) {
        const slice = content.slice(start, end)
        const lastPara = slice.lastIndexOf('\n\n')
        const lastSentence = Math.max(
          slice.lastIndexOf('. '),
          slice.lastIndexOf('! '),
          slice.lastIndexOf('? ')
        )

        if (lastPara > size * 0.5) {
          end = start + lastPara + 2
        } else if (lastSentence > size * 0.5) {
          end = start + lastSentence + 2
        }
      }

      chunks.push(content.slice(start, end).trim())

      start = end - overlap
      if (start >= content.length - overlap) break
    }

    return chunks
  }
}

/**
 * Create a Vectorize client
 */
export function createVectorizeClient(config: VectorizeClientConfig): VectorizeClient {
  return new VectorizeClient(config)
}
