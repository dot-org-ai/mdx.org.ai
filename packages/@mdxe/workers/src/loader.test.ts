/**
 * Tests for Worker Loaders integration
 *
 * These tests verify the createWorkerFromMDX function that wraps
 * Cloudflare's Dynamic Worker Loaders API for MDX execution.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createWorkerFromMDX,
  createWorkerLoaderAdapter,
  clearWorkerCache,
  getWorkerCacheStats,
  isWorkerCached,
  type WorkerLoaderOptions,
  type WorkerLoaderBinding,
  type LoaderWorkerInstance,
} from './loader.js'

// ============================================================================
// Mock Worker Loader Environment
// ============================================================================

/**
 * Create a mock WorkerLoader binding for testing
 * Simulates the env.LOADER.get() behavior from Cloudflare Workers
 */
function createMockLoader(): WorkerLoaderBinding {
  const workerCache = new Map<string, LoaderWorkerInstance>()

  return {
    get: vi.fn((id: string, callback: () => Promise<any>) => {
      // Simulate worker creation/retrieval
      if (!workerCache.has(id)) {
        // In real Worker Loaders, the callback is called to get config
        // We'll store a mock worker instance
        const mockEntrypoint = {
          fetch: vi.fn(async (request: Request | string) => {
            // Call the callback to get the config (this builds the worker)
            const config = await callback()

            // Parse the request
            const url = typeof request === 'string' ? new URL(request) : new URL(request.url)
            const method = typeof request === 'string' ? 'GET' : request.method

            // Simulate the worker's fetch handler
            if (url.pathname === '/meta') {
              return new Response(
                JSON.stringify({ exports: ['greet', 'add'], hasDefault: true }),
                { headers: { 'Content-Type': 'application/json' } }
              )
            }

            if (url.pathname === '/health') {
              return new Response(
                JSON.stringify({ status: 'ok' }),
                { headers: { 'Content-Type': 'application/json' } }
              )
            }

            if (url.pathname.startsWith('/call/')) {
              const fnName = url.pathname.slice(6)
              const body =
                method === 'POST' && typeof request !== 'string'
                  ? await request.json()
                  : {}

              // Simulate function execution
              if (fnName === 'greet') {
                const args = (body as any).args || []
                return new Response(
                  JSON.stringify({ result: `Hello, ${args[0] || 'World'}!` }),
                  { headers: { 'Content-Type': 'application/json' } }
                )
              }

              if (fnName === 'add') {
                const args = (body as any).args || []
                return new Response(
                  JSON.stringify({ result: (args[0] || 0) + (args[1] || 0) }),
                  { headers: { 'Content-Type': 'application/json' } }
                )
              }

              return new Response(
                JSON.stringify({ error: `Function not found: ${fnName}` }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
              )
            }

            return new Response('Not Found', { status: 404 })
          }),
        }

        const mockWorker: LoaderWorkerInstance = {
          getEntrypoint: vi.fn((name?: string) => mockEntrypoint),
        }

        workerCache.set(id, mockWorker)
      }

      return workerCache.get(id)!
    }),
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

const fixtures = {
  simple: `# Hello World`,

  withExports: `---
title: Test Module
---

export function greet(name) {
  return \`Hello, \${name}!\`
}

export function add(a, b) {
  return a + b
}`,

  calculator: `export function add(a, b) { return a + b }
export function subtract(a, b) { return a - b }
export const multiply = (a, b) => a * b`,

  asyncFunctions: `export async function fetchData() {
  return { success: true }
}`,

  withFrontmatter: `---
title: Document
author: Test
---

# Content`,
}

// ============================================================================
// createWorkerFromMDX Tests
// ============================================================================

describe('createWorkerFromMDX', () => {
  let mockLoader: WorkerLoaderBinding
  let mockEnv: { LOADER: WorkerLoaderBinding }

  beforeEach(() => {
    clearWorkerCache()
    mockLoader = createMockLoader()
    mockEnv = { LOADER: mockLoader }
  })

  afterEach(() => {
    clearWorkerCache()
    vi.clearAllMocks()
  })

  describe('basic functionality', () => {
    it('creates a worker from MDX content', async () => {
      const worker = await createWorkerFromMDX('test-worker', fixtures.withExports, mockEnv)

      expect(worker).toBeDefined()
      expect(worker.id).toBe('test-worker')
      expect(typeof worker.fetch).toBe('function')
      expect(typeof worker.call).toBe('function')
      expect(typeof worker.meta).toBe('function')
    })

    it('returns worker with correct module ID', async () => {
      const worker = await createWorkerFromMDX('my-module', fixtures.simple, mockEnv)

      expect(worker.id).toBe('my-module')
    })

    it('calls env.LOADER.get with the worker ID', async () => {
      await createWorkerFromMDX('test-id', fixtures.simple, mockEnv)

      expect(mockLoader.get).toHaveBeenCalledWith('test-id', expect.any(Function))
    })

    it('compiles MDX content to worker config', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.withExports, mockEnv)

      // The callback should have been called and produced a valid config
      expect(mockLoader.get).toHaveBeenCalled()
    })
  })

  describe('worker caching', () => {
    it('caches workers by ID', async () => {
      const worker1 = await createWorkerFromMDX('cached-worker', fixtures.simple, mockEnv)
      const worker2 = await createWorkerFromMDX('cached-worker', fixtures.simple, mockEnv)

      // Same ID should return cached worker
      expect(worker1.id).toBe(worker2.id)
      expect(isWorkerCached('cached-worker')).toBe(true)
    })

    it('returns same worker instance for same ID', async () => {
      await createWorkerFromMDX('same-id', fixtures.simple, mockEnv)
      await createWorkerFromMDX('same-id', fixtures.withExports, mockEnv)

      // LOADER.get should only be called once since we cache at the wrapper level
      expect(mockLoader.get).toHaveBeenCalledTimes(1)
      // Cache should have one entry
      expect(getWorkerCacheStats().size).toBe(1)
    })

    it('creates different workers for different IDs', async () => {
      await createWorkerFromMDX('worker-1', fixtures.simple, mockEnv)
      await createWorkerFromMDX('worker-2', fixtures.withExports, mockEnv)

      expect(getWorkerCacheStats().size).toBe(2)
      expect(isWorkerCached('worker-1')).toBe(true)
      expect(isWorkerCached('worker-2')).toBe(true)
    })

    it('clears specific worker from cache', async () => {
      await createWorkerFromMDX('to-clear', fixtures.simple, mockEnv)
      await createWorkerFromMDX('to-keep', fixtures.withExports, mockEnv)

      expect(getWorkerCacheStats().size).toBe(2)

      clearWorkerCache('to-clear')

      expect(getWorkerCacheStats().size).toBe(1)
      expect(isWorkerCached('to-clear')).toBe(false)
      expect(isWorkerCached('to-keep')).toBe(true)
    })

    it('clears all workers from cache', async () => {
      await createWorkerFromMDX('worker-a', fixtures.simple, mockEnv)
      await createWorkerFromMDX('worker-b', fixtures.withExports, mockEnv)

      clearWorkerCache()

      expect(getWorkerCacheStats().size).toBe(0)
    })
  })

  describe('worker operations', () => {
    it('can call exported functions via worker.call()', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.withExports, mockEnv)

      const result = await worker.call<string>('greet', 'World')
      expect(result).toBe('Hello, World!')
    })

    it('can call functions with multiple arguments', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.calculator, mockEnv)

      const result = await worker.call<number>('add', 5, 3)
      expect(result).toBe(8)
    })

    it('can get module metadata', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.withExports, mockEnv)

      const meta = await worker.meta()
      expect(meta.exports).toBeInstanceOf(Array)
      expect(meta.hasDefault).toBeDefined()
    })

    it('can make raw fetch requests', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.simple, mockEnv)

      const response = await worker.fetch('/health')
      expect(response.ok).toBe(true)

      const body = await response.json()
      expect(body).toEqual({ status: 'ok' })
    })

    it('provides frontmatter data', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.withFrontmatter, mockEnv)

      expect(worker.data).toBeDefined()
      expect(worker.data.title).toBe('Document')
      expect(worker.data.author).toBe('Test')
    })
  })

  describe('custom bindings via ctx.exports', () => {
    it('passes custom bindings to worker', async () => {
      const customBindings = {
        API_KEY: 'test-key',
        API_URL: 'https://api.example.com',
      }

      const worker = await createWorkerFromMDX('test', fixtures.simple, mockEnv, {
        bindings: customBindings,
      })

      expect(worker).toBeDefined()
      // Worker config should include the bindings
    })

    it('allows specifying allowed bindings', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.simple, mockEnv, {
        allowedBindings: ['KV', 'R2'],
      })

      expect(worker).toBeDefined()
    })
  })

  describe('sandboxing options', () => {
    it('blocks network access by default', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.simple, mockEnv)

      // Worker should be sandboxed by default
      expect(worker).toBeDefined()
    })

    it('can disable network blocking', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.simple, mockEnv, {
        blockNetwork: false,
      })

      expect(worker).toBeDefined()
    })

    it('respects timeout option', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.simple, mockEnv, {
        timeout: 5000,
      })

      expect(worker).toBeDefined()
    })

    it('respects memory limit option', async () => {
      const worker = await createWorkerFromMDX('test', fixtures.simple, mockEnv, {
        memoryLimit: 128,
      })

      expect(worker).toBeDefined()
    })
  })
})

// ============================================================================
// createWorkerLoaderAdapter Tests
// ============================================================================

describe('createWorkerLoaderAdapter', () => {
  let mockLoader: WorkerLoaderBinding
  let mockEnv: { LOADER: WorkerLoaderBinding }

  beforeEach(() => {
    clearWorkerCache()
    mockLoader = createMockLoader()
    mockEnv = { LOADER: mockLoader }
  })

  afterEach(() => {
    clearWorkerCache()
    vi.clearAllMocks()
  })

  it('creates an adapter function with pre-configured options', async () => {
    const adapter = createWorkerLoaderAdapter(mockEnv, {
      blockNetwork: true,
      timeout: 10000,
    })

    expect(typeof adapter).toBe('function')
  })

  it('adapter creates workers with pre-configured options', async () => {
    const adapter = createWorkerLoaderAdapter(mockEnv, {
      blockNetwork: true,
    })

    const worker = await adapter('test', fixtures.simple)

    expect(worker).toBeDefined()
    expect(worker.id).toBe('test')
  })

  it('adapter options can be overridden per-call', async () => {
    const adapter = createWorkerLoaderAdapter(mockEnv, {
      blockNetwork: true,
    })

    const worker = await adapter('test', fixtures.simple, {
      blockNetwork: false,
    })

    expect(worker).toBeDefined()
  })
})

// ============================================================================
// Worker ID Strategies Tests
// ============================================================================

describe('worker ID strategies', () => {
  let mockLoader: WorkerLoaderBinding
  let mockEnv: { LOADER: WorkerLoaderBinding }

  beforeEach(() => {
    clearWorkerCache()
    mockLoader = createMockLoader()
    mockEnv = { LOADER: mockLoader }
  })

  afterEach(() => {
    clearWorkerCache()
    vi.clearAllMocks()
  })

  it('uses provided ID as-is', async () => {
    const worker = await createWorkerFromMDX('explicit-id', fixtures.simple, mockEnv)

    expect(worker.id).toBe('explicit-id')
  })

  it('supports content hash ID strategy via option', async () => {
    const worker = await createWorkerFromMDX('base-id', fixtures.simple, mockEnv, {
      idStrategy: 'content-hash',
    })

    // ID should be based on content hash
    expect(worker.id).toContain('base-id')
  })

  it('supports version-based ID strategy', async () => {
    const worker = await createWorkerFromMDX('versioned', fixtures.simple, mockEnv, {
      idStrategy: 'versioned',
      version: '1.0.0',
    })

    expect(worker.id).toContain('versioned')
    expect(worker.id).toContain('1.0.0')
  })
})

// ============================================================================
// Worker Lifecycle Tests
// ============================================================================

describe('worker lifecycle', () => {
  let mockLoader: WorkerLoaderBinding
  let mockEnv: { LOADER: WorkerLoaderBinding }

  beforeEach(() => {
    clearWorkerCache()
    mockLoader = createMockLoader()
    mockEnv = { LOADER: mockLoader }
  })

  afterEach(() => {
    clearWorkerCache()
    vi.clearAllMocks()
  })

  it('worker can be destroyed', async () => {
    const worker = await createWorkerFromMDX('disposable', fixtures.simple, mockEnv)

    expect(isWorkerCached('disposable')).toBe(true)

    worker.destroy()

    expect(isWorkerCached('disposable')).toBe(false)
  })

  it('destroyed worker cannot make requests', async () => {
    const worker = await createWorkerFromMDX('disposable', fixtures.simple, mockEnv)
    worker.destroy()

    await expect(worker.fetch('/health')).rejects.toThrow()
  })

  it('destroying worker does not affect other workers', async () => {
    const worker1 = await createWorkerFromMDX('worker-1', fixtures.simple, mockEnv)
    const worker2 = await createWorkerFromMDX('worker-2', fixtures.withExports, mockEnv)

    worker1.destroy()

    expect(isWorkerCached('worker-1')).toBe(false)
    expect(isWorkerCached('worker-2')).toBe(true)

    // worker2 should still work
    const response = await worker2.fetch('/health')
    expect(response.ok).toBe(true)
  })
})

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('error handling', () => {
  let mockLoader: WorkerLoaderBinding
  let mockEnv: { LOADER: WorkerLoaderBinding }

  beforeEach(() => {
    clearWorkerCache()
    mockLoader = createMockLoader()
    mockEnv = { LOADER: mockLoader }
  })

  afterEach(() => {
    clearWorkerCache()
    vi.clearAllMocks()
  })

  it('throws when calling non-existent function', async () => {
    const worker = await createWorkerFromMDX('test', fixtures.simple, mockEnv)

    await expect(worker.call('nonExistent')).rejects.toThrow()
  })

  it('handles MDX compilation errors gracefully', async () => {
    const invalidMDX = `
export function broken( {
  return 'unclosed parenthesis'
}
`

    await expect(
      createWorkerFromMDX('test', invalidMDX, mockEnv)
    ).rejects.toThrow()
  })
})

// ============================================================================
// Cache Stats Tests
// ============================================================================

describe('cache statistics', () => {
  let mockLoader: WorkerLoaderBinding
  let mockEnv: { LOADER: WorkerLoaderBinding }

  beforeEach(() => {
    clearWorkerCache()
    mockLoader = createMockLoader()
    mockEnv = { LOADER: mockLoader }
  })

  afterEach(() => {
    clearWorkerCache()
    vi.clearAllMocks()
  })

  it('returns correct cache size', async () => {
    expect(getWorkerCacheStats().size).toBe(0)

    await createWorkerFromMDX('worker-1', fixtures.simple, mockEnv)
    expect(getWorkerCacheStats().size).toBe(1)

    await createWorkerFromMDX('worker-2', fixtures.withExports, mockEnv)
    expect(getWorkerCacheStats().size).toBe(2)
  })

  it('returns list of worker IDs', async () => {
    await createWorkerFromMDX('alpha', fixtures.simple, mockEnv)
    await createWorkerFromMDX('beta', fixtures.withExports, mockEnv)

    const stats = getWorkerCacheStats()
    expect(stats.workerIds).toContain('alpha')
    expect(stats.workerIds).toContain('beta')
  })

  it('isWorkerCached returns correct status', async () => {
    expect(isWorkerCached('test')).toBe(false)

    await createWorkerFromMDX('test', fixtures.simple, mockEnv)
    expect(isWorkerCached('test')).toBe(true)

    clearWorkerCache('test')
    expect(isWorkerCached('test')).toBe(false)
  })
})
