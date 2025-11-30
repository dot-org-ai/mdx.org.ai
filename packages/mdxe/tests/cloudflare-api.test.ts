/**
 * Tests for Cloudflare API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CloudflareApi,
  createCloudflareApi,
  createCloudflareApiFromEnv,
  type CloudflareApiConfig,
  type WorkerMetadata,
  type WorkerBinding,
} from '../src/cloudflare/api.js'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('CloudflareApi', () => {
  let api: CloudflareApi
  const defaultConfig: CloudflareApiConfig = {
    accountId: 'test-account-id',
    apiToken: 'test-api-token',
  }

  beforeEach(() => {
    mockFetch.mockReset()
    api = new CloudflareApi(defaultConfig)
  })

  describe('constructor', () => {
    it('should create instance with required config', () => {
      const api = new CloudflareApi(defaultConfig)
      expect(api).toBeInstanceOf(CloudflareApi)
    })

    it('should use default baseUrl when not provided', () => {
      const api = new CloudflareApi(defaultConfig)
      // Verify by making a request
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, result: [] }),
      })

      api.listWorkers()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.cloudflare.com/client/v4'),
        expect.any(Object)
      )
    })

    it('should use custom baseUrl when provided', () => {
      const customApi = new CloudflareApi({
        ...defaultConfig,
        baseUrl: 'https://custom-proxy.example.com/api',
      })

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, result: [] }),
      })

      customApi.listWorkers()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom-proxy.example.com/api'),
        expect.any(Object)
      )
    })

    it('should include custom headers in requests', () => {
      const customApi = new CloudflareApi({
        ...defaultConfig,
        headers: {
          'X-Tenant-Id': 'tenant-123',
          'X-Custom-Auth': 'custom-token',
        },
      })

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, result: [] }),
      })

      customApi.listWorkers()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-Id': 'tenant-123',
            'X-Custom-Auth': 'custom-token',
          }),
        })
      )
    })

    it('should include Authorization header with Bearer token', () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, result: [] }),
      })

      api.listWorkers()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-token',
          }),
        })
      )
    })
  })

  describe('Dispatch Namespace Operations', () => {
    describe('createDispatchNamespace', () => {
      it('should create a dispatch namespace', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { namespace_id: 'ns-123' },
            }),
        })

        const result = await api.createDispatchNamespace({
          name: 'my-namespace',
        })

        expect(result.success).toBe(true)
        expect(result.scriptId).toBe('ns-123')
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.cloudflare.com/client/v4/accounts/test-account-id/workers/dispatch/namespaces',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })

      it('should handle namespace creation failure', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: false,
              errors: [{ code: 10001, message: 'Namespace already exists' }],
            }),
        })

        const result = await api.createDispatchNamespace({
          name: 'existing-namespace',
        })

        expect(result.success).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors![0].message).toBe('Namespace already exists')
      })
    })

    describe('listDispatchNamespaces', () => {
      it('should list dispatch namespaces', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: [
                { name: 'namespace-1' },
                { name: 'namespace-2' },
              ],
            }),
        })

        const result = await api.listDispatchNamespaces()

        expect(result.success).toBe(true)
        expect(result.namespaces).toHaveLength(2)
        expect(result.namespaces![0].name).toBe('namespace-1')
      })
    })

    describe('deleteDispatchNamespace', () => {
      it('should delete a dispatch namespace', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true }),
        })

        const result = await api.deleteDispatchNamespace('my-namespace')

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.cloudflare.com/client/v4/accounts/test-account-id/workers/dispatch/namespaces/my-namespace',
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    describe('uploadToNamespace', () => {
      it('should upload a worker to a namespace', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { id: 'script-123' },
            }),
        })

        const metadata: WorkerMetadata = {
          main_module: 'worker.js',
          compatibility_date: '2024-01-01',
        }

        const result = await api.uploadToNamespace(
          'my-namespace',
          'my-script',
          'export default { fetch() { return new Response("Hello") } }',
          metadata
        )

        expect(result.success).toBe(true)
        expect(result.scriptId).toBe('script-123')
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.cloudflare.com/client/v4/accounts/test-account-id/workers/dispatch/namespaces/my-namespace/scripts/my-script',
          expect.objectContaining({ method: 'PUT' })
        )
      })
    })

    describe('deleteFromNamespace', () => {
      it('should delete a worker from a namespace', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true }),
        })

        const result = await api.deleteFromNamespace('my-namespace', 'my-script')

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.cloudflare.com/client/v4/accounts/test-account-id/workers/dispatch/namespaces/my-namespace/scripts/my-script',
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })
  })

  describe('Worker Operations', () => {
    describe('uploadWorker', () => {
      it('should upload a worker script', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { id: 'worker-123' },
            }),
        })

        const metadata: WorkerMetadata = {
          main_module: 'worker.js',
          compatibility_date: '2024-01-01',
        }

        const result = await api.uploadWorker(
          'my-worker',
          'export default { fetch() { return new Response("Hello") } }',
          metadata
        )

        expect(result.success).toBe(true)
        expect(result.scriptId).toBe('worker-123')
        expect(result.url).toBe('https://my-worker.test-account-id.workers.dev')
      })

      it('should not include URL on failure', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: false,
              errors: [{ code: 10000, message: 'Upload failed' }],
            }),
        })

        const metadata: WorkerMetadata = {
          main_module: 'worker.js',
        }

        const result = await api.uploadWorker('my-worker', 'invalid code', metadata)

        expect(result.success).toBe(false)
        expect(result.url).toBeUndefined()
      })
    })

    describe('uploadWorkerModules', () => {
      it('should upload worker with multiple modules', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { id: 'worker-456' },
            }),
        })

        const modules = [
          { name: 'index.js', content: 'export { handler } from "./handler.js"' },
          { name: 'handler.js', content: 'export function handler() {}' },
        ]

        const metadata: WorkerMetadata = {
          main_module: 'index.js',
        }

        const result = await api.uploadWorkerModules('my-worker', modules, metadata)

        expect(result.success).toBe(true)
        expect(result.scriptId).toBe('worker-456')
      })

      it('should handle custom module types', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { id: 'worker-789' },
            }),
        })

        const modules = [
          { name: 'index.js', content: 'import wasm from "./module.wasm"', type: 'application/javascript+module' },
          { name: 'module.wasm', content: 'binary content', type: 'application/wasm' },
        ]

        const metadata: WorkerMetadata = {
          main_module: 'index.js',
        }

        const result = await api.uploadWorkerModules('wasm-worker', modules, metadata)

        expect(result.success).toBe(true)
      })
    })

    describe('deleteWorker', () => {
      it('should delete a worker script', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true }),
        })

        const result = await api.deleteWorker('my-worker')

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.cloudflare.com/client/v4/accounts/test-account-id/workers/scripts/my-worker',
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    describe('getWorker', () => {
      it('should get worker details', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: {
                id: 'my-worker',
                etag: 'abc123',
                modified_on: '2024-01-15T12:00:00Z',
              },
            }),
        })

        const result = await api.getWorker('my-worker')

        expect(result.success).toBe(true)
        expect(result.script?.id).toBe('my-worker')
        expect(result.script?.etag).toBe('abc123')
      })
    })

    describe('listWorkers', () => {
      it('should list all workers', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: [
                { id: 'worker-1', etag: 'abc', modified_on: '2024-01-15T12:00:00Z' },
                { id: 'worker-2', etag: 'def', modified_on: '2024-01-14T12:00:00Z' },
              ],
            }),
        })

        const result = await api.listWorkers()

        expect(result.success).toBe(true)
        expect(result.workers).toHaveLength(2)
        expect(result.workers![0].id).toBe('worker-1')
      })
    })
  })

  describe('Storage Operations', () => {
    describe('createKVNamespace', () => {
      it('should create a KV namespace', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { id: 'kv-namespace-123' },
            }),
        })

        const result = await api.createKVNamespace('my-kv')

        expect(result.success).toBe(true)
        expect(result.id).toBe('kv-namespace-123')
      })
    })

    describe('createD1Database', () => {
      it('should create a D1 database', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { uuid: 'd1-db-uuid-123' },
            }),
        })

        const result = await api.createD1Database('my-database')

        expect(result.success).toBe(true)
        expect(result.uuid).toBe('d1-db-uuid-123')
      })
    })
  })

  describe('Domain Configuration', () => {
    describe('setCustomDomain', () => {
      it('should configure a custom domain', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true }),
        })

        const result = await api.setCustomDomain('my-worker', 'docs.example.com', 'zone-123')

        expect(result.success).toBe(true)
        expect(result.url).toBe('https://docs.example.com')
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.cloudflare.com/client/v4/zones/zone-123/workers/routes',
          expect.objectContaining({
            method: 'PUT',
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await api.listWorkers()

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].message).toBe('Network error')
    })

    it('should handle timeout', async () => {
      const slowApi = new CloudflareApi({
        ...defaultConfig,
        timeout: 100,
      })

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Aborted')), 200)
          })
      )

      const result = await slowApi.listWorkers()

      expect(result.success).toBe(false)
    })

    it('should handle non-Error throws', async () => {
      mockFetch.mockRejectedValueOnce('string error')

      const result = await api.listWorkers()

      expect(result.success).toBe(false)
      expect(result.errors![0].message).toBe('Unknown error')
    })
  })

  describe('Worker Bindings', () => {
    it('should include KV namespace binding in metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { id: 'worker-123' },
          }),
      })

      const bindings: WorkerBinding[] = [
        { type: 'kv_namespace', name: 'MY_KV', namespace_id: 'kv-123' },
      ]

      const metadata: WorkerMetadata = {
        main_module: 'worker.js',
        bindings,
      }

      await api.uploadWorker('my-worker', 'code', metadata)

      // Verify FormData was passed with metadata containing bindings
      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toBeInstanceOf(FormData)
    })

    it('should include D1 binding in metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { id: 'worker-123' },
          }),
      })

      const bindings: WorkerBinding[] = [
        { type: 'd1', name: 'MY_DB', id: 'd1-123' },
      ]

      const metadata: WorkerMetadata = {
        main_module: 'worker.js',
        bindings,
      }

      await api.uploadWorker('my-worker', 'code', metadata)

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toBeInstanceOf(FormData)
    })

    it('should include R2 bucket binding in metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { id: 'worker-123' },
          }),
      })

      const bindings: WorkerBinding[] = [
        { type: 'r2_bucket', name: 'MY_BUCKET', bucket_name: 'my-bucket' },
      ]

      const metadata: WorkerMetadata = {
        main_module: 'worker.js',
        bindings,
      }

      await api.uploadWorker('my-worker', 'code', metadata)

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toBeInstanceOf(FormData)
    })

    it('should include service binding in metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { id: 'worker-123' },
          }),
      })

      const bindings: WorkerBinding[] = [
        { type: 'service', name: 'AUTH_SERVICE', service: 'auth-worker' },
      ]

      const metadata: WorkerMetadata = {
        main_module: 'worker.js',
        bindings,
      }

      await api.uploadWorker('my-worker', 'code', metadata)

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toBeInstanceOf(FormData)
    })

    it('should include dispatch namespace binding in metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { id: 'worker-123' },
          }),
      })

      const bindings: WorkerBinding[] = [
        { type: 'dispatch_namespace', name: 'DISPATCHER', namespace: 'customer-workers' },
      ]

      const metadata: WorkerMetadata = {
        main_module: 'worker.js',
        bindings,
      }

      await api.uploadWorker('my-worker', 'code', metadata)

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toBeInstanceOf(FormData)
    })

    it('should include environment variables as bindings', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { id: 'worker-123' },
          }),
      })

      const bindings: WorkerBinding[] = [
        { type: 'plain_text', name: 'API_URL', text: 'https://api.example.com' },
        { type: 'secret_text', name: 'API_KEY', text: 'secret-key' },
      ]

      const metadata: WorkerMetadata = {
        main_module: 'worker.js',
        bindings,
      }

      await api.uploadWorker('my-worker', 'code', metadata)

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toBeInstanceOf(FormData)
    })
  })
})

describe('createCloudflareApi', () => {
  it('should create a CloudflareApi instance', () => {
    const api = createCloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    expect(api).toBeInstanceOf(CloudflareApi)
  })

  it('should pass through all config options', () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, result: [] }),
    })

    const api = createCloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
      baseUrl: 'https://custom.api.com',
      headers: { 'X-Custom': 'value' },
      timeout: 60000,
    })

    api.listWorkers()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://custom.api.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom': 'value',
        }),
      })
    )
  })
})

describe('createCloudflareApiFromEnv', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should create API from environment variables', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account-id'
    process.env.CLOUDFLARE_API_TOKEN = 'env-api-token'

    const api = createCloudflareApiFromEnv()

    expect(api).toBeInstanceOf(CloudflareApi)
  })

  it('should throw if CLOUDFLARE_ACCOUNT_ID is missing', () => {
    process.env.CLOUDFLARE_API_TOKEN = 'env-api-token'
    delete process.env.CLOUDFLARE_ACCOUNT_ID

    expect(() => createCloudflareApiFromEnv()).toThrow(
      'CLOUDFLARE_ACCOUNT_ID environment variable is required'
    )
  })

  it('should throw if CLOUDFLARE_API_TOKEN is missing', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account-id'
    delete process.env.CLOUDFLARE_API_TOKEN

    expect(() => createCloudflareApiFromEnv()).toThrow(
      'CLOUDFLARE_API_TOKEN environment variable is required'
    )
  })

  it('should use CLOUDFLARE_API_BASE_URL if set', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account-id'
    process.env.CLOUDFLARE_API_TOKEN = 'env-api-token'
    process.env.CLOUDFLARE_API_BASE_URL = 'https://proxy.example.com/cf'

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, result: [] }),
    })

    const api = createCloudflareApiFromEnv()
    api.listWorkers()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://proxy.example.com/cf'),
      expect.any(Object)
    )
  })

  it('should allow overrides', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account-id'
    process.env.CLOUDFLARE_API_TOKEN = 'env-api-token'

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, result: [] }),
    })

    const api = createCloudflareApiFromEnv({
      baseUrl: 'https://override.example.com',
      headers: { 'X-Override': 'true' },
    })

    api.listWorkers()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://override.example.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Override': 'true',
        }),
      })
    )
  })
})

describe('Asset Upload', () => {
  let testDir: string
  const assetTestConfig: CloudflareApiConfig = {
    accountId: 'test-account-id',
    apiToken: 'test-api-token',
  }

  beforeEach(async () => {
    mockFetch.mockReset()
    const { mkdirSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')

    testDir = join(tmpdir(), `cf-api-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    mkdirSync(join(testDir, 'assets'), { recursive: true })
    mkdirSync(join(testDir, 'assets', 'images'), { recursive: true })

    writeFileSync(join(testDir, 'assets', 'index.html'), '<html></html>')
    writeFileSync(join(testDir, 'assets', 'style.css'), 'body {}')
    writeFileSync(join(testDir, 'assets', 'images', 'logo.png'), 'fake-png-data')
  })

  afterEach(async () => {
    const { rmSync, existsSync } = await import('node:fs')
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should upload assets from directory', async () => {
    const { join } = await import('node:path')

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    const api = new CloudflareApi(assetTestConfig)
    const result = await api.uploadAssets('my-worker', join(testDir, 'assets'))

    expect(result.success).toBe(true)
    expect(result.manifest).toBeDefined()
    expect(Object.keys(result.manifest || {})).toHaveLength(3)
  })

  it('should return error for empty directory', async () => {
    const { mkdirSync } = await import('node:fs')
    const { join } = await import('node:path')

    const emptyDir = join(testDir, 'empty')
    mkdirSync(emptyDir, { recursive: true })

    const api = new CloudflareApi(assetTestConfig)
    const result = await api.uploadAssets('my-worker', emptyDir)

    expect(result.success).toBe(false)
    expect(result.errors?.[0].message).toContain('No assets found')
  })

  it('should return error for non-existent directory', async () => {
    const { join } = await import('node:path')

    const api = new CloudflareApi(assetTestConfig)
    const result = await api.uploadAssets('my-worker', join(testDir, 'nonexistent'))

    expect(result.success).toBe(false)
    expect(result.errors?.[0].message).toContain('No assets found')
  })

  it('should handle upload failure in batch', async () => {
    const { join } = await import('node:path')

    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: false,
          errors: [{ code: 10000, message: 'Upload failed' }],
        }),
    })

    const api = new CloudflareApi(assetTestConfig)
    const result = await api.uploadAssets('my-worker', join(testDir, 'assets'))

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it('should generate unique hashes for different content', async () => {
    const { join } = await import('node:path')
    const fs = await import('node:fs')

    // Create two files with different content
    fs.writeFileSync(join(testDir, 'assets', 'file1.txt'), 'content1')
    fs.writeFileSync(join(testDir, 'assets', 'file2.txt'), 'content2')

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    const api = new CloudflareApi(assetTestConfig)
    const result = await api.uploadAssets('my-worker', join(testDir, 'assets'))

    expect(result.success).toBe(true)
    const hashes = Object.values(result.manifest || {})
    // All hashes should be unique
    expect(new Set(hashes).size).toBe(hashes.length)
  })
})

describe('Multi-Tenant Workflow', () => {
  const mockFetchLocal = vi.fn()

  beforeEach(() => {
    mockFetchLocal.mockReset()
    global.fetch = mockFetchLocal
  })

  it('should support complete multi-tenant deployment workflow', async () => {
    // Create API with custom proxy for tenant auth
    const api = new CloudflareApi({
      accountId: 'platform-account',
      apiToken: 'platform-token',
      baseUrl: 'https://api-proxy.myplatform.com/v1',
      headers: {
        'X-Tenant-Id': 'customer-123',
        'X-Platform-Auth': 'platform-secret',
      },
    })

    // Step 1: Create dispatch namespace for tenant
    mockFetchLocal.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          result: { namespace_id: 'ns-customer-123' },
        }),
    })

    const nsResult = await api.createDispatchNamespace({
      name: 'customer-123-docs',
    })
    expect(nsResult.success).toBe(true)

    // Step 2: Upload tenant's worker to namespace
    mockFetchLocal.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          result: { id: 'script-abc' },
        }),
    })

    const uploadResult = await api.uploadToNamespace(
      'customer-123-docs',
      'docs-worker',
      'export default { fetch() { return new Response("Customer 123 Docs") } }',
      {
        main_module: 'worker.js',
        compatibility_date: '2024-01-01',
        bindings: [
          { type: 'kv_namespace', name: 'ASSETS', namespace_id: 'kv-assets-123' },
        ],
      }
    )
    expect(uploadResult.success).toBe(true)

    // Verify all requests went to custom proxy with tenant headers
    for (const call of mockFetchLocal.mock.calls) {
      expect(call[0]).toContain('https://api-proxy.myplatform.com/v1')
      expect(call[1].headers['X-Tenant-Id']).toBe('customer-123')
      expect(call[1].headers['X-Platform-Auth']).toBe('platform-secret')
    }
  })
})
