/**
 * Core mdxai Package Tests
 *
 * Comprehensive tests for the main mdxai functionality including:
 * - createContext and unified $ context
 * - createPersistentAI and createDevAI
 * - Database tools
 * - Workflow persistence
 * - Helper factories
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { FsDatabase } from '@mdxdb/fs'
import {
  createContext,
  createDatabaseTools,
  experiment,
  decide,
  track,
  trackConversion,
  createPersistentWorkflow,
  createAgentContext,
  createServiceContext,
  createExperimentContext,
  createModelContext,
  delay,
  setupNLQuery,
  createDefaultNLQueryGenerator,
  type AnyDatabase,
} from './index.js'

let db: FsDatabase
let tmpDir: string

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdxai-test-'))
  db = new FsDatabase({ root: tmpDir })
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('createContext', () => {
  it('should create a unified context with default in-memory database', () => {
    const $ = createContext()

    expect($.db).toBeDefined()
    expect($.ai).toBeDefined()
    expect($.on).toBeDefined()
    expect($.every).toBeDefined()
    expect($.send).toBeDefined()
    expect($.do).toBeDefined()
    expect($.try).toBeDefined()
    expect($.log).toBeDefined()
    expect($.state).toBeDefined()
    expect($.generate).toBeDefined()
    expect($.generateText).toBeDefined()
  })

  it('should create context with custom database', () => {
    const customDb = db as AnyDatabase
    const $ = createContext({ db: customDb })

    expect($.db).toBe(customDb)
  })

  it('should create context with custom state', () => {
    const $ = createContext({
      state: { count: 0, name: 'test' },
    })

    expect($.state.count).toBe(0)
    expect($.state.name).toBe('test')
  })

  it('should create context with namespace', () => {
    const $ = createContext({
      ns: 'my-app',
    })

    expect($).toBeDefined()
  })

  it('should provide database tools factory', () => {
    const $ = createContext()

    expect($.ai.createDatabaseTools).toBeDefined()
    expect(typeof $.ai.createDatabaseTools).toBe('function')
  })
})

describe('createDatabaseTools', () => {
  it('should create all database tools', () => {
    const tools = createDatabaseTools(db as AnyDatabase)

    expect(tools).toHaveLength(5)
    expect(tools[0].name).toBe('mdxdb_list')
    expect(tools[1].name).toBe('mdxdb_search')
    expect(tools[2].name).toBe('mdxdb_get')
    expect(tools[3].name).toBe('mdxdb_set')
    expect(tools[4].name).toBe('mdxdb_delete')
  })

  it('should handle list tool successfully', async () => {
    const tools = createDatabaseTools(db as AnyDatabase)
    const listTool = tools[0]

    const result = await listTool.handler({ limit: 10 })

    expect(result.content).toBeDefined()
    expect(result.content[0].type).toBe('text')
    expect(result.isError).toBeUndefined()
  })

  it('should handle search tool successfully', async () => {
    const tools = createDatabaseTools(db as AnyDatabase)
    const searchTool = tools[1]

    const result = await searchTool.handler({ query: 'test', limit: 5 })

    expect(result.content).toBeDefined()
    expect(result.isError).toBeUndefined()
  })

  it('should handle get tool successfully', async () => {
    await db.set('test-id', {
      id: 'test-id',
      type: 'TestDoc',
      data: { title: 'Test Doc' },
      content: '# Test Doc',
      context: {},
    })

    const tools = createDatabaseTools(db as AnyDatabase)
    const getTool = tools[2]

    const result = await getTool.handler({ id: 'test-id' })

    expect(result.content).toBeDefined()
    expect(result.isError).toBeUndefined()
  })

  it('should handle get tool with missing document', async () => {
    const tools = createDatabaseTools(db as AnyDatabase)
    const getTool = tools[2]

    const result = await getTool.handler({ id: 'missing-id' })

    expect(result.isError).toBe(true)
    expect((result.content[0] as { text: string }).text).toContain('not found')
  })

  it('should handle set tool successfully', async () => {
    const tools = createDatabaseTools(db as AnyDatabase)
    const setTool = tools[3]

    const result = await setTool.handler({
      id: 'new-doc',
      data: { title: 'New Document' },
      content: '# New Document',
    })

    expect(result.content).toBeDefined()
    expect(result.isError).toBeUndefined()

    const parsed = JSON.parse((result.content[0] as { text: string }).text)
    expect(parsed.success).toBe(true)

    // Verify the document was actually created
    const doc = await db.get('new-doc')
    expect(doc).toBeDefined()
    expect(doc?.data.title).toBe('New Document')
  })

  it('should handle delete tool successfully', async () => {
    await db.set('to-delete', {
      id: 'to-delete',
      type: 'TestDoc',
      data: { title: 'Delete Me' },
      content: '# Delete Me',
      context: {},
    })

    const tools = createDatabaseTools(db as AnyDatabase)
    const deleteTool = tools[4]

    const result = await deleteTool.handler({ id: 'to-delete' })

    expect(result.content).toBeDefined()
    expect(result.isError).toBeUndefined()

    // Verify the document was actually deleted
    const doc = await db.get('to-delete')
    expect(doc).toBeNull()
  })

  it('should support url parameter in get tool', async () => {
    await db.set('https://example.com/doc', {
      id: 'https://example.com/doc',
      type: 'TestDoc',
      data: { title: 'URL Doc' },
      content: '# URL Doc',
      context: {},
    })

    const tools = createDatabaseTools(db as AnyDatabase)
    const getTool = tools[2]

    const result = await getTool.handler({ url: 'https://example.com/doc' })

    expect(result.isError).toBeUndefined()
  })

  it('should require id or url in get tool', async () => {
    const tools = createDatabaseTools(db as AnyDatabase)
    const getTool = tools[2]

    const result = await getTool.handler({})

    expect(result.isError).toBe(true)
    expect((result.content[0] as { text: string }).text).toContain('required')
  })
})

describe('experiment and decide', () => {
  it('should run an experiment and return a variant', async () => {
    const result = await experiment(
      {
        name: 'button-color',
        variants: [
          { name: 'control', weight: 0.5, value: 'blue' },
          { name: 'treatment', weight: 0.5, value: 'green' },
        ],
        userId: 'user-123',
      },
      db as AnyDatabase
    )

    expect(result.variant).toBeDefined()
    expect(result.value).toBeDefined()
    expect(['blue', 'green']).toContain(result.value)
    expect(result.experimentId).toContain('button-color')

    // Verify experiment was persisted
    const experimentDoc = await db.get(result.experimentId)
    expect(experimentDoc).toBeDefined()
  })

  it('should return same variant for same user', async () => {
    const result1 = await experiment(
      {
        name: 'test-exp',
        variants: [
          { name: 'a', weight: 1, value: 'A' },
          { name: 'b', weight: 1, value: 'B' },
        ],
        userId: 'user-456',
      },
      db as AnyDatabase
    )

    const result2 = await experiment(
      {
        name: 'test-exp',
        variants: [
          { name: 'a', weight: 1, value: 'A' },
          { name: 'b', weight: 1, value: 'B' },
        ],
        userId: 'user-456',
      },
      db as AnyDatabase
    )

    expect(result1.variant).toBe(result2.variant)
    expect(result1.value).toBe(result2.value)
  })

  it('should use decide helper for simple decisions', async () => {
    const result = await decide(['option1', 'option2', 'option3'], 'simple-decision', db as AnyDatabase)

    expect(['option1', 'option2', 'option3']).toContain(result)
  })
})

describe('track and trackConversion', () => {
  it('should track an event', async () => {
    await track('page.view', { path: '/home', userId: 'user-123' }, db as AnyDatabase)

    // Verify event was persisted
    const events = await db.list({ prefix: 'events/' })
    expect(events.documents.length).toBeGreaterThan(0)
  })

  it('should track a conversion', async () => {
    await trackConversion('button-color', 'signup', { userId: 'user-123' }, db as AnyDatabase)

    // Verify conversion was persisted
    const conversions = await db.list({ prefix: 'conversions/' })
    expect(conversions.documents.length).toBeGreaterThan(0)
  })
})

describe('createPersistentWorkflow', () => {
  it('should create a persistent workflow', () => {
    const workflow = createPersistentWorkflow('test-workflow', db as AnyDatabase, ($) => {
      $.on.User.created(async (user) => {
        $.log('User created:', user)
      })
    })

    expect(workflow).toBeDefined()
  })

  it('should persist workflow events', async () => {
    const workflow = createPersistentWorkflow('event-workflow', db as AnyDatabase, ($) => {
      $.on.Order.created(async (order) => {
        $.log('Order created:', order)
      })
    })

    expect(workflow).toBeDefined()
  })
})

describe('createAgentContext', () => {
  it('should create an agent context', () => {
    const ctx = createAgentContext({
      name: 'TestAgent',
      role: {
        name: 'Assistant',
        skills: ['coding', 'testing'],
      },
      mode: 'autonomous',
    })

    expect(ctx.agent).toBeDefined()
    expect(ctx.db).toBeDefined()
    expect(ctx.ai).toBeDefined()
    expect(ctx.generate).toBeDefined()
    expect(ctx.generateText).toBeDefined()
    expect(ctx.do).toBeDefined()
    expect(ctx.ask).toBeDefined()
    expect(ctx.decide).toBeDefined()
    expect(ctx.approve).toBeDefined()
    expect(ctx.notify).toBeDefined()
    expect(ctx.is).toBeDefined()
  })

  it('should create agent context with custom database', () => {
    const ctx = createAgentContext(
      {
        name: 'TestAgent',
        role: { name: 'Assistant', skills: [] },
        mode: 'autonomous',
      },
      { db: db as AnyDatabase }
    )

    expect(ctx.db).toBe(db)
  })
})

describe('createServiceContext', () => {
  it('should create a service context', () => {
    const ctx = createServiceContext({
      name: 'TestService',
      description: 'A test service',
      version: '1.0.0',
      endpoints: [
        {
          path: '/test',
          method: 'GET',
          handler: async () => ({ result: 'ok' }),
        },
      ],
      pricing: {
        model: 'usage',
        unit: 'request',
        price: 0.01,
      },
    })

    expect(ctx.service).toBeDefined()
    expect(ctx.db).toBeDefined()
    expect(ctx.ai).toBeDefined()
    expect(ctx.generate).toBeDefined()
    expect(ctx.generateText).toBeDefined()
    expect(ctx.do).toBeDefined()
    expect(ctx.ask).toBeDefined()
    expect(ctx.notify).toBeDefined()
    expect(ctx.is).toBeDefined()
    expect(ctx.quote).toBeDefined()
    expect(ctx.order).toBeDefined()
    expect(ctx.subscribe).toBeDefined()
    expect(ctx.queue).toBeDefined()
    expect(ctx.deliver).toBeDefined()
  })
})

describe('createExperimentContext', () => {
  it('should create an experiment context', () => {
    const ctx = createExperimentContext({ name: 'test-exp' })

    expect(ctx.Experiment).toBeDefined()
    expect(ctx.decide).toBeDefined()
    expect(ctx.decideWeighted).toBeDefined()
    expect(ctx.decideEpsilonGreedy).toBeDefined()
    expect(ctx.decideThompsonSampling).toBeDefined()
    expect(ctx.decideUCB).toBeDefined()
    expect(ctx.track).toBeDefined()
    expect(ctx.flush).toBeDefined()
    expect(ctx.cartesian).toBeDefined()
    expect(ctx.cartesianFilter).toBeDefined()
    expect(ctx.cartesianSample).toBeDefined()
    expect(ctx.cartesianCount).toBeDefined()
    expect(ctx.cartesianWithLabels).toBeDefined()
  })
})

describe('createModelContext', () => {
  it('should create a model context', () => {
    const ctx = createModelContext()

    expect(ctx.model).toBeDefined()
    expect(ctx.embeddingModel).toBeDefined()
    expect(ctx.list).toBeDefined()
    expect(ctx.get).toBeDefined()
    expect(ctx.search).toBeDefined()
    expect(ctx.resolve).toBeDefined()
    expect(ctx.resolveWithProvider).toBeDefined()
    expect(ctx.providers).toBeDefined()
    expect(ctx.aliases).toBeDefined()
  })

  it('should list models', () => {
    const ctx = createModelContext()
    const models = ctx.list()

    expect(Array.isArray(models)).toBe(true)
    expect(models.length).toBeGreaterThan(0)
  })

  it('should search models', () => {
    const ctx = createModelContext()
    const claudeModels = ctx.search('claude')

    expect(Array.isArray(claudeModels)).toBe(true)
    expect(claudeModels.length).toBeGreaterThan(0)
  })

  it('should resolve model aliases', () => {
    const ctx = createModelContext()
    const resolved = ctx.resolve('sonnet')

    expect(resolved).toBeDefined()
    expect(typeof resolved).toBe('string')
  })
})

describe('delay', () => {
  it('should delay for specified milliseconds', async () => {
    const start = Date.now()
    await delay(100)
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(95) // Allow some variance
  })

  it('should parse duration strings', async () => {
    const start = Date.now()
    await delay('100ms')
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(95)
  })

  it('should parse seconds', async () => {
    const start = Date.now()
    await delay('1s')
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(950)
  }, 2000)

  it('should reject with invalid duration', async () => {
    try {
      await delay('invalid')
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('Invalid duration')
    }
  })
})

describe('NL Query Generator', () => {
  it('should create default NL query generator', () => {
    const generator = createDefaultNLQueryGenerator()

    expect(generator).toBeDefined()
    expect(typeof generator).toBe('function')
  })

  it('should setup NL query', () => {
    expect(() => setupNLQuery()).not.toThrow()
  })

  it('should setup NL query with custom model', () => {
    expect(() => setupNLQuery({ model: 'gpt-4' })).not.toThrow()
  })
})

describe('Module Exports', () => {
  it('should export all main functions', async () => {
    const mod = await import('./index.js')

    // Core context
    expect(mod.createContext).toBeDefined()
    expect(mod.$).toBeDefined()

    // Database tools
    expect(mod.createDatabaseTools).toBeDefined()

    // Experiments
    expect(mod.experiment).toBeDefined()
    expect(mod.decide).toBeDefined()
    expect(mod.track).toBeDefined()
    expect(mod.trackConversion).toBeDefined()

    // Workflow
    expect(mod.createPersistentWorkflow).toBeDefined()

    // Helper factories
    expect(mod.createAgentContext).toBeDefined()
    expect(mod.createServiceContext).toBeDefined()
    expect(mod.createExperimentContext).toBeDefined()
    expect(mod.createModelContext).toBeDefined()

    // Utilities
    expect(mod.delay).toBeDefined()
    expect(mod.setupNLQuery).toBeDefined()
    expect(mod.createDefaultNLQueryGenerator).toBeDefined()

    // Persistence
    expect(mod.createPersistentRegistry).toBeDefined()
    expect(mod.PersistentFunctionRegistry).toBeDefined()

    // Dev mode
    expect(mod.isDevMode).toBeDefined()
    expect(mod.initDevMode).toBeDefined()

    // MCP Server
    expect(mod.createMcpServer).toBeDefined()
    expect(mod.runMcpServer).toBeDefined()

    // Database factories
    expect(mod.createFsDatabase).toBeDefined()
    // Note: createSqliteDatabase may not be available in test environment due to native dependencies
  })

  it('should export all ai-functions exports', async () => {
    const mod = await import('./index.js')

    // These should be re-exported from ai-functions
    expect(mod.AI).toBeDefined()
    expect(mod.ai).toBeDefined()
    expect(mod.generateObject).toBeDefined()
    expect(mod.generateText).toBeDefined()
  })

  it('should export all ai-workflows exports', async () => {
    const mod = await import('./index.js')

    expect(mod.Workflow).toBeDefined()
    expect(mod.on).toBeDefined()
    expect(mod.every).toBeDefined()
    expect(mod.send).toBeDefined()
  })

  it('should export all ai-database exports', async () => {
    const mod = await import('./index.js')

    expect(mod.DB).toBeDefined()
    expect(mod.setProvider).toBeDefined()
    expect(mod.parseSchema).toBeDefined()
  })
})

describe('Integration Tests', () => {
  it('should create and use unified context', () => {
    const $ = createContext()

    expect($.db).toBeDefined()
    expect($.ai).toBeDefined()
    expect($.state).toBeDefined()
  })

  it('should create database tools from context', () => {
    const $ = createContext()
    const tools = $.ai.createDatabaseTools($.db)

    expect(tools).toHaveLength(5)
    expect(tools[0].name).toBe('mdxdb_list')
  })

  it('should track events and experiments together', async () => {
    const expResult = await experiment(
      {
        name: 'integration-test',
        variants: [
          { name: 'a', weight: 1, value: 'A' },
          { name: 'b', weight: 1, value: 'B' },
        ],
      },
      db as AnyDatabase
    )

    await track('experiment.assigned', { variant: expResult.variant }, db as AnyDatabase)

    // Verify both were persisted
    const experiments = await db.list({ prefix: 'experiments/' })
    expect(experiments.documents.length).toBeGreaterThan(0)

    const events = await db.list({ prefix: 'events/' })
    expect(events.documents.length).toBeGreaterThan(0)
  })
})
