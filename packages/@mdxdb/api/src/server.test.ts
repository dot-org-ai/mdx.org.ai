import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiServer } from './server.js'
import { createSqliteDatabase, SqliteDatabase } from '@mdxdb/sqlite'
import { createApiClient, ApiClient } from 'mdxdb/client'
import type { MDXLDDocument } from 'mdxld'

describe('API Server', () => {
  let db: SqliteDatabase
  let app: ReturnType<typeof createApiServer>

  beforeEach(() => {
    db = createSqliteDatabase({ filename: ':memory:' })
    app = createApiServer({ database: db })
  })

  afterEach(async () => {
    await db.close()
  })

  describe('GET / (list)', () => {
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
    })

    it('should list all documents', async () => {
      const res = await app.request('/api/mdxdb')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.documents).toHaveLength(3)
      expect(json.data.total).toBe(3)
    })

    it('should filter by type', async () => {
      const res = await app.request('/api/mdxdb?type=Post')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.documents).toHaveLength(2)
      expect(json.data.documents.every((d: MDXLDDocument) => d.type === 'Post')).toBe(true)
    })

    it('should paginate results', async () => {
      const res = await app.request('/api/mdxdb?limit=2')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.documents).toHaveLength(2)
      expect(json.data.hasMore).toBe(true)
    })

    it('should support offset', async () => {
      const res = await app.request('/api/mdxdb?limit=2&offset=2')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.documents).toHaveLength(1)
      expect(json.data.hasMore).toBe(false)
    })

    it('should filter by prefix', async () => {
      await db.set('nested/doc', { data: {}, content: '# Nested' })
      const res = await app.request('/api/mdxdb?prefix=nested')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.documents).toHaveLength(1)
      expect(json.data.documents[0].id).toBe('nested/doc')
    })
  })

  describe('GET /search', () => {
    beforeEach(async () => {
      await db.set('searchable-1', {
        data: { title: 'Hello World' },
        content: '# Welcome to the hello world tutorial',
      })
      await db.set('searchable-2', {
        data: { title: 'Goodbye' },
        content: '# Goodbye cruel world',
      })
    })

    it('should search documents', async () => {
      const res = await app.request('/api/mdxdb/search?q=world')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.documents).toHaveLength(2)
    })

    it('should require query parameter', async () => {
      const res = await app.request('/api/mdxdb/search')
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error).toContain('"q" is required')
    })

    it('should search specific fields', async () => {
      const res = await app.request('/api/mdxdb/search?q=hello&fields=title')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.documents).toHaveLength(1)
      expect(json.data.documents[0].data.title).toBe('Hello World')
    })

    it('should filter search by type', async () => {
      await db.set('typed-search', {
        type: 'Special',
        data: { title: 'Special World' },
        content: '# World content',
      })

      const res = await app.request('/api/mdxdb/search?q=world&type=Special')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.documents).toHaveLength(1)
      expect(json.data.documents[0].type).toBe('Special')
    })
  })

  describe('GET /:id', () => {
    it('should get a document by ID', async () => {
      await db.set('test-doc', {
        type: 'Article',
        data: { title: 'Test' },
        content: '# Test Content',
      })

      const res = await app.request('/api/mdxdb/test-doc')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.id).toBe('test-doc')
      expect(json.data.type).toBe('Article')
      expect(json.data.data.title).toBe('Test')
    })

    it('should return 404 for non-existent document', async () => {
      const res = await app.request('/api/mdxdb/non-existent')
      expect(res.status).toBe(404)

      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error).toContain('not found')
    })

    it('should handle nested paths', async () => {
      await db.set('posts/2024/my-post', {
        data: { title: 'Nested Post' },
        content: '# Nested',
      })

      const res = await app.request('/api/mdxdb/posts/2024/my-post')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.id).toBe('posts/2024/my-post')
    })
  })

  describe('PUT /:id', () => {
    it('should create a new document', async () => {
      const res = await app.request('/api/mdxdb/new-doc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Post',
          data: { title: 'New Post' },
          content: '# New Post',
        }),
      })

      expect(res.status).toBe(201)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.created).toBe(true)
      expect(json.data.id).toBe('new-doc')

      const doc = await db.get('new-doc')
      expect(doc?.data.title).toBe('New Post')
    })

    it('should update an existing document', async () => {
      await db.set('existing', {
        data: { title: 'Original' },
        content: '# Original',
      })

      const res = await app.request('/api/mdxdb/existing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { title: 'Updated' },
          content: '# Updated',
        }),
      })

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.created).toBe(false)

      const doc = await db.get('existing')
      expect(doc?.data.title).toBe('Updated')
    })

    it('should require content field', async () => {
      const res = await app.request('/api/mdxdb/incomplete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { title: 'Test' },
        }),
      })

      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('"content" is required')
    })

    it('should handle createOnly option', async () => {
      await db.set('exists', { data: {}, content: '# Test' })

      const res = await app.request('/api/mdxdb/exists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {},
          content: '# Updated',
          createOnly: true,
        }),
      })

      expect(res.status).toBe(409)
    })

    it('should handle updateOnly option', async () => {
      const res = await app.request('/api/mdxdb/not-exists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {},
          content: '# Test',
          updateOnly: true,
        }),
      })

      expect(res.status).toBe(409)
    })

    it('should handle nested paths', async () => {
      const res = await app.request('/api/mdxdb/posts/2024/new-post', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { title: 'Nested' },
          content: '# Nested Post',
        }),
      })

      expect(res.status).toBe(201)

      const doc = await db.get('posts/2024/new-post')
      expect(doc?.data.title).toBe('Nested')
    })
  })

  describe('DELETE /:id', () => {
    it('should delete a document', async () => {
      await db.set('to-delete', { data: {}, content: '# Delete me' })

      const res = await app.request('/api/mdxdb/to-delete', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.deleted).toBe(true)

      const doc = await db.get('to-delete')
      expect(doc).toBeNull()
    })

    it('should return 404 for non-existent document', async () => {
      const res = await app.request('/api/mdxdb/non-existent', {
        method: 'DELETE',
      })

      expect(res.status).toBe(404)
    })

    it('should support soft delete', async () => {
      await db.set('soft-delete', { data: {}, content: '# Soft delete' })

      const res = await app.request('/api/mdxdb/soft-delete?soft=true', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.deleted).toBe(true)
    })
  })

  describe('authentication', () => {
    let authApp: ReturnType<typeof createApiServer>

    beforeEach(() => {
      authApp = createApiServer({
        database: db,
        apiKey: 'secret-key',
      })
    })

    it('should reject requests without API key', async () => {
      const res = await authApp.request('/api/mdxdb')
      expect(res.status).toBe(401)

      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should reject requests with wrong API key', async () => {
      const res = await authApp.request('/api/mdxdb', {
        headers: { Authorization: 'Bearer wrong-key' },
      })

      expect(res.status).toBe(401)
    })

    it('should accept requests with correct API key', async () => {
      const res = await authApp.request('/api/mdxdb', {
        headers: { Authorization: 'Bearer secret-key' },
      })

      expect(res.status).toBe(200)
    })
  })

  describe('custom basePath', () => {
    let customApp: ReturnType<typeof createApiServer>

    beforeEach(() => {
      customApp = createApiServer({
        database: db,
        basePath: '/v1/db',
      })
    })

    it('should use custom base path', async () => {
      await db.set('test', { data: {}, content: '# Test' })

      const res = await customApp.request('/v1/db')
      expect(res.status).toBe(200)

      const getRes = await customApp.request('/v1/db/test')
      expect(getRes.status).toBe(200)
    })
  })
})

describe('API Client Integration', () => {
  let db: SqliteDatabase
  let app: ReturnType<typeof createApiServer>
  let client: ApiClient

  beforeEach(() => {
    db = createSqliteDatabase({ filename: ':memory:' })
    app = createApiServer({ database: db })

    // Create client that uses the Hono app's fetch
    client = createApiClient({
      baseUrl: 'http://localhost/api/mdxdb',
      fetch: app.request.bind(app) as unknown as typeof fetch,
    }) as ApiClient
  })

  afterEach(async () => {
    await db.close()
    await client.close()
  })

  it('should list documents via client', async () => {
    await db.set('test-1', { data: { title: 'Test 1' }, content: '# Test 1' })
    await db.set('test-2', { data: { title: 'Test 2' }, content: '# Test 2' })

    const result = await client.list()
    expect(result.documents).toHaveLength(2)
    expect(result.total).toBe(2)
  })

  it('should get a document via client', async () => {
    await db.set('my-doc', {
      type: 'Article',
      data: { title: 'My Article' },
      content: '# My Article Content',
    })

    const doc = await client.get('my-doc')
    expect(doc).not.toBeNull()
    expect(doc?.id).toBe('my-doc')
    expect(doc?.type).toBe('Article')
    expect(doc?.data.title).toBe('My Article')
  })

  it('should return null for non-existent document', async () => {
    const doc = await client.get('non-existent')
    expect(doc).toBeNull()
  })

  it('should create a document via client', async () => {
    const result = await client.set('new-doc', {
      type: 'Post',
      data: { title: 'New Post' },
      content: '# New Post Content',
    })

    expect(result.created).toBe(true)
    expect(result.id).toBe('new-doc')

    const doc = await db.get('new-doc')
    expect(doc?.data.title).toBe('New Post')
  })

  it('should update a document via client', async () => {
    await db.set('update-me', { data: { title: 'Original' }, content: '# Original' })

    const result = await client.set('update-me', {
      data: { title: 'Updated' },
      content: '# Updated',
    })

    expect(result.created).toBe(false)

    const doc = await db.get('update-me')
    expect(doc?.data.title).toBe('Updated')
  })

  it('should search documents via client', async () => {
    await db.set('search-1', { data: { title: 'Hello World' }, content: '# Hello' })
    await db.set('search-2', { data: { title: 'Goodbye' }, content: '# Goodbye world' })
    await db.set('search-3', { data: { title: 'Unrelated' }, content: '# Something else' })

    const result = await client.search({ query: 'world' })
    expect(result.documents).toHaveLength(2)
  })

  it('should delete a document via client', async () => {
    await db.set('delete-me', { data: {}, content: '# Delete' })

    const result = await client.delete('delete-me')
    expect(result.deleted).toBe(true)

    const doc = await db.get('delete-me')
    expect(doc).toBeNull()
  })

  it('should handle nested paths', async () => {
    await client.set('posts/2024/test', {
      data: { title: 'Nested' },
      content: '# Nested Post',
    })

    const doc = await client.get('posts/2024/test')
    expect(doc?.id).toBe('posts/2024/test')
    expect(doc?.data.title).toBe('Nested')
  })
})
