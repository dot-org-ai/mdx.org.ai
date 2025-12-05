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
} from './types.js'

/**
 * VectorizeClient
 *
 * Client for calling Vectorize worker via HTTP or service binding.
 */
export class VectorizeClient implements VectorizeDatabaseRPC {
  private config: VectorizeClientConfig
  private embedFn?: (text: string) => Promise<number[]>

  constructor(config: VectorizeClientConfig) {
    this.config = config
    this.embedFn = config.embedFn
  }

  /**
   * Make RPC call to worker
   */
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const body = JSON.stringify({ method, params })
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-MDXDB-Namespace': this.config.namespace,
    }

    let response: Response

    if (this.config.binding) {
      // Use service binding (Worker-to-Worker)
      response = await this.config.binding.fetch(
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
    return this.rpc('upsert', [vectors])
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
    return this.rpc('search', [options])
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
    return this.rpc('delete', [options])
  }

  /**
   * Get vectors by thing URL
   */
  async getByThingUrl(thingUrl: string): Promise<VectorSearchResult[]> {
    return this.rpc('getByThingUrl', [thingUrl])
  }

  /**
   * Get index info
   */
  async describe(): Promise<VectorizeIndexDetails> {
    return this.rpc('describe', [])
  }

  /**
   * Get namespace
   */
  getNamespace(): string {
    return this.config.namespace
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
