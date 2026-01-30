import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { join } from 'node:path'
import type { DeployPayload, DeployResult, DoDeployOptions } from './types.js'

// Mock oauth.do module
vi.mock('oauth.do', () => ({
  ensureLoggedIn: vi.fn().mockResolvedValue({ token: 'mock-token', isNewLogin: false }),
  getToken: vi.fn().mockResolvedValue(null),
}))

// Mock node:fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue(''),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  }
})

// Mock node:child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn().mockReturnValue('Build successful'),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('@mdxe/do', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('module exports', () => {
    it('exports deploy function', async () => {
      const mod = await import('./index.js')
      expect(mod.deploy).toBeDefined()
      expect(typeof mod.deploy).toBe('function')
    })

    it('exports detectSourceType function', async () => {
      const mod = await import('./index.js')
      expect(mod.detectSourceType).toBeDefined()
      expect(typeof mod.detectSourceType).toBe('function')
    })

    it('exports createProvider function', async () => {
      const mod = await import('./index.js')
      expect(mod.createProvider).toBeDefined()
      expect(typeof mod.createProvider).toBe('function')
    })

    it('exports DoApi class', async () => {
      const mod = await import('./index.js')
      expect(mod.DoApi).toBeDefined()
    })

    it('exports types', async () => {
      const mod = await import('./index.js')
      expect(mod.DEFAULT_API_URL).toBe('https://apis.do')
    })
  })

  // ============================================================
  // deploy() function tests
  // ============================================================
  describe('deploy() function', () => {
    it('should deploy successfully with dry run', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        projectName: 'test-worker',
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.logs).toBeDefined()
      expect(result.logs?.some(log => log.includes('dry-run'))).toBe(true)
    })

    it('should include timing information in result', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        dryRun: true,
      })

      expect(result.timing).toBeDefined()
      expect(result.timing?.totalDuration).toBeGreaterThanOrEqual(0)
    })

    it('should detect static mode for unknown projects', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        dryRun: true,
      })

      expect(result.logs?.some(log => log.includes('static'))).toBe(true)
    })

    it('should use provided project name', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        projectName: 'custom-name',
        dryRun: true,
      })

      expect(result.logs?.some(log => log.includes('custom-name'))).toBe(true)
    })

    it('should respect custom API URL', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        apiUrl: 'https://custom.api.do',
        dryRun: true,
      })

      expect(result.logs?.some(log => log.includes('custom.api.do'))).toBe(true)
    })

    it('should handle build command option', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        buildCommand: 'pnpm build',
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.logs?.some(log => log.includes('Build'))).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      const { deploy } = await import('./index.js')
      const fs = await import('node:fs')

      // Force an error by mocking readFileSync to throw
      const errorFn = vi.fn().mockImplementation(() => {
        throw new Error('Read error')
      })
      ;(fs.existsSync as Mock).mockReturnValue(true)
      ;(fs.readFileSync as Mock).mockImplementation(errorFn)

      const result = await deploy({
        projectDir: '/test/project',
        dryRun: true,
      })

      // Result should still be returned (may succeed or fail depending on path)
      expect(result).toBeDefined()
      expect(result.timing?.totalDuration).toBeGreaterThanOrEqual(0)
    })

    it('should set compatibility date if provided', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        compatibilityDate: '2024-01-01',
        dryRun: true,
      })

      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // DoApi class tests
  // ============================================================
  describe('DoApi class', () => {
    it('should construct with default API URL', async () => {
      const { DoApi, DEFAULT_API_URL } = await import('./index.js')
      const api = new DoApi()
      expect(DEFAULT_API_URL).toBe('https://apis.do')
    })

    it('should construct with custom API URL', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ apiUrl: 'https://custom.api.do' })
      expect(api).toBeDefined()
    })

    it('should construct with provided token', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'custom-token' })
      expect(api).toBeDefined()
    })

    it('should get auth token from provided token', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'my-token' })
      const token = await api.getAuthToken()
      expect(token).toBe('my-token')
    })

    it('should return dry-run token when dryRun is true', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi()
      const token = await api.getAuthToken({ dryRun: true })
      expect(token).toBe('dry-run-token')
    })

    it('should deploy successfully via API', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          url: 'https://test-worker.workers.do',
          deploymentId: 'deploy-123',
          workerId: 'worker-123',
        }),
      })

      const payload: DeployPayload = {
        name: 'test-worker',
        code: 'export default { fetch() { return new Response("OK") } }',
        mode: 'static',
        compatibilityDate: '2024-01-01',
      }

      const result = await api.deploy(payload)

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://test-worker.workers.do')
      expect(result.deploymentId).toBe('deploy-123')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle deploy API error response', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      })

      const payload: DeployPayload = {
        name: 'test-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
      }

      const result = await api.deploy(payload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('500')
    })

    it('should list workers successfully', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workers: [
            { id: 'worker-1', name: 'my-worker-1' },
            { id: 'worker-2', name: 'my-worker-2' },
          ],
        }),
      })

      const result = await api.listWorkers()

      expect(result.success).toBe(true)
      expect(result.workers).toHaveLength(2)
    })

    it('should get worker by name', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'worker-1',
          name: 'my-worker',
          url: 'https://my-worker.workers.do',
        }),
      })

      const result = await api.getWorker('my-worker')

      expect(result.success).toBe(true)
      expect(result.worker?.name).toBe('my-worker')
    })

    it('should handle worker not found', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      })

      const result = await api.getWorker('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Worker not found')
    })

    it('should delete worker successfully', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await api.deleteWorker('my-worker')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workers/my-worker'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should get worker logs', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          logs: [
            { timestamp: '2024-01-01T00:00:00Z', level: 'info', message: 'Request received' },
          ],
        }),
      })

      const result = await api.getLogs('worker-1', { limit: 10 })

      expect(result.success).toBe(true)
      expect(result.logs).toHaveLength(1)
    })

    it('should handle network errors', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await api.listWorkers()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  // ============================================================
  // Framework detection tests
  // ============================================================
  describe('detectSourceType() - Framework detection', () => {
    it('should detect Next.js project', async () => {
      const fs = await import('node:fs')
      const { detectSourceType } = await import('./index.js')

      ;(fs.existsSync as Mock).mockReturnValue(true)
      ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        dependencies: { next: '14.0.0' },
      }))

      const result = detectSourceType('/test/nextjs-project')

      expect(result.framework).toBe('nextjs')
      expect(result.adapter).toBe('opennext')
    })

    it('should detect static Next.js export', async () => {
      const fs = await import('node:fs')
      const { detectSourceType } = await import('./index.js')

      ;(fs.existsSync as Mock).mockImplementation((path: string) => {
        return path.includes('package.json') || path.includes('next.config')
      })
      ;(fs.readFileSync as Mock).mockImplementation((path: string) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ dependencies: { next: '14.0.0' } })
        }
        if (path.includes('next.config')) {
          return "module.exports = { output: 'export' }"
        }
        return ''
      })

      const result = detectSourceType('/test/static-next-project')

      expect(result.framework).toBe('nextjs')
      expect(result.isStatic).toBe(true)
      expect(result.adapter).toBe('static')
    })

    it('should detect Astro project', async () => {
      const fs = await import('node:fs')
      const { detectSourceType } = await import('./index.js')

      ;(fs.existsSync as Mock).mockReturnValue(true)
      ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        dependencies: { astro: '4.0.0' },
      }))

      const result = detectSourceType('/test/astro-project')

      expect(result.framework).toBe('astro')
      expect(result.isStatic).toBe(true)
    })

    it('should detect Astro with Cloudflare adapter', async () => {
      const fs = await import('node:fs')
      const { detectSourceType } = await import('./index.js')

      ;(fs.existsSync as Mock).mockReturnValue(true)
      ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        dependencies: {
          astro: '4.0.0',
          '@astrojs/cloudflare': '9.0.0',
        },
      }))

      const result = detectSourceType('/test/astro-cf-project')

      expect(result.framework).toBe('astro')
      expect(result.isStatic).toBe(false)
      expect(result.adapter).toBe('astro-cloudflare')
    })

    it('should detect Vite project', async () => {
      const fs = await import('node:fs')
      const { detectSourceType } = await import('./index.js')

      ;(fs.existsSync as Mock).mockReturnValue(true)
      ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        devDependencies: { vite: '5.0.0' },
      }))

      const result = detectSourceType('/test/vite-project')

      expect(result.framework).toBe('vite')
      expect(result.isStatic).toBe(true)
      expect(result.outputDir).toBe('dist')
    })

    it('should detect Fumadocs project', async () => {
      const fs = await import('node:fs')
      const { detectSourceType } = await import('./index.js')

      ;(fs.existsSync as Mock).mockReturnValue(true)
      ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        dependencies: {
          'fumadocs-core': '1.0.0',
          'fumadocs-ui': '1.0.0',
        },
      }))

      const result = detectSourceType('/test/fumadocs-project')

      expect(result.framework).toBe('fumadocs')
      expect(result.adapter).toBe('opennext')
    })

    it('should default to static for unknown projects', async () => {
      const fs = await import('node:fs')
      const { detectSourceType } = await import('./index.js')

      ;(fs.existsSync as Mock).mockReturnValue(true)
      ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        dependencies: { 'some-lib': '1.0.0' },
      }))

      const result = detectSourceType('/test/unknown-project')

      expect(result.isStatic).toBe(true)
      expect(result.adapter).toBe('static')
      expect(result.framework).toBeUndefined()
    })

    it('should detect OpenNext adapter', async () => {
      const fs = await import('node:fs')
      const { detectSourceType } = await import('./index.js')

      ;(fs.existsSync as Mock).mockReturnValue(true)
      ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        dependencies: {
          next: '14.0.0',
          '@opennextjs/cloudflare': '1.0.0',
        },
      }))

      const result = detectSourceType('/test/opennext-project')

      expect(result.adapter).toBe('opennext')
      expect(result.outputDir).toBe('.open-next')
    })
  })

  // ============================================================
  // Multi-tenant deployment tests
  // ============================================================
  describe('Multi-tenant deployment', () => {
    it('should support dispatch namespace in deploy options', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        dispatchNamespace: 'my-platform',
        dryRun: true,
      })

      expect(result.success).toBe(true)
    })

    it('should support tenant ID in deploy options', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        dispatchNamespace: 'my-platform',
        tenantId: 'tenant-123',
        dryRun: true,
      })

      expect(result.success).toBe(true)
    })

    it('should include tenant info in deploy payload', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, url: 'https://tenant.workers.do' }),
      })

      const payload: DeployPayload = {
        name: 'tenant-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
        dispatchNamespace: 'my-platform',
        tenantId: 'tenant-123',
      }

      await api.deploy(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('tenant-123'),
        })
      )
    })

    it('should support listing workers in a namespace', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workers: [
            { id: 'tenant-1', name: 'worker-1' },
            { id: 'tenant-2', name: 'worker-2' },
          ],
        }),
      })

      const result = await api.listWorkers()

      expect(result.success).toBe(true)
      expect(result.workers).toBeDefined()
    })
  })

  // ============================================================
  // Custom domains tests
  // ============================================================
  describe('Custom domains', () => {
    it('should support custom domain in deploy options', async () => {
      const { deploy } = await import('./index.js')

      const result = await deploy({
        projectDir: '/test/project',
        customDomain: 'my-site.com',
        dryRun: true,
      })

      expect(result.success).toBe(true)
    })

    it('should include custom domain in deploy payload', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          url: 'https://my-site.com',
          productionUrl: 'https://my-site.com',
        }),
      })

      const payload: DeployPayload = {
        name: 'my-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
        customDomain: 'my-site.com',
      }

      await api.deploy(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('my-site.com'),
        })
      )
    })

    it('should handle custom domain in deploy result', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          url: 'https://my-site.com',
        }),
      })

      const payload: DeployPayload = {
        name: 'my-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
        customDomain: 'my-site.com',
      }

      const result = await api.deploy(payload)

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://my-site.com')
    })
  })

  // ============================================================
  // createProvider() tests
  // ============================================================
  describe('createProvider()', () => {
    it('should create a provider with default config', async () => {
      const { createProvider } = await import('./index.js')

      const provider = createProvider()

      expect(provider.platform).toBe('do')
      expect(provider.name).toBe('.do Platform')
    })

    it('should create a provider with custom config', async () => {
      const { createProvider } = await import('./index.js')

      const provider = createProvider({
        apiUrl: 'https://custom.api.do',
        token: 'custom-token',
      })

      expect(provider.platform).toBe('do')
    })

    it('should have deploy method', async () => {
      const { createProvider } = await import('./index.js')

      const provider = createProvider()

      expect(typeof provider.deploy).toBe('function')
    })

    it('should have getWorker method', async () => {
      const { createProvider } = await import('./index.js')

      const provider = createProvider()

      expect(typeof provider.getWorker).toBe('function')
    })

    it('should have deleteWorker method', async () => {
      const { createProvider } = await import('./index.js')

      const provider = createProvider()

      expect(typeof provider.deleteWorker).toBe('function')
    })

    it('should have listWorkers method', async () => {
      const { createProvider } = await import('./index.js')

      const provider = createProvider()

      expect(typeof provider.listWorkers).toBe('function')
    })
  })

  // ============================================================
  // createDoApiFromEnv tests
  // ============================================================
  describe('createDoApiFromEnv()', () => {
    it('should create API client from environment', async () => {
      const { createDoApiFromEnv } = await import('./index.js')

      const api = createDoApiFromEnv()

      expect(api).toBeDefined()
    })
  })

  // ============================================================
  // KV and D1 bindings tests
  // ============================================================
  describe('KV and D1 bindings', () => {
    it('should include KV namespaces in deploy payload', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const payload: DeployPayload = {
        name: 'my-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
        kvNamespaces: {
          CACHE: 'kv-namespace-id-1',
          SESSIONS: 'kv-namespace-id-2',
        },
      }

      await api.deploy(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('CACHE'),
        })
      )
    })

    it('should include D1 databases in deploy payload', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const payload: DeployPayload = {
        name: 'my-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
        d1Databases: {
          DB: 'd1-database-id',
        },
      }

      await api.deploy(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('d1-database-id'),
        })
      )
    })

    it('should include R2 buckets in deploy payload', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const payload: DeployPayload = {
        name: 'my-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
        r2Buckets: {
          ASSETS: 'r2-bucket-id',
        },
      }

      await api.deploy(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('r2-bucket-id'),
        })
      )
    })

    it('should include Durable Objects in deploy payload', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const payload: DeployPayload = {
        name: 'my-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
        durableObjects: {
          COUNTER: 'CounterDO',
        },
      }

      await api.deploy(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('CounterDO'),
        })
      )
    })
  })

  // ============================================================
  // Edge cases and error handling
  // ============================================================
  describe('Edge cases and error handling', () => {
    it('should handle missing projectDir gracefully', async () => {
      const { deploy } = await import('./index.js')

      // This should not throw, but return an error result
      const result = await deploy({
        projectDir: '',
        dryRun: true,
      })

      expect(result).toBeDefined()
    })

    it('should handle API returning error field', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Deployment quota exceeded',
        }),
      })

      const payload: DeployPayload = {
        name: 'my-worker',
        code: 'export default {}',
        mode: 'static',
        compatibilityDate: '2024-01-01',
      }

      const result = await api.deploy(payload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('quota exceeded')
    })

    it('should handle delete worker error', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      })

      const result = await api.deleteWorker('protected-worker')

      expect(result.success).toBe(false)
      expect(result.error).toContain('403')
    })

    it('should handle list workers error', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })

      const result = await api.listWorkers()

      expect(result.success).toBe(false)
      expect(result.error).toContain('401')
    })

    it('should handle getLogs error', async () => {
      const { DoApi } = await import('./index.js')
      const api = new DoApi({ token: 'test-token' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      })

      const result = await api.getLogs('worker-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('500')
    })
  })
})
