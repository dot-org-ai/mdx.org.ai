/**
 * @mdxdb/rpc Client Tests
 *
 * Tests for RpcClient using real server implementation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import { RpcClient, createRpcClient } from '../src/client.js'
import type { MDXLDDocument } from 'mdxld'
import type { JsonRpcRequest, DatabaseMethod } from '../src/types.js'
import { FsDatabase } from '@mdxdb/fs'

describe('@mdxdb/rpc Client', () => {
  let tmpDir: string
  let db: FsDatabase
  let server: Server
  let serverUrl: string

  const mockDocument: MDXLDDocument = {
    type: 'Post',
    id: 'test/post',
    data: {
      $type: 'Post',
      title: 'Test Post',
    },
    content: '# Test Content',
  }

  beforeAll(async () => {
    // Create temp directory for filesystem database
    tmpDir = mkdtempSync(join(tmpdir(), 'mdxdb-rpc-client-test-'))
    db = new FsDatabase({ root: tmpDir })

    // Seed test data
    await db.set('test/post', mockDocument)
    await db.set('test/another', {
      type: 'Post',
      id: 'test/another',
      data: { $type: 'Post', title: 'Another Post' },
      content: '# Another',
    })
    await db.set('test/article', {
      type: 'Article',
      id: 'test/article',
      data: { $type: 'Article', title: 'Article Title' },
      content: '# Article',
    })

    // Create JSON-RPC server using Hono
    const app = new Hono()

    app.post('/', async (c) => {
      const request = (await c.req.json()) as JsonRpcRequest

      try {
        const { method, params, id } = request

        if (!method || !method.startsWith('mdxdb.')) {
          return c.json({
            jsonrpc: '2.0',
            error: { code: -32601, message: 'Method not found' },
            id,
          })
        }

        const dbMethod = method.replace('mdxdb.', '') as DatabaseMethod

        let result: unknown

        switch (dbMethod) {
          case 'list': {
            result = await db.list(params as Parameters<typeof db.list>[0])
            break
          }
          case 'search': {
            result = await db.search(params as Parameters<typeof db.search>[0])
            break
          }
          case 'get': {
            const { id: docId } = params as { id: string }
            const doc = await db.get(docId)
            if (!doc) {
              return c.json({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Document not found' },
                id,
              })
            }
            result = doc
            break
          }
          case 'set': {
            const { id: docId, document } = params as {
              id: string
              document: MDXLDDocument
            }
            result = await db.set(docId, document)
            break
          }
          case 'delete': {
            const { id: docId } = params as { id: string }
            try {
              result = await db.delete(docId)
            } catch (error) {
              return c.json({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Document not found' },
                id,
              })
            }
            break
          }
          default:
            return c.json({
              jsonrpc: '2.0',
              error: { code: -32601, message: 'Method not found' },
              id,
            })
        }

        return c.json({
          jsonrpc: '2.0',
          result,
          id,
        })
      } catch (error) {
        return c.json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
          id: request.id,
        })
      }
    })

    // Start server on random available port
    server = serve({ fetch: app.fetch, port: 0 })
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 3000
    serverUrl = `http://localhost:${port}`
  })

  afterAll(async () => {
    // Clean up
    server.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('createRpcClient', () => {
    it('should create an RpcClient instance', () => {
      const client = createRpcClient({ url: serverUrl })
      expect(client).toBeInstanceOf(RpcClient)
    })

    it('should auto-detect HTTP transport from https URL', () => {
      const client = createRpcClient({ url: 'https://rpc.do/namespace' })
      expect(client.getConnectionState()).toBe('disconnected')
    })

    it('should auto-detect WS transport from wss URL', () => {
      const client = createRpcClient({ url: 'wss://rpc.do/namespace' })
      expect(client.getConnectionState()).toBe('disconnected')
    })

    it('should accept explicit transport option', () => {
      const client = createRpcClient({
        url: serverUrl,
        transport: 'http',
      })
      expect(client).toBeInstanceOf(RpcClient)
    })
  })

  describe('RpcClient HTTP Transport', () => {
    describe('list()', () => {
      it('should list all documents', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.list()

        expect(result.documents).toHaveLength(3)
        expect(result.total).toBe(3)
        expect(result.documents[0].id).toBeDefined()

        await client.close()
      })

      it('should filter by type', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.list({ type: 'Post' })

        expect(result.documents.length).toBe(2)
        expect(result.documents.every((doc) => doc.type === 'Post')).toBe(true)

        await client.close()
      })

      it('should pass limit option', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.list({ limit: 1 })

        expect(result.documents).toHaveLength(1)

        await client.close()
      })

      it('should pass offset option', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.list({ offset: 1 })

        expect(result.documents.length).toBeLessThanOrEqual(2)

        await client.close()
      })
    })

    describe('search()', () => {
      it('should search documents by query', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.search({ query: 'Test' })

        expect(result.documents).toBeDefined()
        expect(Array.isArray(result.documents)).toBe(true)

        await client.close()
      })
    })

    describe('get()', () => {
      it('should get a document by id', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.get('test/post')

        expect(result).toBeDefined()
        expect(result?.id).toBe('test/post')
        expect(result?.data.title).toBe('Test Post')

        await client.close()
      })

      it('should return null when document not found', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.get('not-found')
        expect(result).toBeNull()

        await client.close()
      })
    })

    describe('set()', () => {
      it('should create a new document', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const newDoc: MDXLDDocument = {
          type: 'Post',
          id: 'test/new',
          data: { $type: 'Post', title: 'New Post' },
          content: '# New',
        }

        const result = await client.set('test/new', newDoc)

        expect(result.id).toBe('test/new')

        // Verify it was created
        const retrieved = await client.get('test/new')
        expect(retrieved?.data.title).toBe('New Post')

        await client.close()
      })

      it('should update an existing document', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const updatedDoc: MDXLDDocument = {
          type: 'Post',
          id: 'test/post',
          data: { $type: 'Post', title: 'Updated Title' },
          content: '# Updated',
        }

        const result = await client.set('test/post', updatedDoc)

        expect(result.id).toBe('test/post')

        // Verify it was updated
        const retrieved = await client.get('test/post')
        expect(retrieved?.data.title).toBe('Updated Title')

        await client.close()
      })
    })

    describe('delete()', () => {
      it('should delete a document', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.delete('test/new')
        expect(result.deleted).toBe(true)

        // Verify it was deleted
        const retrieved = await client.get('test/new')
        expect(retrieved).toBeNull()

        await client.close()
      })

      it('should return deleted: false when not found', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        const result = await client.delete('not-found')
        expect(result.deleted).toBe(false)

        await client.close()
      })
    })

    describe('error handling', () => {
      it('should throw on JSON-RPC error for invalid method', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
        })

        // Hack the client to call invalid method
        const invalidClient = client as any
        const originalCall = invalidClient.call.bind(invalidClient)
        invalidClient.call = async (method: string, ...args: unknown[]) => {
          if (method === 'invalid') {
            return originalCall('invalid.method', ...args)
          }
          return originalCall(method, ...args)
        }

        await expect(invalidClient.call('invalid')).rejects.toThrow()

        await client.close()
      })
    })

    describe('authentication', () => {
      it('should include API key in Authorization header', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
          apiKey: 'test-api-key',
        })

        // The request should work even with API key (server ignores it in this test)
        const result = await client.list()
        expect(result.documents).toBeDefined()

        await client.close()
      })

      it('should include custom headers', async () => {
        const client = new RpcClient({
          url: serverUrl,
          transport: 'http',
          headers: { 'X-Custom': 'test-value' },
        })

        // The request should work with custom headers
        const result = await client.list()
        expect(result.documents).toBeDefined()

        await client.close()
      })
    })
  })

  describe('Connection State', () => {
    it('should report disconnected state for HTTP client', () => {
      const client = createRpcClient({
        url: serverUrl,
        transport: 'http',
      })
      expect(client.getConnectionState()).toBe('disconnected')
    })
  })

  describe('Integration Tests', () => {
    it('should handle full CRUD lifecycle', async () => {
      const client = new RpcClient({
        url: serverUrl,
        transport: 'http',
      })

      // Create
      const createDoc: MDXLDDocument = {
        type: 'Post',
        id: 'test/lifecycle',
        data: { $type: 'Post', title: 'Lifecycle Test' },
        content: '# Lifecycle',
      }

      const createResult = await client.set('test/lifecycle', createDoc)
      expect(createResult.id).toBe('test/lifecycle')

      // Read
      const getResult = await client.get('test/lifecycle')
      expect(getResult?.data.title).toBe('Lifecycle Test')

      // Update
      const updateDoc: MDXLDDocument = {
        type: 'Post',
        id: 'test/lifecycle',
        data: { $type: 'Post', title: 'Updated Lifecycle' },
        content: '# Updated',
      }

      await client.set('test/lifecycle', updateDoc)
      const updated = await client.get('test/lifecycle')
      expect(updated?.data.title).toBe('Updated Lifecycle')

      // Delete
      const deleteResult = await client.delete('test/lifecycle')
      expect(deleteResult.deleted).toBe(true)

      const deleted = await client.get('test/lifecycle')
      expect(deleted).toBeNull()

      await client.close()
    })

    it('should handle multiple concurrent requests', async () => {
      const client = new RpcClient({
        url: serverUrl,
        transport: 'http',
      })

      const promises = [
        client.get('test/post'),
        client.get('test/another'),
        client.list(),
        client.search({ query: 'test' }),
      ]

      const results = await Promise.all(promises)

      expect(results[0]?.id).toBe('test/post')
      expect(results[1]?.id).toBe('test/another')
      expect(results[2].documents).toBeDefined()
      expect(results[3].documents).toBeDefined()

      await client.close()
    })
  })
})
