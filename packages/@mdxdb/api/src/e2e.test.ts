/**
 * End-to-end tests for @mdxdb/api
 *
 * Tests the full stack: API Client → Hono Server → Database Backend (fs/sqlite)
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { createApiServer } from './server.js'
import { createSqliteDatabase, SqliteDatabase } from '@mdxdb/sqlite'
import { createFsDatabase, FsDatabase } from '@mdxdb/fs'
import { createApiClient } from 'mdxdb/client'
import type { Database } from 'mdxdb'
import type { MDXLDDocument } from 'mdxld'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Helper to create a fetch function that works with Hono's app.request
 */
function createTestFetch(app: ReturnType<typeof createApiServer>): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    // Extract the path from the full URL
    const urlObj = new URL(url)
    const path = urlObj.pathname + urlObj.search

    return app.request(path, {
      method: init?.method,
      headers: init?.headers as Record<string, string>,
      body: init?.body as string,
    })
  }
}

/**
 * Shared e2e test suite that can run against any backend
 */
function createE2ETestSuite(
  name: string,
  setup: () => Promise<{ db: Database; cleanup: () => Promise<void> }>
) {
  describe(`E2E: ${name}`, () => {
    let db: Database
    let app: ReturnType<typeof createApiServer>
    let client: Database
    let cleanup: () => Promise<void>

    beforeAll(async () => {
      const result = await setup()
      db = result.db
      cleanup = result.cleanup
      app = createApiServer({ database: db })
      client = createApiClient({
        baseUrl: 'http://test-server/api/mdxdb',
        fetch: createTestFetch(app),
      })
    })

    afterAll(async () => {
      await client.close?.()
      await db.close?.()
      await cleanup()
    })

    beforeEach(async () => {
      // Clean up any existing test documents
      const existing = await client.list()
      for (const doc of existing.documents) {
        await client.delete(doc.id!)
      }
    })

    describe('CRUD operations', () => {
      it('should create a document via client and retrieve it', async () => {
        const doc: MDXLDDocument = {
          type: 'Article',
          data: { title: 'E2E Test Article', author: 'Test User' },
          content: '# E2E Test\n\nThis is an end-to-end test.',
        }

        const createResult = await client.set('e2e-test-doc', doc)
        expect(createResult.created).toBe(true)
        expect(createResult.id).toBe('e2e-test-doc')

        const retrieved = await client.get('e2e-test-doc')
        expect(retrieved).not.toBeNull()
        expect(retrieved?.id).toBe('e2e-test-doc')
        expect(retrieved?.type).toBe('Article')
        expect(retrieved?.data.title).toBe('E2E Test Article')
        expect(retrieved?.data.author).toBe('Test User')
        expect(retrieved?.content).toContain('end-to-end test')
      })

      it('should update an existing document', async () => {
        await client.set('update-test', {
          data: { title: 'Original Title', version: 1 },
          content: '# Original',
        })

        const updateResult = await client.set('update-test', {
          data: { title: 'Updated Title', version: 2 },
          content: '# Updated',
        })
        expect(updateResult.created).toBe(false)

        const retrieved = await client.get('update-test')
        expect(retrieved?.data.title).toBe('Updated Title')
        expect(retrieved?.data.version).toBe(2)
        expect(retrieved?.content).toContain('Updated')
      })

      it('should delete a document', async () => {
        await client.set('delete-test', {
          data: { title: 'To Delete' },
          content: '# Delete Me',
        })

        const deleteResult = await client.delete('delete-test')
        expect(deleteResult.deleted).toBe(true)

        const retrieved = await client.get('delete-test')
        expect(retrieved).toBeNull()
      })

      it('should return null for non-existent document', async () => {
        const result = await client.get('non-existent-doc-xyz')
        expect(result).toBeNull()
      })

      it('should handle nested path IDs', async () => {
        await client.set('blog/2024/01/my-first-post', {
          type: 'BlogPost',
          data: { title: 'My First Post', date: '2024-01-15' },
          content: '# My First Post\n\nHello world!',
        })

        const retrieved = await client.get('blog/2024/01/my-first-post')
        expect(retrieved?.id).toBe('blog/2024/01/my-first-post')
        expect(retrieved?.type).toBe('BlogPost')
        expect(retrieved?.data.title).toBe('My First Post')
      })

      it('should store and retrieve context', async () => {
        await client.set('with-context', {
          type: 'Thing',
          context: 'https://schema.org',
          data: { name: 'Test Thing' },
          content: '# Thing',
        })

        const retrieved = await client.get('with-context')
        expect(retrieved?.context).toBe('https://schema.org')
      })

      it('should store complex data structures', async () => {
        await client.set('complex-data', {
          data: {
            tags: ['typescript', 'testing', 'e2e'],
            views: 100,
            likes: 50,
            authorName: 'John',
            authorEmail: 'john@example.com',
            published: true,
          },
          content: '# Complex Data',
        })

        const retrieved = await client.get('complex-data')
        expect(retrieved?.data.tags).toEqual(['typescript', 'testing', 'e2e'])
        expect(retrieved?.data.views).toBe(100)
        expect(retrieved?.data.likes).toBe(50)
        expect(retrieved?.data.authorName).toBe('John')
        expect(retrieved?.data.authorEmail).toBe('john@example.com')
        expect(retrieved?.data.published).toBe(true)
      })
    })

    describe('list operations', () => {
      beforeEach(async () => {
        // Create test documents
        await client.set('post-1', {
          type: 'Post',
          data: { title: 'First Post', order: 1 },
          content: '# First',
        })
        await client.set('post-2', {
          type: 'Post',
          data: { title: 'Second Post', order: 2 },
          content: '# Second',
        })
        await client.set('article-1', {
          type: 'Article',
          data: { title: 'First Article', order: 3 },
          content: '# Article',
        })
        await client.set('nested/doc-1', {
          type: 'Post',
          data: { title: 'Nested Doc', order: 4 },
          content: '# Nested',
        })
      })

      it('should list all documents', async () => {
        const result = await client.list()
        expect(result.documents).toHaveLength(4)
        expect(result.total).toBe(4)
      })

      it('should filter by type', async () => {
        const result = await client.list({ type: 'Post' })
        expect(result.documents).toHaveLength(3)
        expect(result.documents.every((d) => d.type === 'Post')).toBe(true)
      })

      it('should filter by multiple types', async () => {
        const result = await client.list({ type: ['Post', 'Article'] })
        expect(result.documents).toHaveLength(4)
      })

      it('should filter by prefix', async () => {
        const result = await client.list({ prefix: 'nested' })
        expect(result.documents).toHaveLength(1)
        expect(result.documents[0]?.id).toBe('nested/doc-1')
      })

      it('should paginate results', async () => {
        const page1 = await client.list({ limit: 2 })
        expect(page1.documents).toHaveLength(2)
        expect(page1.hasMore).toBe(true)

        const page2 = await client.list({ limit: 2, offset: 2 })
        expect(page2.documents).toHaveLength(2)
        expect(page2.hasMore).toBe(false)
      })

      it('should sort results', async () => {
        const result = await client.list({ sortBy: 'title', sortOrder: 'asc' })
        const titles = result.documents.map((d) => d.data.title)
        expect(titles).toEqual(['First Article', 'First Post', 'Nested Doc', 'Second Post'])
      })
    })

    describe('search operations', () => {
      beforeEach(async () => {
        await client.set('search-1', {
          type: 'Article',
          data: { title: 'Introduction to TypeScript' },
          content: '# TypeScript Guide\n\nLearn TypeScript programming language.',
        })
        await client.set('search-2', {
          type: 'Article',
          data: { title: 'Advanced JavaScript Patterns' },
          content: '# JavaScript\n\nAdvanced patterns and techniques.',
        })
        await client.set('search-3', {
          type: 'Tutorial',
          data: { title: 'React TypeScript Tutorial' },
          content: '# React with TypeScript\n\nBuild React apps with TypeScript.',
        })
      })

      it('should search documents by content', async () => {
        const result = await client.search({ query: 'TypeScript' })
        expect(result.documents.length).toBeGreaterThanOrEqual(2)
        expect(result.documents.every((d) => d.score && d.score > 0)).toBe(true)
      })

      it('should search documents by title', async () => {
        const result = await client.search({ query: 'JavaScript' })
        expect(result.documents.length).toBeGreaterThanOrEqual(1)
      })

      it('should filter search by type', async () => {
        const result = await client.search({ query: 'TypeScript', type: 'Tutorial' })
        expect(result.documents).toHaveLength(1)
        expect(result.documents[0]?.type).toBe('Tutorial')
      })

      it('should return empty results for non-matching query', async () => {
        const result = await client.search({ query: 'xyz-nonexistent-query-abc' })
        expect(result.documents).toHaveLength(0)
      })

      it('should paginate search results', async () => {
        const result = await client.search({ query: 'TypeScript', limit: 1 })
        expect(result.documents).toHaveLength(1)
      })
    })

    describe('error handling', () => {
      it('should handle createOnly constraint', async () => {
        await client.set('exists', { data: {}, content: '# Test' })

        await expect(
          client.set('exists', { data: {}, content: '# Updated' }, { createOnly: true })
        ).rejects.toThrow()
      })

      it('should handle updateOnly constraint', async () => {
        await expect(
          client.set('not-exists', { data: {}, content: '# Test' }, { updateOnly: true })
        ).rejects.toThrow()
      })
    })

    describe('concurrent operations', () => {
      it('should handle multiple concurrent creates', async () => {
        const promises = Array.from({ length: 10 }, (_, i) =>
          client.set(`concurrent-${i}`, {
            data: { index: i },
            content: `# Document ${i}`,
          })
        )

        const results = await Promise.all(promises)
        expect(results.every((r) => r.created)).toBe(true)

        const list = await client.list({ prefix: 'concurrent' })
        expect(list.documents).toHaveLength(10)
      })

      it('should handle concurrent reads', async () => {
        await client.set('read-test', {
          data: { value: 'test' },
          content: '# Read Test',
        })

        const promises = Array.from({ length: 10 }, () => client.get('read-test'))

        const results = await Promise.all(promises)
        expect(results.every((r) => r?.data.value === 'test')).toBe(true)
      })
    })
  })
}

// Run e2e tests with SQLite backend
createE2ETestSuite('SQLite Backend', async () => {
  const db = createSqliteDatabase({ filename: ':memory:' }) as SqliteDatabase
  return {
    db,
    cleanup: async () => {},
  }
})

// Run e2e tests with Filesystem backend
createE2ETestSuite('Filesystem Backend', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'mdxdb-e2e-'))
  const db = createFsDatabase({ root: tempDir }) as FsDatabase
  return {
    db,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true })
    },
  }
})

// Test with API key authentication
describe('E2E: Authentication', () => {
  let db: SqliteDatabase
  let app: ReturnType<typeof createApiServer>
  let authenticatedClient: Database
  let unauthenticatedClient: Database

  beforeAll(() => {
    db = createSqliteDatabase({ filename: ':memory:' })
    app = createApiServer({
      database: db,
      apiKey: 'test-api-key-12345',
    })

    authenticatedClient = createApiClient({
      baseUrl: 'http://test-server/api/mdxdb',
      apiKey: 'test-api-key-12345',
      fetch: createTestFetch(app),
    })

    unauthenticatedClient = createApiClient({
      baseUrl: 'http://test-server/api/mdxdb',
      fetch: createTestFetch(app),
    })
  })

  afterAll(async () => {
    await authenticatedClient.close?.()
    await unauthenticatedClient.close?.()
    await db.close()
  })

  it('should allow authenticated requests', async () => {
    const result = await authenticatedClient.set('auth-test', {
      data: { title: 'Auth Test' },
      content: '# Auth Test',
    })
    expect(result.created).toBe(true)

    const doc = await authenticatedClient.get('auth-test')
    expect(doc?.data.title).toBe('Auth Test')
  })

  it('should reject unauthenticated requests', async () => {
    await expect(unauthenticatedClient.list()).rejects.toThrow()
  })

  it('should reject requests with wrong API key', async () => {
    const wrongKeyClient = createApiClient({
      baseUrl: 'http://test-server/api/mdxdb',
      apiKey: 'wrong-key',
      fetch: createTestFetch(app),
    })

    await expect(wrongKeyClient.list()).rejects.toThrow()
    await wrongKeyClient.close?.()
  })
})

// Test custom base path
describe('E2E: Custom Base Path', () => {
  let db: SqliteDatabase
  let app: ReturnType<typeof createApiServer>
  let client: Database

  beforeAll(() => {
    db = createSqliteDatabase({ filename: ':memory:' })
    app = createApiServer({
      database: db,
      basePath: '/v2/database',
    })

    client = createApiClient({
      baseUrl: 'http://test-server/v2/database',
      fetch: createTestFetch(app),
    })
  })

  afterAll(async () => {
    await client.close?.()
    await db.close()
  })

  it('should work with custom base path', async () => {
    await client.set('custom-path-test', {
      data: { title: 'Custom Path' },
      content: '# Custom Path Test',
    })

    const doc = await client.get('custom-path-test')
    expect(doc?.data.title).toBe('Custom Path')

    const list = await client.list()
    expect(list.documents).toHaveLength(1)
  })
})
