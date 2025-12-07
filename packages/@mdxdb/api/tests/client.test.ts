/**
 * @mdxdb/api Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient, createApiClient, createClient } from '../src/client.js'
import type { MDXLDDocument } from 'mdxld'

describe('@mdxdb/api', () => {
  const mockDocument: MDXLDDocument = {
    type: 'Post',
    id: 'test-id',
    data: {
      $type: 'Post',
      title: 'Test Post',
    },
    content: '# Test Content',
  }

  describe('createClient', () => {
    it('should create an ApiClient instance', () => {
      const client = createClient({ baseUrl: 'https://api.example.com' })
      expect(client).toBeInstanceOf(ApiClient)
    })

    it('should accept optional configuration', () => {
      const client = createClient({
        baseUrl: 'https://api.example.com',
        apiKey: 'test-key',
        timeout: 5000,
        headers: { 'X-Custom': 'header' },
      })
      expect(client).toBeInstanceOf(ApiClient)
    })
  })

  describe('createApiClient (deprecated)', () => {
    it('should be an alias for createClient', () => {
      expect(createApiClient).toBe(createClient)
    })
  })

  describe('ApiClient', () => {
    let client: ApiClient
    let mockFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockFetch = vi.fn()
      client = new ApiClient({
        baseUrl: 'https://api.example.com',
        fetch: mockFetch,
      })
    })

    describe('list()', () => {
      it('should list documents', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                documents: [mockDocument],
                total: 1,
                hasMore: false,
              },
            }),
        })

        const result = await client.list()

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com',
          expect.objectContaining({ method: 'GET' })
        )
        expect(result.documents).toHaveLength(1)
        expect(result.total).toBe(1)
      })

      it('should pass query parameters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                documents: [],
                total: 0,
                hasMore: false,
              },
            }),
        })

        await client.list({ limit: 10, offset: 5, type: 'Post' })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.any(Object)
        )
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('offset=5'),
          expect.any(Object)
        )
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('type=Post'),
          expect.any(Object)
        )
      })
    })

    describe('search()', () => {
      it('should search documents', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                documents: [{ ...mockDocument, score: 0.95 }],
                total: 1,
                hasMore: false,
              },
            }),
        })

        const result = await client.search({ query: 'test' })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('q=test'),
          expect.any(Object)
        )
        expect(result.documents).toHaveLength(1)
        expect(result.documents[0].score).toBe(0.95)
      })
    })

    describe('get()', () => {
      it('should get a document by id', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: mockDocument,
            }),
        })

        const result = await client.get('test-id')

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test-id',
          expect.objectContaining({ method: 'GET' })
        )
        expect(result).toEqual(mockDocument)
      })

      it('should return null when document not found', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: false,
              error: 'Document not found',
            }),
        })

        const result = await client.get('not-found')
        expect(result).toBeNull()
      })
    })

    describe('set()', () => {
      it('should create/update a document', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'test-id',
                created: true,
              },
            }),
        })

        const result = await client.set('test-id', mockDocument)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test-id',
          expect.objectContaining({
            method: 'PUT',
          })
        )
        expect(result.created).toBe(true)
      })
    })

    describe('delete()', () => {
      it('should delete a document', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'test-id',
                deleted: true,
              },
            }),
        })

        const result = await client.delete('test-id')

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test-id',
          expect.objectContaining({ method: 'DELETE' })
        )
        expect(result.deleted).toBe(true)
      })

      it('should return deleted: false when not found', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: false,
              error: 'Document not found',
            }),
        })

        const result = await client.delete('not-found')
        expect(result.deleted).toBe(false)
      })
    })

    describe('error handling', () => {
      it('should throw on API error', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: false,
              error: 'Internal server error',
            }),
        })

        await expect(client.list()).rejects.toThrow('Internal server error')
      })

      it('should throw unknown error when no message provided', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: false,
            }),
        })

        await expect(client.list()).rejects.toThrow('Unknown API error')
      })
    })

    describe('authentication', () => {
      it('should include API key in Authorization header', async () => {
        const authClient = new ApiClient({
          baseUrl: 'https://api.example.com',
          apiKey: 'test-api-key',
          fetch: mockFetch,
        })

        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { documents: [], total: 0, hasMore: false },
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
      })

      it('should include custom headers', async () => {
        const customClient = new ApiClient({
          baseUrl: 'https://api.example.com',
          headers: { 'X-Custom-Header': 'custom-value' },
          fetch: mockFetch,
        })

        mockFetch.mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { documents: [], total: 0, hasMore: false },
            }),
        })

        await customClient.list()

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Custom-Header': 'custom-value',
            }),
          })
        )
      })
    })

    describe('close()', () => {
      it('should be callable (no-op for HTTP client)', async () => {
        await expect(client.close()).resolves.toBeUndefined()
      })
    })
  })
})
