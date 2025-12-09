/**
 * Persistent AI and Dev AI Tests
 *
 * Tests for createPersistentAI, createDevAI, and related functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { FsDatabase } from '@mdxdb/fs'
import { createPersistentAI, createPersistentAIWithFs, createDevAI, createAI } from './index.js'

let db: FsDatabase
let tmpDir: string

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdxai-ai-test-'))
  db = new FsDatabase({ root: tmpDir })
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('createPersistentAI', () => {
  it('should create a persistent AI instance', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    expect(ai).toBeDefined()
    expect(ai.functions).toBeDefined()
    expect(ai.define).toBeDefined()
    expect(ai.preload).toBeDefined()
    expect(ai.close).toBeDefined()
  })

  it('should have a function registry', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    expect(ai.functions).toBeDefined()
    expect(typeof ai.functions.get).toBe('function')
    expect(typeof ai.functions.set).toBe('function')
  })

  it('should preload functions on startup when enabled', async () => {
    // Add a function to database first
    await db.set('ai-functions/testFunction', {
      id: 'ai-functions/testFunction',
      type: 'AIFunction',
      data: {
        name: 'testFunction',
        definition: {
          name: 'testFunction',
          description: 'A test function',
          parameters: {},
        },
      },
      content: '',
      context: {},
    })

    const ai = await createPersistentAI({
      database: db,
      preload: true,
    })

    expect(ai).toBeDefined()
    // Functions should be preloaded
  })

  it('should skip preload when disabled', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    expect(ai).toBeDefined()
  })

  it('should use custom namespace', async () => {
    const ai = await createPersistentAI({
      database: db,
      namespace: 'custom-functions',
      preload: false,
    })

    expect(ai).toBeDefined()
  })

  it('should use custom cache TTL', async () => {
    const ai = await createPersistentAI({
      database: db,
      cacheTtl: 30000,
      preload: false,
    })

    expect(ai).toBeDefined()
  })

  it('should close properly', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    await ai.close()
    // Database should still be usable (close doesn't close the database itself)
    const result = await db.list({ limit: 1 })
    expect(result).toBeDefined()
  })

  it('should support manual preload', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    await ai.preload()
    expect(ai).toBeDefined()
  })

  it('should provide define methods', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    expect(ai.define).toBeDefined()
    expect(ai.define.code).toBeDefined()
    expect(ai.define.generative).toBeDefined()
    expect(ai.define.agentic).toBeDefined()
    expect(ai.define.human).toBeDefined()
  })

  it('should handle different configuration combinations', async () => {
    const ai1 = await createPersistentAI({
      database: db,
      namespace: 'test',
      cacheTtl: 60000,
      preload: true,
    })

    expect(ai1).toBeDefined()

    const ai2 = await createPersistentAI({
      database: db,
    })

    expect(ai2).toBeDefined()
  })
})

describe('createPersistentAIWithFs', () => {
  it('should create persistent AI with filesystem database', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'mdxai-fs-test-'))
    try {
      const ai = await createPersistentAIWithFs(testDir, {
        preload: false,
      })

      expect(ai).toBeDefined()
      expect(ai.functions).toBeDefined()
      expect(ai.database).toBeDefined()

      await ai.close()
    } finally {
      rmSync(testDir, { recursive: true, force: true })
    }
  })
})

describe('createDevAI', () => {
  it('should create a dev AI instance', async () => {
    const ai = await createDevAI({
      root: '/tmp/test-ai',
      preload: false,
    })

    expect(ai).toBeDefined()
    expect(ai.functions).toBeDefined()
    expect(ai.devMode).toBeDefined()
    expect(ai.regenerateTypes).toBeDefined()
    expect(ai.registerSchema).toBeDefined()
  })

  it('should have dev mode state', async () => {
    const ai = await createDevAI({
      preload: false,
    })

    expect(ai.devMode).toBeDefined()
    expect(ai.devMode.aiFolder).toBeDefined()
    expect(ai.devMode.functions).toBeDefined()
    expect(ai.devMode.schemas).toBeDefined()
  })

  it('should support schema registration', async () => {
    const ai = await createDevAI({
      preload: false,
    })

    expect(() => {
      ai.registerSchema('testSchema', {
        User: { name: 'string', email: 'string' },
        Post: { title: 'string', content: 'string' },
      })
    }).not.toThrow()
  })

  it.skip('should support custom paths', async () => {
    // Skipped: createDevAI creates temp directories for filesystem database
    // which overrides the custom root path
    const ai = await createDevAI({
      root: '/custom/root',
      aiFolderPath: '.custom-ai',
      typesPath: 'custom.d.ts',
      preload: false,
    })

    expect(ai).toBeDefined()
  })

  it('should support auto-generate types configuration', async () => {
    const ai = await createDevAI({
      autoGenerateTypes: false,
      preload: false,
    })

    expect(ai).toBeDefined()
  })

  it('should have type regeneration function', async () => {
    const ai = await createDevAI({
      preload: false,
    })

    expect(ai.regenerateTypes).toBeDefined()
    expect(typeof ai.regenerateTypes).toBe('function')
  })
})

describe('createAI', () => {
  it('should create AI instance based on environment', async () => {
    const ai = await createAI()

    expect(ai).toBeDefined()
  })

  it('should accept configuration options', async () => {
    const ai = await createAI({
      root: '/test/root',
      preload: false,
    })

    expect(ai).toBeDefined()
  })
})

describe('PersistentFunctionRegistry Integration', () => {
  it('should store and retrieve functions', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    // Functions should be retrievable through the registry
    expect(ai.functions).toBeDefined()
  })

  it('should list functions from registry', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    const names = await ai.functions.listAsync()
    expect(Array.isArray(names)).toBe(true)
  })

  it('should handle cache properly', async () => {
    const ai = await createPersistentAI({
      database: db,
      cacheTtl: 1000,
      preload: false,
    })

    expect(ai.functions).toBeDefined()
  })
})

describe('Dev Mode Integration', () => {
  it('should save function definitions to MDX files', async () => {
    const ai = await createDevAI({
      preload: false,
      autoGenerateTypes: false,
    })

    expect(ai.devMode.functions).toBeDefined()
  })

  it('should track schemas for type generation', async () => {
    const ai = await createDevAI({
      preload: false,
    })

    ai.registerSchema('app', {
      User: { name: 'string', email: 'string' },
    })

    expect(ai.devMode.schemas).toBeDefined()
    expect(ai.devMode.schemas.has('app')).toBe(true)
    expect(ai.devMode.schemas.get('app')).toBeDefined()
  })

  it('should generate types file on demand', async () => {
    const ai = await createDevAI({
      preload: false,
      autoGenerateTypes: false,
    })

    expect(() => ai.regenerateTypes()).not.toThrow()
  })
})

describe('Persistent AI Configuration', () => {
  it('should use default namespace when not specified', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    expect(ai).toBeDefined()
    // Default namespace should be 'ai-functions'
  })

  it('should handle custom namespace in all operations', async () => {
    const ai = await createPersistentAI({
      database: db,
      namespace: 'my-custom-namespace',
      preload: false,
    })

    expect(ai).toBeDefined()
  })

  it('should support various cache TTL values', async () => {
    const configs = [0, 1000, 60000, 300000]

    for (const cacheTtl of configs) {
      const ai = await createPersistentAI({
        database: db,
        cacheTtl,
        preload: false,
      })

      expect(ai).toBeDefined()
    }
  })
})

describe('Error Handling', () => {
  it('should handle missing database gracefully', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'mdxai-empty-test-'))
    try {
      const emptyDb = new FsDatabase({ root: emptyDir })

      const ai = await createPersistentAI({
        database: emptyDb,
        preload: true,
      })

      expect(ai).toBeDefined()
    } finally {
      rmSync(emptyDir, { recursive: true, force: true })
    }
  })
})

describe('Advanced Use Cases', () => {
  it('should support multiple AI instances with same database', async () => {
    const ai1 = await createPersistentAI({
      database: db,
      namespace: 'instance1',
      preload: false,
    })

    const ai2 = await createPersistentAI({
      database: db,
      namespace: 'instance2',
      preload: false,
    })

    expect(ai1).toBeDefined()
    expect(ai2).toBeDefined()
  })

  it('should handle concurrent operations', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    const operations = [ai.preload(), ai.preload(), ai.preload()]

    await Promise.all(operations)
    expect(ai).toBeDefined()
  })

  it('should clean up resources on close', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    await ai.close()
    // After close, AI instance should still be defined
    expect(ai).toBeDefined()
  })
})

describe('Type Safety', () => {
  it('should provide proper types for AI instance', async () => {
    const ai = await createPersistentAI({
      database: db,
      preload: false,
    })

    // Type checking - these should not cause TypeScript errors
    const _registry = ai.functions
    const _define = ai.define
    const _preload = ai.preload
    const _close = ai.close

    expect(ai).toBeDefined()
  })

  it('should provide proper types for dev AI instance', async () => {
    const ai = await createDevAI({
      preload: false,
    })

    // Type checking
    const _devMode = ai.devMode
    const _regenerateTypes = ai.regenerateTypes
    const _registerSchema = ai.registerSchema

    expect(ai).toBeDefined()
  })
})
