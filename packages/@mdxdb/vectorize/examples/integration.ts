/**
 * Integration Examples
 *
 * Shows how @mdxdb/vectorize integrates with other @mdxdb packages
 * for comprehensive vector search across different storage backends.
 *
 * The @mdxdb/vectorize package is designed to work alongside:
 * - @mdxdb/sqlite: Vector search with SQLite/Turso (local-first)
 * - @mdxdb/clickhouse: Analytics + vector search (warehouse scale)
 * - @mdxdb/postgres: Traditional RDBMS with pgvector
 * - @mdxdb/fs: File system storage with vector index
 */

import { createVectorizeClient } from '../src/client.js'
import type { VectorizeClientConfig } from '../src/types.js'

/**
 * Example 1: Integration with @mdxdb/clickhouse
 *
 * Use Vectorize for semantic search and ClickHouse for analytics/full-text
 */
export async function clickhouseIntegration() {
  // Setup (assuming Workers environment)
  const vectorClient = createVectorizeClient({
    namespace: 'docs',
    workerUrl: 'https://vectorize.example.workers.dev',
    embedFn: async (text) => {
      // Your embedding function (OpenAI, Workers AI, etc.)
      return [] // Placeholder
    },
  })

  // ClickHouse client for full-text and analytics
  // (from @mdxdb/clickhouse)
  const clickhouse = {
    fullTextSearch: async (query: string) => {
      // Full-text search in ClickHouse
      return []
    },
    indexForSearch: async (doc: any) => {
      // Index in ClickHouse Search table
    },
  }

  // Index a document in both systems
  async function indexDocument(doc: { url: string; content: string; type: string }) {
    // 1. Index in Vectorize for semantic search
    await vectorClient.upsertText(doc.url, doc.content, {
      type: doc.type,
    })

    // 2. Index in ClickHouse for full-text + analytics
    await clickhouse.indexForSearch({
      url: doc.url,
      content: doc.content,
      type: doc.type,
      ns: 'docs',
    })
  }

  // Hybrid search combining both
  async function search(query: string) {
    // Get semantic results from Vectorize
    const vectorResults = await vectorClient.searchText(query, {
      topK: 10,
      minScore: 0.7,
    })

    // Get full-text results from ClickHouse
    const textResults = await clickhouse.fullTextSearch(query)

    // Merge and rank (simplified)
    return [...vectorResults, ...textResults]
  }

  return { indexDocument, search }
}

/**
 * Example 2: Integration with @mdxdb/sqlite (Durable Objects)
 *
 * Use Vectorize for embeddings and SQLite DO for structured data
 */
export async function sqliteIntegration() {
  interface Env {
    VECTORIZE_SERVICE: any // Service binding to vectorize worker
    MDXDB: any // Durable Object binding to @mdxdb/sqlite
  }

  return {
    async fetch(request: Request, env: Env) {
      const url = new URL(request.url)
      const namespace = url.hostname

      // Get SQLite DO stub
      const id = env.MDXDB.idFromName(namespace)
      const stub = env.MDXDB.get(id)

      // Get Vectorize service
      const vectorize = env.VECTORIZE_SERVICE.withNamespace(namespace)

      // Example: Create a document with vector embeddings
      if (request.method === 'POST') {
        const doc = await request.json() as {
          type: string
          data: { title: string; content: string }
        }

        // 1. Store in SQLite DO
        const thing = await stub.create({
          ns: namespace,
          type: doc.type,
          data: doc.data,
        })

        // 2. Index vectors in Vectorize
        await vectorize.upsert([
          {
            thingUrl: thing.url,
            chunkIndex: 0,
            embedding: await generateEmbedding(doc.data.content),
            content: doc.data.content,
            type: doc.type,
          },
        ])

        return Response.json({ created: thing })
      }

      // Example: Search across both
      if (url.pathname === '/search') {
        const query = url.searchParams.get('q')!

        // 1. Vector search
        const vectorResults = await vectorize.search({
          embedding: await generateEmbedding(query),
          topK: 10,
        })

        // 2. Get full things from SQLite DO
        const things = await Promise.all(
          vectorResults.map((r: any) => stub.get(r.thingUrl))
        )

        return Response.json({ results: things })
      }

      return new Response('Not Found', { status: 404 })
    },
  }

  async function generateEmbedding(text: string): Promise<number[]> {
    // Your embedding function
    return []
  }
}

/**
 * Example 3: Multi-namespace vector search
 *
 * Use Vectorize namespaces for multi-tenant isolation
 */
export async function multiTenantSearch() {
  const createTenantClient = (tenant: string) =>
    createVectorizeClient({
      namespace: tenant,
      workerUrl: 'https://vectorize.example.workers.dev',
    })

  // Index documents for different tenants
  async function indexForTenant(
    tenant: string,
    docs: Array<{ url: string; content: string }>
  ) {
    const client = createTenantClient(tenant)

    for (const doc of docs) {
      await client.upsertText(doc.url, doc.content, {
        metadata: { tenant },
      })
    }
  }

  // Search within tenant namespace
  async function searchForTenant(tenant: string, query: string) {
    const client = createTenantClient(tenant)
    return client.searchText(query, { topK: 10 })
  }

  return { indexForTenant, searchForTenant }
}

/**
 * Example 4: Incremental updates
 *
 * Handle document updates efficiently
 */
export async function incrementalUpdates() {
  const vectorClient = createVectorizeClient({
    namespace: 'docs',
    workerUrl: 'https://vectorize.example.workers.dev',
    embedFn: async (text) => [],
  })

  // Update document content and re-index vectors
  async function updateDocument(url: string, newContent: string) {
    // 1. Delete old vectors
    await vectorClient.delete({ thingUrls: [url] })

    // 2. Index new content (automatically chunks and embeds)
    await vectorClient.upsertText(url, newContent)
  }

  // Partial update (append new sections)
  async function appendToDocument(url: string, additionalContent: string) {
    // Get existing chunks
    const existing = await vectorClient.getByThingUrl(url)
    const nextIndex = existing.length

    // Index new chunks starting from next index
    // (Manual chunking for precise control)
    const chunks = chunkContent(additionalContent)

    // Upsert new chunks
    await vectorClient.upsert(
      chunks.map((content, i) => ({
        thingUrl: url,
        chunkIndex: nextIndex + i,
        embedding: [], // Would embed here
        content,
      }))
    )
  }

  function chunkContent(text: string, size = 1000): string[] {
    // Simple chunking implementation
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size))
    }
    return chunks
  }

  return { updateDocument, appendToDocument }
}

/**
 * Example 5: Similarity-based recommendations
 *
 * Find similar documents using vector embeddings
 */
export async function similarityRecommendations() {
  const vectorClient = createVectorizeClient({
    namespace: 'docs',
    workerUrl: 'https://vectorize.example.workers.dev',
  })

  // Find similar documents to a given document
  async function findSimilar(documentUrl: string, options?: { topK?: number; minScore?: number }) {
    // 1. Get the document's chunks
    const chunks = await vectorClient.getByThingUrl(documentUrl)

    if (chunks.length === 0) {
      return []
    }

    // 2. Use the first chunk's embedding as the query
    // (In practice, you might average embeddings or use the title)
    // Note: We'd need to store the embedding or recompute it
    // For this example, assume we can get it from metadata or recompute

    // 3. Search for similar vectors, excluding the source document
    const results = await vectorClient.search({
      embedding: [], // Would use document's embedding here
      topK: (options?.topK ?? 10) + chunks.length, // Get extra to filter out self
      minScore: options?.minScore ?? 0.7,
    })

    // 4. Filter out the source document and limit results
    return results
      .filter((r) => r.thingUrl !== documentUrl)
      .slice(0, options?.topK ?? 10)
  }

  // Recommend based on user's reading history
  async function recommendForUser(readUrls: string[], topK = 10) {
    // Get embeddings for all read documents
    const allResults = await Promise.all(
      readUrls.map((url) => vectorClient.getByThingUrl(url))
    )

    // Average the embeddings (simplified - would need actual embeddings)
    // const avgEmbedding = averageEmbeddings(allResults.flat().map(r => r.embedding))

    // Search for similar content
    return vectorClient.search({
      embedding: [], // Would use avgEmbedding here
      topK,
      minScore: 0.7,
    })
  }

  return { findSimilar, recommendForUser }
}

/**
 * Example 6: Real-time indexing with Workers
 *
 * Index documents as they're created/updated
 */
export interface IndexWorkerEnv {
  VECTORIZE_SERVICE: any
  QUEUE: any // Queue binding for async processing
}

export const indexWorker = {
  // Main request handler
  async fetch(request: Request, env: IndexWorkerEnv) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const doc = await request.json() as {
      url: string
      content: string
      type: string
      namespace: string
    }

    // Queue for async processing (better performance)
    await env.QUEUE.send({
      type: 'index',
      document: doc,
    })

    return Response.json({ queued: true })
  },

  // Queue consumer
  async queue(batch: any, env: IndexWorkerEnv) {
    const vectorize = env.VECTORIZE_SERVICE

    for (const message of batch.messages) {
      const { document } = message.body

      try {
        // Index in Vectorize
        const client = vectorize.withNamespace(document.namespace)
        await client.upsert([
          {
            thingUrl: document.url,
            chunkIndex: 0,
            embedding: await generateEmbedding(document.content),
            content: document.content,
            type: document.type,
          },
        ])

        message.ack()
      } catch (error) {
        console.error('Indexing failed:', error)
        message.retry()
      }
    }
  },
}

async function generateEmbedding(text: string): Promise<number[]> {
  // Placeholder - implement with your embedding service
  return new Array(384).fill(0)
}

/**
 * Example 7: Cross-namespace search
 *
 * Search across multiple namespaces with permission filtering
 */
export async function crossNamespaceSearch() {
  const baseUrl = 'https://vectorize.example.workers.dev'

  async function searchAcrossNamespaces(
    query: string,
    namespaces: string[],
    options?: { topK?: number }
  ) {
    // Create client for each namespace
    const clients = namespaces.map((ns) =>
      createVectorizeClient({
        namespace: ns,
        workerUrl: baseUrl,
      })
    )

    // Search all namespaces in parallel
    const results = await Promise.all(
      clients.map((client) =>
        client.searchText(query, {
          topK: options?.topK ?? 10,
        })
      )
    )

    // Merge results from all namespaces
    const merged = results.flat()

    // Sort by score and limit
    return merged.sort((a, b) => b.score - a.score).slice(0, options?.topK ?? 10)
  }

  return { searchAcrossNamespaces }
}
