import { describe, it, expect, beforeEach } from 'vitest'
import { VectorizeDatabase } from './worker.js'
import { VectorizeClient, createVectorizeClient } from './client.js'
import type {
  VectorizeEnv,
  VectorizeIndex,
  VectorizeVector,
  VectorizeMatches,
  VectorizeIndexDetails,
  UpsertVectorOptions,
  VectorizeQueryOptions,
  VectorizeVectorMutation,
} from './types.js'

/**
 * In-memory Vectorize implementation for testing
 *
 * This is a real implementation that:
 * - Stores vectors in memory
 * - Calculates cosine similarity for searches
 * - Supports metadata filtering
 * - Handles namespaces
 */
class InMemoryVectorizeIndex implements VectorizeIndex {
  private vectors: Map<string, VectorizeVector> = new Map()
  private dimensions: number
  private metric: 'cosine' | 'euclidean' | 'dot-product'
  private name: string

  constructor(name: string, dimensions: number, metric: 'cosine' | 'euclidean' | 'dot-product' = 'cosine') {
    this.name = name
    this.dimensions = dimensions
    this.metric = metric
  }

  async insert(vectors: VectorizeVector[]): Promise<VectorizeVectorMutation> {
    const ids: string[] = []
    for (const vector of vectors) {
      const key = this.makeKey(vector.id, vector.namespace)
      if (this.vectors.has(key)) {
        throw new Error(`Vector with id ${vector.id} already exists`)
      }
      this.vectors.set(key, vector)
      ids.push(vector.id)
    }
    return { ids, count: ids.length }
  }

  async upsert(vectors: VectorizeVector[]): Promise<VectorizeVectorMutation> {
    const ids: string[] = []
    for (const vector of vectors) {
      const key = this.makeKey(vector.id, vector.namespace)
      this.vectors.set(key, vector)
      ids.push(vector.id)
    }
    return { ids, count: ids.length }
  }

  async query(vector: number[], options?: VectorizeQueryOptions): Promise<VectorizeMatches> {
    const namespace = options?.namespace
    const topK = options?.topK ?? 10
    const returnMetadata = options?.returnMetadata ?? 'none'
    const returnValues = options?.returnValues ?? false
    const filter = options?.filter

    // Filter vectors by namespace and metadata
    const candidates: Array<{ id: string; vector: VectorizeVector; score: number }> = []

    for (const [key, v] of this.vectors.entries()) {
      // Check namespace
      if (namespace && v.namespace !== namespace) {
        continue
      }

      // Check metadata filter
      if (filter && !this.matchesFilter(v.metadata, filter)) {
        continue
      }

      // Calculate similarity score
      const score = this.calculateSimilarity(vector, v.values)
      candidates.push({ id: v.id, vector: v, score })
    }

    // Sort by score (descending) and take top K
    candidates.sort((a, b) => b.score - a.score)
    const topCandidates = candidates.slice(0, topK)

    const matches = topCandidates.map(({ id, vector: v, score }) => ({
      id,
      score,
      values: returnValues ? v.values : undefined,
      metadata: returnMetadata === 'none' ? undefined : v.metadata,
    }))

    return { matches, count: matches.length }
  }

  async getByIds(ids: string[]): Promise<VectorizeVector[]> {
    const results: VectorizeVector[] = []
    for (const id of ids) {
      // Try to find in any namespace
      for (const [, vector] of this.vectors.entries()) {
        if (vector.id === id) {
          results.push(vector)
          break
        }
      }
    }
    return results
  }

  async deleteByIds(ids: string[]): Promise<VectorizeVectorMutation> {
    const deletedIds: string[] = []
    for (const id of ids) {
      // Delete from all namespaces
      for (const [key, vector] of this.vectors.entries()) {
        if (vector.id === id) {
          this.vectors.delete(key)
          deletedIds.push(id)
        }
      }
    }
    return { ids: deletedIds, count: deletedIds.length }
  }

  async describe(): Promise<VectorizeIndexDetails> {
    return {
      name: this.name,
      dimensions: this.dimensions,
      metric: this.metric,
      vectorCount: this.vectors.size,
      config: {
        dimensions: this.dimensions,
        metric: this.metric,
      },
    }
  }

  private makeKey(id: string, namespace?: string): string {
    return namespace ? `${namespace}:${id}` : id
  }

  private matchesFilter(
    metadata: Record<string, string | number | boolean | string[]> | undefined,
    filter: Record<string, unknown>
  ): boolean {
    if (!metadata) return false

    for (const [key, value] of Object.entries(filter)) {
      const metaValue = metadata[key]

      if (typeof value === 'object' && value !== null && '$in' in value) {
        // Handle $in operator
        const inValues = (value as { $in: unknown[] }).$in
        if (!inValues.includes(metaValue)) {
          return false
        }
      } else if (typeof value === 'object' && value !== null && '$eq' in value) {
        // Handle $eq operator
        const eqValue = (value as { $eq: unknown }).$eq
        if (metaValue !== eqValue) {
          return false
        }
      } else if (typeof value === 'object' && value !== null && '$ne' in value) {
        // Handle $ne operator
        const neValue = (value as { $ne: unknown }).$ne
        if (metaValue === neValue) {
          return false
        }
      } else {
        // Direct equality check
        if (metaValue !== value) {
          return false
        }
      }
    }

    return true
  }

  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match')
    }

    switch (this.metric) {
      case 'cosine':
        return this.cosineSimilarity(a, b)
      case 'euclidean':
        return 1 / (1 + this.euclideanDistance(a, b))
      case 'dot-product':
        return this.dotProduct(a, b)
      default:
        throw new Error(`Unsupported metric: ${this.metric}`)
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProd = this.dotProduct(a, b)
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return magA === 0 || magB === 0 ? 0 : dotProd / (magA * magB)
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i]!, 0)
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i]!, 2), 0))
  }
}

/**
 * Create a test environment with in-memory Vectorize
 */
function createTestEnv(dimensions = 384): VectorizeEnv {
  return {
    VECTORIZE: new InMemoryVectorizeIndex('test-index', dimensions, 'cosine'),
  }
}

describe('@mdxdb/vectorize', () => {
  describe('module', () => {
    it('loads', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
      expect(mod.VectorizeDatabase).toBeDefined()
      expect(mod.VectorizeClient).toBeDefined()
      expect(mod.createVectorizeClient).toBeDefined()
    })
  })

  describe('VectorizeDatabase', () => {
    let env: VectorizeEnv
    let db: VectorizeDatabase

    beforeEach(() => {
      env = createTestEnv()
      db = new VectorizeDatabase(env, 'test-namespace')
    })

    describe('upsert', () => {
      it('upserts vectors with metadata', async () => {
        const vectors: UpsertVectorOptions[] = [
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.1),
            content: 'Test content chunk 0',
            type: 'Document',
            metadata: { author: 'John' },
          },
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 1,
            embedding: new Array(384).fill(0.2),
            content: 'Test content chunk 1',
            type: 'Document',
          },
        ]

        const result = await db.upsert(vectors)

        expect(result.count).toBe(2)

        // Verify vectors were stored by querying them back
        const chunks = await db.getByThingUrl('https://example.com/doc/1')
        expect(chunks).toHaveLength(2)
        expect(chunks[0]).toMatchObject({
          thingUrl: 'https://example.com/doc/1',
          chunkIndex: 0,
          content: 'Test content chunk 0',
          type: 'Document',
        })
        expect(chunks[0]!.metadata).toMatchObject({ author: 'John' })
      })

      it('validates vector dimensions', async () => {
        const vectors: UpsertVectorOptions[] = [
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: [0.1, 0.2], // Wrong dimensions (2 instead of 384)
            content: 'Test content',
          },
        ]

        await expect(db.upsert(vectors)).rejects.toThrow(/dimension mismatch/i)
      })

      it('returns early for empty vectors', async () => {
        const result = await db.upsert([])
        expect(result.count).toBe(0)
      })

      it('updates existing vectors', async () => {
        const vector: UpsertVectorOptions = {
          thingUrl: 'https://example.com/doc/1',
          chunkIndex: 0,
          embedding: new Array(384).fill(0.1),
          content: 'Original content',
          type: 'Document',
        }

        await db.upsert([vector])

        // Update with new content
        const updatedVector: UpsertVectorOptions = {
          ...vector,
          content: 'Updated content',
        }

        const result = await db.upsert([updatedVector])
        expect(result.count).toBe(1)

        // Verify update
        const chunks = await db.getByThingUrl('https://example.com/doc/1')
        expect(chunks).toHaveLength(1)
        expect(chunks[0]!.content).toBe('Updated content')
      })
    })

    describe('search', () => {
      it('searches with cosine similarity', async () => {
        // Insert test vectors
        const vectors: UpsertVectorOptions[] = [
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Relevant content',
            type: 'Document',
          },
          {
            thingUrl: 'https://example.com/doc/2',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.8),
            content: 'Another relevant content',
            type: 'Document',
          },
          {
            thingUrl: 'https://example.com/doc/3',
            chunkIndex: 0,
            embedding: new Array(384).fill(-0.5),
            content: 'Less relevant content',
            type: 'Document',
          },
        ]

        await db.upsert(vectors)

        // Search with vector similar to doc/1 and doc/2
        const queryEmbedding = new Array(384).fill(0.6)
        const results = await db.search({
          embedding: queryEmbedding,
          topK: 10,
          minScore: 0,
        })

        expect(results.length).toBeGreaterThan(0)
        // Most similar should be doc/2 (0.8), then doc/1 (0.5)
        expect(results[0]!.thingUrl).toBe('https://example.com/doc/2')
        expect(results[1]!.thingUrl).toBe('https://example.com/doc/1')
        expect(results[0]!.score).toBeGreaterThan(results[1]!.score)
      })

      it('filters by type', async () => {
        const vectors: UpsertVectorOptions[] = [
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Document content',
            type: 'Document',
          },
          {
            thingUrl: 'https://example.com/post/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Post content',
            type: 'Post',
          },
        ]

        await db.upsert(vectors)

        const queryEmbedding = new Array(384).fill(0.5)
        const results = await db.search({
          embedding: queryEmbedding,
          type: 'Document',
          topK: 5,
        })

        expect(results).toHaveLength(1)
        expect(results[0]!.type).toBe('Document')
      })

      it('filters by thing URLs', async () => {
        const vectors: UpsertVectorOptions[] = [
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Doc 1 content',
          },
          {
            thingUrl: 'https://example.com/doc/2',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Doc 2 content',
          },
          {
            thingUrl: 'https://example.com/doc/3',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Doc 3 content',
          },
        ]

        await db.upsert(vectors)

        const queryEmbedding = new Array(384).fill(0.5)
        const results = await db.search({
          embedding: queryEmbedding,
          thingUrls: ['https://example.com/doc/1', 'https://example.com/doc/2'],
          topK: 5,
        })

        expect(results).toHaveLength(2)
        const urls = results.map(r => r.thingUrl)
        expect(urls).toContain('https://example.com/doc/1')
        expect(urls).toContain('https://example.com/doc/2')
        expect(urls).not.toContain('https://example.com/doc/3')
      })

      it('filters by minimum score', async () => {
        const vectors: UpsertVectorOptions[] = [
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.9), // Very similar
            content: 'High score',
          },
          {
            thingUrl: 'https://example.com/doc/2',
            chunkIndex: 0,
            embedding: new Array(384).fill(-0.5), // Very different
            content: 'Low score',
          },
        ]

        await db.upsert(vectors)

        const queryEmbedding = new Array(384).fill(0.9)
        const results = await db.search({
          embedding: queryEmbedding,
          topK: 10,
          minScore: 0.9,
        })

        expect(results.length).toBeGreaterThan(0)
        expect(results.every(r => r.score >= 0.9)).toBe(true)
      })

      it('validates query embedding dimensions', async () => {
        const queryEmbedding = [0.1, 0.2] // Wrong dimensions

        await expect(
          db.search({
            embedding: queryEmbedding,
            topK: 10,
          })
        ).rejects.toThrow(/dimension mismatch/i)
      })

      it('returns top K results only', async () => {
        const vectors: UpsertVectorOptions[] = Array.from({ length: 20 }, (_, i) => ({
          thingUrl: `https://example.com/doc/${i}`,
          chunkIndex: 0,
          embedding: new Array(384).fill(0.5 + i * 0.01),
          content: `Content ${i}`,
        }))

        await db.upsert(vectors)

        const queryEmbedding = new Array(384).fill(0.6)
        const results = await db.search({
          embedding: queryEmbedding,
          topK: 5,
        })

        expect(results).toHaveLength(5)
      })
    })

    describe('delete', () => {
      it('deletes vectors for thing URLs', async () => {
        // Insert test vectors
        const vectors: UpsertVectorOptions[] = [
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Chunk 0',
          },
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 1,
            embedding: new Array(384).fill(0.5),
            content: 'Chunk 1',
          },
          {
            thingUrl: 'https://example.com/doc/2',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Other doc',
          },
        ]

        await db.upsert(vectors)

        // Delete doc/1
        const result = await db.delete({
          thingUrls: ['https://example.com/doc/1'],
        })

        expect(result.count).toBe(2)

        // Verify deletion
        const chunks = await db.getByThingUrl('https://example.com/doc/1')
        expect(chunks).toHaveLength(0)

        // Verify doc/2 still exists
        const doc2Chunks = await db.getByThingUrl('https://example.com/doc/2')
        expect(doc2Chunks).toHaveLength(1)
      })

      it('returns early for empty URLs', async () => {
        const result = await db.delete({ thingUrls: [] })
        expect(result.count).toBe(0)
      })

      it('handles deleting non-existent URLs', async () => {
        const result = await db.delete({
          thingUrls: ['https://example.com/nonexistent'],
        })
        expect(result.count).toBe(0)
      })
    })

    describe('getByThingUrl', () => {
      it('retrieves all chunks for a thing', async () => {
        const vectors: UpsertVectorOptions[] = [
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Chunk 0',
            type: 'Document',
          },
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 1,
            embedding: new Array(384).fill(0.5),
            content: 'Chunk 1',
            type: 'Document',
          },
          {
            thingUrl: 'https://example.com/doc/2',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Other doc',
            type: 'Document',
          },
        ]

        await db.upsert(vectors)

        const chunks = await db.getByThingUrl('https://example.com/doc/1')

        expect(chunks).toHaveLength(2)
        expect(chunks[0]).toMatchObject({
          thingUrl: 'https://example.com/doc/1',
          chunkIndex: 0,
          content: 'Chunk 0',
          type: 'Document',
        })
        expect(chunks[1]).toMatchObject({
          thingUrl: 'https://example.com/doc/1',
          chunkIndex: 1,
          content: 'Chunk 1',
          type: 'Document',
        })
      })

      it('returns empty array for non-existent thing', async () => {
        const chunks = await db.getByThingUrl('https://example.com/nonexistent')
        expect(chunks).toHaveLength(0)
      })
    })

    describe('withNamespace', () => {
      it('creates instance with different namespace', () => {
        const newDb = db.withNamespace('other-namespace')
        expect(newDb.getNamespace()).toBe('other-namespace')
        expect(db.getNamespace()).toBe('test-namespace')
      })

      it('isolates vectors by namespace', async () => {
        const db1 = db.withNamespace('namespace-1')
        const db2 = db.withNamespace('namespace-2')

        // Insert into namespace-1
        await db1.upsert([
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Namespace 1 content',
          },
        ])

        // Insert into namespace-2
        await db2.upsert([
          {
            thingUrl: 'https://example.com/doc/2',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Namespace 2 content',
          },
        ])

        // Search in namespace-1 should only return namespace-1 vectors
        const results1 = await db1.search({
          embedding: new Array(384).fill(0.5),
          topK: 10,
        })
        expect(results1).toHaveLength(1)
        expect(results1[0]!.thingUrl).toBe('https://example.com/doc/1')

        // Search in namespace-2 should only return namespace-2 vectors
        const results2 = await db2.search({
          embedding: new Array(384).fill(0.5),
          topK: 10,
        })
        expect(results2).toHaveLength(1)
        expect(results2[0]!.thingUrl).toBe('https://example.com/doc/2')
      })
    })

    describe('describe', () => {
      it('returns index details', async () => {
        const details = await db.describe()

        expect(details).toMatchObject({
          name: 'test-index',
          dimensions: 384,
          metric: 'cosine',
          vectorCount: 0,
          config: {
            dimensions: 384,
            metric: 'cosine',
          },
        })
      })

      it('updates vector count after upsert', async () => {
        await db.upsert([
          {
            thingUrl: 'https://example.com/doc/1',
            chunkIndex: 0,
            embedding: new Array(384).fill(0.5),
            content: 'Test',
          },
        ])

        // Need to create new instance to get fresh describe
        const newDb = new VectorizeDatabase(env, 'test-namespace')
        const details = await newDb.describe()
        expect(details.vectorCount).toBe(1)
      })
    })
  })

  describe('VectorizeClient', () => {
    it('creates client with config', () => {
      const client = createVectorizeClient({
        namespace: 'test',
        workerUrl: 'https://vectorize.example.workers.dev',
      })

      expect(client).toBeInstanceOf(VectorizeClient)
      expect(client.getNamespace()).toBe('test')
    })

    it('checks RPC usage', () => {
      const client = new VectorizeClient({
        namespace: 'test',
        workerUrl: 'https://example.com',
      })

      expect(client.isUsingRPC()).toBe(false)
    })

    describe('chunking', () => {
      it('chunks content at paragraph boundaries', () => {
        const client = new VectorizeClient({
          namespace: 'test',
          workerUrl: 'https://example.com',
        })

        const content = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
        const chunks = (client as any).chunkContent(content, 30, 5)

        expect(chunks.length).toBeGreaterThan(1)
        expect(chunks[0]).toContain('First paragraph')
      })

      it('handles empty content', () => {
        const client = new VectorizeClient({
          namespace: 'test',
          workerUrl: 'https://example.com',
        })

        const chunks = (client as any).chunkContent('', 1000, 200)
        expect(chunks).toEqual([])
      })

      it('handles content smaller than chunk size', () => {
        const client = new VectorizeClient({
          namespace: 'test',
          workerUrl: 'https://example.com',
        })

        const content = 'Short content.'
        const chunks = (client as any).chunkContent(content, 1000, 200)
        expect(chunks).toHaveLength(1)
        expect(chunks[0]).toBe('Short content.')
      })

      it('respects overlap', () => {
        const client = new VectorizeClient({
          namespace: 'test',
          workerUrl: 'https://example.com',
        })

        const content = 'A'.repeat(100) + '\n\n' + 'B'.repeat(100)
        const chunks = (client as any).chunkContent(content, 120, 20)

        expect(chunks.length).toBeGreaterThan(1)
        // Chunks should have some overlap
        if (chunks.length > 1) {
          const firstChunk = chunks[0]!
          const secondChunk = chunks[1]!
          // Check that there's some content from the end of first chunk
          // at the beginning of second chunk (overlap)
          const overlap = firstChunk.slice(-10)
          expect(secondChunk.includes(overlap.trim())).toBe(true)
        }
      })
    })
  })
})
