import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSqliteDatabase, SqliteDatabase } from './database.js'
import type { MDXLDDocument } from 'mdxld'

describe('SqliteDatabase', () => {
  let db: SqliteDatabase

  beforeEach(() => {
    // Use in-memory database for tests
    db = createSqliteDatabase({ filename: ':memory:' })
  })

  afterEach(async () => {
    await db.close()
  })

  describe('set and get', () => {
    it('should create and retrieve a document', async () => {
      const doc: MDXLDDocument = {
        type: 'Article',
        data: { title: 'Test Article' },
        content: '# Hello World\n\nThis is a test.',
      }

      const result = await db.set('test-doc', doc)
      expect(result.created).toBe(true)
      expect(result.id).toBe('test-doc')
      expect(result.version).toBe('1')

      const retrieved = await db.get('test-doc')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe('test-doc')
      expect(retrieved?.type).toBe('Article')
      expect(retrieved?.data.title).toBe('Test Article')
      expect(retrieved?.content).toContain('Hello World')
    })

    it('should store nested paths as IDs', async () => {
      const doc: MDXLDDocument = {
        data: { title: 'Nested Doc' },
        content: '# Nested',
      }

      await db.set('posts/2024/my-post', doc)

      const retrieved = await db.get('posts/2024/my-post')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe('posts/2024/my-post')
      expect(retrieved?.data.title).toBe('Nested Doc')
    })

    it('should update an existing document', async () => {
      const doc1: MDXLDDocument = {
        data: { title: 'Original' },
        content: '# Original',
      }
      const res1 = await db.set('update-test', doc1)
      expect(res1.version).toBe('1')

      const doc2: MDXLDDocument = {
        data: { title: 'Updated' },
        content: '# Updated',
      }
      const res2 = await db.set('update-test', doc2)
      expect(res2.created).toBe(false)
      expect(res2.version).toBe('2')

      const retrieved = await db.get('update-test')
      expect(retrieved?.data.title).toBe('Updated')
    })

    it('should throw when createOnly and document exists', async () => {
      const doc: MDXLDDocument = {
        data: {},
        content: '# Test',
      }
      await db.set('exists', doc)

      await expect(db.set('exists', doc, { createOnly: true })).rejects.toThrow('already exists')
    })

    it('should throw when updateOnly and document does not exist', async () => {
      const doc: MDXLDDocument = {
        data: {},
        content: '# Test',
      }

      await expect(db.set('not-exists', doc, { updateOnly: true })).rejects.toThrow('does not exist')
    })

    it('should return null for non-existent document', async () => {
      const result = await db.get('non-existent')
      expect(result).toBeNull()
    })

    it('should store and retrieve context', async () => {
      const doc: MDXLDDocument = {
        type: 'Article',
        context: 'https://schema.org',
        data: { title: 'With Context' },
        content: '# Content',
      }

      await db.set('with-context', doc)
      const retrieved = await db.get('with-context')

      expect(retrieved?.context).toBe('https://schema.org')
    })

    it('should support optimistic locking with version', async () => {
      const doc: MDXLDDocument = { data: {}, content: '# Test' }
      await db.set('versioned', doc)

      // Update with correct version should work
      await db.set('versioned', doc, { version: '1' })

      // Update with wrong version should fail
      await expect(db.set('versioned', doc, { version: '1' })).rejects.toThrow('Version mismatch')
    })
  })

  describe('list', () => {
    beforeEach(async () => {
      await db.set('post-1', {
        type: 'Post',
        data: { title: 'First Post' },
        content: '# Post 1',
      })
      await db.set('post-2', {
        type: 'Post',
        data: { title: 'Second Post' },
        content: '# Post 2',
      })
      await db.set('article-1', {
        type: 'Article',
        data: { title: 'First Article' },
        content: '# Article 1',
      })
      await db.set('nested/doc', {
        type: 'Post',
        data: { title: 'Nested Doc' },
        content: '# Nested',
      })
    })

    it('should list all documents', async () => {
      const result = await db.list()
      expect(result.documents).toHaveLength(4)
      expect(result.total).toBe(4)
      expect(result.hasMore).toBe(false)
    })

    it('should filter by type', async () => {
      const result = await db.list({ type: 'Post' })
      expect(result.documents).toHaveLength(3)
      expect(result.documents.every((d) => d.type === 'Post')).toBe(true)
    })

    it('should filter by multiple types', async () => {
      const result = await db.list({ type: ['Post', 'Article'] })
      expect(result.documents).toHaveLength(4)
    })

    it('should filter by prefix', async () => {
      const result = await db.list({ prefix: 'nested' })
      expect(result.documents).toHaveLength(1)
      expect(result.documents[0]?.id).toBe('nested/doc')
    })

    it('should paginate results', async () => {
      const result = await db.list({ limit: 2 })
      expect(result.documents).toHaveLength(2)
      expect(result.hasMore).toBe(true)

      const page2 = await db.list({ limit: 2, offset: 2 })
      expect(page2.documents).toHaveLength(2)
      expect(page2.hasMore).toBe(false)
    })

    it('should sort by data field', async () => {
      const result = await db.list({ sortBy: 'title', sortOrder: 'asc' })
      const titles = result.documents.map((d) => d.data.title)
      expect(titles).toEqual(['First Article', 'First Post', 'Nested Doc', 'Second Post'])
    })

    it('should sort by column field', async () => {
      const result = await db.list({ sortBy: 'id', sortOrder: 'asc' })
      const ids = result.documents.map((d) => d.id)
      expect(ids).toEqual(['article-1', 'nested/doc', 'post-1', 'post-2'])
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      await db.set('searchable-1', {
        data: { title: 'Hello World' },
        content: '# Welcome to the hello world tutorial',
      })
      await db.set('searchable-2', {
        data: { title: 'Goodbye' },
        content: '# Goodbye cruel world',
      })
      await db.set('searchable-3', {
        data: { title: 'Unrelated' },
        content: '# Something completely different',
      })
    })

    it('should find documents matching query in content', async () => {
      const result = await db.search({ query: 'world' })
      expect(result.documents).toHaveLength(2)
      expect(result.documents.every((d) => d.score && d.score > 0)).toBe(true)
    })

    it('should find documents matching query in title', async () => {
      const result = await db.search({ query: 'Hello' })
      expect(result.documents).toHaveLength(1)
      expect(result.documents[0]?.data.title).toBe('Hello World')
    })

    it('should search specific fields', async () => {
      const result = await db.search({ query: 'world', fields: ['title'] })
      expect(result.documents).toHaveLength(1)
      expect(result.documents[0]?.data.title).toBe('Hello World')
    })

    it('should return empty results for non-matching query', async () => {
      const result = await db.search({ query: 'nonexistent' })
      expect(result.documents).toHaveLength(0)
    })

    it('should sort by relevance score', async () => {
      await db.set('multi-match', {
        data: { title: 'Hello Hello' },
        content: '# Hello hello hello',
      })

      const result = await db.search({ query: 'hello' })
      expect(result.documents[0]?.data.title).toBe('Hello Hello')
    })

    it('should filter by type when searching', async () => {
      await db.set('typed-search', {
        type: 'Special',
        data: { title: 'Special World' },
        content: '# World content',
      })

      const result = await db.search({ query: 'world', type: 'Special' })
      expect(result.documents).toHaveLength(1)
      expect(result.documents[0]?.type).toBe('Special')
    })
  })

  describe('delete', () => {
    it('should delete an existing document', async () => {
      await db.set('to-delete', {
        data: {},
        content: '# Delete me',
      })

      const result = await db.delete('to-delete')
      expect(result.deleted).toBe(true)

      const doc = await db.get('to-delete')
      expect(doc).toBeNull()
    })

    it('should return false for non-existent document', async () => {
      const result = await db.delete('non-existent')
      expect(result.deleted).toBe(false)
    })

    it('should soft delete document', async () => {
      await db.set('soft-delete', {
        data: { title: 'Soft Delete' },
        content: '# Soft delete me',
      })

      const result = await db.delete('soft-delete', { soft: true })
      expect(result.deleted).toBe(true)

      // Document should not be found via get
      const doc = await db.get('soft-delete')
      expect(doc).toBeNull()

      // But it should still exist in the database (with deleted_at set)
      const rawDb = db.getDb()
      const row = rawDb.prepare('SELECT * FROM documents WHERE id = ?').get('soft-delete')
      expect(row).not.toBeUndefined()
    })

    it('should not delete with version mismatch', async () => {
      await db.set('versioned-delete', { data: {}, content: '# Test' })
      await db.set('versioned-delete', { data: {}, content: '# Updated' })

      await expect(db.delete('versioned-delete', { version: '1' })).rejects.toThrow('Version mismatch')

      // Document should still exist
      const doc = await db.get('versioned-delete')
      expect(doc).not.toBeNull()
    })
  })

  describe('database options', () => {
    it('should work with in-memory database', async () => {
      const memDb = createSqliteDatabase({ filename: ':memory:' })
      await memDb.set('test', { data: {}, content: '# Test' })
      const doc = await memDb.get('test')
      expect(doc).not.toBeNull()
      await memDb.close()
    })

    it('should expose underlying database', () => {
      const rawDb = db.getDb()
      expect(rawDb).toBeDefined()
      expect(typeof rawDb.prepare).toBe('function')
    })
  })

  describe('complex data types', () => {
    it('should store arrays in data', async () => {
      await db.set('with-array', {
        data: { tags: ['a', 'b', 'c'], numbers: [1, 2, 3] },
        content: '# Test',
      })

      const doc = await db.get('with-array')
      expect(doc?.data.tags).toEqual(['a', 'b', 'c'])
      expect(doc?.data.numbers).toEqual([1, 2, 3])
    })

    it('should store nested objects in data', async () => {
      await db.set('with-nested', {
        data: {
          author: { name: 'John', email: 'john@example.com' },
          meta: { views: 100, likes: 50 },
        },
        content: '# Test',
      })

      const doc = await db.get('with-nested')
      expect(doc?.data.author).toEqual({ name: 'John', email: 'john@example.com' })
      expect(doc?.data.meta).toEqual({ views: 100, likes: 50 })
    })

    it('should store complex context', async () => {
      await db.set('complex-context', {
        context: { '@vocab': 'https://schema.org/', 'custom': 'https://example.com/' },
        data: {},
        content: '# Test',
      })

      const doc = await db.get('complex-context')
      expect(doc?.context).toEqual({ '@vocab': 'https://schema.org/', 'custom': 'https://example.com/' })
    })
  })
})
