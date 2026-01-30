/**
 * @mdxe/workers/local tests - Miniflare-based local execution
 *
 * These tests verify the local execution functionality using Miniflare
 * to run workerd locally for development and testing in Node.js.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  evaluate,
  createLocalEvaluator,
  run,
  test as testMdx,
  disposeAll,
  getActiveInstanceCount,
  type EvaluateResult,
  type LocalEvaluator,
} from './local.js'

describe('@mdxe/workers/local', () => {
  // ============================================================================
  // Test Fixtures - Real MDX content that will be executed via Miniflare
  // ============================================================================

  const fixtures = {
    simple: `# Hello World`,

    withExports: `---
title: Test Document
author: Test Author
---

# Hello World

export function greet(name) {
  return \`Hello, \${name}!\`
}

export const PI = 3.14159

export function add(a, b) {
  return a + b
}`,

    calculator: `export function add(a, b) { return a + b }
export function subtract(a, b) { return a - b }
export function multiply(a, b) { return a * b }
export function divide(a, b) { return a / b }`,

    asyncFunctions: `export async function fetchData() {
  return { success: true, timestamp: Date.now() }
}

export async function delayedValue(value, ms = 10) {
  await new Promise(resolve => setTimeout(resolve, ms))
  return value
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
---

# Content

export const getTitle = () => 'Document'`,

    withError: `export function throwError() {
  throw new Error('Intentional test error')
}

export function safeFunction() {
  return 'safe'
}`,

    complex: `---
title: Complex Module
metadata:
  author: Test
---

export const config = {
  theme: 'dark',
  features: ['a', 'b', 'c']
}

export function process(data) {
  return { processed: true, input: data }
}

export function getConfig() {
  return config
}`,

    unicode: `---
title: 日本語タイトル
emoji: 🎉
---

export const greeting = '你好世界'
export const getEmoji = () => '🚀'`,
  }

  // ============================================================================
  // Setup and Teardown
  // ============================================================================

  beforeEach(async () => {
    await disposeAll()
  })

  afterEach(async () => {
    await disposeAll()
  })

  // ============================================================================
  // Instance Management
  // ============================================================================

  describe('instance management', () => {
    it('getActiveInstanceCount returns number', () => {
      expect(typeof getActiveInstanceCount()).toBe('number')
    })

    it('starts with zero instances', () => {
      expect(getActiveInstanceCount()).toBe(0)
    })

    it('disposeAll is safe when no instances exist', async () => {
      await disposeAll()
      expect(getActiveInstanceCount()).toBe(0)
    })
  })

  // ============================================================================
  // evaluate - Integration Tests with Real Miniflare
  // ============================================================================

  describe('evaluate', () => {
    describe('basic evaluation', () => {
      it('evaluates simple MDX and returns result', async () => {
        const result = await evaluate(fixtures.simple)

        expect(result.moduleId).toBeDefined()
        expect(result.data).toEqual({})
        expect(typeof result.call).toBe('function')
        expect(typeof result.meta).toBe('function')
        expect(typeof result.dispose).toBe('function')

        await result.dispose()
      })

      it('returns frontmatter data', async () => {
        const result = await evaluate(fixtures.withFrontmatter)

        expect(result.data.title).toBe('Document')
        expect(result.data.author).toBe('Test Author')
        expect(result.data.version).toBe('1.0.0')
        expect(result.data.tags).toEqual(['test', 'mdx'])

        await result.dispose()
      })

      it('returns module ID based on content hash', async () => {
        const result1 = await evaluate(fixtures.simple)
        const result2 = await evaluate(fixtures.withExports)

        expect(result1.moduleId).not.toBe(result2.moduleId)

        await result1.dispose()
        await result2.dispose()
      })
    })

    describe('calling exported functions', () => {
      it('calls simple function with arguments', async () => {
        const result = await evaluate(fixtures.withExports)

        const greeting = await result.call<string>('greet', 'World')
        expect(greeting).toBe('Hello, World!')

        await result.dispose()
      })

      it('calls calculator functions', async () => {
        const result = await evaluate(fixtures.calculator)

        expect(await result.call<number>('add', 2, 3)).toBe(5)
        expect(await result.call<number>('subtract', 10, 4)).toBe(6)
        expect(await result.call<number>('multiply', 3, 7)).toBe(21)
        expect(await result.call<number>('divide', 20, 4)).toBe(5)

        await result.dispose()
      })

      it('calls async functions', async () => {
        const result = await evaluate(fixtures.asyncFunctions)

        const data = await result.call<{ success: boolean; timestamp: number }>('fetchData')
        expect(data.success).toBe(true)
        expect(typeof data.timestamp).toBe('number')

        const delayed = await result.call<string>('delayedValue', 'test-value', 10)
        expect(delayed).toBe('test-value')

        await result.dispose()
      })

      it('returns complex objects', async () => {
        const result = await evaluate(fixtures.complex)

        const config = await result.call<{ theme: string; features: string[] }>('getConfig')
        expect(config.theme).toBe('dark')
        expect(config.features).toEqual(['a', 'b', 'c'])

        const processed = await result.call<{ processed: boolean; input: unknown }>('process', { value: 42 })
        expect(processed.processed).toBe(true)
        expect(processed.input).toEqual({ value: 42 })

        await result.dispose()
      })

      it('handles unicode content', async () => {
        const result = await evaluate(fixtures.unicode)

        expect(result.data.title).toBe('日本語タイトル')
        expect(result.data.emoji).toBe('🎉')

        const emoji = await result.call<string>('getEmoji')
        expect(emoji).toBe('🚀')

        await result.dispose()
      })

      it('throws error for non-existent function', async () => {
        const result = await evaluate(fixtures.calculator)

        await expect(result.call('nonExistentFunction')).rejects.toThrow()

        await result.dispose()
      })

      it('propagates errors from functions', async () => {
        const result = await evaluate(fixtures.withError)

        // Safe function should work
        const safe = await result.call<string>('safeFunction')
        expect(safe).toBe('safe')

        // Error function should throw
        await expect(result.call('throwError')).rejects.toThrow('Intentional test error')

        await result.dispose()
      })
    })

    describe('metadata', () => {
      it('returns export metadata', async () => {
        const result = await evaluate(fixtures.calculator)
        const meta = await result.meta()

        expect(meta.exports).toContain('add')
        expect(meta.exports).toContain('subtract')
        expect(meta.exports).toContain('multiply')
        expect(meta.exports).toContain('divide')

        await result.dispose()
      })

      it('indicates if default export exists', async () => {
        const result = await evaluate(fixtures.simple)
        const meta = await result.meta()

        // MDX always has a default export (the content component)
        expect(meta.hasDefault).toBe(true)

        await result.dispose()
      })
    })

    describe('disposal', () => {
      it('dispose cleans up resources', async () => {
        const result = await evaluate(fixtures.simple)
        const initialCount = getActiveInstanceCount()

        expect(initialCount).toBeGreaterThan(0)

        await result.dispose()

        expect(getActiveInstanceCount()).toBe(0)
      })

      it('dispose is idempotent', async () => {
        const result = await evaluate(fixtures.simple)

        await result.dispose()
        await result.dispose()
        await result.dispose()

        expect(getActiveInstanceCount()).toBe(0)
      })
    })

    describe('options', () => {
      it('accepts sandbox options', async () => {
        const result = await evaluate(fixtures.calculator, {
          sandbox: { blockNetwork: true },
        })

        const sum = await result.call<number>('add', 1, 2)
        expect(sum).toBe(3)

        await result.dispose()
      })

      it('accepts compile options', async () => {
        const result = await evaluate(fixtures.simple, {
          bundleRuntime: true,
        })

        expect(result.moduleId).toBeDefined()

        await result.dispose()
      })
    })
  })

  // ============================================================================
  // createLocalEvaluator
  // ============================================================================

  describe('createLocalEvaluator', () => {
    it('returns evaluator with expected interface', () => {
      const evaluator = createLocalEvaluator()

      expect(typeof evaluator.evaluate).toBe('function')
      expect(typeof evaluator.dispose).toBe('function')
      expect(typeof evaluator.getInstanceCount).toBe('function')
    })

    it('starts with zero instances', () => {
      const evaluator = createLocalEvaluator()
      expect(evaluator.getInstanceCount()).toBe(0)
    })

    it('tracks instances', async () => {
      const evaluator = createLocalEvaluator()

      await evaluator.evaluate(fixtures.simple)
      expect(evaluator.getInstanceCount()).toBe(1)

      await evaluator.evaluate(fixtures.calculator)
      expect(evaluator.getInstanceCount()).toBe(2)

      await evaluator.dispose()
      expect(evaluator.getInstanceCount()).toBe(0)
    })

    it('evaluator instances work correctly', async () => {
      const evaluator = createLocalEvaluator()

      const result = await evaluator.evaluate(fixtures.calculator)
      const sum = await result.call<number>('add', 5, 7)
      expect(sum).toBe(12)

      await evaluator.dispose()
    })

    it('applies default options', async () => {
      const evaluator = createLocalEvaluator({
        sandbox: { blockNetwork: true },
      })

      const result = await evaluator.evaluate(fixtures.calculator)
      const sum = await result.call<number>('add', 1, 1)
      expect(sum).toBe(2)

      await evaluator.dispose()
    })

    it('multiple independent evaluators', async () => {
      const evaluator1 = createLocalEvaluator()
      const evaluator2 = createLocalEvaluator()

      await evaluator1.evaluate(fixtures.simple)
      await evaluator2.evaluate(fixtures.calculator)

      expect(evaluator1.getInstanceCount()).toBe(1)
      expect(evaluator2.getInstanceCount()).toBe(1)

      await evaluator1.dispose()
      expect(evaluator1.getInstanceCount()).toBe(0)
      expect(evaluator2.getInstanceCount()).toBe(1)

      await evaluator2.dispose()
    })
  })

  // ============================================================================
  // run - Convenience function
  // ============================================================================

  describe('run', () => {
    it('runs function and returns result', async () => {
      const result = await run<number>(fixtures.calculator, 'add', [2, 3])
      expect(result).toBe(5)
    })

    it('auto-disposes after execution', async () => {
      const initialCount = getActiveInstanceCount()

      await run(fixtures.calculator, 'add', [1, 1])

      expect(getActiveInstanceCount()).toBe(initialCount)
    })

    it('auto-disposes even on error', async () => {
      const initialCount = getActiveInstanceCount()

      try {
        await run(fixtures.withError, 'throwError')
      } catch {
        // Expected
      }

      expect(getActiveInstanceCount()).toBe(initialCount)
    })

    it('handles complex return values', async () => {
      const result = await run<{ processed: boolean; input: unknown }>(
        fixtures.complex,
        'process',
        [{ data: 'test' }]
      )

      expect(result.processed).toBe(true)
      expect(result.input).toEqual({ data: 'test' })
    })

    it('runs async functions', async () => {
      const result = await run<{ success: boolean }>(fixtures.asyncFunctions, 'fetchData')
      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // test - Validation function
  // ============================================================================

  describe('test', () => {
    it('returns success for valid MDX', async () => {
      const result = await testMdx(fixtures.calculator)

      expect(result.success).toBe(true)
      expect(result.exports).toContain('add')
      expect(result.exports).toContain('subtract')
      expect(result.error).toBeUndefined()
    })

    it('returns frontmatter data', async () => {
      const result = await testMdx(fixtures.withFrontmatter)

      expect(result.success).toBe(true)
      expect(result.data.title).toBe('Document')
      expect(result.data.author).toBe('Test Author')
    })

    it('returns error for invalid MDX', async () => {
      const invalidMdx = `<Component unclosed`

      const result = await testMdx(invalidMdx)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.exports).toEqual([])
    })

    it('disposes after test', async () => {
      const initialCount = getActiveInstanceCount()

      await testMdx(fixtures.simple)

      expect(getActiveInstanceCount()).toBe(initialCount)
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('full workflow: evaluate -> call -> meta -> dispose', async () => {
      const result = await evaluate(fixtures.calculator)

      // Call multiple functions
      expect(await result.call<number>('add', 10, 5)).toBe(15)
      expect(await result.call<number>('multiply', 4, 3)).toBe(12)

      // Get metadata
      const meta = await result.meta()
      expect(meta.exports.length).toBeGreaterThanOrEqual(4)

      // Clean up
      await result.dispose()
      expect(getActiveInstanceCount()).toBe(0)
    })

    it('evaluator with multiple modules', async () => {
      const evaluator = createLocalEvaluator()

      const calc = await evaluator.evaluate(fixtures.calculator)
      const greet = await evaluator.evaluate(fixtures.withExports)

      expect(await calc.call<number>('add', 1, 2)).toBe(3)
      expect(await greet.call<string>('greet', 'Test')).toBe('Hello, Test!')

      expect(evaluator.getInstanceCount()).toBe(2)

      await evaluator.dispose()
      expect(evaluator.getInstanceCount()).toBe(0)
    })

    it('error handling preserves other functionality', async () => {
      const result = await evaluate(fixtures.withError)

      // Error function throws
      await expect(result.call('throwError')).rejects.toThrow()

      // But safe function still works
      expect(await result.call<string>('safeFunction')).toBe('safe')

      await result.dispose()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles empty content', async () => {
      const result = await evaluate('')
      expect(result.moduleId).toBeDefined()
      await result.dispose()
    })

    it('handles content with only frontmatter', async () => {
      const content = `---
title: Only Frontmatter
---`
      const result = await evaluate(content)
      expect(result.data.title).toBe('Only Frontmatter')
      await result.dispose()
    })

    it('handles content with only exports', async () => {
      const content = `export const x = 42`
      const result = await evaluate(content)
      expect(result.moduleId).toBeDefined()
      await result.dispose()
    })

    it('reuses instances for same content', async () => {
      const result1 = await evaluate(fixtures.simple)
      const result2 = await evaluate(fixtures.simple)

      expect(result1.moduleId).toBe(result2.moduleId)

      await result1.dispose()
      await result2.dispose()
    })
  })

  // ============================================================================
  // Type Tests
  // ============================================================================

  describe('types', () => {
    it('EvaluateResult has correct shape', async () => {
      const result: EvaluateResult = await evaluate(fixtures.simple)

      expect(result).toHaveProperty('exports')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('call')
      expect(result).toHaveProperty('meta')
      expect(result).toHaveProperty('moduleId')
      expect(result).toHaveProperty('dispose')

      await result.dispose()
    })

    it('LocalEvaluator has correct shape', () => {
      const evaluator: LocalEvaluator = createLocalEvaluator()

      expect(evaluator).toHaveProperty('evaluate')
      expect(evaluator).toHaveProperty('dispose')
      expect(evaluator).toHaveProperty('getInstanceCount')
    })
  })
})
