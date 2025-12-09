/**
 * @mdxdb/server Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createServer, createApiServer } from '../src/server.js'
import type { Database } from '../src/types.js'
import { FsDatabase } from '@mdxdb/fs'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let db: Database
let tmpDir: string

beforeAll(async () => {
  // Create a temporary directory for test files
  tmpDir = mkdtempSync(join(tmpdir(), 'mdxdb-server-test-'))
  db = new FsDatabase({ root: tmpDir })

  // Seed some test data
  await db.set('test-id', {
    type: 'Post',
    data: {
      $type: 'Post',
      title: 'Test Post',
    },
    content: '# Test Content',
  })

  await db.set('posts/hello-world', {
    type: 'Post',
    data: {
      $type: 'Post',
      title: 'Hello World',
    },
    content: '# Hello World\n\nThis is a test post.',
  })
})

afterAll(() => {
  // Clean up temporary directory
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('@mdxdb/server', () => {
  describe('createServer', () => {
    it('should create a Hono app', () => {
      const app = createServer({ database: db })
      expect(app).toBeDefined()
      expect(typeof app.fetch).toBe('function')
    })

    it('should export createApiServer as alias', () => {
      expect(createApiServer).toBe(createServer)
    })
  })

  describe('Server Routes', () => {
    let app: ReturnType<typeof createServer>
    const basePath = '/api/mdxdb' // Default base path

    beforeEach(() => {
      app = createServer({ database: db })
    })

    describe(`GET ${basePath}`, () => {
      it('should list documents', async () => {
        const res = await app.request(basePath)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.documents).toHaveLength(2)
        expect(body.data.total).toBe(2)
      })

      it('should pass query parameters to database', async () => {
        const res = await app.request(`${basePath}?limit=1&offset=0&type=Post`)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.documents).toHaveLength(1)
        expect(body.data.hasMore).toBe(true)
      })
    })

    describe(`GET ${basePath}/search`, () => {
      it('should search documents', async () => {
        const res = await app.request(`${basePath}/search?q=test`)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.documents).toHaveLength(2)
        expect(body.data.documents[0].score).toBeGreaterThan(0)
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
        expect(body.data.data.title).toBe('Test Post')
      })

      it('should return 404 for non-existent document', async () => {
        const res = await app.request(`${basePath}/not-found`)
        expect(res.status).toBe(404)

        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toContain('not found')
      })

      it('should handle nested paths', async () => {
        const res = await app.request(`${basePath}/posts/hello-world`)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.data.title).toBe('Hello World')
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

        // Verify document was actually created
        const getRes = await app.request(`${basePath}/new-id`)
        const getBody = await getRes.json()
        expect(getBody.data.data.title).toBe('New Post')
      })

      it('should return 400 without content', async () => {
        const res = await app.request(`${basePath}/another-new-id`, {
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
        // Create a document to delete
        await db.set('to-delete', {
          type: 'Post',
          data: { title: 'Delete Me' },
          content: '# Delete Me',
        })

        const res = await app.request(`${basePath}/to-delete`, { method: 'DELETE' })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.deleted).toBe(true)

        // Verify document was actually deleted
        const getRes = await app.request(`${basePath}/to-delete`)
        expect(getRes.status).toBe(404)
      })

      it('should return 404 for non-existent document', async () => {
        const res = await app.request(`${basePath}/not-found`, { method: 'DELETE' })
        expect(res.status).toBe(404)

        const body = await res.json()
        expect(body.success).toBe(false)
      })
    })
  })

  describe('Custom Base Path', () => {
    it('should support custom base path', async () => {
      const app = createServer({ database: db, basePath: '/api/v1' })

      const res = await app.request('/api/v1')
      expect(res.status).toBe(200)
    })
  })

  describe('API Key Authentication', () => {
    it('should reject requests without API key when configured', async () => {
      const app = createServer({ database: db, apiKey: 'secret-key' })

      const res = await app.request('/api/mdxdb')
      expect(res.status).toBe(401)
    })

    it('should accept requests with valid API key', async () => {
      const app = createServer({ database: db, apiKey: 'secret-key' })

      const res = await app.request('/api/mdxdb', {
        headers: { Authorization: 'Bearer secret-key' },
      })
      expect(res.status).toBe(200)
    })
  })
})
