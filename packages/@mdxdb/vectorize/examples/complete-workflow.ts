/**
 * Complete Workflow Example
 *
 * End-to-end example showing document indexing, searching, and management
 * with @mdxdb/vectorize in a Cloudflare Workers environment.
 *
 * This demonstrates:
 * - Setting up the worker
 * - Indexing documents with automatic chunking and embedding
 * - Semantic search with scoring
 * - Document updates and deletions
 * - Multi-namespace isolation
 * - Integration with Workers AI
 */

import { VectorizeDatabase } from '../src/worker.js'
import { createVectorizeClient } from '../src/client.js'
import type {
  VectorizeIndex,
  VectorizeEnv,
  UpsertVectorOptions,
  VectorSearchOptions,
} from '../src/types.js'

// ============================================================================
// 1. Environment Setup
// ============================================================================

/**
 * Worker environment with all necessary bindings
 */
export interface Env {
  /** Vectorize index binding */
  VECTORIZE: VectorizeIndex

  /** Workers AI for embeddings */
  AI: {
    run(
      model: string,
      inputs: { text: string | string[] }
    ): Promise<{ data: number[][] }>
  }

  /** Optional: Service binding for Worker-to-Worker RPC */
  VECTORIZE_SERVICE?: any

  /** Optional: D1 for metadata storage */
  DB?: any

  /** Optional: KV for caching */
  KV?: any
}

// ============================================================================
// 2. Embedding Service
// ============================================================================

/**
 * Embedding service using Workers AI
 * Uses the BGE-base-en-v1.5 model (384 dimensions)
 */
class EmbeddingService {
  constructor(private ai: Env['AI']) {}

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const result = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
      text: [text],
    })
    return result.data[0]!
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const result = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
      text: texts,
    })
    return result.data
  }

  /**
   * Get embedding dimensions
   */
  get dimensions(): number {
    return 384
  }
}

// ============================================================================
// 3. Document Service
// ============================================================================

/**
 * Document to be indexed
 */
export interface Document {
  id: string
  url: string
  type: string
  title: string
  content: string
  metadata?: Record<string, any>
}

/**
 * Service for managing documents in Vectorize
 */
class DocumentService {
  private db: VectorizeDatabase
  private embedder: EmbeddingService

  constructor(env: Env, namespace: string) {
    this.db = new VectorizeDatabase(env, namespace)
    this.embedder = new EmbeddingService(env.AI)
  }

  /**
   * Chunk text into smaller pieces for better search accuracy
   */
  private chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    if (!text || text.length === 0) return []

    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length)

      // Try to break at paragraph boundary
      if (end < text.length) {
        const slice = text.slice(start, end)
        const lastPara = slice.lastIndexOf('\n\n')
        const lastSentence = Math.max(
          slice.lastIndexOf('. '),
          slice.lastIndexOf('! '),
          slice.lastIndexOf('? ')
        )

        if (lastPara > chunkSize * 0.5) {
          end = start + lastPara + 2
        } else if (lastSentence > chunkSize * 0.5) {
          end = start + lastSentence + 2
        }
      }

      const chunk = text.slice(start, end).trim()
      if (chunk) chunks.push(chunk)

      start = end - overlap
      if (start >= text.length - overlap) break
    }

    return chunks
  }

  /**
   * Index a document with automatic chunking and embedding
   */
  async indexDocument(doc: Document): Promise<{ indexed: number }> {
    // Combine title and content for indexing
    const fullText = `${doc.title}\n\n${doc.content}`

    // Chunk the text
    const chunks = this.chunkText(fullText)

    // Generate embeddings for all chunks
    const embeddings = await this.embedder.embedBatch(chunks)

    // Prepare vectors for upsert
    const vectors: UpsertVectorOptions[] = chunks.map((content, index) => ({
      thingUrl: doc.url,
      chunkIndex: index,
      embedding: embeddings[index]!,
      content,
      type: doc.type,
      metadata: {
        id: doc.id,
        title: doc.title,
        ...doc.metadata,
      },
    }))

    // Upsert to Vectorize
    const result = await this.db.upsert(vectors)

    return { indexed: result.count }
  }

  /**
   * Index multiple documents in batch
   */
  async indexBatch(docs: Document[]): Promise<{ indexed: number; failed: string[] }> {
    const results = await Promise.allSettled(
      docs.map((doc) => this.indexDocument(doc))
    )

    const indexed = results
      .filter((r) => r.status === 'fulfilled')
      .reduce((sum, r) => sum + (r as PromiseFulfilledResult<any>).value.indexed, 0)

    const failed = results
      .map((r, i) => (r.status === 'rejected' ? docs[i]!.id : null))
      .filter((id): id is string => id !== null)

    return { indexed, failed }
  }

  /**
   * Search documents semantically
   */
  async search(
    query: string,
    options?: {
      type?: string
      topK?: number
      minScore?: number
    }
  ) {
    // Generate query embedding
    const queryEmbedding = await this.embedder.embed(query)

    // Search in Vectorize
    const results = await this.db.search({
      embedding: queryEmbedding,
      topK: options?.topK ?? 10,
      type: options?.type,
      minScore: options?.minScore ?? 0.7,
    })

    // Group results by document URL
    const grouped = new Map<string, typeof results>()

    for (const result of results) {
      const existing = grouped.get(result.thingUrl) ?? []
      existing.push(result)
      grouped.set(result.thingUrl, existing)
    }

    // Return top chunks per document
    return Array.from(grouped.entries()).map(([url, chunks]) => ({
      url,
      score: Math.max(...chunks.map((c) => c.score)),
      chunks: chunks
        .sort((a, b) => b.score - a.score)
        .slice(0, 3) // Top 3 chunks per document
        .map((c) => ({
          index: c.chunkIndex,
          content: c.content,
          score: c.score,
        })),
      metadata: chunks[0]!.metadata,
    }))
  }

  /**
   * Delete a document's vectors
   */
  async deleteDocument(url: string): Promise<{ deleted: number }> {
    const result = await this.db.delete({ thingUrls: [url] })
    return { deleted: result.count }
  }

  /**
   * Update a document (re-index)
   */
  async updateDocument(doc: Document): Promise<{ updated: number }> {
    // Delete old vectors
    await this.deleteDocument(doc.url)

    // Index new content
    const result = await this.indexDocument(doc)

    return { updated: result.indexed }
  }

  /**
   * Get document info (number of chunks, etc.)
   */
  async getDocumentInfo(url: string) {
    const chunks = await this.db.getByThingUrl(url)

    return {
      url,
      chunkCount: chunks.length,
      totalLength: chunks.reduce((sum, c) => sum + c.content.length, 0),
      chunks: chunks.map((c) => ({
        index: c.chunkIndex,
        length: c.content.length,
        preview: c.content.slice(0, 100) + '...',
      })),
    }
  }
}

// ============================================================================
// 4. Worker Implementation
// ============================================================================

/**
 * Main worker export
 */
export default {
  /**
   * HTTP request handler
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const namespace = url.hostname.split('.')[0] ?? 'default'

    // Create document service
    const docService = new DocumentService(env, namespace)

    // Route handling
    try {
      // POST /documents - Index a document
      if (request.method === 'POST' && url.pathname === '/documents') {
        const doc = (await request.json()) as Document

        const result = await docService.indexDocument(doc)

        return Response.json({
          success: true,
          indexed: result.indexed,
          url: doc.url,
        })
      }

      // POST /documents/batch - Index multiple documents
      if (request.method === 'POST' && url.pathname === '/documents/batch') {
        const docs = (await request.json()) as Document[]

        const result = await docService.indexBatch(docs)

        return Response.json({
          success: true,
          indexed: result.indexed,
          failed: result.failed,
        })
      }

      // GET /search?q=query - Search documents
      if (request.method === 'GET' && url.pathname === '/search') {
        const query = url.searchParams.get('q')
        const type = url.searchParams.get('type') ?? undefined
        const topK = parseInt(url.searchParams.get('topK') ?? '10')
        const minScore = parseFloat(url.searchParams.get('minScore') ?? '0.7')

        if (!query) {
          return Response.json(
            { error: 'Missing query parameter: ?q=' },
            { status: 400 }
          )
        }

        const results = await docService.search(query, {
          type,
          topK,
          minScore,
        })

        return Response.json({
          query,
          results,
          count: results.length,
        })
      }

      // DELETE /documents/:url - Delete document
      if (request.method === 'DELETE' && url.pathname.startsWith('/documents/')) {
        const docUrl = decodeURIComponent(url.pathname.slice('/documents/'.length))

        const result = await docService.deleteDocument(docUrl)

        return Response.json({
          success: true,
          deleted: result.deleted,
          url: docUrl,
        })
      }

      // PUT /documents - Update document
      if (request.method === 'PUT' && url.pathname === '/documents') {
        const doc = (await request.json()) as Document

        const result = await docService.updateDocument(doc)

        return Response.json({
          success: true,
          updated: result.updated,
          url: doc.url,
        })
      }

      // GET /documents/:url/info - Get document info
      if (request.method === 'GET' && url.pathname.startsWith('/documents/')) {
        const docUrl = decodeURIComponent(url.pathname.slice('/documents/'.length))

        if (!docUrl.includes('/info')) {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }

        const cleanUrl = docUrl.replace('/info', '')
        const info = await docService.getDocumentInfo(cleanUrl)

        return Response.json(info)
      }

      // Health check
      if (request.method === 'GET' && url.pathname === '/health') {
        const db = new VectorizeDatabase(env, namespace)
        const indexInfo = await db.describe()

        return Response.json({
          status: 'ok',
          namespace,
          index: {
            name: indexInfo.name,
            dimensions: indexInfo.dimensions,
            metric: indexInfo.metric,
            vectorCount: indexInfo.vectorCount,
          },
        })
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      console.error('Error:', error)
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Internal error',
        },
        { status: 500 }
      )
    }
  },
}

// ============================================================================
// 5. Usage Examples
// ============================================================================

/**
 * Example usage (from another script or worker):
 */

// Index a single document
async function exampleIndex() {
  const response = await fetch('https://vectorize.example.workers.dev/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'doc-1',
      url: 'https://example.com/docs/intro',
      type: 'Documentation',
      title: 'Introduction to Vectors',
      content: 'Vectors are mathematical objects that represent direction and magnitude...',
      metadata: { author: 'John Doe', category: 'Tutorial' },
    }),
  })

  const result = await response.json()
  console.log('Indexed:', result)
}

// Search documents
async function exampleSearch() {
  const response = await fetch(
    'https://vectorize.example.workers.dev/search?q=vector%20embeddings&topK=5&minScore=0.75'
  )

  const result = await response.json()
  console.log('Search results:', result.results)
}

// Update a document
async function exampleUpdate() {
  const response = await fetch('https://vectorize.example.workers.dev/documents', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'doc-1',
      url: 'https://example.com/docs/intro',
      type: 'Documentation',
      title: 'Updated: Introduction to Vectors',
      content: 'This is the updated content with more details about vectors...',
      metadata: { author: 'John Doe', category: 'Tutorial', updated: '2024-12-08' },
    }),
  })

  const result = await response.json()
  console.log('Updated:', result)
}

// Delete a document
async function exampleDelete() {
  const response = await fetch(
    'https://vectorize.example.workers.dev/documents/https%3A%2F%2Fexample.com%2Fdocs%2Fintro',
    { method: 'DELETE' }
  )

  const result = await response.json()
  console.log('Deleted:', result)
}

// Get document info
async function exampleInfo() {
  const response = await fetch(
    'https://vectorize.example.workers.dev/documents/https%3A%2F%2Fexample.com%2Fdocs%2Fintro/info'
  )

  const result = await response.json()
  console.log('Document info:', result)
}

// Batch index
async function exampleBatch() {
  const documents = [
    {
      id: 'doc-1',
      url: 'https://example.com/docs/intro',
      type: 'Documentation',
      title: 'Introduction',
      content: '...',
    },
    {
      id: 'doc-2',
      url: 'https://example.com/docs/advanced',
      type: 'Documentation',
      title: 'Advanced Topics',
      content: '...',
    },
  ]

  const response = await fetch(
    'https://vectorize.example.workers.dev/documents/batch',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documents),
    }
  )

  const result = await response.json()
  console.log('Batch indexed:', result)
}
