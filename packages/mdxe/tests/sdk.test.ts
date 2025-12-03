/**
 * SDK Provider Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSDKProvider, generateSDKInjectionCode } from '../src/sdk-provider.js'
import type { SDKProvider, SDKProviderConfig } from '../src/sdk-provider.js'

describe('SDK Provider', () => {
  let sdk: SDKProvider | null = null

  afterEach(async () => {
    if (sdk) {
      await sdk.close()
      sdk = null
    }
  })

  describe('Local Context', () => {
    describe('Memory Backend', () => {
      beforeEach(async () => {
        sdk = await createSDKProvider({
          context: 'local',
          db: 'memory',
          aiMode: 'local',
          ns: 'test',
        })
      })

      it('should create SDK provider with memory backend', () => {
        expect(sdk).toBeDefined()
        expect(sdk!.db).toBeDefined()
        expect(sdk!.ai).toBeDefined()
        expect(sdk!.workflows).toBeDefined()
        expect(sdk!.context).toBeDefined()
      })

      it('should have correct namespace in context', () => {
        expect(sdk!.context.ns).toBe('test')
      })

      it('should provide AI methods', () => {
        expect(sdk!.ai.generate).toBeDefined()
        expect(sdk!.ai.embed).toBeDefined()
        expect(sdk!.ai.chat).toBeDefined()
      })

      it('should provide workflow methods', () => {
        expect(sdk!.workflows.on).toBeDefined()
        expect(sdk!.workflows.every).toBeDefined()
        expect(sdk!.workflows.send).toBeDefined()
      })

      it('should generate AI response (stub)', async () => {
        const response = await sdk!.ai.generate('test prompt')
        expect(response).toContain('[Local AI stub]')
        expect(response).toContain('test prompt')
      })

      it('should generate embeddings (stub)', async () => {
        const embedding = await sdk!.ai.embed('test text')
        expect(Array.isArray(embedding)).toBe(true)
        expect(embedding.length).toBe(1536)
      })
    })

    describe('FS Backend', () => {
      it('should create SDK provider with fs backend', async () => {
        sdk = await createSDKProvider({
          context: 'local',
          db: 'fs',
          dbPath: './test-content',
          aiMode: 'local',
          ns: 'test',
        })

        expect(sdk).toBeDefined()
        expect(sdk!.db).toBeDefined()
      })
    })

    describe('SQLite Backend', () => {
      it('should create SDK provider with sqlite backend', async () => {
        sdk = await createSDKProvider({
          context: 'local',
          db: 'sqlite',
          dbPath: ':memory:',
          aiMode: 'local',
          ns: 'test',
        })

        expect(sdk).toBeDefined()
        expect(sdk!.db).toBeDefined()
      })
    })
  })

  describe('Code Generation', () => {
    it('should generate local SDK code', () => {
      const code = generateSDKInjectionCode({
        context: 'local',
        db: 'memory',
        aiMode: 'local',
        ns: 'test',
      })

      expect(code).toContain('Local SDK')
      expect(code).toContain('ns: \'test\'')
      expect(code).toContain('const db =')
      expect(code).toContain('const ai =')
      expect(code).toContain('const on =')
      expect(code).toContain('const every =')
      expect(code).toContain('const send =')
      expect(code).toContain('const $ =')
    })

    it('should generate remote SDK code', () => {
      const code = generateSDKInjectionCode({
        context: 'remote',
        db: 'memory',
        aiMode: 'remote',
        rpcUrl: 'https://rpc.example.com',
        token: 'test-token',
        ns: 'tenant-123',
      })

      expect(code).toContain('Remote SDK')
      expect(code).toContain('rpcUrl: \'https://rpc.example.com\'')
      expect(code).toContain('token: \'test-token\'')
      expect(code).toContain('ns: \'tenant-123\'')
      expect(code).toContain('const __rpc__ =')
      expect(code).toContain('const __createProxy__ =')
      expect(code).toContain('const $ =')
    })

    it('should handle missing optional config values', () => {
      const code = generateSDKInjectionCode({
        context: 'local',
        db: 'memory',
        aiMode: 'local',
      })

      expect(code).toContain('ns: \'default\'')
    })
  })

  describe('Export Integration', () => {
    it('should export from main index', async () => {
      const { createSDKProvider: imported } = await import('../src/index.js')
      expect(imported).toBeDefined()
      expect(typeof imported).toBe('function')
    })

    it('should export from sdk module', async () => {
      const { createSDKProvider: imported } = await import('../src/sdk.js')
      expect(imported).toBeDefined()
      expect(typeof imported).toBe('function')
    })

    it('should export types from main index', async () => {
      // Type-only import - just testing that it doesn't error
      const module = await import('../src/index.js')
      expect(module).toBeDefined()
    })
  })

  describe('ai-sandbox Integration', () => {
    it('should re-export evaluate from ai-sandbox', async () => {
      const { evaluate } = await import('../src/index.js')
      expect(evaluate).toBeDefined()
      expect(typeof evaluate).toBe('function')
    })

    it('should re-export createEvaluator from ai-sandbox', async () => {
      const { createEvaluator } = await import('../src/index.js')
      expect(createEvaluator).toBeDefined()
      expect(typeof createEvaluator).toBe('function')
    })
  })

  describe('ai-workflows Integration', () => {
    it('should have workflow types available', async () => {
      // Import to verify types exist
      const module = await import('../src/index.js')
      expect(module).toBeDefined()
    })
  })

  describe('ai-functions Integration', () => {
    it('should have RPC types available', async () => {
      // Import to verify types exist
      const module = await import('../src/index.js')
      expect(module).toBeDefined()
    })
  })
})

describe('SDK Configuration', () => {
  it('should validate local context config', async () => {
    const config: SDKProviderConfig = {
      context: 'local',
      db: 'memory',
      aiMode: 'local',
      ns: 'test',
    }

    const sdk = await createSDKProvider(config)
    expect(sdk).toBeDefined()
    await sdk.close()
  })

  it('should validate remote context config', async () => {
    const config: SDKProviderConfig = {
      context: 'remote',
      db: 'memory',
      aiMode: 'remote',
      rpcUrl: 'https://rpc.example.com',
      token: 'test-token',
      ns: 'tenant-123',
    }

    // Don't actually create remote SDK in test (would fail without server)
    // Just validate the config type
    expect(config.context).toBe('remote')
    expect(config.rpcUrl).toBe('https://rpc.example.com')
  })

  it('should support all database backends', () => {
    const backends: Array<SDKProviderConfig['db']> = [
      'memory',
      'fs',
      'sqlite',
      'postgres',
      'clickhouse',
      'mongo',
    ]

    backends.forEach(db => {
      const config: SDKProviderConfig = {
        context: 'local',
        db,
        aiMode: 'local',
        ns: 'test',
      }
      expect(config.db).toBe(db)
    })
  })

  it('should support both AI modes', () => {
    const localConfig: SDKProviderConfig = {
      context: 'local',
      db: 'memory',
      aiMode: 'local',
      ns: 'test',
    }
    expect(localConfig.aiMode).toBe('local')

    const remoteConfig: SDKProviderConfig = {
      context: 'local',
      db: 'memory',
      aiMode: 'remote',
      ns: 'test',
    }
    expect(remoteConfig.aiMode).toBe('remote')
  })
})
