/**
 * @mdxdb/rpc Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RpcClient, createRpcClient } from '../src/client.js'
import type { MDXLDDocument } from 'mdxld'

// Mock global fetch for HTTP transport tests
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('@mdxdb/rpc', () => {
  const mockDocument: MDXLDDocument = {
    type: 'Post',
    id: 'test-id',
    data: {
      $type: 'Post',
      title: 'Test Post',
    },
    content: '# Test Content',
  }

  describe('createRpcClient', () => {
    it('should create an RpcClient instance', () => {
      const client = createRpcClient({ url: 'https://rpc.do/namespace' })
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
        url: 'https://rpc.do/namespace',
        transport: 'ws',
      })
      expect(client).toBeInstanceOf(RpcClient)
    })
  })

  describe('RpcClient HTTP Transport', () => {
    let client: RpcClient

    beforeEach(() => {
      mockFetch.mockReset()
      client = new RpcClient({
        url: 'https://rpc.do/namespace',
        transport: 'http',
      })
    })

    afterEach(async () => {
      await client.close()
    })

    describe('list()', () => {
      it('should send JSON-RPC request for list', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 1,
              result: {
                documents: [mockDocument],
                total: 1,
                hasMore: false,
              },
            }),
        })

        const result = await client.list()

        expect(mockFetch).toHaveBeenCalledWith(
          'https://rpc.do/namespace',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )

        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body.jsonrpc).toBe('2.0')
        expect(body.method).toBe('mdxdb.list')
        expect(body.params).toEqual({})

        expect(result.documents).toHaveLength(1)
        expect(result.total).toBe(1)
      })

      it('should pass options as params', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 2,
              result: { documents: [], total: 0, hasMore: false },
            }),
        })

        await client.list({ limit: 10, offset: 5, type: 'Post' })

        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body.params).toEqual({ limit: 10, offset: 5, type: 'Post' })
      })
    })

    describe('search()', () => {
      it('should send JSON-RPC request for search', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 3,
              result: {
                documents: [{ ...mockDocument, score: 0.95 }],
                total: 1,
                hasMore: false,
              },
            }),
        })

        const result = await client.search({ query: 'test' })

        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body.method).toBe('mdxdb.search')
        expect(body.params).toEqual({ query: 'test' })

        expect(result.documents[0].score).toBe(0.95)
      })
    })

    describe('get()', () => {
      it('should send JSON-RPC request for get', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 4,
              result: mockDocument,
            }),
        })

        const result = await client.get('test-id')

        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body.method).toBe('mdxdb.get')
        expect(body.params).toEqual({ id: 'test-id' })

        expect(result).toEqual(mockDocument)
      })

      it('should return null when document not found', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 5,
              error: { code: -32000, message: 'Document not found' },
            }),
        })

        const result = await client.get('not-found')
        expect(result).toBeNull()
      })
    })

    describe('set()', () => {
      it('should send JSON-RPC request for set', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 6,
              result: { id: 'test-id', created: true },
            }),
        })

        const result = await client.set('test-id', mockDocument)

        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body.method).toBe('mdxdb.set')
        expect(body.params).toEqual({ id: 'test-id', document: mockDocument })

        expect(result.created).toBe(true)
      })
    })

    describe('delete()', () => {
      it('should send JSON-RPC request for delete', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 7,
              result: { id: 'test-id', deleted: true },
            }),
        })

        const result = await client.delete('test-id')

        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body.method).toBe('mdxdb.delete')
        expect(body.params).toEqual({ id: 'test-id' })

        expect(result.deleted).toBe(true)
      })

      it('should return deleted: false when not found', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 8,
              error: { code: -32000, message: 'Document not found' },
            }),
        })

        const result = await client.delete('not-found')
        expect(result.deleted).toBe(false)
      })
    })

    describe('error handling', () => {
      it('should throw on JSON-RPC error', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 9,
              error: { code: -32600, message: 'Invalid request' },
            }),
        })

        await expect(client.list()).rejects.toThrow('Invalid request')
      })
    })

    describe('authentication', () => {
      it('should include API key in Authorization header', async () => {
        const authClient = new RpcClient({
          url: 'https://rpc.do/namespace',
          transport: 'http',
          apiKey: 'test-api-key',
        })

        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 10,
              result: { documents: [], total: 0, hasMore: false },
            }),
        })

        await authClient.list()

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-api-key',
            }),
          })
        )

        await authClient.close()
      })
    })
  })

  describe('Connection State', () => {
    it('should report disconnected state for HTTP client', () => {
      const client = createRpcClient({
        url: 'https://rpc.do/namespace',
        transport: 'http',
      })
      expect(client.getConnectionState()).toBe('disconnected')
    })
  })
})
