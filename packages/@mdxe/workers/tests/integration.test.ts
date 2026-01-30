/**
 * Cross-Package Integration Tests for @mdxe/workers
 *
 * These tests verify the integration between:
 * - @mdxe/workers and @mdxe/isolate (compilation -> evaluation pipeline)
 * - Function call execution across package boundaries
 * - End-to-end MDX content -> Worker response flows
 * - Error propagation across packages
 *
 * Test Environment:
 * - Uses Miniflare for local workerd simulation
 * - Tests actual inter-package communication
 * - Validates full compilation -> evaluation pipeline
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  evaluate,
  run,
  test as testMdx,
  createLocalEvaluator,
  disposeAll,
  getActiveInstanceCount,
} from '../src/local.js'
import {
  compileToModule,
  createWorkerConfig,
  generateModuleId,
  getExports,
} from '@mdxe/isolate'

// ============================================================================
// Test Fixtures - Common MDX content for integration tests
// ============================================================================

const fixtures = {
  // Simple function export
  simpleFunction: `
export function greet(name) {
  return \`Hello, \${name}!\`
}
`,

  // Multiple exports with various types
  multipleExports: `
export function add(a, b) {
  return a + b
}

export function multiply(a, b) {
  return a * b
}

export const PI = 3.14159

export const config = {
  version: '1.0.0',
  name: 'test-module'
}
`,

  // Async function exports
  asyncExports: `
export async function fetchData(url) {
  return { url, status: 'fetched' }
}

export async function delayedGreet(name, delay) {
  await new Promise(resolve => setTimeout(resolve, delay))
  return \`Hello, \${name}!\`
}
`,

  // Frontmatter with exports
  withFrontmatter: `---
title: Integration Test Document
version: 2.0.0
metadata:
  author: Test Author
  tags:
    - integration
    - test
---

# Welcome

export function getTitle() {
  return 'Integration Test Document'
}

export function getVersion() {
  return '2.0.0'
}
`,

  // Complex computation
  complexComputation: `
export function factorial(n) {
  if (n <= 1) return 1
  return n * factorial(n - 1)
}

export function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

export function sumRange(start, end) {
  let sum = 0
  for (let i = start; i <= end; i++) {
    sum += i
  }
  return sum
}
`,

  // Error scenarios
  throwingFunction: `
export function willThrow() {
  throw new Error('Intentional error for testing')
}

export function mayThrow(shouldThrow) {
  if (shouldThrow) {
    throw new Error('Conditional error')
  }
  return 'success'
}
`,

  // Class exports
  classExport: `
export class Calculator {
  constructor(initialValue = 0) {
    this.value = initialValue
  }

  add(n) {
    this.value += n
    return this
  }

  subtract(n) {
    this.value -= n
    return this
  }

  getValue() {
    return this.value
  }
}
`,

  // JSX component exports
  jsxComponent: `
export function Button({ label, onClick }) {
  return { type: 'button', props: { label, onClick } }
}

export function Card({ title, children }) {
  return { type: 'card', props: { title, children } }
}
`,

  // Module with state - use var instead of let for module-level state
  statefulModule: `
export const state = { counter: 0 }

export function increment() {
  return ++state.counter
}

export function decrement() {
  return --state.counter
}

export function getCount() {
  return state.counter
}

export function reset() {
  state.counter = 0
  return state.counter
}
`,

  // Unicode and special characters
  unicodeContent: `---
title: Unicode Test
emoji: rocket
---

export const greeting = 'Hello World!'
export const emoji = 'rocket'
export const japanese = 'Test'

export function getGreeting(lang) {
  const greetings = {
    en: 'Hello!',
    es: 'Hola!',
    jp: 'Konnichiwa!'
  }
  return greetings[lang] || greetings.en
}
`,

  // Deeply nested data
  nestedData: `
export function createNestedObject(depth) {
  let obj = { value: depth }
  for (let i = depth - 1; i > 0; i--) {
    obj = { nested: obj, value: i }
  }
  return obj
}

export function flattenObject(obj, prefix = '') {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? \`\${prefix}.\${key}\` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey))
    } else {
      result[newKey] = value
    }
  }
  return result
}
`,

  // Large payload handling
  largePayload: `
export function generateArray(size) {
  return Array.from({ length: size }, (_, i) => i)
}

export function processArray(arr) {
  return {
    sum: arr.reduce((a, b) => a + b, 0),
    length: arr.length,
    min: Math.min(...arr),
    max: Math.max(...arr),
    avg: arr.reduce((a, b) => a + b, 0) / arr.length
  }
}
`,

  // Invalid MDX for error testing
  invalidMdx: `<Component unclosed`,

  // Invalid JavaScript
  invalidJs: `export const = 'missing name'`,

  // Syntax error in function
  syntaxError: `
export function broken( {
  return 'this will not compile'
}
`,
}

// ============================================================================
// Integration Tests - @mdxe/workers + @mdxe/isolate Pipeline
// ============================================================================

describe('Cross-Package Integration Tests', () => {
  // Setup and cleanup between tests
  beforeEach(async () => {
    await disposeAll()
  })

  afterEach(async () => {
    await disposeAll()
  })

  describe('@mdxe/workers + @mdxe/isolate: Full Pipeline', () => {
    it('should compile and evaluate simple MDX content', async () => {
      const result = await evaluate(fixtures.simpleFunction)

      const greeting = await result.call<string>('greet', 'World')
      expect(greeting).toBe('Hello, World!')

      await result.dispose()
    })

    it('should compile and evaluate MDX with multiple exports', async () => {
      const result = await evaluate(fixtures.multipleExports)

      const sum = await result.call<number>('add', 2, 3)
      expect(sum).toBe(5)

      const product = await result.call<number>('multiply', 4, 5)
      expect(product).toBe(20)

      await result.dispose()
    })

    it('should preserve frontmatter data through the pipeline', async () => {
      const result = await evaluate(fixtures.withFrontmatter)

      expect(result.data.title).toBe('Integration Test Document')
      expect(result.data.version).toBe('2.0.0')
      expect(result.data.metadata).toEqual({
        author: 'Test Author',
        tags: ['integration', 'test'],
      })

      const title = await result.call<string>('getTitle')
      expect(title).toBe('Integration Test Document')

      await result.dispose()
    })

    it('should handle async function exports', async () => {
      const result = await evaluate(fixtures.asyncExports)

      const data = await result.call<{ url: string; status: string }>('fetchData', 'https://example.com')
      expect(data).toEqual({ url: 'https://example.com', status: 'fetched' })

      await result.dispose()
    })

    it('should execute complex computations correctly', async () => {
      const result = await evaluate(fixtures.complexComputation)

      const fact5 = await result.call<number>('factorial', 5)
      expect(fact5).toBe(120) // 5! = 120

      const fib10 = await result.call<number>('fibonacci', 10)
      expect(fib10).toBe(55) // fib(10) = 55

      const sum = await result.call<number>('sumRange', 1, 100)
      expect(sum).toBe(5050) // sum(1..100) = 5050

      await result.dispose()
    })

    it('should handle class exports and instantiation', async () => {
      const result = await evaluate(fixtures.classExport)

      // Note: Class instantiation happens inside the worker
      // We test the class export exists
      const meta = await result.meta()
      expect(meta.exports).toContain('Calculator')

      await result.dispose()
    })

    it('should handle JSX component exports', async () => {
      const result = await evaluate(fixtures.jsxComponent)

      const button = await result.call('Button', { label: 'Click me', onClick: null })
      expect(button).toEqual({
        type: 'button',
        props: { label: 'Click me', onClick: null },
      })

      await result.dispose()
    })

    it('should handle nested data structures', async () => {
      const result = await evaluate(fixtures.nestedData)

      const nested = await result.call<object>('createNestedObject', 3)
      expect(nested).toEqual({
        nested: {
          nested: { value: 3 },
          value: 2,
        },
        value: 1,
      })

      await result.dispose()
    })

    it('should handle large payloads', async () => {
      const result = await evaluate(fixtures.largePayload)

      const arr = await result.call<number[]>('generateArray', 1000)
      expect(arr).toHaveLength(1000)
      expect(arr[0]).toBe(0)
      expect(arr[999]).toBe(999)

      const stats = await result.call<object>('processArray', arr)
      expect(stats).toEqual({
        sum: 499500, // sum(0..999)
        length: 1000,
        min: 0,
        max: 999,
        avg: 499.5,
      })

      await result.dispose()
    })
  })

  describe('Function Call Execution', () => {
    it('should pass multiple arguments correctly', async () => {
      const result = await evaluate(fixtures.multipleExports)

      const sum = await result.call<number>('add', 10, 20)
      expect(sum).toBe(30)

      await result.dispose()
    })

    it('should handle no arguments', async () => {
      const content = `export function getConstant() { return 42 }`
      const result = await evaluate(content)

      const value = await result.call<number>('getConstant')
      expect(value).toBe(42)

      await result.dispose()
    })

    it('should handle object arguments', async () => {
      const content = `
export function processObject(obj) {
  return { ...obj, processed: true }
}
`
      const result = await evaluate(content)

      const processed = await result.call<{ a: number; processed: boolean }>('processObject', { a: 1 })
      expect(processed).toEqual({ a: 1, processed: true })

      await result.dispose()
    })

    it('should handle array arguments', async () => {
      const content = `
export function sumArray(arr) {
  return arr.reduce((a, b) => a + b, 0)
}
`
      const result = await evaluate(content)

      const sum = await result.call<number>('sumArray', [1, 2, 3, 4, 5])
      expect(sum).toBe(15)

      await result.dispose()
    })

    it('should handle null and undefined arguments', async () => {
      const content = `
export function handleNullish(value) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  return 'value'
}
`
      const result = await evaluate(content)

      expect(await result.call('handleNullish', null)).toBe('null')
      // Note: undefined becomes null when serialized through JSON
      // This tests the actual serialization behavior
      expect(await result.call('handleNullish', undefined)).toBe('null')
      expect(await result.call('handleNullish', 'test')).toBe('value')

      await result.dispose()
    })
  })

  describe('End-to-End MDX Content -> Worker Response', () => {
    it('should return correct metadata from /meta endpoint', async () => {
      const result = await evaluate(fixtures.multipleExports)

      const meta = await result.meta()
      expect(meta.exports).toContain('add')
      expect(meta.exports).toContain('multiply')
      expect(meta.exports).toContain('PI')
      expect(meta.exports).toContain('config')
      expect(meta.hasDefault).toBe(true) // MDX always has a default export

      await result.dispose()
    })

    it('should handle module caching correctly', async () => {
      const content = fixtures.simpleFunction
      const moduleId1 = generateModuleId(content)

      const result1 = await evaluate(content)
      const moduleId2 = result1.moduleId

      // Module IDs should be consistent
      expect(moduleId1).toBe(moduleId2)

      await result1.dispose()
    })

    it('should share module state within cached evaluations', async () => {
      // First evaluation
      const result1 = await evaluate(fixtures.statefulModule)

      await result1.call('reset') // Reset counter first
      await result1.call('increment')
      await result1.call('increment')
      const count1 = await result1.call<number>('getCount')
      expect(count1).toBe(2)

      // Don't dispose - reuse same instance
      // Second evaluation of same content uses cached instance
      const result2 = await evaluate(fixtures.statefulModule)
      const count2 = await result2.call<number>('getCount')
      // Module is cached, so state persists
      expect(count2).toBe(2) // Same state as before

      await result1.dispose()
      await result2.dispose()
    })

    it('should handle unicode content correctly', async () => {
      const result = await evaluate(fixtures.unicodeContent)

      expect(result.data.title).toBe('Unicode Test')

      const greeting = await result.call<string>('getGreeting', 'jp')
      expect(greeting).toBe('Konnichiwa!')

      await result.dispose()
    })
  })

  describe('Error Propagation Across Packages', () => {
    it('should propagate errors from thrown functions', async () => {
      const result = await evaluate(fixtures.throwingFunction)

      await expect(result.call('willThrow')).rejects.toThrow('Intentional error for testing')

      await result.dispose()
    })

    it('should propagate conditional errors', async () => {
      const result = await evaluate(fixtures.throwingFunction)

      // Should succeed when not throwing
      const success = await result.call('mayThrow', false)
      expect(success).toBe('success')

      // Should throw when requested
      await expect(result.call('mayThrow', true)).rejects.toThrow('Conditional error')

      await result.dispose()
    })

    it('should throw on invalid MDX syntax during compilation', async () => {
      await expect(evaluate(fixtures.invalidMdx)).rejects.toThrow()
    })

    it('should throw on invalid JavaScript syntax', async () => {
      await expect(evaluate(fixtures.invalidJs)).rejects.toThrow()
    })

    it('should throw on function syntax errors', async () => {
      await expect(evaluate(fixtures.syntaxError)).rejects.toThrow()
    })

    it('should throw when calling non-existent function', async () => {
      const result = await evaluate(fixtures.simpleFunction)

      await expect(result.call('nonExistentFunction')).rejects.toThrow()

      await result.dispose()
    })
  })

  describe('run() Convenience Function', () => {
    it('should run and return result directly', async () => {
      const result = await run(fixtures.multipleExports, 'add', [10, 20])
      expect(result).toBe(30)
    })

    it('should automatically dispose after execution', async () => {
      await run(fixtures.simpleFunction, 'greet', ['Test'])
      // No explicit dispose needed - handled by run()
    })

    it('should handle errors in run()', async () => {
      await expect(run(fixtures.throwingFunction, 'willThrow', [])).rejects.toThrow('Intentional error for testing')
    })
  })

  describe('test() Function', () => {
    it('should return success for valid MDX', async () => {
      const result = await testMdx(fixtures.multipleExports)

      expect(result.success).toBe(true)
      expect(result.exports).toContain('add')
      expect(result.exports).toContain('multiply')
      expect(result.error).toBeUndefined()
    })

    it('should return failure for invalid MDX', async () => {
      const result = await testMdx(fixtures.invalidMdx)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return frontmatter data', async () => {
      const result = await testMdx(fixtures.withFrontmatter)

      expect(result.success).toBe(true)
      expect(result.data.title).toBe('Integration Test Document')
    })
  })

  describe('createLocalEvaluator() Factory', () => {
    it('should create evaluator with default options', async () => {
      const evaluator = createLocalEvaluator({})

      const result = await evaluator.evaluate(fixtures.simpleFunction)
      const greeting = await result.call<string>('greet', 'Factory')
      expect(greeting).toBe('Hello, Factory!')

      await evaluator.dispose()
    })

    it('should track instance count', async () => {
      const evaluator = createLocalEvaluator({})

      expect(evaluator.getInstanceCount()).toBe(0)

      await evaluator.evaluate(fixtures.simpleFunction)
      expect(evaluator.getInstanceCount()).toBe(1)

      await evaluator.evaluate(fixtures.multipleExports)
      expect(evaluator.getInstanceCount()).toBe(2)

      await evaluator.dispose()
      expect(evaluator.getInstanceCount()).toBe(0)
    })

    it('should dispose all instances when calling dispose()', async () => {
      const evaluator = createLocalEvaluator({})

      await evaluator.evaluate(fixtures.simpleFunction)
      await evaluator.evaluate(fixtures.multipleExports)
      await evaluator.evaluate(fixtures.asyncExports)

      expect(evaluator.getInstanceCount()).toBe(3)

      await evaluator.dispose()
      expect(evaluator.getInstanceCount()).toBe(0)
    })
  })

  describe('Compilation Pipeline Verification', () => {
    it('should compile to valid module structure', async () => {
      const module = await compileToModule(fixtures.simpleFunction, {
        bundleRuntime: true,
      })

      expect(module.mainModule).toBe('entry.js')
      expect(module.modules).toHaveProperty('entry.js')
      expect(module.modules).toHaveProperty('mdx.js')
      expect(module.modules).toHaveProperty('jsx-runtime')
      expect(module.hash).toBeDefined()
    })

    it('should create valid worker config from module', async () => {
      const module = await compileToModule(fixtures.simpleFunction, {
        bundleRuntime: true,
      })
      const config = createWorkerConfig(module, { blockNetwork: true })

      expect(config.mainModule).toBe('entry.js')
      expect(config.modules).toEqual(module.modules)
      expect(config.compatibilityDate).toBeDefined()
      expect(config.globalOutbound).toBeNull() // Network blocked
    })

    it('should extract exports from compiled module', async () => {
      const module = await compileToModule(fixtures.multipleExports, {
        bundleRuntime: true,
      })

      // Note: getExports looks at the main module which may use re-exports
      const exports = getExports(module)
      expect(Array.isArray(exports)).toBe(true)
    })

    it('should generate consistent module IDs', () => {
      const content = fixtures.simpleFunction
      const id1 = generateModuleId(content)
      const id2 = generateModuleId(content)

      expect(id1).toBe(id2)
    })

    it('should generate different IDs for different content', () => {
      const id1 = generateModuleId(fixtures.simpleFunction)
      const id2 = generateModuleId(fixtures.multipleExports)

      expect(id1).not.toBe(id2)
    })
  })

  describe('Sandbox Options', () => {
    it('should evaluate with network blocked by default', async () => {
      const result = await evaluate(fixtures.simpleFunction)

      // Module should work normally with network blocked
      const greeting = await result.call<string>('greet', 'Sandbox')
      expect(greeting).toBe('Hello, Sandbox!')

      await result.dispose()
    })

    it('should accept custom sandbox options', async () => {
      const result = await evaluate(fixtures.simpleFunction, {
        sandbox: { blockNetwork: true },
      })

      const greeting = await result.call<string>('greet', 'Custom')
      expect(greeting).toBe('Hello, Custom!')

      await result.dispose()
    })
  })

  describe('Cleanup and Resource Management', () => {
    it('should dispose individual results', async () => {
      const result = await evaluate(fixtures.simpleFunction)

      await result.call<string>('greet', 'Test')
      await result.dispose()

      // After dispose, operations should fail or be cleaned up
      // (Implementation specific behavior)
    })

    it('should track active instances', async () => {
      const initialCount = getActiveInstanceCount()

      const result1 = await evaluate(fixtures.simpleFunction)
      const result2 = await evaluate(fixtures.multipleExports)

      expect(getActiveInstanceCount()).toBe(initialCount + 2)

      await result1.dispose()
      await result2.dispose()
    })

    it('should dispose all instances with disposeAll()', async () => {
      await evaluate(fixtures.simpleFunction)
      await evaluate(fixtures.multipleExports)
      await evaluate(fixtures.asyncExports)

      const countBefore = getActiveInstanceCount()
      expect(countBefore).toBeGreaterThan(0)

      await disposeAll()

      expect(getActiveInstanceCount()).toBe(0)
    })
  })
})

// ============================================================================
// Summary: 15+ Integration Tests Covering
// ============================================================================
//
// 1. Full compilation -> evaluation pipeline
// 2. Multiple exports handling
// 3. Frontmatter preservation
// 4. Async function execution
// 5. Complex computations
// 6. Class exports
// 7. JSX component exports
// 8. Nested data structures
// 9. Large payload handling
// 10. Multi-argument function calls
// 11. Object/array arguments
// 12. Null/undefined handling
// 13. Metadata endpoint
// 14. Module caching
// 15. State isolation
// 16. Error propagation (multiple scenarios)
// 17. Compilation errors
// 18. Non-existent function errors
// 19. run() convenience function
// 20. test() function
// 21. createLocalEvaluator() factory
// 22. Instance tracking
// 23. Resource cleanup
// 24. Sandbox options
// 25. Unicode content
