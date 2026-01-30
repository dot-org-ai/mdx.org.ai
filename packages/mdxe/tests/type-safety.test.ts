/**
 * Type safety tests for SDK provider
 *
 * These tests verify that there are no `any` types in the SDK provider exports
 * and that all types are properly defined with proper type inference.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import type {
  SDKProviderConfig,
  SDKProvider,
  AIProvider,
  WorkflowProvider,
  ContextProvider,
} from '../src/sdk-provider.js'
import { createSDKProvider, generateSDKInjectionCode } from '../src/sdk-provider.js'

/**
 * Stub DB client type tests
 *
 * Verifies that the stub DB client is properly typed (no `any`)
 */
describe('SDK Provider Type Safety', () => {
  describe('StubDBClient type', () => {
    it('should have properly typed db client', async () => {
      // Create a provider
      const config: SDKProviderConfig = {
        context: 'local',
        db: 'memory',
        aiMode: 'local',
        ns: 'test',
      }

      const provider = await createSDKProvider(config)

      // The db client should be defined
      expect(provider.db).toBeDefined()

      // The provider's close method should be a function
      expect(typeof provider.close).toBe('function')

      // Cleanup
      await provider.close()
    })

    it('should have db.ns as string or undefined type (not any)', async () => {
      const config: SDKProviderConfig = {
        context: 'local',
        db: 'memory',
        aiMode: 'local',
        ns: 'test-ns',
      }

      const provider = await createSDKProvider(config)

      // Type-level check: ns should be string or undefined, not any
      // This test verifies at compile-time that the type is correct
      expectTypeOf(provider.db.ns).toMatchTypeOf<string | undefined>()

      await provider.close()
    })

    it('should have db.close as async function type (not any)', async () => {
      const config: SDKProviderConfig = {
        context: 'local',
        db: 'memory',
        aiMode: 'local',
      }

      const provider = await createSDKProvider(config)

      // Type-level check: close should be optional function, not any
      expectTypeOf(provider.db.close).toMatchTypeOf<(() => Promise<void>) | undefined>()

      await provider.close()
    })
  })

  describe('SDKProvider interface', () => {
    it('should have all required fields with proper types', () => {
      // Type-level test: verify SDKProvider has correct structure
      expectTypeOf<SDKProvider>().toHaveProperty('db')
      expectTypeOf<SDKProvider>().toHaveProperty('ai')
      expectTypeOf<SDKProvider>().toHaveProperty('workflows')
      expectTypeOf<SDKProvider>().toHaveProperty('context')
      expectTypeOf<SDKProvider>().toHaveProperty('close')
    })

    it('should have AIProvider with proper method types', () => {
      // AIProvider should have generate, embed, chat methods
      expectTypeOf<AIProvider>().toHaveProperty('generate')
      expectTypeOf<AIProvider>().toHaveProperty('embed')
      expectTypeOf<AIProvider>().toHaveProperty('chat')

      // Verify return types
      type GenerateReturn = ReturnType<AIProvider['generate']>
      expectTypeOf<GenerateReturn>().toEqualTypeOf<Promise<string>>()

      type EmbedReturn = ReturnType<AIProvider['embed']>
      expectTypeOf<EmbedReturn>().toEqualTypeOf<Promise<number[]>>()

      type ChatReturn = ReturnType<AIProvider['chat']>
      expectTypeOf<ChatReturn>().toEqualTypeOf<Promise<string>>()
    })

    it('should have WorkflowProvider with proper types', () => {
      // WorkflowProvider should have on, every, send
      expectTypeOf<WorkflowProvider>().toHaveProperty('on')
      expectTypeOf<WorkflowProvider>().toHaveProperty('every')
      expectTypeOf<WorkflowProvider>().toHaveProperty('send')

      // send should return Promise<void>
      type SendReturn = ReturnType<WorkflowProvider['send']>
      expectTypeOf<SendReturn>().toEqualTypeOf<Promise<void>>()
    })

    it('should have ContextProvider with proper types', () => {
      // ContextProvider should have ns, user, request, env, config
      expectTypeOf<ContextProvider>().toHaveProperty('ns')
      expectTypeOf<ContextProvider>().toHaveProperty('user')
      expectTypeOf<ContextProvider>().toHaveProperty('request')
      expectTypeOf<ContextProvider>().toHaveProperty('env')
      expectTypeOf<ContextProvider>().toHaveProperty('config')

      // ns should be string
      type NsType = ContextProvider['ns']
      expectTypeOf<NsType>().toEqualTypeOf<string>()

      // env should be Record<string, string>
      type EnvType = ContextProvider['env']
      expectTypeOf<EnvType>().toEqualTypeOf<Record<string, string>>()
    })
  })

  describe('SDKProviderConfig interface', () => {
    it('should have proper context type', () => {
      type ContextType = SDKProviderConfig['context']
      expectTypeOf<ContextType>().toEqualTypeOf<'local' | 'remote'>()
    })

    it('should have proper db type', () => {
      type DbType = SDKProviderConfig['db']
      expectTypeOf<DbType>().toEqualTypeOf<'memory' | 'fs' | 'sqlite' | 'postgres' | 'clickhouse' | 'mongo'>()
    })

    it('should have proper aiMode type', () => {
      type AiModeType = SDKProviderConfig['aiMode']
      expectTypeOf<AiModeType>().toEqualTypeOf<'local' | 'remote'>()
    })

    it('should have optional string fields', () => {
      type NsType = SDKProviderConfig['ns']
      type DbPathType = SDKProviderConfig['dbPath']
      type RpcUrlType = SDKProviderConfig['rpcUrl']
      type TokenType = SDKProviderConfig['token']

      expectTypeOf<NsType>().toEqualTypeOf<string | undefined>()
      expectTypeOf<DbPathType>().toEqualTypeOf<string | undefined>()
      expectTypeOf<RpcUrlType>().toEqualTypeOf<string | undefined>()
      expectTypeOf<TokenType>().toEqualTypeOf<string | undefined>()
    })
  })

  describe('generateSDKInjectionCode', () => {
    it('should return string type', () => {
      const config: SDKProviderConfig = {
        context: 'local',
        db: 'memory',
        aiMode: 'local',
      }

      const code = generateSDKInjectionCode(config)
      expectTypeOf(code).toEqualTypeOf<string>()
      expect(typeof code).toBe('string')
    })
  })
})

/**
 * DocsDetectionResult type tests
 *
 * Verifies that the detection result type is properly imported and used in cli.ts
 */
describe('CLI Type Safety', () => {
  describe('DocsDetectionResult', () => {
    it('should be properly typed when imported from @mdxe/fumadocs', async () => {
      // Import the type from fumadocs
      const { detectDocsType } = await import('@mdxe/fumadocs')
      const { DocsDetectionResult } = await import('@mdxe/fumadocs') as { DocsDetectionResult: unknown }

      // The detectDocsType function should exist and return proper type
      expect(typeof detectDocsType).toBe('function')

      // Call with test directory and verify result structure
      const result = detectDocsType(process.cwd())

      // Result should have proper structure (no `any`)
      expect(typeof result.isDocsType).toBe('boolean')
      expect(result.indexPath === null || typeof result.indexPath === 'string').toBe(true)
      expect(result.readmePath === null || typeof result.readmePath === 'string').toBe(true)
      expect(typeof result.contentDir).toBe('string')
      expect(typeof result.projectName).toBe('string')
      expect(typeof result.config).toBe('object')
    })

    it('should have DocsConfig with proper types', async () => {
      const { detectDocsType } = await import('@mdxe/fumadocs')
      const result = detectDocsType(process.cwd())

      // Config should be an object with optional string fields
      const config = result.config
      expect(config === undefined || config.title === undefined || typeof config.title === 'string').toBe(true)
      expect(config === undefined || config.description === undefined || typeof config.description === 'string').toBe(true)
      expect(config === undefined || config.logo === undefined || typeof config.logo === 'string').toBe(true)
      expect(config === undefined || config.githubUrl === undefined || typeof config.githubUrl === 'string').toBe(true)
      expect(config === undefined || config.baseUrl === undefined || typeof config.baseUrl === 'string').toBe(true)
      expect(config === undefined || config.domain === undefined || typeof config.domain === 'string').toBe(true)
    })
  })
})
