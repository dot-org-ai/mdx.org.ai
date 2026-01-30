/**
 * SDK Provider Tests - Workerd-based execution model
 *
 * Tests for the simplified SDK provider that assumes workerd execution context:
 * - Uses @mdxe/workers for remote execution
 * - Uses @mdxe/workers/local for local development
 * - Simplifies environment detection
 * - Provides database binding injection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { WorkerEnv } from '@mdxe/workers'

// These imports will be created in the GREEN phase
import {
  createWorkerdSDKProvider,
  type WorkerdSDKConfig,
  type WorkerdSDKProvider,
  isLocalContext,
  isRemoteContext,
  createWorkerdContext,
  injectDatabaseBindings,
} from '../src/sdk-workerd.js'

describe('Workerd SDK Provider', () => {
  describe('Context Detection', () => {
    it('should detect local context when running in miniflare/workerd', () => {
      // In local development, there's no WORKER_LOADER binding
      const mockEnv = {} as WorkerEnv
      expect(isLocalContext(mockEnv)).toBe(true)
    })

    it('should detect remote context when LOADER binding is present', () => {
      // In production workerd, the LOADER binding is available
      const mockEnv = {
        LOADER: {
          get: vi.fn(),
        },
      } as unknown as WorkerEnv
      expect(isRemoteContext(mockEnv)).toBe(true)
      expect(isLocalContext(mockEnv)).toBe(false)
    })

    it('should detect local context from environment variable', () => {
      // MDX_LOCAL_DEV=true signals local development
      const mockEnv = {
        MDX_LOCAL_DEV: 'true',
      } as unknown as WorkerEnv
      expect(isLocalContext(mockEnv)).toBe(true)
    })
  })

  describe('createWorkerdSDKProvider', () => {
    describe('Local Context (Development)', () => {
      let sdk: WorkerdSDKProvider | null = null

      afterEach(async () => {
        if (sdk) {
          await sdk.dispose()
          sdk = null
        }
      })

      it('should create SDK provider for local development', async () => {
        const config: WorkerdSDKConfig = {
          context: 'local',
          ns: 'test-namespace',
        }

        sdk = await createWorkerdSDKProvider(config)

        expect(sdk).toBeDefined()
        expect(sdk.db).toBeDefined()
        expect(sdk.ai).toBeDefined()
        expect(sdk.workflows).toBeDefined()
        expect(sdk.$).toBeDefined()
      })

      it('should provide $ context object with correct namespace', async () => {
        const config: WorkerdSDKConfig = {
          context: 'local',
          ns: 'my-app',
        }

        sdk = await createWorkerdSDKProvider(config)

        expect(sdk.$.ns).toBe('my-app')
        expect(sdk.$.env).toBeDefined()
        expect(sdk.$.user).toBeDefined()
        expect(sdk.$.request).toBeDefined()
      })

      it('should support database operations via $ proxy', async () => {
        const config: WorkerdSDKConfig = {
          context: 'local',
          ns: 'test',
        }

        sdk = await createWorkerdSDKProvider(config)

        // Database operations should work through $ proxy
        const created = await sdk.$.db.Posts.create('test-id', { title: 'Test' })
        expect(created).toBeDefined()

        const retrieved = await sdk.$.db.Posts.get('test-id')
        expect(retrieved).toBeDefined()
      })

      it('should use in-memory database for local context by default', async () => {
        const config: WorkerdSDKConfig = {
          context: 'local',
          ns: 'test',
        }

        sdk = await createWorkerdSDKProvider(config)

        // Local context uses memory-based storage
        const item = await sdk.db.create({ type: 'TestItem', data: { name: 'test' } })
        expect(item).toBeDefined()
        expect(item.type).toBe('TestItem')
      })

      it('should provide AI functions in local context (stub mode)', async () => {
        const config: WorkerdSDKConfig = {
          context: 'local',
          ns: 'test',
        }

        sdk = await createWorkerdSDKProvider(config)

        // Local AI should return stub responses
        const response = await sdk.ai.generate('test prompt')
        expect(response).toContain('stub')

        const embedding = await sdk.ai.embed('test text')
        expect(Array.isArray(embedding)).toBe(true)
        expect(embedding.length).toBeGreaterThan(0)
      })
    })

    describe('Remote Context (Production)', () => {
      it('should create SDK provider for remote workerd execution', async () => {
        const mockEnv = {
          LOADER: {
            get: vi.fn().mockReturnValue({
              getEntrypoint: vi.fn().mockReturnValue({
                fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: 'ok' }))),
              }),
            }),
          },
        } as unknown as WorkerEnv

        const config: WorkerdSDKConfig = {
          context: 'remote',
          ns: 'production-app',
          env: mockEnv,
        }

        const sdk = await createWorkerdSDKProvider(config)

        expect(sdk).toBeDefined()
        expect(sdk.db).toBeDefined()
        expect(sdk.ai).toBeDefined()
      })

      it('should proxy database calls through Worker Loader', async () => {
        const mockFetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ result: { id: '123', title: 'Test' } }))
        )
        const mockEnv = {
          LOADER: {
            get: vi.fn().mockReturnValue({
              getEntrypoint: vi.fn().mockReturnValue({
                fetch: mockFetch,
              }),
            }),
          },
        } as unknown as WorkerEnv

        const config: WorkerdSDKConfig = {
          context: 'remote',
          ns: 'production',
          env: mockEnv,
        }

        const sdk = await createWorkerdSDKProvider(config)
        await sdk.$.db.Posts.get('123')

        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('Database Binding Injection', () => {
    it('should inject D1 database binding', () => {
      const mockD1 = {
        prepare: vi.fn(),
        exec: vi.fn(),
        batch: vi.fn(),
      }

      const bindings = injectDatabaseBindings({
        D1: mockD1,
      })

      expect(bindings.D1).toBe(mockD1)
    })

    it('should inject KV namespace binding', () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      }

      const bindings = injectDatabaseBindings({
        KV: mockKV,
      })

      expect(bindings.KV).toBe(mockKV)
    })

    it('should inject R2 bucket binding', () => {
      const mockR2 = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      }

      const bindings = injectDatabaseBindings({
        R2: mockR2,
      })

      expect(bindings.R2).toBe(mockR2)
    })

    it('should combine multiple bindings', () => {
      const mockD1 = { prepare: vi.fn() }
      const mockKV = { get: vi.fn() }
      const mockR2 = { put: vi.fn() }

      const bindings = injectDatabaseBindings({
        D1: mockD1,
        KV: mockKV,
        R2: mockR2,
      })

      expect(bindings.D1).toBe(mockD1)
      expect(bindings.KV).toBe(mockKV)
      expect(bindings.R2).toBe(mockR2)
    })
  })

  describe('Workerd Context Creation', () => {
    it('should create context with request details', () => {
      const mockRequest = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const ctx = createWorkerdContext({
        ns: 'my-app',
        request: mockRequest,
      })

      expect(ctx.ns).toBe('my-app')
      expect(ctx.request.method).toBe('POST')
      expect(ctx.request.url).toBe('https://example.com/api/test')
    })

    it('should create context with user information', () => {
      const ctx = createWorkerdContext({
        ns: 'my-app',
        user: { id: 'user-123', name: 'Test User', role: 'admin' },
      })

      expect(ctx.user.id).toBe('user-123')
      expect(ctx.user.name).toBe('Test User')
      expect(ctx.user.role).toBe('admin')
    })

    it('should include environment variables', () => {
      const ctx = createWorkerdContext({
        ns: 'my-app',
        env: {
          API_KEY: 'secret-key',
          DEBUG: 'true',
        },
      })

      expect(ctx.env.API_KEY).toBe('secret-key')
      expect(ctx.env.DEBUG).toBe('true')
    })

    it('should support scope function for temporary context changes', async () => {
      const ctx = createWorkerdContext({
        ns: 'app',
        user: { id: 'user-1' },
      })

      let capturedNs: string | undefined
      let capturedUser: { id: string } | undefined

      await ctx.scope({ ns: 'scoped-app', user: { id: 'scoped-user' } }, async () => {
        capturedNs = ctx.ns
        capturedUser = ctx.user
      })

      // Inside scope, values should be overridden
      expect(capturedNs).toBe('scoped-app')
      expect(capturedUser?.id).toBe('scoped-user')

      // After scope, original values should be restored
      expect(ctx.ns).toBe('app')
      expect(ctx.user.id).toBe('user-1')
    })
  })

  describe('SDK Code Generation for Workerd', () => {
    it('should generate workerd-compatible SDK injection code', async () => {
      const { generateWorkerdSDKCode } = await import('../src/sdk-workerd.js')

      const code = generateWorkerdSDKCode({
        ns: 'my-app',
        context: 'local',
      })

      // Should use workerd-compatible patterns (no process.env)
      expect(code).not.toContain('process.env')
      expect(code).toContain('ns')
      expect(code).toContain('$')
      expect(code).toContain('db')
      expect(code).toContain('ai')
    })

    it('should generate remote SDK code that uses Worker Loader', async () => {
      const { generateWorkerdSDKCode } = await import('../src/sdk-workerd.js')

      const code = generateWorkerdSDKCode({
        ns: 'production',
        context: 'remote',
      })

      // Should reference Worker Loader pattern
      expect(code).toContain('LOADER')
      expect(code).not.toContain('process.env')
    })
  })

  describe('Integration with @mdxe/workers', () => {
    it('should work with evaluate from @mdxe/workers', async () => {
      // This test verifies that the SDK can be used within @mdxe/workers evaluate
      const config: WorkerdSDKConfig = {
        context: 'local',
        ns: 'test',
      }

      const sdk = await createWorkerdSDKProvider(config)

      // SDK should provide the globals that MDX documents expect
      expect(typeof sdk.$).toBe('object')
      expect(typeof sdk.$.db).toBe('object')
      expect(typeof sdk.$.ai).toBe('object')
      expect(typeof sdk.$.on).toBe('object')
      expect(typeof sdk.$.every).toBe('object')
      expect(typeof sdk.$.send).toBe('function')

      await sdk.dispose()
    })

    it('should provide SDK globals for MDX evaluation', async () => {
      const config: WorkerdSDKConfig = {
        context: 'local',
        ns: 'mdx-test',
      }

      const sdk = await createWorkerdSDKProvider(config)
      const globals = sdk.getGlobals()

      // These are the globals that should be available in MDX documents
      expect(globals.$).toBeDefined()
      expect(globals.db).toBeDefined()
      expect(globals.ai).toBeDefined()
      expect(globals.on).toBeDefined()
      expect(globals.every).toBeDefined()
      expect(globals.send).toBeDefined()

      await sdk.dispose()
    })
  })
})

describe('Backward Compatibility', () => {
  it('should support legacy SDKProviderConfig format', async () => {
    // The new workerd SDK should still accept the old config format
    const legacyConfig = {
      context: 'local' as const,
      db: 'memory' as const,
      aiMode: 'local' as const,
      ns: 'legacy-app',
    }

    // This should not throw, but adapt the legacy config
    const { createWorkerdSDKProvider } = await import('../src/sdk-workerd.js')
    const sdk = await createWorkerdSDKProvider(legacyConfig as any)

    expect(sdk).toBeDefined()
    expect(sdk.$.ns).toBe('legacy-app')

    await sdk.dispose()
  })
})
