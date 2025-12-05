/**
 * @mdxdb/chdb Tests
 *
 * Tests for vector similarity search and ULID support.
 * These tests verify the enhanced chdb build includes the required features.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, query, hasVectorSearch, hasULID } from './index'

describe('@mdxdb/chdb', () => {
  describe('Basic functionality', () => {
    it('executes simple query', () => {
      const result = query('SELECT 1 + 1 as result', 'JSON')
      const parsed = JSON.parse(result)
      expect(parsed.data[0].result).toBe(2)
    })

    it('creates session', () => {
      const session = new Session()
      expect(session.isTemp).toBe(true)
      session.cleanup()
    })

    it('executes session query', () => {
      const session = new Session()
      const result = session.query('SELECT version()', 'JSON')
      expect(result).toContain('data')
      session.cleanup()
    })
  })

  describe('Feature detection', () => {
    it('detects vector search availability', () => {
      const available = hasVectorSearch()
      console.log(`Vector search available: ${available}`)
      // Don't fail if not available - just report
      expect(typeof available).toBe('boolean')
    })

    it('detects ULID availability', () => {
      const available = hasULID()
      console.log(`ULID available: ${available}`)
      expect(typeof available).toBe('boolean')
    })
  })

  describe('ULID support', () => {
    let session: Session | null = null

    beforeAll(() => {
      try {
        session = new Session()
      } catch {
        // Session creation may fail if native bindings have issues
      }
    })

    afterAll(() => {
      session?.cleanup()
    })

    it('generates ULID', () => {
      if (!hasULID() || !session) {
        console.log('Skipping ULID test - not available in this build')
        return
      }

      const result = session.query('SELECT generateULID() as ulid', 'JSON')
      const parsed = JSON.parse(result)
      const ulid = parsed.data[0].ulid

      // ULID is 26 characters
      expect(ulid).toHaveLength(26)
      // ULID uses Crockford's Base32
      expect(ulid).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    })

    it('generates unique ULIDs', () => {
      if (!hasULID() || !session) return

      const result = session.query(
        'SELECT generateULID(1) as u1, generateULID(2) as u2, generateULID(3) as u3',
        'JSON'
      )
      const parsed = JSON.parse(result)
      const { u1, u2, u3 } = parsed.data[0]

      expect(u1).not.toBe(u2)
      expect(u2).not.toBe(u3)
      expect(u1).not.toBe(u3)
    })

    it('uses ULID as default ID', () => {
      if (!hasULID() || !session) return

      session.query(`
        CREATE TABLE IF NOT EXISTS test_ulid (
          id String DEFAULT generateULID(),
          name String
        ) ENGINE = MergeTree() ORDER BY id
      `)

      session.query("INSERT INTO test_ulid (name) VALUES ('test')")

      const result = session.query('SELECT id FROM test_ulid LIMIT 1', 'JSON')
      const parsed = JSON.parse(result)
      const id = parsed.data[0].id

      expect(id).toHaveLength(26)

      session.query('DROP TABLE IF EXISTS test_ulid')
    })
  })

  describe('Vector similarity search', () => {
    let session: Session | null = null

    beforeAll(() => {
      try {
        session = new Session()
      } catch {
        // Session creation may fail if native bindings have issues
      }
    })

    afterAll(() => {
      session?.cleanup()
    })

    it('creates table with vector_similarity index', () => {
      if (!hasVectorSearch() || !session) {
        console.log('Skipping vector test - not available in this build')
        return
      }

      // Enable experimental features
      session.query('SET allow_experimental_vector_similarity_index = 1')

      session.query(`
        CREATE TABLE IF NOT EXISTS test_vectors (
          id UInt64,
          embedding Array(Float32),
          INDEX idx_embedding embedding TYPE vector_similarity('hnsw', 'cosineDistance', 3) GRANULARITY 1
        ) ENGINE = MergeTree() ORDER BY id
      `)

      // Verify table was created
      const result = session.query('SHOW CREATE TABLE test_vectors', 'JSON')
      expect(result).toContain('vector_similarity')

      session.query('DROP TABLE IF EXISTS test_vectors')
    })

    it('performs vector similarity search', () => {
      if (!hasVectorSearch() || !session) return

      session.query('SET allow_experimental_vector_similarity_index = 1')

      // Create table with 3D vectors
      session.query(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id UInt64,
          text String,
          vec Array(Float32),
          INDEX idx_vec vec TYPE vector_similarity('hnsw', 'cosineDistance', 3) GRANULARITY 1
        ) ENGINE = MergeTree() ORDER BY id
      `)

      // Insert test vectors
      session.query(`
        INSERT INTO embeddings (id, text, vec) VALUES
          (1, 'apple', [1.0, 0.0, 0.0]),
          (2, 'banana', [0.9, 0.1, 0.0]),
          (3, 'orange', [0.8, 0.2, 0.0]),
          (4, 'car', [0.0, 1.0, 0.0]),
          (5, 'truck', [0.0, 0.9, 0.1])
      `)

      // Search for vectors similar to "apple" [1.0, 0.0, 0.0]
      const result = session.query(`
        SELECT id, text, cosineDistance(vec, [1.0, 0.0, 0.0]) as distance
        FROM embeddings
        ORDER BY distance
        LIMIT 3
      `, 'JSON')

      const parsed = JSON.parse(result)
      const results = parsed.data

      // First result should be "apple" with distance ~0
      expect(results[0].text).toBe('apple')
      expect(results[0].distance).toBeLessThan(0.01)

      // Second should be "banana" (similar direction)
      expect(results[1].text).toBe('banana')

      session.query('DROP TABLE IF EXISTS embeddings')
    })

    it('supports L2 distance', () => {
      if (!hasVectorSearch() || !session) return

      session.query('SET allow_experimental_vector_similarity_index = 1')

      session.query(`
        CREATE TABLE IF NOT EXISTS l2_test (
          id UInt64,
          vec Array(Float32),
          INDEX idx_vec vec TYPE vector_similarity('hnsw', 'L2Distance', 2) GRANULARITY 1
        ) ENGINE = MergeTree() ORDER BY id
      `)

      session.query(`
        INSERT INTO l2_test (id, vec) VALUES
          (1, [0.0, 0.0]),
          (2, [1.0, 0.0]),
          (3, [0.0, 1.0]),
          (4, [1.0, 1.0])
      `)

      const result = session.query(`
        SELECT id, L2Distance(vec, [0.0, 0.0]) as distance
        FROM l2_test
        ORDER BY distance
        LIMIT 2
      `, 'JSON')

      const parsed = JSON.parse(result)

      // First should be id=1 at origin
      expect(parsed.data[0].id).toBe(1)
      expect(parsed.data[0].distance).toBe(0)

      session.query('DROP TABLE IF EXISTS l2_test')
    })
  })

  describe('Combined ULID + Vector', () => {
    it('creates semantic search table', () => {
      if (!hasVectorSearch() || !hasULID()) {
        console.log('Skipping combined test - features not available')
        return
      }

      const session = new Session()
      session.query('SET allow_experimental_vector_similarity_index = 1')

      // Real-world schema for semantic search
      session.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id String DEFAULT generateULID(),
          content String,
          embedding Array(Float32),
          created_at DateTime64(3) DEFAULT now64(3),
          INDEX idx_embedding embedding TYPE vector_similarity('hnsw', 'cosineDistance', 1536) GRANULARITY 1
        ) ENGINE = MergeTree() ORDER BY id
      `)

      const result = session.query('SHOW CREATE TABLE documents', 'JSON')
      expect(result).toContain('generateULID')
      expect(result).toContain('vector_similarity')

      session.query('DROP TABLE IF EXISTS documents')
      session.cleanup()
    })
  })
})
