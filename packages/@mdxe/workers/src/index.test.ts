import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  compileToModule,
  createWorkerConfig,
  generateModuleId,
  getExports,
  clearCache,
  isCached,
  getCacheStats,
  precompile,
  evaluate,
  createEvaluator,
  createHandler,
  type WorkerEnv,
  type WorkerLoader,
  type WorkerInstance,
  type WorkerEntrypoint,
  type EvaluateOptions,
  type EvaluateResult,
} from './index.js'

describe('@mdxe/workers', () => {
  // ============================================================================
  // Test Fixtures
  // ============================================================================

  const fixtures = {
    simple: `# Hello World`,

    withExports: `---
title: Test
---

export function greet(name) {
  return \`Hello, \${name}!\`
}

export const PI = 3.14159`,

    calculator: `export function add(a, b) { return a + b }
export function subtract(a, b) { return a - b }
export const multiply = (a, b) => a * b`,

    asyncFunctions: `export async function fetchData() {
  return { success: true }
}

export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}`,

    withFrontmatter: `---
title: Document
author: Test
version: 1.0.0
tags:
  - test
  - mdx
---

# Content`,

    withError: `export function throwError() {
  throw new Error('Test error')
}`,

    complex: `---
title: Complex Module
metadata:
  created: 2024-01-01
  author:
    name: Test
    email: test@example.com
---

import { Component } from './component'

export const config = {
  theme: 'dark',
  features: ['a', 'b', 'c']
}

export function process(data) {
  return { processed: true, data }
}

export class Handler {
  handle(request) {
    return { handled: true }
  }
}

# Complex Document

<Component />`,
  }

  // ============================================================================
  // Mock Setup
  // ============================================================================

  /**
   * Create a mock WorkerEnv with LOADER binding
   */
  function createMockEnv(
    responses: Record<string, unknown> = {}
  ): WorkerEnv {
    const mockFetch = vi.fn(async (request: Request | string) => {
      const url = typeof request === 'string' ? request : request.url
      const path = new URL(url).pathname

      // Health endpoint
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Meta endpoint
      if (path === '/meta') {
        return new Response(JSON.stringify({
          exports: responses.exports || ['default'],
          hasDefault: responses.hasDefault ?? true,
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Call endpoint
      if (path.startsWith('/call/')) {
        const fnName = path.slice(6)

        if (responses.error?.[fnName]) {
          return new Response(JSON.stringify({
            error: responses.error[fnName],
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const result = responses.results?.[fnName]
        return new Response(JSON.stringify({ result }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    })

    const mockEntrypoint: WorkerEntrypoint = {
      fetch: mockFetch,
    }

    const mockInstance: WorkerInstance = {
      getEntrypoint: vi.fn(() => mockEntrypoint),
    }

    const mockLoader: WorkerLoader = {
      get: vi.fn((id, callback) => {
        // Simulate calling the callback to get config
        callback()
        return mockInstance
      }),
    }

    return {
      LOADER: mockLoader,
    }
  }

  // ============================================================================
  // Re-exports from @mdxe/isolate
  // ============================================================================

  describe('re-exports from @mdxe/isolate', () => {
    it('exports compileToModule', () => {
      expect(typeof compileToModule).toBe('function')
    })

    it('exports createWorkerConfig', () => {
      expect(typeof createWorkerConfig).toBe('function')
    })

    it('exports generateModuleId', () => {
      expect(typeof generateModuleId).toBe('function')
    })

    it('exports getExports', () => {
      expect(typeof getExports).toBe('function')
    })

    it('compileToModule works correctly', async () => {
      const module = await compileToModule(fixtures.simple)

      expect(module.mainModule).toBe('entry.js')
      expect(module.modules).toHaveProperty('entry.js')
      expect(module.modules).toHaveProperty('mdx.js')
    })

    it('generateModuleId is consistent', () => {
      const id1 = generateModuleId('test')
      const id2 = generateModuleId('test')

      expect(id1).toBe(id2)
    })
  })

  // ============================================================================
  // Cache Utilities
  // ============================================================================

  describe('cache utilities', () => {
    beforeEach(() => {
      clearCache()
    })

    afterEach(() => {
      clearCache()
    })

    describe('clearCache', () => {
      it('clears all cache when called without arguments', async () => {
        await precompile(fixtures.simple)
        await precompile(fixtures.withExports)

        expect(getCacheStats().size).toBe(2)

        clearCache()

        expect(getCacheStats().size).toBe(0)
      })

      it('clears specific module when ID provided', async () => {
        const id1 = await precompile(fixtures.simple)
        const id2 = await precompile(fixtures.withExports)

        expect(getCacheStats().size).toBe(2)

        clearCache(id1)

        expect(getCacheStats().size).toBe(1)
        expect(isCached(id1)).toBe(false)
        expect(isCached(id2)).toBe(true)
      })

      it('does nothing when clearing non-existent module', () => {
        clearCache('nonexistent')

        expect(getCacheStats().size).toBe(0)
      })

      it('can clear then add new modules', async () => {
        await precompile(fixtures.simple)
        clearCache()
        await precompile(fixtures.withExports)

        expect(getCacheStats().size).toBe(1)
      })
    })

    describe('isCached', () => {
      it('returns true for cached modules', async () => {
        const id = await precompile(fixtures.simple)

        expect(isCached(id)).toBe(true)
      })

      it('returns false for non-cached modules', () => {
        expect(isCached('nonexistent')).toBe(false)
      })

      it('returns false after module is cleared', async () => {
        const id = await precompile(fixtures.simple)
        clearCache(id)

        expect(isCached(id)).toBe(false)
      })

      it('handles empty string ID', () => {
        expect(isCached('')).toBe(false)
      })
    })

    describe('getCacheStats', () => {
      it('returns zero size for empty cache', () => {
        const stats = getCacheStats()

        expect(stats.size).toBe(0)
        expect(stats.moduleIds).toEqual([])
      })

      it('returns correct size and IDs', async () => {
        const id1 = await precompile(fixtures.simple)
        const id2 = await precompile(fixtures.withExports)

        const stats = getCacheStats()

        expect(stats.size).toBe(2)
        expect(stats.moduleIds).toContain(id1)
        expect(stats.moduleIds).toContain(id2)
      })

      it('updates after clearing', async () => {
        await precompile(fixtures.simple)
        await precompile(fixtures.withExports)

        clearCache()

        const stats = getCacheStats()

        expect(stats.size).toBe(0)
        expect(stats.moduleIds).toEqual([])
      })

      it('moduleIds array is a copy', async () => {
        const id = await precompile(fixtures.simple)
        const stats = getCacheStats()

        stats.moduleIds.push('fake-id')

        expect(getCacheStats().moduleIds).not.toContain('fake-id')
        expect(getCacheStats().moduleIds).toContain(id)
      })
    })
  })

  // ============================================================================
  // precompile
  // ============================================================================

  describe('precompile', () => {
    beforeEach(() => {
      clearCache()
    })

    afterEach(() => {
      clearCache()
    })

    it('compiles and caches module', async () => {
      const id = await precompile(fixtures.simple)

      expect(typeof id).toBe('string')
      expect(isCached(id)).toBe(true)
    })

    it('returns consistent ID for same content', async () => {
      const id1 = await precompile(fixtures.simple)
      clearCache()
      const id2 = await precompile(fixtures.simple)

      expect(id1).toBe(id2)
    })

    it('returns different IDs for different content', async () => {
      const id1 = await precompile(fixtures.simple)
      const id2 = await precompile(fixtures.withExports)

      expect(id1).not.toBe(id2)
    })

    it('accepts compile options', async () => {
      const id = await precompile(fixtures.simple, { bundleRuntime: true })

      expect(isCached(id)).toBe(true)
    })

    it('overwrites existing cache entry', async () => {
      const id1 = await precompile(fixtures.simple)
      const id2 = await precompile(fixtures.simple, { bundleRuntime: true })

      expect(id1).toBe(id2)
      expect(getCacheStats().size).toBe(1)
    })

    it('handles empty content', async () => {
      const id = await precompile('')

      expect(typeof id).toBe('string')
      expect(isCached(id)).toBe(true)
    })

    it('handles content with frontmatter', async () => {
      const id = await precompile(fixtures.withFrontmatter)

      expect(isCached(id)).toBe(true)
    })

    it('handles complex MDX', async () => {
      const id = await precompile(fixtures.complex)

      expect(isCached(id)).toBe(true)
    })
  })

  // ============================================================================
  // evaluate
  // ============================================================================

  describe('evaluate', () => {
    beforeEach(() => {
      clearCache()
    })

    afterEach(() => {
      clearCache()
    })

    describe('basic evaluation', () => {
      it('evaluates simple MDX', async () => {
        const env = createMockEnv({
          exports: ['default'],
          hasDefault: true,
        })

        const result = await evaluate(fixtures.simple, env)

        expect(result.moduleId).toBeDefined()
        expect(result.data).toEqual({})
        expect(typeof result.call).toBe('function')
        expect(typeof result.meta).toBe('function')
      })

      it('returns frontmatter data', async () => {
        const env = createMockEnv()

        const result = await evaluate(fixtures.withFrontmatter, env)

        expect(result.data.title).toBe('Document')
        expect(result.data.author).toBe('Test')
        expect(result.data.version).toBe('1.0.0')
        expect(result.data.tags).toEqual(['test', 'mdx'])
      })

      it('returns module ID', async () => {
        const env = createMockEnv()

        const result = await evaluate(fixtures.simple, env)

        expect(typeof result.moduleId).toBe('string')
        expect(result.moduleId.length).toBeGreaterThan(0)
      })

      it('uses LOADER.get with module ID', async () => {
        const env = createMockEnv()

        await evaluate(fixtures.simple, env)

        expect(env.LOADER.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Function)
        )
      })
    })

    describe('calling exported functions', () => {
      it('calls exported function', async () => {
        const env = createMockEnv({
          results: { greet: 'Hello, World!' },
        })

        const result = await evaluate(fixtures.withExports, env)
        const greeting = await result.call('greet', 'World')

        expect(greeting).toBe('Hello, World!')
      })

      it('calls function with multiple arguments', async () => {
        const env = createMockEnv({
          results: { add: 5 },
        })

        const result = await evaluate(fixtures.calculator, env)
        const sum = await result.call('add', 2, 3)

        expect(sum).toBe(5)
      })

      it('calls function with no arguments', async () => {
        const env = createMockEnv({
          results: { fetchData: { success: true } },
        })

        const result = await evaluate(fixtures.asyncFunctions, env)
        const data = await result.call('fetchData')

        expect(data).toEqual({ success: true })
      })

      it('throws on function not found', async () => {
        const env = createMockEnv({
          error: { nonexistent: 'Function not found: nonexistent' },
        })

        const result = await evaluate(fixtures.simple, env)

        await expect(result.call('nonexistent')).rejects.toThrow(
          'Function not found: nonexistent'
        )
      })

      it('throws on function error', async () => {
        const env = createMockEnv({
          error: { throwError: 'Test error' },
        })

        const result = await evaluate(fixtures.withError, env)

        await expect(result.call('throwError')).rejects.toThrow('Test error')
      })

      it('returns complex results', async () => {
        const complexResult = {
          processed: true,
          data: { nested: { value: 42 } },
        }
        const env = createMockEnv({
          results: { process: complexResult },
        })

        const result = await evaluate(fixtures.complex, env)
        const processed = await result.call('process', { input: 'test' })

        expect(processed).toEqual(complexResult)
      })
    })

    describe('metadata', () => {
      it('returns export list', async () => {
        const env = createMockEnv({
          exports: ['greet', 'PI', 'default'],
          hasDefault: true,
        })

        const result = await evaluate(fixtures.withExports, env)
        const meta = await result.meta()

        expect(meta.exports).toContain('greet')
        expect(meta.exports).toContain('PI')
        expect(meta.exports).toContain('default')
      })

      it('returns hasDefault flag', async () => {
        const env = createMockEnv({
          exports: ['named'],
          hasDefault: false,
        })

        const result = await evaluate(fixtures.calculator, env)
        const meta = await result.meta()

        expect(meta.hasDefault).toBe(false)
      })
    })

    describe('caching', () => {
      it('caches module by default', async () => {
        const env = createMockEnv()

        await evaluate(fixtures.simple, env)

        const moduleId = generateModuleId(fixtures.simple)
        expect(isCached(moduleId)).toBe(true)
      })

      it('does not cache when cache option is false', async () => {
        const env = createMockEnv()

        await evaluate(fixtures.simple, env, { cache: false })

        const moduleId = generateModuleId(fixtures.simple)
        expect(isCached(moduleId)).toBe(false)
      })

      it('uses cached module on subsequent calls', async () => {
        const env = createMockEnv()

        const result1 = await evaluate(fixtures.simple, env)
        const result2 = await evaluate(fixtures.simple, env)

        expect(result1.moduleId).toBe(result2.moduleId)
      })

      it('uses custom moduleId when provided', async () => {
        const env = createMockEnv()
        const customId = 'custom-module-id'

        const result = await evaluate(fixtures.simple, env, { moduleId: customId })

        expect(result.moduleId).toBe(customId)
      })
    })

    describe('options', () => {
      it('passes sandbox options to worker config', async () => {
        const env = createMockEnv()

        await evaluate(fixtures.simple, env, {
          sandbox: { blockNetwork: true },
        })

        // Verify LOADER.get was called (config callback would have sandbox options)
        expect(env.LOADER.get).toHaveBeenCalled()
      })

      it('passes compile options', async () => {
        const env = createMockEnv()

        await evaluate(fixtures.simple, env, {
          bundleRuntime: true,
        })

        expect(env.LOADER.get).toHaveBeenCalled()
      })

      it('handles all options together', async () => {
        const env = createMockEnv()

        const result = await evaluate(fixtures.withExports, env, {
          sandbox: { blockNetwork: false },
          cache: true,
          moduleId: 'test-module',
          bundleRuntime: true,
        })

        expect(result.moduleId).toBe('test-module')
      })
    })
  })

  // ============================================================================
  // createEvaluator
  // ============================================================================

  describe('createEvaluator', () => {
    beforeEach(() => {
      clearCache()
    })

    afterEach(() => {
      clearCache()
    })

    it('creates evaluator function', () => {
      const env = createMockEnv()
      const evaluator = createEvaluator(env)

      expect(typeof evaluator).toBe('function')
    })

    it('evaluator returns EvaluateResult', async () => {
      const env = createMockEnv()
      const evaluator = createEvaluator(env)

      const result = await evaluator(fixtures.simple)

      expect(result.moduleId).toBeDefined()
      expect(result.data).toBeDefined()
      expect(typeof result.call).toBe('function')
      expect(typeof result.meta).toBe('function')
    })

    it('applies default options', async () => {
      const env = createMockEnv()
      const evaluator = createEvaluator(env, {
        sandbox: { blockNetwork: true },
      })

      const result = await evaluator(fixtures.simple)

      expect(result.moduleId).toBeDefined()
    })

    it('allows overriding default options', async () => {
      const env = createMockEnv()
      const evaluator = createEvaluator(env, {
        moduleId: 'default-id',
      })

      const result = await evaluator(fixtures.simple, {
        moduleId: 'override-id',
      })

      expect(result.moduleId).toBe('override-id')
    })

    it('merges options correctly', async () => {
      const env = createMockEnv()
      const evaluator = createEvaluator(env, {
        sandbox: { blockNetwork: true },
        cache: true,
      })

      const result = await evaluator(fixtures.simple, {
        cache: false,
      })

      // Cache should be false (overridden), but sandbox should still apply
      const moduleId = generateModuleId(fixtures.simple)
      expect(isCached(moduleId)).toBe(false)
    })

    it('can create multiple evaluators with different options', async () => {
      const env = createMockEnv()

      const sandboxedEvaluator = createEvaluator(env, {
        sandbox: { blockNetwork: true },
        moduleId: 'sandboxed',
      })

      const openEvaluator = createEvaluator(env, {
        sandbox: { blockNetwork: false },
        moduleId: 'open',
      })

      const result1 = await sandboxedEvaluator(fixtures.simple)
      const result2 = await openEvaluator(fixtures.simple)

      expect(result1.moduleId).toBe('sandboxed')
      expect(result2.moduleId).toBe('open')
    })

    it('supports generic type parameter', async () => {
      const env = createMockEnv({
        results: { getData: { value: 42 } },
      })
      const evaluator = createEvaluator(env)

      interface MyModule {
        getData: () => { value: number }
      }

      const result = await evaluator<MyModule>(fixtures.simple)
      const data = await result.call<{ value: number }>('getData')

      expect(data.value).toBe(42)
    })
  })

  // ============================================================================
  // createHandler
  // ============================================================================

  describe('createHandler', () => {
    beforeEach(() => {
      clearCache()
    })

    afterEach(() => {
      clearCache()
    })

    it('creates handler function', () => {
      const env = createMockEnv()
      const handler = createHandler(env)

      expect(typeof handler).toBe('function')
    })

    it('rejects non-POST requests', async () => {
      const env = createMockEnv()
      const handler = createHandler(env)

      const request = new Request('http://localhost/evaluate', {
        method: 'GET',
      })

      const response = await handler(request)

      expect(response.status).toBe(405)
      expect(await response.text()).toBe('Method not allowed')
    })

    it('handles POST request with content', async () => {
      const env = createMockEnv({
        exports: ['default'],
        hasDefault: true,
      })
      const handler = createHandler(env)

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fixtures.simple }),
      })

      const response = await handler(request)

      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.moduleId).toBeDefined()
      expect(body.exports).toBeDefined()
      expect(body.hasDefault).toBeDefined()
    })

    it('calls action when specified', async () => {
      const env = createMockEnv({
        results: { greet: 'Hello, Test!' },
      })
      const handler = createHandler(env)

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fixtures.withExports,
          action: 'greet',
          args: ['Test'],
        }),
      })

      const response = await handler(request)
      const body = await response.json()

      expect(body.result).toBe('Hello, Test!')
    })

    it('returns frontmatter data', async () => {
      const env = createMockEnv({
        exports: ['default'],
        hasDefault: true,
      })
      const handler = createHandler(env)

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fixtures.withFrontmatter }),
      })

      const response = await handler(request)
      const body = await response.json()

      expect(body.data.title).toBe('Document')
      expect(body.data.author).toBe('Test')
    })

    it('handles errors gracefully', async () => {
      const env = createMockEnv()
      const handler = createHandler(env)

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await handler(request)

      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it('applies default options', async () => {
      const env = createMockEnv({
        exports: [],
        hasDefault: false,
      })
      const handler = createHandler(env, {
        sandbox: { blockNetwork: true },
      })

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fixtures.simple }),
      })

      const response = await handler(request)

      expect(response.status).toBe(200)
    })

    it('merges request options with default options', async () => {
      const env = createMockEnv({
        exports: [],
        hasDefault: false,
      })
      const handler = createHandler(env, {
        sandbox: { blockNetwork: true },
      })

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fixtures.simple,
          options: { cache: false },
        }),
      })

      const response = await handler(request)

      expect(response.status).toBe(200)
    })

    it('returns proper content-type header', async () => {
      const env = createMockEnv({
        exports: [],
        hasDefault: false,
      })
      const handler = createHandler(env)

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fixtures.simple }),
      })

      const response = await handler(request)

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('handles action with no args', async () => {
      const env = createMockEnv({
        results: { getConfig: { theme: 'dark' } },
      })
      const handler = createHandler(env)

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fixtures.complex,
          action: 'getConfig',
        }),
      })

      const response = await handler(request)
      const body = await response.json()

      expect(body.result).toEqual({ theme: 'dark' })
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    beforeEach(() => {
      clearCache()
    })

    afterEach(() => {
      clearCache()
    })

    it('full workflow: precompile -> evaluate -> call', async () => {
      // Step 1: Precompile
      const moduleId = await precompile(fixtures.calculator)
      expect(isCached(moduleId)).toBe(true)

      // Step 2: Evaluate (should use cache)
      const env = createMockEnv({
        results: { add: 7, subtract: 3, multiply: 10 },
      })
      const result = await evaluate(fixtures.calculator, env)
      expect(result.moduleId).toBe(moduleId)

      // Step 3: Call functions
      const sum = await result.call('add', 3, 4)
      expect(sum).toBe(7)

      const diff = await result.call('subtract', 7, 4)
      expect(diff).toBe(3)
    })

    it('evaluator with handler', async () => {
      const env = createMockEnv({
        exports: ['greet', 'PI'],
        hasDefault: true,
        results: { greet: 'Hello!' },
      })

      // Create evaluator
      const evaluator = createEvaluator(env, {
        sandbox: { blockNetwork: true },
      })

      // Create handler
      const handler = createHandler(env, {
        sandbox: { blockNetwork: true },
      })

      // Both should work with same content
      const evalResult = await evaluator(fixtures.withExports)
      expect(evalResult.moduleId).toBeDefined()

      const request = new Request('http://localhost/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fixtures.withExports }),
      })
      const handlerResponse = await handler(request)
      expect(handlerResponse.status).toBe(200)
    })

    it('cache persistence across multiple evaluations', async () => {
      const env = createMockEnv()

      // First evaluation
      await evaluate(fixtures.simple, env, { moduleId: 'test-1' })
      expect(getCacheStats().size).toBe(1)

      // Second evaluation (different content)
      await evaluate(fixtures.withExports, env, { moduleId: 'test-2' })
      expect(getCacheStats().size).toBe(2)

      // Third evaluation (same as first, should reuse)
      await evaluate(fixtures.simple, env, { moduleId: 'test-1' })
      expect(getCacheStats().size).toBe(2) // Still 2, reused cache
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    beforeEach(() => {
      clearCache()
    })

    afterEach(() => {
      clearCache()
    })

    it('handles empty MDX content', async () => {
      const env = createMockEnv()

      const result = await evaluate('', env)

      expect(result.moduleId).toBeDefined()
      expect(result.data).toEqual({})
    })

    it('handles MDX with only frontmatter', async () => {
      const env = createMockEnv()
      const content = `---
title: Only Frontmatter
---`

      const result = await evaluate(content, env)

      expect(result.data.title).toBe('Only Frontmatter')
    })

    it('handles MDX with only code', async () => {
      const env = createMockEnv()
      const content = `export const x = 1`

      const result = await evaluate(content, env)

      expect(result.moduleId).toBeDefined()
    })

    it('handles unicode content', async () => {
      const env = createMockEnv()
      const content = `---
title: 日本語
---

# 你好世界

export const emoji = '🚀'`

      const result = await evaluate(content, env)

      expect(result.data.title).toBe('日本語')
    })

    it('handles very long content', async () => {
      const env = createMockEnv()
      const sections = Array.from({ length: 100 }, (_, i) =>
        `## Section ${i}\n\nContent for section ${i}.`
      ).join('\n\n')
      const content = `---
title: Long Document
---

${sections}

export const sectionCount = 100`

      const result = await evaluate(content, env)

      expect(result.data.title).toBe('Long Document')
    })
  })
})
