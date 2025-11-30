import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createFsDatabase } from './database.js'
import type { Database } from 'mdxdb'
import type { MDXLDDocument } from 'mdxld'

describe('FsDatabase', () => {
  let testDir: string
  let db: Database

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdxdb-fs-test-'))
    db = createFsDatabase({ root: testDir })
  })

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testDir, { recursive: true, force: true })
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

      const retrieved = await db.get('test-doc')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.type).toBe('Article')
      expect(retrieved?.data.title).toBe('Test Article')
      expect(retrieved?.content).toContain('Hello World')
    })

    it('should create nested directory structure', async () => {
      const doc: MDXLDDocument = {
        data: { title: 'Nested Doc' },
        content: '# Nested',
      }

      await db.set('posts/2024/my-post', doc)

      const retrieved = await db.get('posts/2024/my-post')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.data.title).toBe('Nested Doc')
    })

    it('should update an existing document', async () => {
      const doc1: MDXLDDocument = {
        data: { title: 'Original' },
        content: '# Original',
      }
      await db.set('update-test', doc1)

      const doc2: MDXLDDocument = {
        data: { title: 'Updated' },
        content: '# Updated',
      }
      const result = await db.set('update-test', doc2)

      expect(result.created).toBe(false)

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
  })

  describe('list', () => {
    beforeEach(async () => {
      // Create some test documents
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

    it('should filter by prefix', async () => {
      const result = await db.list({ prefix: 'nested' })
      expect(result.documents).toHaveLength(1)
      expect(result.documents[0]?.data.title).toBe('Nested Doc')
    })

    it('should paginate results', async () => {
      const result = await db.list({ limit: 2 })
      expect(result.documents).toHaveLength(2)
      expect(result.hasMore).toBe(true)

      const page2 = await db.list({ limit: 2, offset: 2 })
      expect(page2.documents).toHaveLength(2)
      expect(page2.hasMore).toBe(false)
    })

    it('should sort by field', async () => {
      const result = await db.list({ sortBy: 'title', sortOrder: 'asc' })
      const titles = result.documents.map((d) => d.data.title)
      expect(titles).toEqual(['First Article', 'First Post', 'Nested Doc', 'Second Post'])
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
      // Add document with multiple matches
      await db.set('multi-match', {
        data: { title: 'Hello Hello' },
        content: '# Hello hello hello',
      })

      const result = await db.search({ query: 'hello' })
      expect(result.documents[0]?.data.title).toBe('Hello Hello')
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

    it('should soft delete with .deleted extension', async () => {
      await db.set('soft-delete', {
        data: {},
        content: '# Soft delete me',
      })

      const result = await db.delete('soft-delete', { soft: true })
      expect(result.deleted).toBe(true)

      // File should still exist with .deleted extension
      const files = await fs.readdir(testDir)
      expect(files).toContain('soft-delete.mdx.deleted')

      // But get should return null
      const doc = await db.get('soft-delete')
      expect(doc).toBeNull()
    })
  })

  describe('file extensions', () => {
    it('should support .md files', async () => {
      const mdDb = createFsDatabase({ root: testDir, extensions: ['.md'] })

      await mdDb.set('markdown-doc', {
        data: { title: 'Markdown' },
        content: '# Markdown file',
      })

      const files = await fs.readdir(testDir)
      expect(files).toContain('markdown-doc.md')

      const doc = await mdDb.get('markdown-doc')
      expect(doc).not.toBeNull()
    })

    it('should find files with explicit extension', async () => {
      // Create file directly
      await fs.writeFile(
        path.join(testDir, 'explicit.md'),
        '---\ntitle: Explicit\n---\n# Content'
      )

      const mdDb = createFsDatabase({ root: testDir, extensions: ['.md', '.mdx'] })
      const doc = await mdDb.get('explicit.md')
      expect(doc).not.toBeNull()
    })
  })

  describe('document ID handling', () => {
    it('should set document ID from file path', async () => {
      await db.set('auto-id', {
        data: { title: 'Auto ID' },
        content: '# Content',
      })

      const doc = await db.get('auto-id')
      expect(doc?.id).toBe('auto-id')
    })

    it('should preserve existing $id in data', async () => {
      await db.set('with-id', {
        id: 'custom-id',
        data: { title: 'Custom ID' },
        content: '# Content',
      })

      const doc = await db.get('with-id')
      expect(doc?.id).toBe('custom-id')
    })
  })
})
