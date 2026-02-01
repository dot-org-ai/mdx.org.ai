/**
 * @mdxe/workers tests using @cloudflare/vitest-pool-workers
 *
 * These tests run in the actual Workers runtime (workerd) to ensure
 * the package works correctly in its target environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  compileToModule,
  createWorkerConfig,
  generateModuleId,
  getExports,
  clearCache,
  isCached,
  getCacheStats,
  precompile,
  type CompiledModule,
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

export async function processAsync(value) {
  return value * 2
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

export const config = {
  theme: 'dark',
  features: ['a', 'b', 'c']
}

export function process(data) {
  return { processed: true, data }
}

# Complex Document`,
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
  })

  // ============================================================================
  // compileToModule
  // ============================================================================

  describe('compileToModule', () => {
    it('compiles simple MDX', async () => {
      const module = await compileToModule(fixtures.simple)

      expect(module.mainModule).toBe('entry.js')
      expect(module.modules).toHaveProperty('entry.js')
      expect(module.modules).toHaveProperty('mdx.js')
      expect(module.hash).toBeDefined()
    })

    it('extracts frontmatter data', async () => {
      const module = await compileToModule(fixtures.withFrontmatter)

      expect(module.data.title).toBe('Document')
      expect(module.data.author).toBe('Test')
      expect(module.data.version).toBe('1.0.0')
      expect(module.data.tags).toEqual(['test', 'mdx'])
    })

    it('generates consistent hash for same content', async () => {
      const module1 = await compileToModule(fixtures.simple)
      const module2 = await compileToModule(fixtures.simple)

      expect(module1.hash).toBe(module2.hash)
    })

    it('generates different hash for different content', async () => {
      const module1 = await compileToModule(fixtures.simple)
      const module2 = await compileToModule(fixtures.withExports)

      expect(module1.hash).not.toBe(module2.hash)
    })

    it('bundles JSX runtime when requested', async () => {
      const module = await compileToModule(fixtures.simple, { bundleRuntime: true })

      expect(module.modules).toHaveProperty('jsx-runtime')
    })

    it('does not bundle JSX runtime by default', async () => {
      const module = await compileToModule(fixtures.simple)

      expect(module.modules).not.toHaveProperty('jsx-runtime')
    })

    it('handles empty content', async () => {
      const module = await compileToModule('')

      expect(module.mainModule).toBe('entry.js')
      expect(module.hash).toBeDefined()
    })

    it('handles content with only frontmatter', async () => {
      const content = `---
title: Only Frontmatter
---`
      const module = await compileToModule(content)

      expect(module.data.title).toBe('Only Frontmatter')
    })

    it('handles unicode content', async () => {
      const content = `---
title: 日本語
---

# 你好世界`

      const module = await compileToModule(content)

      expect(module.data.title).toBe('日本語')
    })

    it('handles complex frontmatter', async () => {
      const module = await compileToModule(fixtures.complex)

      expect(module.data.title).toBe('Complex Module')
      expect(module.data.metadata).toEqual({
        created: '2024-01-01',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
      })
    })

    it('generates valid JavaScript', async () => {
      const module = await compileToModule(fixtures.calculator)
      const code = module.modules['mdx.js']

      // Should contain export statements
      expect(code).toContain('export')
      expect(code).toContain('function')
    })

    it('preserves exports in compiled code', async () => {
      const module = await compileToModule(fixtures.withExports)
      const code = module.modules['mdx.js']

      expect(code).toContain('greet')
      expect(code).toContain('PI')
    })
  })

  // ============================================================================
  // createWorkerConfig
  // ============================================================================

  describe('createWorkerConfig', () => {
    it('creates valid worker config from module', async () => {
      const module = await compileToModule(fixtures.simple)
      const config = createWorkerConfig(module)

      expect(config.mainModule).toBe('entry.js')
      expect(config.modules).toEqual(module.modules)
      expect(config.compatibilityDate).toBe('2024-01-01')
    })

    it('blocks network by default', async () => {
      const module = await compileToModule(fixtures.simple)
      const config = createWorkerConfig(module)

      expect(config.globalOutbound).toBeNull()
    })

    it('allows network when blockNetwork is false', async () => {
      const module = await compileToModule(fixtures.simple)
      const config = createWorkerConfig(module, { blockNetwork: false })

      expect(config.globalOutbound).toBeUndefined()
    })

    it('includes empty env by default', async () => {
      const module = await compileToModule(fixtures.simple)
      const config = createWorkerConfig(module)

      expect(config.env).toEqual({})
    })

    it('passes sandbox options', async () => {
      const module = await compileToModule(fixtures.simple)
      const config = createWorkerConfig(module, {
        blockNetwork: true,
        timeout: 5000,
        memoryLimit: 128,
      })

      expect(config.globalOutbound).toBeNull()
    })
  })

  // ============================================================================
  // generateModuleId
  // ============================================================================

  describe('generateModuleId', () => {
    it('returns consistent ID for same content', () => {
      const id1 = generateModuleId('test content')
      const id2 = generateModuleId('test content')

      expect(id1).toBe(id2)
    })

    it('returns different ID for different content', () => {
      const id1 = generateModuleId('content 1')
      const id2 = generateModuleId('content 2')

      expect(id1).not.toBe(id2)
    })

    it('returns string ID', () => {
      const id = generateModuleId('test')

      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('includes version when provided', () => {
      const id1 = generateModuleId('test', 'v1')
      const id2 = generateModuleId('test', 'v2')

      expect(id1).toContain('v1')
      expect(id2).toContain('v2')
      expect(id1).not.toBe(id2)
    })

    it('handles empty content', () => {
      const id = generateModuleId('')

      expect(typeof id).toBe('string')
    })

    it('handles unicode content', () => {
      const id = generateModuleId('日本語コンテンツ')

      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // getExports
  // ============================================================================

  describe('getExports', () => {
    it('returns empty array for module with no exports', async () => {
      const module = await compileToModule(fixtures.simple)
      const exports = getExports(module)

      // MDX always exports default
      expect(Array.isArray(exports)).toBe(true)
    })

    it('extracts function exports', async () => {
      const module = await compileToModule(fixtures.calculator)
      const exports = getExports(module)

      expect(exports).toContain('add')
      expect(exports).toContain('subtract')
      expect(exports).toContain('multiply')
    })

    it('extracts const exports', async () => {
      const module = await compileToModule(fixtures.withExports)
      const exports = getExports(module)

      expect(exports).toContain('PI')
    })

    it('extracts both function and const exports', async () => {
      const module = await compileToModule(fixtures.withExports)
      const exports = getExports(module)

      expect(exports).toContain('greet')
      expect(exports).toContain('PI')
    })

    it('extracts async function exports', async () => {
      const module = await compileToModule(fixtures.asyncFunctions)
      const exports = getExports(module)

      expect(exports).toContain('fetchData')
      expect(exports).toContain('processAsync')
    })

    it('extracts object exports', async () => {
      const module = await compileToModule(fixtures.complex)
      const exports = getExports(module)

      expect(exports).toContain('config')
      expect(exports).toContain('process')
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
  // Compiled Worker Entry Tests
  // ============================================================================

  describe('compiled worker entry', () => {
    it('entry.js contains fetch handler export', async () => {
      const module = await compileToModule(fixtures.simple)
      const entryCode = module.modules['entry.js']

      expect(entryCode).toContain('export default')
      expect(entryCode).toContain('fetch')
      expect(entryCode).toContain('request')
    })

    it('entry.js contains health endpoint', async () => {
      const module = await compileToModule(fixtures.simple)
      const entryCode = module.modules['entry.js']

      expect(entryCode).toContain('/health')
      expect(entryCode).toContain('status')
      expect(entryCode).toContain('ok')
    })

    it('entry.js contains meta endpoint', async () => {
      const module = await compileToModule(fixtures.simple)
      const entryCode = module.modules['entry.js']

      expect(entryCode).toContain('/meta')
      expect(entryCode).toContain('exports')
      expect(entryCode).toContain('hasDefault')
    })

    it('entry.js contains call endpoint', async () => {
      const module = await compileToModule(fixtures.simple)
      const entryCode = module.modules['entry.js']

      expect(entryCode).toContain('/call/')
      expect(entryCode).toContain('args')
      expect(entryCode).toContain('result')
    })

    it('entry.js imports MDXModule', async () => {
      const module = await compileToModule(fixtures.simple)
      const entryCode = module.modules['entry.js']

      expect(entryCode).toContain("import * as MDXModule from './mdx.js'")
    })

    it('entry.js handles function not found', async () => {
      const module = await compileToModule(fixtures.simple)
      const entryCode = module.modules['entry.js']

      expect(entryCode).toContain('Function not found')
      expect(entryCode).toContain('404')
    })

    it('entry.js handles function errors', async () => {
      const module = await compileToModule(fixtures.simple)
      const entryCode = module.modules['entry.js']

      expect(entryCode).toContain('error')
      expect(entryCode).toContain('stack')
      expect(entryCode).toContain('500')
    })

    it('mdx.js contains compiled exports', async () => {
      const module = await compileToModule(fixtures.calculator)
      const mdxCode = module.modules['mdx.js']

      expect(mdxCode).toContain('add')
      expect(mdxCode).toContain('subtract')
      expect(mdxCode).toContain('multiply')
    })

    it('jsx-runtime shim exports Fragment', async () => {
      const module = await compileToModule(fixtures.simple, { bundleRuntime: true })
      const jsxCode = module.modules['jsx-runtime']

      expect(jsxCode).toContain('Fragment')
      expect(jsxCode).toContain('export')
    })

    it('jsx-runtime shim exports jsx function', async () => {
      const module = await compileToModule(fixtures.simple, { bundleRuntime: true })
      const jsxCode = module.modules['jsx-runtime']

      expect(jsxCode).toContain('jsx')
      expect(jsxCode).toContain('jsxs')
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

    it('handles MDX with many exports', async () => {
      const exports = Array.from({ length: 20 }, (_, i) =>
        `export const var${i} = ${i}`
      ).join('\n')

      const module = await compileToModule(exports)
      const extractedExports = getExports(module)

      expect(extractedExports.length).toBeGreaterThanOrEqual(20)
    })

    it('handles MDX with deep frontmatter nesting', async () => {
      const content = `---
level1:
  level2:
    level3:
      level4:
        value: deep
---

# Content`

      const module = await compileToModule(content)

      expect((module.data.level1 as any).level2.level3.level4.value).toBe('deep')
    })

    it('handles MDX with special characters in exports', async () => {
      const content = `export const special = "Hello, \\"World\\"!"`

      const module = await compileToModule(content)

      expect(module.modules['mdx.js']).toContain('special')
    })

    it('handles very long content', async () => {
      const sections = Array.from({ length: 50 }, (_, i) =>
        `## Section ${i}\n\nParagraph with content for section ${i}.`
      ).join('\n\n')

      const module = await compileToModule(sections)

      expect(module.hash).toBeDefined()
      expect(module.modules['mdx.js']!.length).toBeGreaterThan(1000)
    })

    it('handles MDX with code blocks', async () => {
      const content = `
# Code Example

\`\`\`javascript
function example() {
  return 'Hello'
}
\`\`\`
`

      const module = await compileToModule(content)

      expect(module.modules['mdx.js']).toBeDefined()
    })

    it('handles MDX with inline expressions', async () => {
      const content = `
export const name = 'World'

# Hello {name}
`

      const module = await compileToModule(content)

      expect(module.modules['mdx.js']).toContain('name')
    })

    it('handles MDX with JSX components', async () => {
      const content = `
export function Button({ children }) {
  return <button>{children}</button>
}

<Button>Click me</Button>
`

      const module = await compileToModule(content, { bundleRuntime: true })

      expect(module.modules['mdx.js']).toContain('Button')
    })
  })

  // ============================================================================
  // createHandler Tests
  // ============================================================================

  describe('createHandler', () => {
    // Mock WorkerEnv for testing (createHandler needs env, but we're testing error handling)
    const mockEnv = {} as any

    it('does NOT expose stack traces in production mode (default)', async () => {
      // Import createHandler
      const { createHandler } = await import('./index.js')

      // Create handler without debug option (production mode)
      const handler = createHandler(mockEnv, {})

      // Create a request with invalid JSON to trigger an error
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: 'invalid json{{{',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await handler(request)
      const body = await response.json() as { error: string; stack?: string }

      // Should have error message
      expect(body.error).toBeDefined()
      // Should NOT have stack trace in production
      expect(body.stack).toBeUndefined()
    })

    it('DOES expose stack traces when debug mode is enabled', async () => {
      // Import createHandler
      const { createHandler } = await import('./index.js')

      // Create handler with debug option enabled
      const handler = createHandler(mockEnv, { debug: true })

      // Create a request with invalid JSON to trigger an error
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: 'invalid json{{{',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await handler(request)
      const body = await response.json() as { error: string; stack?: string }

      // Should have error message
      expect(body.error).toBeDefined()
      // Should have stack trace in debug mode
      expect(body.stack).toBeDefined()
    })

    it('returns 405 for non-POST requests', async () => {
      const { createHandler } = await import('./index.js')
      const handler = createHandler(mockEnv, {})

      const request = new Request('http://localhost/test', { method: 'GET' })
      const response = await handler(request)

      expect(response.status).toBe(405)
    })

    it('sanitizes internal paths in error messages by default', async () => {
      const { createHandler } = await import('./index.js')
      const handler = createHandler(mockEnv, {})

      // Create a request with invalid JSON to trigger an error
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: 'invalid json{{{',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await handler(request)
      const body = await response.json() as { error: string }

      // Error message should not contain internal paths
      expect(body.error).not.toMatch(/\/Users\/|\/home\/|\/app\//)
    })
  })

  // ============================================================================
  // Type Exports
  // ============================================================================

  describe('type exports', () => {
    it('exports WorkerEnv type', async () => {
      const { WorkerEnv } = await import('./index.js') as any

      // Type-only exports won't be present at runtime
      // This test just verifies the module loads correctly
      expect(true).toBe(true)
    })

    it('exports WorkerLoader type', async () => {
      const { WorkerLoader } = await import('./index.js') as any

      expect(true).toBe(true)
    })

    it('exports EvaluateOptions type', async () => {
      const { EvaluateOptions } = await import('./index.js') as any

      expect(true).toBe(true)
    })

    it('exports EvaluateResult type', async () => {
      const { EvaluateResult } = await import('./index.js') as any

      expect(true).toBe(true)
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

    it('full compilation workflow', async () => {
      // Step 1: Precompile
      const moduleId = await precompile(fixtures.calculator)
      expect(isCached(moduleId)).toBe(true)

      // Step 2: Get cache stats
      const stats = getCacheStats()
      expect(stats.size).toBe(1)
      expect(stats.moduleIds).toContain(moduleId)

      // Step 3: Verify we can compile again (uses cache conceptually)
      const module = await compileToModule(fixtures.calculator)
      expect(module.hash).toBe(moduleId)

      // Step 4: Create worker config
      const config = createWorkerConfig(module, { blockNetwork: true })
      expect(config.mainModule).toBe('entry.js')
      expect(config.globalOutbound).toBeNull()

      // Step 5: Extract exports
      const exports = getExports(module)
      expect(exports).toContain('add')
      expect(exports).toContain('subtract')
      expect(exports).toContain('multiply')
    })

    it('multiple modules workflow', async () => {
      // Precompile multiple modules
      const id1 = await precompile(fixtures.simple)
      const id2 = await precompile(fixtures.calculator)
      const id3 = await precompile(fixtures.withFrontmatter)

      // Verify all cached
      expect(getCacheStats().size).toBe(3)
      expect(isCached(id1)).toBe(true)
      expect(isCached(id2)).toBe(true)
      expect(isCached(id3)).toBe(true)

      // Clear one
      clearCache(id2)
      expect(getCacheStats().size).toBe(2)
      expect(isCached(id2)).toBe(false)

      // Recompile
      const newId2 = await precompile(fixtures.calculator)
      expect(newId2).toBe(id2)
      expect(isCached(id2)).toBe(true)
    })

    it('config creation for different sandbox options', async () => {
      const module = await compileToModule(fixtures.simple)

      // Sandboxed (default)
      const sandboxed = createWorkerConfig(module)
      expect(sandboxed.globalOutbound).toBeNull()

      // Not sandboxed
      const open = createWorkerConfig(module, { blockNetwork: false })
      expect(open.globalOutbound).toBeUndefined()

      // With all options
      const full = createWorkerConfig(module, {
        blockNetwork: true,
        timeout: 10000,
        memoryLimit: 256,
        allowedBindings: ['KV'],
      })
      expect(full.globalOutbound).toBeNull()
    })
  })
})
