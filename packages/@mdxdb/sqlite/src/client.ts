/**
 * MDXDatabase Client
 *
 * Client for interacting with MDXDatabase Durable Objects.
 * Works in both Cloudflare Workers (via DO binding) and Node.js (via miniflare).
 *
 * @example Workers
 * ```ts
 * // In a Cloudflare Worker
 * const client = createMDXClient({
 *   namespace: 'example.com',
 *   binding: env.MDXDB,
 * })
 *
 * const post = await client.create({
 *   ns: 'example.com',
 *   type: 'Post',
 *   data: { title: 'Hello World' }
 * })
 * ```
 *
 * @example Node.js with miniflare
 * ```ts
 * // In Node.js (uses miniflare automatically)
 * const client = await createMDXClient({
 *   namespace: 'example.com',
 *   miniflare: true,
 *   persistPath: './.data',
 * })
 *
 * const posts = await client.list({ type: 'Post' })
 * ```
 *
 * @packageDocumentation
 */

import type {
  MDXClientConfig,
  MDXDatabaseRPC,
  DurableObjectNamespace,
  DurableObjectStub,
  Thing,
  Relationship,
  Event,
  Action,
  Artifact,
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
  ArtifactType,
} from './types.js'

/**
 * MDXDatabase Client
 *
 * Provides a typed interface to the MDXDatabase Durable Object.
 * Methods are called directly via Workers RPC.
 */
export class MDXClient implements MDXDatabaseRPC {
  private stub: DurableObjectStub<MDXDatabaseRPC>
  private embedFn?: (text: string) => Promise<number[]>
  private _namespace: string

  constructor(
    stub: DurableObjectStub<MDXDatabaseRPC>,
    namespace: string,
    embedFn?: (text: string) => Promise<number[]>
  ) {
    this.stub = stub
    this._namespace = namespace
    this.embedFn = embedFn
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options?: QueryOptions): Promise<Thing[]> {
    return this.stub.list(options)
  }

  async get(url: string): Promise<Thing | null> {
    return this.stub.get(url)
  }

  async getById(type: string, id: string): Promise<Thing | null> {
    return this.stub.getById(type, id)
  }

  async create<TData = Record<string, unknown>>(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const thing = await this.stub.create(options as CreateOptions)

    // If we have an embed function, generate embeddings for the content
    if (this.embedFn) {
      await this.generateEmbeddings(thing.url)
    }

    return thing as Thing<TData>
  }

  async update<TData = Record<string, unknown>>(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>> {
    const thing = await this.stub.update(url, options as UpdateOptions)

    // If we have an embed function, regenerate embeddings
    if (this.embedFn) {
      await this.generateEmbeddings(url)
    }

    return thing as Thing<TData>
  }

  async upsert<TData = Record<string, unknown>>(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const thing = await this.stub.upsert(options as CreateOptions)

    // If we have an embed function, generate embeddings
    if (this.embedFn) {
      await this.generateEmbeddings(thing.url)
    }

    return thing as Thing<TData>
  }

  async delete(url: string): Promise<boolean> {
    return this.stub.delete(url)
  }

  async search(options: SearchOptions): Promise<Thing[]> {
    // If we have embeddings, try vector search
    if (this.embedFn) {
      const embedding = await this.embedFn(options.query)
      const results = await this.vectorSearchWithEmbedding(embedding, options)
      if (results.length > 0) {
        // Get things from URLs
        const things: Thing[] = []
        const seen = new Set<string>()
        for (const result of results) {
          if (!seen.has(result.thingUrl)) {
            seen.add(result.thingUrl)
            const thing = await this.get(result.thingUrl)
            if (thing) things.push(thing)
          }
        }
        return things
      }
    }

    // Fallback to text search
    return this.stub.search(options)
  }

  // ===========================================================================
  // Relationship Operations
  // ===========================================================================

  async relate<TData = Record<string, unknown>>(options: RelateOptions<TData>): Promise<Relationship<TData>> {
    return this.stub.relate(options as RelateOptions) as Promise<Relationship<TData>>
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    return this.stub.unrelate(from, type, to)
  }

  async related(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Promise<Thing[]> {
    return this.stub.related(url, type, direction)
  }

  async relationships(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Promise<Relationship[]> {
    return this.stub.relationships(url, type, direction)
  }

  // ===========================================================================
  // Vector Search Operations
  // ===========================================================================

  async vectorSearch(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    if (!this.embedFn) {
      throw new Error('No embedding function configured')
    }

    const embedding = await this.embedFn(options.query)
    return this.vectorSearchWithEmbedding(embedding, options)
  }

  async setEmbedding(thingUrl: string, chunkIndex: number, embedding: number[]): Promise<void> {
    return this.stub.setEmbedding(thingUrl, chunkIndex, embedding)
  }

  /**
   * Generate embeddings for a thing's search chunks
   */
  private async generateEmbeddings(thingUrl: string): Promise<void> {
    if (!this.embedFn) return

    // Get the thing to find its chunks
    const thing = await this.get(thingUrl)
    if (!thing) return

    // Get content to embed
    const data = thing.data as Record<string, unknown>
    const content = [
      data.title,
      data.name,
      data.description,
      data.content,
      data.text,
      thing.content,
    ].filter(v => typeof v === 'string').join('\n\n')

    if (!content) return

    // Chunk and embed (simple chunking, matches DO implementation)
    const chunks = this.chunkContent(content)
    for (const chunk of chunks) {
      try {
        const embedding = await this.embedFn(chunk.content)
        await this.setEmbedding(thingUrl, chunk.index, embedding)
      } catch (e) {
        console.warn(`Failed to embed chunk ${chunk.index} for ${thingUrl}:`, e)
      }
    }
  }

  private chunkContent(content: string, size = 1000, overlap = 200): Array<{ content: string; index: number }> {
    if (!content || content.length === 0) return []

    const chunks: Array<{ content: string; index: number }> = []
    let start = 0
    let index = 0

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

      chunks.push({
        content: content.slice(start, end).trim(),
        index,
      })

      start = end - overlap
      if (start >= content.length - overlap) break
      index++
    }

    return chunks
  }

  /**
   * Vector search with pre-computed embedding
   */
  private async vectorSearchWithEmbedding(
    queryEmbedding: number[],
    options: Omit<VectorSearchOptions, 'query'> & { query?: string }
  ): Promise<VectorSearchResult[]> {
    // This would need to fetch chunks and compute similarity client-side
    // since DO SQLite doesn't have vector operations
    // For now, delegate to stub's implementation
    return this.stub.vectorSearch({ ...options, query: options.query ?? '' })
  }

  // ===========================================================================
  // Event Operations
  // ===========================================================================

  async track<TData = Record<string, unknown>>(options: CreateEventOptions<TData>): Promise<Event<TData>> {
    return this.stub.track(options as CreateEventOptions) as Promise<Event<TData>>
  }

  async getEvent(id: string): Promise<Event | null> {
    return this.stub.getEvent(id)
  }

  async queryEvents(options?: EventQueryOptions): Promise<Event[]> {
    return this.stub.queryEvents(options)
  }

  // ===========================================================================
  // Action Operations
  // ===========================================================================

  async send<TData = Record<string, unknown>>(options: CreateActionOptions<TData>): Promise<Action<TData>> {
    return this.stub.send(options as CreateActionOptions) as Promise<Action<TData>>
  }

  async do<TData = Record<string, unknown>>(options: CreateActionOptions<TData>): Promise<Action<TData>> {
    return this.stub.do(options as CreateActionOptions) as Promise<Action<TData>>
  }

  async getAction(id: string): Promise<Action | null> {
    return this.stub.getAction(id)
  }

  async queryActions(options?: ActionQueryOptions): Promise<Action[]> {
    return this.stub.queryActions(options)
  }

  async startAction(id: string): Promise<Action> {
    return this.stub.startAction(id)
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    return this.stub.completeAction(id, result)
  }

  async failAction(id: string, error: string): Promise<Action> {
    return this.stub.failAction(id, error)
  }

  async cancelAction(id: string): Promise<Action> {
    return this.stub.cancelAction(id)
  }

  // ===========================================================================
  // Artifact Operations
  // ===========================================================================

  async storeArtifact<TContent = unknown>(options: StoreArtifactOptions<TContent>): Promise<Artifact<TContent>> {
    return this.stub.storeArtifact(options) as Promise<Artifact<TContent>>
  }

  async getArtifact<TContent = unknown>(key: string): Promise<Artifact<TContent> | null> {
    return this.stub.getArtifact(key) as Promise<Artifact<TContent> | null>
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    return this.stub.getArtifactBySource(source, type)
  }

  async deleteArtifact(key: string): Promise<boolean> {
    return this.stub.deleteArtifact(key)
  }

  async cleanExpiredArtifacts(): Promise<number> {
    return this.stub.cleanExpiredArtifacts()
  }

  // ===========================================================================
  // Database Info
  // ===========================================================================

  getDatabaseSize(): number {
    return this.stub.getDatabaseSize()
  }

  getNamespace(): string {
    return this._namespace
  }
}

/**
 * Create an MDXDatabase client for Workers
 *
 * @example
 * ```ts
 * const client = createMDXClient({
 *   namespace: 'example.com',
 *   binding: env.MDXDB,
 * })
 * ```
 */
export function createMDXClient(config: MDXClientConfig & { binding: DurableObjectNamespace<MDXDatabaseRPC> }): MDXClient {
  const id = config.binding.idFromName(config.namespace)
  const stub = config.binding.get(id)
  return new MDXClient(stub, config.namespace, config.embedFn)
}

/**
 * Create an MDXDatabase client for Node.js using miniflare
 *
 * @example
 * ```ts
 * const client = await createMiniflareClient({
 *   namespace: 'example.com',
 *   persistPath: './.data',
 * })
 * ```
 */
export async function createMiniflareClient(config: Omit<MDXClientConfig, 'binding'>): Promise<MDXClient> {
  // Dynamic import to avoid bundling miniflare in Workers
  const { createMiniflareBinding } = await import('./miniflare.js')
  const binding = await createMiniflareBinding(config.persistPath)
  const id = binding.idFromName(config.namespace)
  const stub = binding.get(id)
  return new MDXClient(stub, config.namespace, config.embedFn)
}
