/**
 * @mdxdb/server Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServer, createApiServer } from '../src/server.js'
import type { Database, ListResult, SearchResult, SetResult, DeleteResult } from '../src/types.js'
import type { MDXLDDocument, MDXLDData } from 'mdxld'

// Mock database implementation
function createMockDatabase(): Database {
  const mockDocument: MDXLDDocument = {
    type: 'Post',
    id: 'test-id',
    data: {
      $type: 'Post',
      title: 'Test Post',
    },
    content: '# Test Content',
  }

  return {
    list: vi.fn().mockResolvedValue({
      documents: [mockDocument],
      total: 1,
      hasMore: false,
    } as ListResult),
    search: vi.fn().mockResolvedValue({
      documents: [{ ...mockDocument, score: 0.95 }],
      total: 1,
      hasMore: false,
    } as SearchResult),
    get: vi.fn().mockImplementation((id: string) => {
      if (id === 'not-found') return Promise.resolve(null)
      return Promise.resolve(mockDocument)
    }),
    set: vi.fn().mockResolvedValue({
      id: 'test-id',
      created: true,
    } as SetResult),
    delete: vi.fn().mockImplementation((id: string) => {
      if (id === 'not-found') return Promise.resolve({ id, deleted: false })
      return Promise.resolve({ id, deleted: true } as DeleteResult)
    }),
  }
}

describe('@mdxdb/server', () => {
  describe('createServer', () => {
    it('should create a Hono app', () => {
      const db = createMockDatabase()
      const app = createServer({ database: db })
      expect(app).toBeDefined()
      expect(typeof app.fetch).toBe('function')
    })

    it('should export createApiServer as alias', () => {
      expect(createApiServer).toBe(createServer)
    })
  })

  describe('Server Routes', () => {
    let db: Database
    let app: ReturnType<typeof createServer>
    const basePath = '/api/mdxdb' // Default base path

    beforeEach(() => {
      db = createMockDatabase()
      app = createServer({ database: db })
    })

    describe(`GET ${basePath}`, () => {
      it('should list documents', async () => {
        const res = await app.request(basePath)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.documents).toHaveLength(1)
        expect(body.data.total).toBe(1)
        expect(db.list).toHaveBeenCalled()
      })

      it('should pass query parameters to database', async () => {
        await app.request(`${basePath}?limit=10&offset=5&type=Post`)

        expect(db.list).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 10,
            offset: 5,
            type: 'Post',
          })
        )
      })
    })

    describe(`GET ${basePath}/search`, () => {
      it('should search documents', async () => {
        const res = await app.request(`${basePath}/search?q=test`)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.documents).toHaveLength(1)
        expect(body.data.documents[0].score).toBe(0.95)
        expect(db.search).toHaveBeenCalledWith(
          expect.objectContaining({ query: 'test' })
        )
      })

      it('should return 400 without query', async () => {
        const res = await app.request(`${basePath}/search`)
        expect(res.status).toBe(400)

        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toContain('required')
      })
    })

    describe(`GET ${basePath}/:id`, () => {
      it('should get a document by id', async () => {
        const res = await app.request(`${basePath}/test-id`)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.type).toBe('Post')
        expect(db.get).toHaveBeenCalledWith('test-id')
      })

      it('should return 404 for non-existent document', async () => {
        const res = await app.request(`${basePath}/not-found`)
        expect(res.status).toBe(404)

        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toContain('not found')
      })

      it('should handle nested paths', async () => {
        await app.request(`${basePath}/posts/hello-world`)
        expect(db.get).toHaveBeenCalledWith('posts/hello-world')
      })
    })

    describe(`PUT ${basePath}/:id`, () => {
      it('should create/update a document', async () => {
        const document = {
          type: 'Post',
          data: { title: 'New Post' },
          content: '# New Content',
        }

        const res = await app.request(`${basePath}/new-id`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(document),
        })

        expect(res.status).toBe(201) // Created
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.created).toBe(true)
        expect(db.set).toHaveBeenCalledWith(
          'new-id',
          expect.objectContaining({
            type: 'Post',
            content: '# New Content',
          }),
          expect.any(Object)
        )
      })

      it('should return 400 without content', async () => {
        const res = await app.request(`${basePath}/new-id`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'Post' }),
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toContain('content')
      })
    })

    describe(`DELETE ${basePath}/:id`, () => {
      it('should delete a document', async () => {
        const res = await app.request(`${basePath}/test-id`, { method: 'DELETE' })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.deleted).toBe(true)
        expect(db.delete).toHaveBeenCalledWith('test-id', expect.any(Object))
      })

      it('should return 404 for non-existent document', async () => {
        const res = await app.request(`${basePath}/not-found`, { method: 'DELETE' })
        expect(res.status).toBe(404)

        const body = await res.json()
        expect(body.success).toBe(false)
      })
    })

    describe('Error Handling', () => {
      it('should return 500 on database error', async () => {
        ;(db.list as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Database error'))

        const res = await app.request(basePath)
        expect(res.status).toBe(500)

        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toContain('Database error')
      })
    })
  })

  describe('Custom Base Path', () => {
    it('should support custom base path', async () => {
      const db = createMockDatabase()
      const app = createServer({ database: db, basePath: '/api/v1' })

      const res = await app.request('/api/v1')
      expect(res.status).toBe(200)
    })
  })

  describe('API Key Authentication', () => {
    it('should reject requests without API key when configured', async () => {
      const db = createMockDatabase()
      const app = createServer({ database: db, apiKey: 'secret-key' })

      const res = await app.request('/api/mdxdb')
      expect(res.status).toBe(401)
    })

    it('should accept requests with valid API key', async () => {
      const db = createMockDatabase()
      const app = createServer({ database: db, apiKey: 'secret-key' })

      const res = await app.request('/api/mdxdb', {
        headers: { Authorization: 'Bearer secret-key' },
      })
      expect(res.status).toBe(200)
    })
  })
})
