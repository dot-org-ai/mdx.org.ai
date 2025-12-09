/**
 * @mdxdb/server Package Tests
 *
 * Tests for the main package exports and both server implementations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createServer,
  createApiServer,
  createDBServer,
  type Server,
  type ApiServer,
  type DBServer,
  type ServerConfig,
  type DBServerConfig,
} from './index.js'
import type { Database } from './types.js'
import { FsDatabase } from '@mdxdb/fs'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { DBClient, DBClientExtended, Thing, Relationship, Event, Action, Artifact } from 'ai-database'

let db: Database
let tmpDir: string

beforeAll(async () => {
  // Create a temporary directory for test files
  tmpDir = mkdtempSync(join(tmpdir(), 'mdxdb-server-index-test-'))
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
})

afterAll(() => {
  // Clean up temporary directory
  rmSync(tmpDir, { recursive: true, force: true })
})

// Mock DBClient implementation for DBClient interface
function createMockDBClient(): DBClientExtended {
  const mockThing: Thing = {
    url: 'https://example.com/User/123',
    ns: 'example.com',
    type: 'User',
    id: '123',
    data: { name: 'Test User', email: 'test@example.com' },
    '@context': {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockRelationship: Relationship = {
    from: 'https://example.com/User/123',
    type: 'follows',
    to: 'https://example.com/User/456',
    createdAt: new Date(),
  }

  const mockEvent: Event = {
    id: 'event-123',
    type: 'user.created',
    source: 'https://example.com/User/123',
    data: { action: 'created' },
    timestamp: new Date(),
  }

  const mockAction: Action = {
    id: 'action-123',
    actor: 'https://example.com/User/123',
    object: 'https://example.com/Post/456',
    action: 'publish',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockArtifact: Artifact = {
    key: 'artifact-key',
    type: 'mdx',
    source: 'https://example.com/Post/123',
    sourceHash: 'hash123',
    content: '# Test',
    createdAt: new Date(),
  }

  return {
    // Thing operations
    list: vi.fn().mockResolvedValue([mockThing]),
    find: vi.fn().mockResolvedValue([mockThing]),
    search: vi.fn().mockResolvedValue([mockThing]),
    get: vi.fn().mockResolvedValue(mockThing),
    getById: vi.fn().mockResolvedValue(mockThing),
    set: vi.fn().mockResolvedValue(mockThing),
    create: vi.fn().mockResolvedValue(mockThing),
    update: vi.fn().mockResolvedValue(mockThing),
    upsert: vi.fn().mockResolvedValue(mockThing),
    delete: vi.fn().mockResolvedValue(true),
    forEach: vi.fn().mockResolvedValue(undefined),

    // Relationship operations
    relate: vi.fn().mockResolvedValue(mockRelationship),
    unrelate: vi.fn().mockResolvedValue(true),
    related: vi.fn().mockResolvedValue([mockThing]),
    relationships: vi.fn().mockResolvedValue([mockRelationship]),
    references: vi.fn().mockResolvedValue([mockThing]),

    // Event operations (Extended)
    track: vi.fn().mockResolvedValue(mockEvent),
    getEvent: vi.fn().mockResolvedValue(mockEvent),
    queryEvents: vi.fn().mockResolvedValue([mockEvent]),

    // Action operations (Extended)
    send: vi.fn().mockResolvedValue(mockAction),
    do: vi.fn().mockResolvedValue({ ...mockAction, status: 'active' as const }),
    try: vi.fn().mockImplementation(async (options, fn) => {
      try {
        await fn()
        return { ...mockAction, status: 'completed' as const }
      } catch {
        return { ...mockAction, status: 'failed' as const }
      }
    }),
    getAction: vi.fn().mockResolvedValue(mockAction),
    queryActions: vi.fn().mockResolvedValue([mockAction]),
    startAction: vi.fn().mockResolvedValue({ ...mockAction, status: 'active' as const }),
    completeAction: vi.fn().mockResolvedValue({ ...mockAction, status: 'completed' as const }),
    failAction: vi.fn().mockResolvedValue({ ...mockAction, status: 'failed' as const }),
    cancelAction: vi.fn().mockResolvedValue({ ...mockAction, status: 'cancelled' as const }),

    // Artifact operations (Extended)
    storeArtifact: vi.fn().mockResolvedValue(mockArtifact),
    getArtifact: vi.fn().mockResolvedValue(mockArtifact),
    getArtifactBySource: vi.fn().mockResolvedValue(mockArtifact),
    deleteArtifact: vi.fn().mockResolvedValue(true),
    cleanExpiredArtifacts: vi.fn().mockResolvedValue(5),
  }
}

describe('@mdxdb/server', () => {
  describe('Package Exports', () => {
    it('should export createServer function', () => {
      expect(typeof createServer).toBe('function')
    })

    it('should export createApiServer as alias', () => {
      expect(createApiServer).toBe(createServer)
    })

    it('should export createDBServer function', () => {
      expect(typeof createDBServer).toBe('function')
    })

    it('should have proper TypeScript types', () => {
      // Type assertion tests
      const app: Server = createServer({ database: db })
      const apiApp: ApiServer = createApiServer({ database: db })

      expect(app).toBeDefined()
      expect(apiApp).toBeDefined()
    })
  })

  describe('createServer (Simple Database Interface)', () => {
    it('should create a Hono app with Database', () => {
      const app = createServer({ database: db })

      expect(app).toBeDefined()
      expect(typeof app.fetch).toBe('function')
    })

    it('should accept ServerConfig options', () => {
      const config: ServerConfig = {
        database: db,
        basePath: '/custom/path',
        cors: false,
        apiKey: 'test-key',
      }

      const app = createServer(config)
      expect(app).toBeDefined()
    })

    it('should handle CORS configuration', async () => {
      const app = createServer({ database: db, cors: true })

      const res = await app.request('/api/mdxdb', {
        method: 'OPTIONS',
      })

      // CORS middleware should handle OPTIONS
      expect(res.status).toBeLessThan(500)
    })

    it('should enforce API key authentication', async () => {
      const app = createServer({ database: db, apiKey: 'secret' })

      // Without API key
      const res1 = await app.request('/api/mdxdb')
      expect(res1.status).toBe(401)

      // With correct API key
      const res2 = await app.request('/api/mdxdb', {
        headers: { Authorization: 'Bearer secret' },
      })
      expect(res2.status).toBe(200)

      // With wrong API key
      const res3 = await app.request('/api/mdxdb', {
        headers: { Authorization: 'Bearer wrong' },
      })
      expect(res3.status).toBe(401)
    })

    it('should use custom base path', async () => {
      const app = createServer({ database: db, basePath: '/v1/db' })

      const res = await app.request('/v1/db')
      expect(res.status).toBe(200)

      const defaultPath = await app.request('/api/mdxdb')
      expect(defaultPath.status).toBe(404)
    })

    it('should handle list requests', async () => {
      const app = createServer({ database: db })

      const res = await app.request('/api/mdxdb?type=Post&limit=10')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.documents).toHaveLength(1)
    })

    it('should handle search requests', async () => {
      const app = createServer({ database: db })

      const res = await app.request('/api/mdxdb/search?q=test')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.documents.length).toBeGreaterThan(0)
      expect(body.data.documents[0].score).toBeGreaterThan(0)
    })

    it('should handle get requests', async () => {
      const app = createServer({ database: db })

      const res = await app.request('/api/mdxdb/test-id')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.type).toBe('Post')
    })

    it('should handle set requests', async () => {
      const app = createServer({ database: db })

      const res = await app.request('/api/mdxdb/new-doc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Post',
          data: { title: 'New' },
          content: '# New',
        }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)

      // Verify document was actually created
      const getRes = await app.request('/api/mdxdb/new-doc')
      const getBody = await getRes.json()
      expect(getBody.data.data.title).toBe('New')
    })

    it('should handle delete requests', async () => {
      const app = createServer({ database: db })

      // Create a document to delete
      await db.set('to-delete-index', {
        type: 'Post',
        data: { title: 'Delete Me' },
        content: '# Delete Me',
      })

      const res = await app.request('/api/mdxdb/to-delete-index', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.deleted).toBe(true)

      // Verify document was actually deleted
      const getRes = await app.request('/api/mdxdb/to-delete-index')
      expect(getRes.status).toBe(404)
    })
  })

  describe('createDBServer (DBClient Interface)', () => {
    it('should create a Hono app with DBClient', () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      expect(app).toBeDefined()
      expect(typeof app.fetch).toBe('function')
    })

    it('should accept DBServerConfig options', () => {
      const client = createMockDBClient()
      const config: DBServerConfig = {
        client,
        basePath: '/api/db',
        cors: true,
        apiKey: 'test-key',
      }

      const app = createDBServer(config)
      expect(app).toBeDefined()
    })

    it('should handle thing list requests', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      const res = await app.request('/api/db/things?filter[ns]=example.com')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/vnd.api+json')
    })

    it('should handle thing search requests', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      const res = await app.request('/api/db/things/search?query=test')
      expect(res.status).toBe(200)
      expect(client.search).toHaveBeenCalled()
    })

    it('should handle thing get requests', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      const url = encodeURIComponent('https://example.com/User/123')
      const res = await app.request(`/api/db/things/${url}`)
      expect(res.status).toBe(200)
    })

    it('should handle thing create requests', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      const res = await app.request('/api/db/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ns: 'example.com',
          type: 'User',
          data: { name: 'New User' },
        }),
      })

      expect(res.status).toBe(201)
    })

    it('should handle relationship operations', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      // Create relationship
      const res = await app.request('/api/db/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'follows',
          from: 'https://example.com/User/123',
          to: 'https://example.com/User/456',
        }),
      })

      expect(res.status).toBe(201)
      expect(client.relate).toHaveBeenCalled()
    })

    it('should handle event operations (extended)', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      // Track event
      const res = await app.request('/api/db/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user.created',
          source: 'https://example.com/User/123',
          data: { action: 'created' },
        }),
      })

      expect(res.status).toBe(201)
      expect(client.track).toHaveBeenCalled()
    })

    it('should handle action operations (extended)', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      // Send action
      const res = await app.request('/api/db/actions/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: 'https://example.com/User/123',
          object: 'https://example.com/Post/456',
          action: 'publish',
        }),
      })

      expect(res.status).toBe(201)
      expect(client.send).toHaveBeenCalled()
    })

    it('should handle artifact operations (extended)', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      // Store artifact
      const res = await app.request('/api/db/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'test-artifact',
          type: 'mdx',
          source: 'https://example.com/Post/123',
          sourceHash: 'hash123',
          content: '# Test',
        }),
      })

      expect(res.status).toBe(201)
      expect(client.storeArtifact).toHaveBeenCalled()
    })

    it('should handle RPC endpoint', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client })

      const res = await app.request('/api/db/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'db.list',
          params: [{ ns: 'example.com' }],
        }),
      })

      expect(res.status).toBeLessThan(500)
    })

    it('should enforce API key on DBServer', async () => {
      const client = createMockDBClient()
      const app = createDBServer({ client, apiKey: 'db-secret' })

      // Without API key
      const res1 = await app.request('/api/db/things')
      expect(res1.status).toBe(401)

      // With correct API key
      const res2 = await app.request('/api/db/things', {
        headers: { Authorization: 'Bearer db-secret' },
      })
      expect(res2.status).toBe(200)
    })
  })

  describe('Type Exports', () => {
    it('should export all necessary types', () => {
      // This test ensures TypeScript compilation succeeds
      const serverConfig: ServerConfig = {
        database: db,
      }

      const dbServerConfig: DBServerConfig = {
        client: createMockDBClient(),
      }

      expect(serverConfig).toBeDefined()
      expect(dbServerConfig).toBeDefined()
    })
  })
})
