/**
 * SDK Context Tests - process.env usage in Worker context
 *
 * These tests verify that:
 * 1. process.env is NOT accessed when context is 'remote' (Worker)
 * 2. process.env IS accessible when context is 'local'
 * 3. Worker context detection works correctly
 * 4. Environment abstraction works for both contexts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('SDK Context - process.env handling', () => {
  // Store original process.env
  const originalEnv = process.env

  beforeEach(() => {
    // Reset process.env to a clean state for each test
    vi.stubGlobal('process', { ...process, env: { ...originalEnv } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('Worker Context Detection', () => {
    it('should detect Worker context when process is undefined', async () => {
      const { isWorkerContext } = await import('../src/env-utils.js')

      // Simulate Worker environment where process is undefined
      const savedProcess = globalThis.process
      // @ts-expect-error - Testing undefined process
      globalThis.process = undefined

      expect(isWorkerContext()).toBe(true)

      globalThis.process = savedProcess
    })

    it('should detect local context when process.env exists', async () => {
      const { isWorkerContext } = await import('../src/env-utils.js')

      // In Node.js, process.env should exist
      expect(isWorkerContext()).toBe(false)
    })

    it('should detect Worker context when process.env throws', async () => {
      const { isWorkerContext } = await import('../src/env-utils.js')

      // Simulate Worker environment where accessing process.env throws
      const savedProcess = globalThis.process
      globalThis.process = new Proxy(
        {},
        {
          get(target, prop) {
            if (prop === 'env') {
              throw new Error('process.env is not available in Workers')
            }
            return (savedProcess as Record<string, unknown>)[prop as string]
          },
        }
      ) as typeof process

      expect(isWorkerContext()).toBe(true)

      globalThis.process = savedProcess
    })
  })

  describe('getEnvironment function', () => {
    it('should return process.env values when context is local', async () => {
      const { getEnvironment } = await import('../src/env-utils.js')

      // Set a test environment variable
      process.env.TEST_VAR = 'test-value'
      process.env.DO_TOKEN = 'local-token'

      const env = getEnvironment('local')

      expect(env.TEST_VAR).toBe('test-value')
      expect(env.DO_TOKEN).toBe('local-token')
    })

    it('should return empty object when context is remote and no env bindings provided', async () => {
      const { getEnvironment } = await import('../src/env-utils.js')

      const env = getEnvironment('remote')

      expect(env).toEqual({})
    })

    it('should return env bindings when context is remote and bindings are provided', async () => {
      const { getEnvironment } = await import('../src/env-utils.js')

      const workerEnv = {
        API_KEY: 'worker-api-key',
        DEBUG: 'true',
      }

      const env = getEnvironment('remote', workerEnv)

      expect(env.API_KEY).toBe('worker-api-key')
      expect(env.DEBUG).toBe('true')
    })

    it('should NOT access process.env when context is remote', async () => {
      const { getEnvironment } = await import('../src/env-utils.js')

      // Set a value that should NOT be accessible in remote context
      process.env.SECRET_KEY = 'should-not-be-accessible'

      const env = getEnvironment('remote', { OTHER_KEY: 'other-value' })

      expect(env.SECRET_KEY).toBeUndefined()
      expect(env.OTHER_KEY).toBe('other-value')
    })

    it('should handle missing env gracefully in remote context', async () => {
      const { getEnvironment } = await import('../src/env-utils.js')

      // Should not throw when env bindings are undefined
      expect(() => getEnvironment('remote', undefined)).not.toThrow()
      expect(getEnvironment('remote', undefined)).toEqual({})
    })
  })

  describe('SDK Provider - process.env usage', () => {
    it('should use process.env for context.env in local context', async () => {
      const { createSDKProvider } = await import('../src/sdk-provider.js')

      process.env.LOCAL_TEST = 'local-value'

      const sdk = await createSDKProvider({
        context: 'local',
        db: 'memory',
        aiMode: 'local',
        ns: 'test',
      })

      expect(sdk.context.env.LOCAL_TEST).toBe('local-value')
      await sdk.close()
    })

    it('should NOT access process.env in remote context', async () => {
      const { createSDKProvider } = await import('../src/sdk-provider.js')

      // Set a value that should NOT appear in remote context
      process.env.SHOULD_NOT_APPEAR = 'secret'

      const sdk = await createSDKProvider({
        context: 'remote',
        db: 'memory',
        aiMode: 'remote',
        rpcUrl: 'https://rpc.example.com',
        token: 'test-token',
        ns: 'test',
      })

      // Remote context should have empty env (not process.env)
      expect(sdk.context.env.SHOULD_NOT_APPEAR).toBeUndefined()
      expect(sdk.context.env).toEqual({})
      await sdk.close()
    })

    it('should use provided token instead of process.env.DO_TOKEN in remote context', async () => {
      const { createSDKProvider } = await import('../src/sdk-provider.js')

      // This should NOT be used in remote context with explicit token
      process.env.DO_TOKEN = 'env-token'

      const sdk = await createSDKProvider({
        context: 'remote',
        db: 'memory',
        aiMode: 'remote',
        rpcUrl: 'https://rpc.example.com',
        token: 'explicit-token',
        ns: 'test',
      })

      // The SDK should use the explicit token, not process.env.DO_TOKEN
      // We verify this indirectly by checking context.env doesn't have DO_TOKEN
      expect(sdk.context.env.DO_TOKEN).toBeUndefined()
      await sdk.close()
    })

    it('should handle remote context when process.env is not available', async () => {
      // This simulates Worker environment
      const savedProcess = globalThis.process
      // @ts-expect-error - Testing without process
      globalThis.process = undefined

      // Re-import to get fresh module without process
      vi.resetModules()

      try {
        const { createSDKProvider } = await import('../src/sdk-provider.js')

        // Should not throw even when process is undefined
        const sdk = await createSDKProvider({
          context: 'remote',
          db: 'memory',
          aiMode: 'remote',
          rpcUrl: 'https://rpc.example.com',
          token: 'worker-token',
          ns: 'test',
        })

        expect(sdk).toBeDefined()
        expect(sdk.context.env).toEqual({})
        await sdk.close()
      } finally {
        globalThis.process = savedProcess
        vi.resetModules()
      }
    })
  })

  describe('SDK Provider - AI provider token handling', () => {
    it('should use explicit token for remote AI mode', async () => {
      const { createSDKProvider } = await import('../src/sdk-provider.js')

      // This should NOT be used when explicit token is provided
      process.env.DO_TOKEN = 'env-token'

      const sdk = await createSDKProvider({
        context: 'local',
        db: 'memory',
        aiMode: 'remote',
        rpcUrl: 'https://rpc.example.com',
        token: 'explicit-token',
        ns: 'test',
      })

      expect(sdk).toBeDefined()
      await sdk.close()
    })

    it('should fall back to process.env.DO_TOKEN in local context with remote AI when no explicit token', async () => {
      const { createSDKProvider } = await import('../src/sdk-provider.js')

      process.env.DO_TOKEN = 'env-token'

      const sdk = await createSDKProvider({
        context: 'local',
        db: 'memory',
        aiMode: 'remote',
        rpcUrl: 'https://rpc.example.com',
        // No explicit token provided
        ns: 'test',
      })

      // In local context, process.env.DO_TOKEN should be accessible
      expect(sdk.context.env.DO_TOKEN).toBe('env-token')
      await sdk.close()
    })

    it('should NOT fall back to process.env.DO_TOKEN in remote context', async () => {
      const { createSDKProvider } = await import('../src/sdk-provider.js')

      process.env.DO_TOKEN = 'env-token-should-not-be-used'

      const sdk = await createSDKProvider({
        context: 'remote',
        db: 'memory',
        aiMode: 'remote',
        rpcUrl: 'https://rpc.example.com',
        // No explicit token - should NOT fall back to process.env
        ns: 'test',
      })

      // Remote context should not have access to process.env.DO_TOKEN
      expect(sdk.context.env.DO_TOKEN).toBeUndefined()
      await sdk.close()
    })
  })

  describe('Environment abstraction with WorkerEnv', () => {
    it('should accept WorkerEnv bindings in remote context', async () => {
      const { getEnvironment } = await import('../src/env-utils.js')

      // Simulate Cloudflare Worker environment bindings
      const workerEnv = {
        API_KEY: 'cf-api-key',
        DATABASE_URL: 'postgres://...',
        // Cloudflare-specific bindings would be objects, not strings
        // but for env vars, they're typically strings
      }

      const env = getEnvironment('remote', workerEnv)

      expect(env.API_KEY).toBe('cf-api-key')
      expect(env.DATABASE_URL).toBe('postgres://...')
    })

    it('should filter out non-string values from WorkerEnv', async () => {
      const { getEnvironment } = await import('../src/env-utils.js')

      const workerEnv = {
        STRING_VAR: 'string-value',
        NUMBER_VAR: 123,
        OBJECT_VAR: { nested: true },
        NULL_VAR: null,
        UNDEFINED_VAR: undefined,
        BOOL_VAR: true,
      }

      const env = getEnvironment('remote', workerEnv)

      // Only string values should be included
      expect(env.STRING_VAR).toBe('string-value')
      expect(env.NUMBER_VAR).toBeUndefined()
      expect(env.OBJECT_VAR).toBeUndefined()
      expect(env.NULL_VAR).toBeUndefined()
      expect(env.UNDEFINED_VAR).toBeUndefined()
      expect(env.BOOL_VAR).toBeUndefined()
    })
  })

  describe('Type safety', () => {
    it('should have proper types for getEnvironment', async () => {
      const { getEnvironment } = await import('../src/env-utils.js')

      // Type should be Record<string, string | undefined>
      const env: Record<string, string | undefined> = getEnvironment('local')
      expect(typeof env).toBe('object')
    })

    it('should have proper types for isWorkerContext', async () => {
      const { isWorkerContext } = await import('../src/env-utils.js')

      // Should return boolean
      const result: boolean = isWorkerContext()
      expect(typeof result).toBe('boolean')
    })
  })
})
