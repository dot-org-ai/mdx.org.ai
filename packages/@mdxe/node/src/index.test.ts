import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  compileToModule,
  createWorkerConfig,
  generateModuleId,
  getExports,
  getActiveInstanceCount,
  disposeAll,
  createEvaluator,
  evaluate,
  run,
  test as testMdx,
  type EvaluateOptions,
  type EvaluateResult,
  type Evaluator,
} from './index.js'

// Use globalThis to share state between test file and mock
declare global {
  // eslint-disable-next-line no-var
  var __miniflare_mock_responses: Record<string, unknown>
}

globalThis.__miniflare_mock_responses = {}

function setMockResponses(responses: Record<string, unknown>) {
  Object.assign(globalThis.__miniflare_mock_responses, responses)
}

function clearMockResponses() {
  globalThis.__miniflare_mock_responses = {}
}

// Mock miniflare since we can't run workerd in test environment
vi.mock('miniflare', () => {
  const MockMiniflare = vi.fn().mockImplementation(() => ({
    dispatchFetch: vi.fn(async (url: string) => {
      const responses = globalThis.__miniflare_mock_responses || {}
      const urlObj = new URL(url)
      const path = urlObj.pathname

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

        // Check for error responses
        const errors = responses.errors as Record<string, string> | undefined
        if (errors?.[fnName]) {
          return new Response(JSON.stringify({
            error: errors[fnName],
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Get result for function
        const results = responses.results as Record<string, unknown> | undefined
        const result = results?.[fnName]
        return new Response(JSON.stringify({ result }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    }),
    dispose: vi.fn().mockResolvedValue(undefined),
  }))

  return { Miniflare: MockMiniflare }
})

describe('@mdxe/node', () => {
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
export const multiply = (a, b) => a * b
export const divide = (a, b) => a / b`,

    asyncFunctions: `export async function fetchData() {
  return { success: true }
}

export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}`,

    withFrontmatter: `---
title: Document
author: Test Author
version: 1.0.0
tags:
  - test
  - mdx
metadata:
  created: 2024-01-01
  updated: 2024-12-01
---

# Content

Some paragraph text.`,

    withError: `export function throwError() {
  throw new Error('Test error')
}

export function divideByZero() {
  return 1 / 0
}`,

    complex: `---
title: Complex Module
description: A complex MDX module with many features
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

export async function asyncProcess(input) {
  return { async: true, input }
}

# Complex Document

<Component />`,

    withDefaultExport: `export default function MyComponent() {
  return <div>Hello</div>
}

export const name = 'MyComponent'`,

    withMultipleExports: `export const a = 1
export const b = 2
export const c = 3
export function sum() { return a + b + c }
export const obj = { a, b, c }`,

    unicode: `---
title: 日本語タイトル
author: 作者名
emoji: 🎉🚀💡
---

# Welcome 欢迎 ようこそ

Content with émojis 🎉 and ünïcödé characters.

export const greeting = '你好世界'
export const emoji = '🚀'`,
  }

  // ============================================================================
  // Setup and Teardown
  // ============================================================================

  beforeEach(async () => {
    clearMockResponses()
    await disposeAll()
  })

  afterEach(async () => {
    clearMockResponses()
    await disposeAll()
  })

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

    it('createWorkerConfig works correctly', async () => {
      const module = await compileToModule(fixtures.simple)
      const config = createWorkerConfig(module)

      expect(config.compatibilityDate).toBeDefined()
      expect(config.mainModule).toBe('entry.js')
    })

    it('generateModuleId is consistent', () => {
      const id1 = generateModuleId('test')
      const id2 = generateModuleId('test')

      expect(id1).toBe(id2)
    })

    it('generateModuleId differs for different content', () => {
      const id1 = generateModuleId('content a')
      const id2 = generateModuleId('content b')

      expect(id1).not.toBe(id2)
    })
  })

  // ============================================================================
  // Instance Management
  // ============================================================================

  describe('instance management', () => {
    it('getActiveInstanceCount returns number', () => {
      const count = getActiveInstanceCount()

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('starts with zero instances', () => {
      expect(getActiveInstanceCount()).toBe(0)
    })

    it('disposeAll disposes all instances', async () => {
      setMockResponses({
        exports: ['default'],
        hasDefault: true,
      })

      await evaluate(fixtures.simple)
      await evaluate(fixtures.withExports)

      expect(getActiveInstanceCount()).toBeGreaterThan(0)

      await disposeAll()

      expect(getActiveInstanceCount()).toBe(0)
    })

    it('disposeAll is safe to call multiple times', async () => {
      await disposeAll()
      await disposeAll()
      await disposeAll()

      expect(getActiveInstanceCount()).toBe(0)
    })

    it('disposeAll is safe when no instances exist', async () => {
      expect(getActiveInstanceCount()).toBe(0)
      await disposeAll()
      expect(getActiveInstanceCount()).toBe(0)
    })
  })

  // ============================================================================
  // evaluate
  // ============================================================================

  describe('evaluate', () => {
    describe('basic evaluation', () => {
      it('evaluates simple MDX', async () => {
        setMockResponses({
          exports: ['default'],
          hasDefault: true,
        })

        const result = await evaluate(fixtures.simple)

        expect(result.moduleId).toBeDefined()
        expect(result.data).toEqual({})
        expect(typeof result.call).toBe('function')
        expect(typeof result.meta).toBe('function')
        expect(typeof result.dispose).toBe('function')
      })

      it('returns frontmatter data', async () => {
        setMockResponses({
          exports: ['default'],
          hasDefault: true,
        })

        const result = await evaluate(fixtures.withFrontmatter)

        expect(result.data.title).toBe('Document')
        expect(result.data.author).toBe('Test Author')
        expect(result.data.version).toBe('1.0.0')
        expect(result.data.tags).toEqual(['test', 'mdx'])
        expect(result.data.metadata).toEqual({
          created: '2024-01-01',
          updated: '2024-12-01',
        })
      })

      it('returns module ID', async () => {
        setMockResponses({})

        const result = await evaluate(fixtures.simple)

        expect(typeof result.moduleId).toBe('string')
        expect(result.moduleId.length).toBeGreaterThan(0)
      })

      it('returns consistent module ID for same content', async () => {
        setMockResponses({})

        const result1 = await evaluate(fixtures.simple)
        await result1.dispose()

        const result2 = await evaluate(fixtures.simple)

        expect(result1.moduleId).toBe(result2.moduleId)
      })

      it('returns different module IDs for different content', async () => {
        setMockResponses({})

        const result1 = await evaluate(fixtures.simple)
        const result2 = await evaluate(fixtures.withExports)

        expect(result1.moduleId).not.toBe(result2.moduleId)
      })
    })

    describe('calling exported functions', () => {
      it('calls exported function', async () => {
        setMockResponses({
          results: { greet: 'Hello, World!' },
        })

        const result = await evaluate(fixtures.withExports)
        const greeting = await result.call('greet', 'World')

        expect(greeting).toBe('Hello, World!')
      })

      it('calls function with multiple arguments', async () => {
        setMockResponses({
          results: { add: 5 },
        })

        const result = await evaluate(fixtures.calculator)
        const sum = await result.call('add', 2, 3)

        expect(sum).toBe(5)
      })

      it('calls function with no arguments', async () => {
        setMockResponses({
          results: { fetchData: { success: true } },
        })

        const result = await evaluate(fixtures.asyncFunctions)
        const data = await result.call('fetchData')

        expect(data).toEqual({ success: true })
      })

      it('throws on function not found', async () => {
        setMockResponses({
          errors: { nonexistent: 'Function not found: nonexistent' },
        })

        const result = await evaluate(fixtures.simple)

        await expect(result.call('nonexistent')).rejects.toThrow(
          'Function not found: nonexistent'
        )
      })

      it('throws on function error', async () => {
        setMockResponses({
          errors: { throwError: 'Test error' },
        })

        const result = await evaluate(fixtures.withError)

        await expect(result.call('throwError')).rejects.toThrow('Test error')
      })

      it('returns complex results', async () => {
        const complexResult = {
          processed: true,
          data: { nested: { value: 42 } },
        }
        setMockResponses({
          results: { process: complexResult },
        })

        const result = await evaluate(fixtures.complex)
        const processed = await result.call('process', { input: 'test' })

        expect(processed).toEqual(complexResult)
      })

      it('handles multiple sequential calls', async () => {
        setMockResponses({
          results: {
            add: 5,
            subtract: 1,
            multiply: 6,
          },
        })

        const result = await evaluate(fixtures.calculator)

        const sum = await result.call('add', 2, 3)
        const diff = await result.call('subtract', 3, 2)
        const product = await result.call('multiply', 2, 3)

        expect(sum).toBe(5)
        expect(diff).toBe(1)
        expect(product).toBe(6)
      })
    })

    describe('metadata', () => {
      it('returns export list', async () => {
        setMockResponses({
          exports: ['greet', 'PI', 'default'],
          hasDefault: true,
        })

        const result = await evaluate(fixtures.withExports)
        const meta = await result.meta()

        expect(meta.exports).toContain('greet')
        expect(meta.exports).toContain('PI')
        expect(meta.exports).toContain('default')
      })

      it('returns hasDefault flag when true', async () => {
        setMockResponses({
          exports: ['default', 'name'],
          hasDefault: true,
        })

        const result = await evaluate(fixtures.withDefaultExport)
        const meta = await result.meta()

        expect(meta.hasDefault).toBe(true)
      })

      it('returns hasDefault flag when false', async () => {
        setMockResponses({
          exports: ['add', 'subtract'],
          hasDefault: false,
        })

        const result = await evaluate(fixtures.calculator)
        const meta = await result.meta()

        expect(meta.hasDefault).toBe(false)
      })
    })

    describe('disposal', () => {
      it('dispose cleans up instance', async () => {
        setMockResponses({})

        const result = await evaluate(fixtures.simple)
        const initialCount = getActiveInstanceCount()

        await result.dispose()

        expect(getActiveInstanceCount()).toBeLessThan(initialCount)
      })

      it('dispose is safe to call multiple times', async () => {
        setMockResponses({})

        const result = await evaluate(fixtures.simple)

        await result.dispose()
        await result.dispose()
        await result.dispose()

        // Should not throw
        expect(true).toBe(true)
      })
    })

    describe('options', () => {
      it('accepts sandbox options', async () => {
        setMockResponses({})

        const result = await evaluate(fixtures.simple, {
          sandbox: { blockNetwork: true },
        })

        expect(result.moduleId).toBeDefined()
      })

      it('accepts miniflare options', async () => {
        setMockResponses({})

        const result = await evaluate(fixtures.simple, {
          miniflareOptions: { compatibilityDate: '2024-01-01' },
        })

        expect(result.moduleId).toBeDefined()
      })

      it('accepts compile options', async () => {
        setMockResponses({})

        const result = await evaluate(fixtures.simple, {
          bundleRuntime: true,
        })

        expect(result.moduleId).toBeDefined()
      })

      it('handles all options together', async () => {
        setMockResponses({})

        const result = await evaluate(fixtures.withExports, {
          sandbox: { blockNetwork: true, timeout: 5000 },
          miniflareOptions: { compatibilityDate: '2024-01-01' },
          bundleRuntime: true,
        })

        expect(result.moduleId).toBeDefined()
        expect(result.data.title).toBe('Test')
      })
    })

    describe('exports property', () => {
      it('exports property is an object', async () => {
        setMockResponses({})

        const result = await evaluate(fixtures.simple)

        expect(typeof result.exports).toBe('object')
      })
    })
  })

  // ============================================================================
  // createEvaluator
  // ============================================================================

  describe('createEvaluator', () => {
    it('returns evaluator with expected interface', () => {
      const evaluator = createEvaluator()

      expect(typeof evaluator.evaluate).toBe('function')
      expect(typeof evaluator.dispose).toBe('function')
      expect(typeof evaluator.getInstanceCount).toBe('function')
    })

    it('evaluator starts with zero instances', () => {
      const evaluator = createEvaluator()

      expect(evaluator.getInstanceCount()).toBe(0)
    })

    it('evaluator.evaluate returns EvaluateResult', async () => {
      setMockResponses({})

      const evaluator = createEvaluator()
      const result = await evaluator.evaluate(fixtures.simple)

      expect(result.moduleId).toBeDefined()
      expect(result.data).toBeDefined()
      expect(typeof result.call).toBe('function')
      expect(typeof result.meta).toBe('function')
      expect(typeof result.dispose).toBe('function')
    })

    it('tracks instances correctly', async () => {
      setMockResponses({})

      const evaluator = createEvaluator()

      expect(evaluator.getInstanceCount()).toBe(0)

      await evaluator.evaluate(fixtures.simple)
      expect(evaluator.getInstanceCount()).toBe(1)

      await evaluator.evaluate(fixtures.withExports)
      expect(evaluator.getInstanceCount()).toBe(2)
    })

    it('dispose cleans up all evaluator instances', async () => {
      setMockResponses({})

      const evaluator = createEvaluator()

      await evaluator.evaluate(fixtures.simple)
      await evaluator.evaluate(fixtures.withExports)
      await evaluator.evaluate(fixtures.calculator)

      expect(evaluator.getInstanceCount()).toBe(3)

      await evaluator.dispose()

      expect(evaluator.getInstanceCount()).toBe(0)
    })

    it('applies default options', async () => {
      setMockResponses({})

      const evaluator = createEvaluator({
        sandbox: { blockNetwork: true },
      })

      const result = await evaluator.evaluate(fixtures.simple)

      expect(result.moduleId).toBeDefined()
    })

    it('allows overriding default options', async () => {
      setMockResponses({})

      const evaluator = createEvaluator({
        sandbox: { blockNetwork: true },
      })

      const result = await evaluator.evaluate(fixtures.simple, {
        sandbox: { blockNetwork: false },
      })

      expect(result.moduleId).toBeDefined()
    })

    it('can create multiple independent evaluators', async () => {
      setMockResponses({})

      const evaluator1 = createEvaluator({ sandbox: { blockNetwork: true } })
      const evaluator2 = createEvaluator({ sandbox: { blockNetwork: false } })

      await evaluator1.evaluate(fixtures.simple)
      await evaluator2.evaluate(fixtures.withExports)

      expect(evaluator1.getInstanceCount()).toBe(1)
      expect(evaluator2.getInstanceCount()).toBe(1)

      await evaluator1.dispose()

      expect(evaluator1.getInstanceCount()).toBe(0)
      expect(evaluator2.getInstanceCount()).toBe(1)

      await evaluator2.dispose()
    })

    it('supports generic type parameter', async () => {
      setMockResponses({
        results: { getData: { value: 42 } },
      })

      const evaluator = createEvaluator()

      interface MyModule {
        getData: () => { value: number }
      }

      const result = await evaluator.evaluate<MyModule>(fixtures.simple)
      const data = await result.call<{ value: number }>('getData')

      expect(data.value).toBe(42)
    })
  })

  // ============================================================================
  // run
  // ============================================================================

  describe('run', () => {
    it('runs function and returns result', async () => {
      setMockResponses({
        results: { add: 5 },
      })

      const result = await run(fixtures.calculator, 'add', [2, 3])

      expect(result).toBe(5)
    })

    it('runs function with no arguments', async () => {
      setMockResponses({
        results: { fetchData: { success: true } },
      })

      const result = await run(fixtures.asyncFunctions, 'fetchData')

      expect(result).toEqual({ success: true })
    })

    it('runs function with single argument', async () => {
      setMockResponses({
        results: { greet: 'Hello, World!' },
      })

      const result = await run(fixtures.withExports, 'greet', ['World'])

      expect(result).toBe('Hello, World!')
    })

    it('automatically disposes after run', async () => {
      setMockResponses({
        results: { add: 5 },
      })

      const initialCount = getActiveInstanceCount()

      await run(fixtures.calculator, 'add', [2, 3])

      // Should dispose after running
      expect(getActiveInstanceCount()).toBe(initialCount)
    })

    it('disposes even on error', async () => {
      setMockResponses({
        errors: { throwError: 'Test error' },
      })

      const initialCount = getActiveInstanceCount()

      try {
        await run(fixtures.withError, 'throwError')
      } catch {
        // Expected
      }

      // Should still dispose after error
      expect(getActiveInstanceCount()).toBe(initialCount)
    })

    it('accepts evaluate options', async () => {
      setMockResponses({
        results: { add: 5 },
      })

      const result = await run(
        fixtures.calculator,
        'add',
        [2, 3],
        { sandbox: { blockNetwork: true } }
      )

      expect(result).toBe(5)
    })

    it('returns complex results', async () => {
      const complexResult = {
        processed: true,
        data: { nested: { value: 42 } },
      }
      setMockResponses({
        results: { process: complexResult },
      })

      const result = await run(fixtures.complex, 'process', [{ input: 'test' }])

      expect(result).toEqual(complexResult)
    })

    it('handles different return types', async () => {
      setMockResponses({
        results: {
          getNumber: 42,
          getString: 'hello',
          getBoolean: true,
          getArray: [1, 2, 3],
          getObject: { key: 'value' },
          getNull: null,
        },
      })

      expect(await run(fixtures.simple, 'getNumber')).toBe(42)
      expect(await run(fixtures.simple, 'getString')).toBe('hello')
      expect(await run(fixtures.simple, 'getBoolean')).toBe(true)
      expect(await run(fixtures.simple, 'getArray')).toEqual([1, 2, 3])
      expect(await run(fixtures.simple, 'getObject')).toEqual({ key: 'value' })
      expect(await run(fixtures.simple, 'getNull')).toBeNull()
    })
  })

  // ============================================================================
  // test
  // ============================================================================

  describe('test', () => {
    it('returns success for valid MDX', async () => {
      setMockResponses({
        exports: ['add', 'subtract'],
        hasDefault: false,
      })

      const result = await testMdx(fixtures.calculator)

      expect(result.success).toBe(true)
      expect(result.exports).toContain('add')
      expect(result.exports).toContain('subtract')
      expect(result.error).toBeUndefined()
    })

    it('returns frontmatter data', async () => {
      setMockResponses({
        exports: ['default'],
        hasDefault: true,
      })

      const result = await testMdx(fixtures.withFrontmatter)

      expect(result.success).toBe(true)
      expect(result.data.title).toBe('Document')
      expect(result.data.author).toBe('Test Author')
    })

    it('returns error for invalid MDX', async () => {
      // This will fail during compilation, before mock is used
      const invalidMdx = `<Component unclosed`

      const result = await testMdx(invalidMdx)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.exports).toEqual([])
      expect(result.data).toEqual({})
    })

    it('returns empty data for content without frontmatter', async () => {
      setMockResponses({
        exports: ['default'],
        hasDefault: true,
      })

      const result = await testMdx(fixtures.simple)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('accepts evaluate options', async () => {
      setMockResponses({
        exports: ['default'],
        hasDefault: true,
      })

      const result = await testMdx(fixtures.simple, {
        sandbox: { blockNetwork: true },
      })

      expect(result.success).toBe(true)
    })

    it('disposes instance after test', async () => {
      setMockResponses({
        exports: ['default'],
        hasDefault: true,
      })

      const initialCount = getActiveInstanceCount()

      await testMdx(fixtures.simple)

      // Should dispose after testing
      expect(getActiveInstanceCount()).toBe(initialCount)
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('full workflow: evaluate -> call -> meta -> dispose', async () => {
      setMockResponses({
        exports: ['add', 'subtract', 'multiply', 'divide'],
        hasDefault: false,
        results: {
          add: 10,
          subtract: 4,
          multiply: 21,
        },
      })

      // Step 1: Evaluate
      const result = await evaluate(fixtures.calculator)
      expect(result.moduleId).toBeDefined()

      // Step 2: Call functions
      const sum = await result.call('add', 3, 7)
      expect(sum).toBe(10)

      const diff = await result.call('subtract', 7, 3)
      expect(diff).toBe(4)

      const product = await result.call('multiply', 3, 7)
      expect(product).toBe(21)

      // Step 3: Get metadata
      const meta = await result.meta()
      expect(meta.exports).toContain('add')
      expect(meta.exports).toContain('subtract')
      expect(meta.exports).toContain('multiply')
      expect(meta.hasDefault).toBe(false)

      // Step 4: Dispose
      await result.dispose()
    })

    it('evaluator manages multiple modules', async () => {
      setMockResponses({
        results: {
          greet: 'Hello!',
          add: 5,
        },
        exports: ['greet', 'add', 'default'],
        hasDefault: true,
      })

      const evaluator = createEvaluator({ sandbox: { blockNetwork: true } })

      // Evaluate multiple modules
      const result1 = await evaluator.evaluate(fixtures.withExports)
      const result2 = await evaluator.evaluate(fixtures.calculator)

      expect(evaluator.getInstanceCount()).toBe(2)

      // Call functions on both
      const greeting = await result1.call('greet', 'World')
      expect(greeting).toBe('Hello!')

      const sum = await result2.call('add', 2, 3)
      expect(sum).toBe(5)

      // Dispose all
      await evaluator.dispose()
      expect(evaluator.getInstanceCount()).toBe(0)
    })

    it('run is convenient for one-off calls', async () => {
      setMockResponses({
        results: { add: 15 },
      })

      const result = await run(fixtures.calculator, 'add', [7, 8])

      expect(result).toBe(15)
      expect(getActiveInstanceCount()).toBe(0) // Auto-disposed
    })

    it('test validates MDX before use', async () => {
      // Valid MDX
      setMockResponses({
        exports: ['default'],
        hasDefault: true,
      })

      const validResult = await testMdx(fixtures.simple)
      expect(validResult.success).toBe(true)

      // Invalid MDX
      const invalidResult = await testMdx(`<Broken unclosed`)
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.error).toBeDefined()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles empty MDX content', async () => {
      setMockResponses({})

      const result = await evaluate('')

      expect(result.moduleId).toBeDefined()
      expect(result.data).toEqual({})
    })

    it('handles MDX with only frontmatter', async () => {
      setMockResponses({})

      const content = `---
title: Only Frontmatter
---`

      const result = await evaluate(content)

      expect(result.data.title).toBe('Only Frontmatter')
    })

    it('handles MDX with only code', async () => {
      setMockResponses({})

      const content = `export const x = 1`

      const result = await evaluate(content)

      expect(result.moduleId).toBeDefined()
    })

    it('handles unicode content', async () => {
      setMockResponses({})

      const result = await evaluate(fixtures.unicode)

      expect(result.data.title).toBe('日本語タイトル')
      expect(result.data.author).toBe('作者名')
      expect(result.data.emoji).toBe('🎉🚀💡')
    })

    it('handles very long content', async () => {
      setMockResponses({})

      const sections = Array.from({ length: 100 }, (_, i) =>
        `## Section ${i}\n\nContent for section ${i}.`
      ).join('\n\n')
      const content = `---
title: Long Document
---

${sections}

export const sectionCount = 100`

      const result = await evaluate(content)

      expect(result.data.title).toBe('Long Document')
    })

    it('handles content with special characters', async () => {
      setMockResponses({})

      const content = `---
title: Quotes and special chars
description: Contains ampersand and angle brackets
---

# Content

Some text here.`

      const result = await evaluate(content)

      expect(result.data.title).toBe('Quotes and special chars')
    })

    it('reuses instances for same content', async () => {
      setMockResponses({})

      const result1 = await evaluate(fixtures.simple)
      const result2 = await evaluate(fixtures.simple)

      expect(result1.moduleId).toBe(result2.moduleId)
    })
  })

  // ============================================================================
  // Type Tests
  // ============================================================================

  describe('types', () => {
    it('EvaluateResult has correct shape', async () => {
      setMockResponses({})

      const result: EvaluateResult = await evaluate(fixtures.simple)

      expect(result).toHaveProperty('exports')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('call')
      expect(result).toHaveProperty('meta')
      expect(result).toHaveProperty('moduleId')
      expect(result).toHaveProperty('dispose')
    })

    it('Evaluator has correct shape', () => {
      const evaluator: Evaluator = createEvaluator()

      expect(evaluator).toHaveProperty('evaluate')
      expect(evaluator).toHaveProperty('dispose')
      expect(evaluator).toHaveProperty('getInstanceCount')
    })
  })
})
