/**
 * Hybrid Search Example
 *
 * Demonstrates combining @mdxdb/vectorize with other database adapters
 * for powerful hybrid search (vector similarity + full-text).
 *
 * This pattern is useful for:
 * - Semantic search with keyword fallback
 * - Combining relevance signals from multiple sources
 * - Improving search accuracy with multi-modal ranking
 */

import { createVectorizeClient } from '../src/client.js'
import type { VectorSearchResult, VectorizeClientConfig } from '../src/types.js'

/**
 * Example: Hybrid search combining vector and full-text search
 *
 * This example shows how to integrate Vectorize with a full-text search
 * database (like ClickHouse, SQLite, or PostgreSQL) to provide comprehensive
 * search results.
 */

interface HybridSearchResult {
  thingUrl: string
  score: number
  vectorScore: number
  textScore: number
  content: string
  type?: string
}

/**
 * Hybrid search function
 *
 * Combines vector similarity search with full-text search,
 * then merges and re-ranks results.
 */
export async function hybridSearch(
  query: string,
  options: {
    vectorClient: ReturnType<typeof createVectorizeClient>
    textSearch: (query: string) => Promise<Array<{ url: string; score: number; content: string }>>
    embedFn: (text: string) => Promise<number[]>
    vectorWeight?: number
    textWeight?: number
    topK?: number
  }
): Promise<HybridSearchResult[]> {
  const {
    vectorClient,
    textSearch,
    embedFn,
    vectorWeight = 0.7,
    textWeight = 0.3,
    topK = 10,
  } = options

  // 1. Generate query embedding
  const queryEmbedding = await embedFn(query)

  // 2. Perform vector search
  const vectorResults = await vectorClient.search({
    embedding: queryEmbedding,
    topK: topK * 2, // Get more to ensure good coverage after merging
  })

  // 3. Perform full-text search
  const textResults = await textSearch(query)

  // 4. Merge results by URL
  const scoreMap = new Map<string, HybridSearchResult>()

  // Add vector results
  for (const result of vectorResults) {
    const existing = scoreMap.get(result.thingUrl)
    if (existing) {
      existing.vectorScore = Math.max(existing.vectorScore, result.score)
    } else {
      scoreMap.set(result.thingUrl, {
        thingUrl: result.thingUrl,
        score: 0, // Will be computed later
        vectorScore: result.score,
        textScore: 0,
        content: result.content,
        type: result.type,
      })
    }
  }

  // Add text results
  for (const result of textResults) {
    const existing = scoreMap.get(result.url)
    if (existing) {
      existing.textScore = Math.max(existing.textScore, result.score)
    } else {
      scoreMap.set(result.url, {
        thingUrl: result.url,
        score: 0, // Will be computed later
        vectorScore: 0,
        textScore: result.score,
        content: result.content,
      })
    }
  }

  // 5. Compute combined scores
  const results = Array.from(scoreMap.values()).map((r) => ({
    ...r,
    score: r.vectorScore * vectorWeight + r.textScore * textWeight,
  }))

  // 6. Sort by combined score and limit
  return results.sort((a, b) => b.score - a.score).slice(0, topK)
}

/**
 * Example: Using Workers AI for embeddings
 */
export function createWorkersAIEmbedder(ai: any) {
  return async (text: string): Promise<number[]> => {
    const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
      text: [text],
    })
    return result.data[0]
  }
}

/**
 * Example: Complete setup for Cloudflare Workers
 */
export interface WorkersEnv {
  VECTORIZE: any
  AI: any
  DB: any // Your full-text database binding
}

export async function setupHybridSearch(env: WorkersEnv, namespace: string) {
  // Create vector client
  const vectorClient = createVectorizeClient({
    namespace,
    binding: env.VECTORIZE,
    embedFn: createWorkersAIEmbedder(env.AI),
  })

  // Create text search function (example with D1 or other DB)
  const textSearch = async (query: string) => {
    // Example: Full-text search query
    const results = await env.DB.prepare(
      `SELECT url, content,
       (CASE WHEN LOWER(content) LIKE LOWER(?) THEN 1.0 ELSE 0.5 END) as score
       FROM things
       WHERE content LIKE ?
       ORDER BY score DESC
       LIMIT 20`
    )
      .bind(`%${query}%`, `%${query}%`)
      .all()

    return results.results.map((r: any) => ({
      url: r.url,
      score: r.score,
      content: r.content,
    }))
  }

  return {
    vectorClient,
    textSearch,
    embedFn: createWorkersAIEmbedder(env.AI),
  }
}

/**
 * Example: Worker handler with hybrid search
 */
export const exampleWorker = {
  async fetch(request: Request, env: WorkersEnv) {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')

    if (!query) {
      return new Response('Missing query parameter: ?q=', { status: 400 })
    }

    const { vectorClient, textSearch, embedFn } = await setupHybridSearch(
      env,
      'default'
    )

    const results = await hybridSearch(query, {
      vectorClient,
      textSearch,
      embedFn,
      topK: 10,
      vectorWeight: 0.7,
      textWeight: 0.3,
    })

    return Response.json({
      query,
      results: results.map((r) => ({
        url: r.thingUrl,
        score: r.score,
        breakdown: {
          vector: r.vectorScore,
          text: r.textScore,
        },
        content: r.content.slice(0, 200) + '...',
      })),
    })
  },
}

/**
 * Example: Document indexing pipeline
 *
 * Shows how to index documents into both vector and text databases
 */
export async function indexDocument(
  doc: {
    url: string
    type: string
    content: string
    metadata?: Record<string, any>
  },
  options: {
    vectorClient: ReturnType<typeof createVectorizeClient>
    textDb: any // Your text database client
  }
) {
  const { vectorClient, textDb } = options

  // 1. Index into vector database (automatically chunks and embeds)
  await vectorClient.upsertText(doc.url, doc.content, {
    type: doc.type,
    metadata: doc.metadata,
  })

  // 2. Index into text database for full-text search
  await textDb
    .prepare(
      'INSERT OR REPLACE INTO things (url, type, content, metadata) VALUES (?, ?, ?, ?)'
    )
    .bind(doc.url, doc.type, doc.content, JSON.stringify(doc.metadata))
    .run()

  return { indexed: true, url: doc.url }
}

/**
 * Example: Batch indexing
 */
export async function batchIndex(
  documents: Array<{
    url: string
    type: string
    content: string
    metadata?: Record<string, any>
  }>,
  options: {
    vectorClient: ReturnType<typeof createVectorizeClient>
    textDb: any
  }
) {
  // Process in parallel batches for better performance
  const BATCH_SIZE = 10
  const results: any[] = []

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((doc) => indexDocument(doc, options))
    )
    results.push(...batchResults)
  }

  return {
    indexed: results.length,
    documents: results,
  }
}

/**
 * Example: Semantic similarity with keyword boosting
 *
 * A more sophisticated approach that boosts results containing
 * exact keyword matches while still benefiting from semantic similarity
 */
export async function semanticSearchWithKeywordBoost(
  query: string,
  keywords: string[],
  options: {
    vectorClient: ReturnType<typeof createVectorizeClient>
    embedFn: (text: string) => Promise<number[]>
    topK?: number
    keywordBoost?: number
  }
): Promise<VectorSearchResult[]> {
  const { vectorClient, embedFn, topK = 10, keywordBoost = 0.2 } = options

  // Get vector search results
  const embedding = await embedFn(query)
  const results = await vectorClient.search({
    embedding,
    topK: topK * 2, // Get extra to allow for boosting
  })

  // Boost results that contain keywords
  const boosted = results.map((result) => {
    let boost = 0
    const lowerContent = result.content.toLowerCase()

    for (const keyword of keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        boost += keywordBoost
      }
    }

    return {
      ...result,
      score: Math.min(1.0, result.score + boost),
    }
  })

  // Re-sort and limit
  return boosted.sort((a, b) => b.score - a.score).slice(0, topK)
}
