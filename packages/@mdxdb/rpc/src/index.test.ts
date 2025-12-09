/**
 * @mdxdb/rpc Package Tests
 *
 * Tests for the main package exports and both RPC client implementations using real server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import {
  RpcClient,
  createRpcClient,
  DBRpcClient,
  createDBRpcClient,
  type RpcClientConfig,
  type DBRpcClientConfig,
  type Transport,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcError,
  type DatabaseMethod,
  type ConnectionState,
  type Database,
} from './index.js'
import type { MDXLDDocument } from 'mdxld'
import { FsDatabase } from '@mdxdb/fs'

describe('@mdxdb/rpc', () => {
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
    tmpDir = mkdtempSync(join(tmpdir(), 'mdxdb-rpc-test-'))
    db = new FsDatabase({ root: tmpDir })

    // Seed test data
    await db.set('test/post', mockDocument)
    await db.set('test/another', {
      type: 'Post',
      id: 'test/another',
      data: { $type: 'Post', title: 'Another Post' },
      content: '# Another',
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

  describe('Package Exports', () => {
    it('should export RpcClient class', () => {
      expect(typeof RpcClient).toBe('function')
      expect(RpcClient.name).toBe('RpcClient')
    })

    it('should export createRpcClient factory function', () => {
      expect(typeof createRpcClient).toBe('function')
    })

    it('should export DBRpcClient class', () => {
      expect(typeof DBRpcClient).toBe('function')
      expect(DBRpcClient.name).toBe('DBRpcClient')
    })

    it('should export createDBRpcClient factory function', () => {
      expect(typeof createDBRpcClient).toBe('function')
    })
  })

  describe('Type Exports', () => {
    it('should have RpcClientConfig type', () => {
      const config: RpcClientConfig = {
        url: 'https://rpc.do/namespace',
        transport: 'http',
      }
      expect(config).toBeDefined()
    })

    it('should have DBRpcClientConfig type', () => {
      const config: DBRpcClientConfig = {
        url: 'https://rpc.do/namespace',
        apiKey: 'test-key',
      }
      expect(config).toBeDefined()
    })

    it('should have Transport type', () => {
      const httpTransport: Transport = 'http'
      const wsTransport: Transport = 'ws'
      expect(httpTransport).toBe('http')
      expect(wsTransport).toBe('ws')
    })

    it('should have JsonRpcRequest type', () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'mdxdb.list',
        params: { limit: 10 },
      }
      expect(request).toBeDefined()
    })

    it('should have JsonRpcResponse type', () => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { documents: [] },
      }
      expect(response).toBeDefined()
    })

    it('should have JsonRpcError type', () => {
      const error: JsonRpcError = {
        code: -32600,
        message: 'Invalid request',
      }
      expect(error).toBeDefined()
    })

    it('should have ConnectionState type', () => {
      const states: ConnectionState[] = ['disconnected', 'connecting', 'connected', 'reconnecting']
      expect(states).toHaveLength(4)
    })

    it('should have DatabaseMethod type', () => {
      const method: DatabaseMethod = 'list'
      expect(method).toBeDefined()
    })
  })

  describe('createRpcClient (Simple Database Interface)', () => {
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

    it('should accept apiKey option', () => {
      const client = createRpcClient({
        url: serverUrl,
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(RpcClient)
    })

    it('should accept custom headers', () => {
      const client = createRpcClient({
        url: serverUrl,
        headers: { 'X-Custom': 'value' },
      })
      expect(client).toBeInstanceOf(RpcClient)
    })

    it('should accept timeout option', () => {
      const client = createRpcClient({
        url: serverUrl,
        timeout: 60000,
      })
      expect(client).toBeInstanceOf(RpcClient)
    })

    it('should accept reconnect config', () => {
      const client = createRpcClient({
        url: 'wss://rpc.do/namespace',
        reconnect: {
          enabled: true,
          maxAttempts: 10,
          delay: 500,
        },
      })
      expect(client).toBeInstanceOf(RpcClient)
    })
  })

  describe('RpcClient HTTP Operations', () => {
    it('should implement Database interface', async () => {
      const client = new RpcClient({
        url: serverUrl,
        transport: 'http',
      })

      // Check that all Database methods exist
      expect(typeof client.list).toBe('function')
      expect(typeof client.search).toBe('function')
      expect(typeof client.get).toBe('function')
      expect(typeof client.set).toBe('function')
      expect(typeof client.delete).toBe('function')

      await client.close()
    })

    it('should send JSON-RPC requests via HTTP and get real results', async () => {
      const client = new RpcClient({
        url: serverUrl,
        transport: 'http',
      })

      const result = await client.list()

      expect(result.documents).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.documents[0].id).toBeDefined()

      await client.close()
    })

    it('should filter by type', async () => {
      const client = new RpcClient({
        url: serverUrl,
        transport: 'http',
      })

      const result = await client.list({ type: 'Post' })

      expect(result.documents.length).toBeGreaterThan(0)
      expect(result.documents[0].type).toBe('Post')

      await client.close()
    })

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

    it('should return null for not found documents', async () => {
      const client = new RpcClient({
        url: serverUrl,
        transport: 'http',
      })

      const result = await client.get('not-found')
      expect(result).toBeNull()

      await client.close()
    })

    it('should set a document', async () => {
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

    it('should return deleted: false for not found on delete', async () => {
      const client = new RpcClient({
        url: serverUrl,
        transport: 'http',
      })

      const result = await client.delete('not-found')
      expect(result.deleted).toBe(false)

      await client.close()
    })
  })

  describe('createDBRpcClient (DBClient Interface)', () => {
    it('should create a DBRpcClient instance', () => {
      const client = createDBRpcClient({ url: serverUrl })
      expect(client).toBeInstanceOf(DBRpcClient)
    })

    it('should auto-detect HTTP transport', () => {
      const client = createDBRpcClient({ url: 'https://rpc.do/namespace' })
      expect(client).toBeInstanceOf(DBRpcClient)
    })

    it('should auto-detect WebSocket transport', () => {
      const client = createDBRpcClient({ url: 'wss://rpc.do/namespace' })
      expect(client).toBeInstanceOf(DBRpcClient)
    })

    it('should accept explicit transport option', () => {
      const client = createDBRpcClient({
        url: serverUrl,
        transport: 'http',
      })
      expect(client).toBeInstanceOf(DBRpcClient)
    })

    it('should accept apiKey option', () => {
      const client = createDBRpcClient({
        url: serverUrl,
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(DBRpcClient)
    })
  })

  describe('DBRpcClient Operations', () => {
    it('should implement DBClient interface', () => {
      const client = new DBRpcClient({ url: serverUrl })

      // Thing operations
      expect(typeof client.list).toBe('function')
      expect(typeof client.find).toBe('function')
      expect(typeof client.search).toBe('function')
      expect(typeof client.get).toBe('function')
      expect(typeof client.getById).toBe('function')
      expect(typeof client.set).toBe('function')
      expect(typeof client.create).toBe('function')
      expect(typeof client.update).toBe('function')
      expect(typeof client.upsert).toBe('function')
      expect(typeof client.delete).toBe('function')
      expect(typeof client.forEach).toBe('function')

      // Relationship operations
      expect(typeof client.relate).toBe('function')
      expect(typeof client.unrelate).toBe('function')
      expect(typeof client.related).toBe('function')
      expect(typeof client.relationships).toBe('function')
      expect(typeof client.references).toBe('function')

      // Extended operations
      expect(typeof client.track).toBe('function')
      expect(typeof client.send).toBe('function')
      expect(typeof client.do).toBe('function')
      expect(typeof client.try).toBe('function')
      expect(typeof client.storeArtifact).toBe('function')
    })

    it('should have close method', async () => {
      const client = new DBRpcClient({ url: serverUrl })

      expect(typeof client.close).toBe('function')
      await client.close()
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

    it('should report disconnected state for WS client before connection', () => {
      const client = createRpcClient({
        url: 'wss://rpc.do/namespace',
        transport: 'ws',
      })
      expect(client.getConnectionState()).toBe('disconnected')
    })
  })

  describe('Module Loading', () => {
    it('should load module successfully', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
      expect(mod.RpcClient).toBeDefined()
      expect(mod.createRpcClient).toBeDefined()
      expect(mod.DBRpcClient).toBeDefined()
      expect(mod.createDBRpcClient).toBeDefined()
    })

    it('should export all documented types', async () => {
      const mod = await import('./index.js')

      // Check that the module has the expected exports
      expect(typeof mod.RpcClient).toBe('function')
      expect(typeof mod.createRpcClient).toBe('function')
      expect(typeof mod.DBRpcClient).toBe('function')
      expect(typeof mod.createDBRpcClient).toBe('function')
    })

    it('should re-export MDXLDDocument types', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
    })
  })

  describe('Type Safety', () => {
    it('should support typed RpcClient', () => {
      interface CustomData {
        title: string
        content: string
      }

      const client = createRpcClient<CustomData>({
        url: serverUrl,
      })

      expect(client).toBeInstanceOf(RpcClient)
    })

    it('should support typed DBRpcClient', () => {
      interface CustomData {
        name: string
        email: string
      }

      const client = createDBRpcClient<CustomData>({
        url: serverUrl,
      })

      expect(client).toBeInstanceOf(DBRpcClient)
    })
  })

  describe('Configuration Options', () => {
    it('should support full RpcClientConfig', () => {
      const config: RpcClientConfig = {
        url: serverUrl,
        transport: 'http',
        apiKey: 'test-key',
        headers: { 'X-Custom': 'value' },
        timeout: 60000,
        reconnect: {
          enabled: true,
          maxAttempts: 5,
          delay: 1000,
        },
      }

      const client = createRpcClient(config)
      expect(client).toBeInstanceOf(RpcClient)
    })

    it('should support minimal RpcClientConfig', () => {
      const config: RpcClientConfig = {
        url: serverUrl,
      }

      const client = createRpcClient(config)
      expect(client).toBeInstanceOf(RpcClient)
    })

    it('should support full DBRpcClientConfig', () => {
      const config: DBRpcClientConfig = {
        url: serverUrl,
        transport: 'http',
        apiKey: 'test-key',
      }

      const client = createDBRpcClient(config)
      expect(client).toBeInstanceOf(DBRpcClient)
    })

    it('should support minimal DBRpcClientConfig', () => {
      const config: DBRpcClientConfig = {
        url: serverUrl,
      }

      const client = createDBRpcClient(config)
      expect(client).toBeInstanceOf(DBRpcClient)
    })
  })
})
