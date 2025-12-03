/**
 * mdxai - Unified AI SDK for MDX-based Applications
 *
 * This package provides a complete AI SDK that combines:
 * - ai-functions: AI primitives, RPC, generation, embeddings, auto-define
 * - ai-workflows: Event-driven workflows with $ context
 * - ai-database: Simplified AI-powered database interface
 * - Persistence: mdxdb-backed storage for functions, workflows, experiments
 * - Database Tools: Tools for AI agents to interact with mdxdb
 *
 * @packageDocumentation
 */

export const name = 'mdxai'

// =============================================================================
// Re-export everything from ai-functions
// =============================================================================

// RPC primitives with capnweb promise pipelining
export * from 'ai-functions'

// =============================================================================
// Re-export everything from ai-workflows
// =============================================================================

export {
  // Main Workflow API
  Workflow,
  createTestContext,
  parseEvent,
  type WorkflowInstance,
  // Event handling
  on,
  registerEventHandler,
  getEventHandlers,
  clearEventHandlers,
  // Scheduling
  every,
  registerScheduleHandler,
  getScheduleHandlers,
  clearScheduleHandlers,
  setCronConverter,
  toCron,
  intervalToMs,
  formatInterval,
  // Event emission
  send,
  getEventBus,
  // Context
  createWorkflowContext,
  createIsolatedContext,
  // Types
  type EventHandler,
  type ScheduleHandler,
  type WorkflowContext,
  type WorkflowState,
  type WorkflowHistoryEntry,
  type EventRegistration,
  type ScheduleRegistration,
  type ScheduleInterval,
  type WorkflowDefinition,
  type WorkflowOptions,
  type ParsedEvent,
  type OnProxy,
  type EveryProxy,
  type HandlerFunction,
  type DatabaseContext,
  type ActionData,
  type ArtifactData,
} from 'ai-workflows'

// =============================================================================
// Re-export everything from ai-database
// =============================================================================

export {
  DB,
  db,
  configureDB,
  type DBOptions,
  MemoryDB,
  createMemoryDB,
} from 'ai-database'

// =============================================================================
// Persistence Provider using mdxdb
// =============================================================================

export {
  createPersistentRegistry,
  PersistentFunctionRegistry,
  type PersistentRegistryConfig,
} from './persistence.js'

// =============================================================================
// MCP Server for Claude integration
// =============================================================================

export { createMcpServer, runMcpServer, McpServer, StdioServerTransport } from './server.js'
export type { McpServerConfig } from './server.js'

// =============================================================================
// Database factories and types
// =============================================================================

// Re-export database factories for convenience
export { createFsDatabase } from '@mdxdb/fs'
export { createSqliteDatabase } from '@mdxdb/sqlite'

// Re-export types
export type { Database, ListOptions, SearchOptions, GetOptions, SetOptions, DeleteOptions, DBClient, Thing } from 'mdxdb'
export type { FsDatabaseConfig } from '@mdxdb/fs'
export type { SqliteDatabaseConfig } from '@mdxdb/sqlite'
export type { MDXLDDocument, MDXLDData, Relationship } from 'mdxld'

// =============================================================================
// AI Database Tools for Agents
// =============================================================================

import type { Database } from 'mdxdb'

/**
 * Flexible database interface that works with both mdxdb Database and ai-database DBClient
 *
 * This allows createDatabaseTools and other helpers to work with either interface
 */
export interface AnyDatabase {
  list(options?: unknown): Promise<unknown>
  search(options?: unknown): Promise<unknown>
  get(id: string, options?: unknown): Promise<unknown>
  set(id: string, doc: unknown, options?: unknown): Promise<unknown>
  delete(id: string, options?: unknown): Promise<unknown>
  close?(): Promise<void>
}

/**
 * Tool response format compatible with Claude SDK
 */
export interface ToolResponse {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

/**
 * Database tool definition for AI agents
 */
export interface DatabaseTool {
  name: string
  description: string
  handler: (args: Record<string, unknown>) => Promise<ToolResponse>
}

/**
 * Create database tools for AI agents
 *
 * Returns an array of tools that AI agents can use to interact with the database:
 * - mdxdb_list: List documents by type
 * - mdxdb_search: Semantic search across documents
 * - mdxdb_get: Get a specific document by ID
 * - mdxdb_set: Create or update a document
 * - mdxdb_delete: Delete a document
 *
 * @example
 * ```ts
 * import { createDatabaseTools } from 'mdxai'
 *
 * const tools = createDatabaseTools(db)
 *
 * // Use with Claude or other AI agents
 * const response = await agent.run({
 *   tools: tools.map(t => ({
 *     name: t.name,
 *     description: t.description,
 *     input_schema: { type: 'object', properties: {...} }
 *   })),
 *   toolHandler: async (name, args) => {
 *     const tool = tools.find(t => t.name === name)
 *     return tool?.handler(args)
 *   }
 * })
 * ```
 */
export function createDatabaseTools(db: AnyDatabase): DatabaseTool[] {
  const success = (data: unknown): ToolResponse => ({
    content: [{ type: 'text', text: JSON.stringify(data) }],
  })

  const error = (message: string): ToolResponse => ({
    content: [{ type: 'text', text: message }],
    isError: true,
  })

  return [
    {
      name: 'mdxdb_list',
      description: 'List documents from the database by type. Returns an array of documents.',
      handler: async (args: Record<string, unknown>) => {
        try {
          const { type, prefix, limit = 100 } = args as { type?: string; prefix?: string; limit?: number }
          const result = await db.list({ type, prefix, limit })
          // Handle both mdxdb (ListResult) and ai-database (array) return formats
          const documents = Array.isArray(result) ? result : (result as { documents: unknown[] }).documents
          return success(documents)
        } catch (err) {
          return error(`Failed to list documents: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'mdxdb_search',
      description: 'Search for documents by query. Supports semantic search when enabled.',
      handler: async (args: Record<string, unknown>) => {
        try {
          const { query, type, limit = 10, semantic = false } = args as {
            query: string
            type?: string
            limit?: number
            semantic?: boolean
          }
          const result = await db.search({ query, type, limit, semantic })
          // Handle both mdxdb (SearchResult) and ai-database (array) return formats
          const documents = Array.isArray(result) ? result : (result as { documents: unknown[] }).documents
          return success(documents)
        } catch (err) {
          return error(`Failed to search documents: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'mdxdb_get',
      description: 'Get a specific document by ID. Returns the document or null if not found.',
      handler: async (args: Record<string, unknown>) => {
        try {
          const { id, url } = args as { id?: string; url?: string }
          const identifier = url || id
          if (!identifier) {
            return error('Either id or url is required')
          }
          const doc = await db.get(identifier)
          if (!doc) {
            return error(`Document not found: ${identifier}`)
          }
          return success(doc)
        } catch (err) {
          return error(`Failed to get document: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'mdxdb_set',
      description: 'Create or update a document. Returns success status.',
      handler: async (args: Record<string, unknown>) => {
        try {
          const { id, url, data, content, type } = args as {
            id?: string
            url?: string
            data?: Record<string, unknown>
            content?: string
            type?: string
          }
          const identifier = url || id
          if (!identifier) {
            return error('Either id or url is required')
          }
          // Set data directly - the db.set wraps it in a thing.data property
          // Also include type metadata if provided
          const docData = { ...(data || {}), ...(type ? { $type: type } : {}) }
          await db.set(identifier, docData)
          return success({ success: true, id: identifier })
        } catch (err) {
          return error(`Failed to set document: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'mdxdb_delete',
      description: 'Delete a document by ID. Returns deletion status.',
      handler: async (args: Record<string, unknown>) => {
        try {
          const { id, url } = args as { id?: string; url?: string }
          const identifier = url || id
          if (!identifier) {
            return error('Either id or url is required')
          }
          const result = await db.delete(identifier)
          // Handle both mdxdb (DeleteResult) and ai-database (boolean) return formats
          const deleted = typeof result === 'boolean' ? result : (result as { deleted: boolean }).deleted
          return success({ deleted })
        } catch (err) {
          return error(`Failed to delete document: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
  ]
}

// =============================================================================
// Unified $ Context Factory
// =============================================================================

import { Workflow, createIsolatedContext } from 'ai-workflows'
import { DB, type DBOptions, MemoryDB } from 'ai-database'
import { AI, ai, generateObject, generateText, type AIProxy } from 'ai-functions'

/**
 * Options for creating a unified $ context
 */
export interface ContextOptions {
  /** Database configuration or instance */
  db?: AnyDatabase | DBOptions | string
  /** AI configuration */
  ai?: AIProxy | Record<string, unknown>
  /** Namespace for the context */
  ns?: string
  /** Initial state */
  state?: Record<string, unknown>
}

/**
 * Unified $ context with database, AI, and workflow capabilities
 */
export interface UnifiedContext {
  /** Database instance */
  db: AnyDatabase
  /** AI instance with auto-define */
  ai: AIProxy & {
    createDatabaseTools: (db: AnyDatabase) => DatabaseTool[]
  }
  /** Event handler registration */
  on: ReturnType<typeof createIsolatedContext>['on']
  /** Schedule handler registration */
  every: ReturnType<typeof createIsolatedContext>['every']
  /** Send events */
  send: <T = unknown>(event: string, data: T) => Promise<void>
  /** Durable action execution */
  do: <TData = unknown, TResult = unknown>(event: string, data: TData) => Promise<TResult>
  /** Try action (non-durable) */
  try: <TData = unknown, TResult = unknown>(event: string, data: TData) => Promise<TResult>
  /** Log message */
  log: (message: string, data?: unknown) => void
  /** Shared state */
  state: Record<string, unknown>
  /** Generate structured objects */
  generate: typeof generateObject
  /** Generate text */
  generateText: typeof generateText
}

/**
 * Create a unified $ context
 *
 * Combines database, AI, and workflow capabilities into a single context.
 *
 * @example
 * ```ts
 * import { createContext } from 'mdxai'
 *
 * const $ = createContext({
 *   db: 'example.com',
 *   ns: 'my-app',
 * })
 *
 * // Database operations
 * await $.db.Users.create('john', { name: 'John' })
 *
 * // AI operations
 * const summary = await $.ai.summarize({ text: 'Long article...' })
 *
 * // Workflow events
 * $.on.User.created(async (user, $) => {
 *   $.log('New user:', user.name)
 *   await $.send('Email.welcome', { to: user.email })
 * })
 * ```
 */
export function createContext(options: ContextOptions = {}): UnifiedContext {
  // Initialize database - MemoryDB and DBClient both implement AnyDatabase interface
  let database: AnyDatabase
  if (!options.db) {
    database = new MemoryDB() as AnyDatabase
  } else if (typeof options.db === 'string') {
    database = DB(options.db) as unknown as AnyDatabase
  } else if ('ns' in options.db || 'namespace' in options.db) {
    database = DB(options.db as DBOptions) as unknown as AnyDatabase
  } else {
    database = options.db as AnyDatabase
  }

  // Initialize AI
  const aiInstance = (options.ai as AIProxy) || ai

  // Create workflow context for event handling
  const workflowCtx = createIsolatedContext()

  // Create unified context
  const ctx: UnifiedContext = {
    db: database,
    ai: Object.assign(aiInstance, {
      createDatabaseTools: (db: AnyDatabase) => createDatabaseTools(db),
    }),
    on: workflowCtx.on,
    every: workflowCtx.every,
    send: workflowCtx.send,
    do: workflowCtx.do,
    try: workflowCtx.try,
    log: workflowCtx.log,
    state: options.state || {},
    generate: generateObject,
    generateText,
  }

  return ctx
}

/**
 * Default unified $ context
 *
 * @example
 * ```ts
 * import { $ } from 'mdxai'
 *
 * // Use with default in-memory database
 * await $.db.Users.create('john', { name: 'John' })
 * const summary = await $.ai.summarize({ text: '...' })
 * ```
 */
export const $ = createContext()

// =============================================================================
// Experiment Tracking
// =============================================================================

/**
 * Experiment variant
 */
export interface ExperimentVariant<T = unknown> {
  name: string
  weight: number
  value: T
}

/**
 * Experiment configuration
 */
export interface ExperimentConfig<T = unknown> {
  name: string
  variants: ExperimentVariant<T>[]
  userId?: string
}

/**
 * Experiment result
 */
export interface ExperimentResult<T = unknown> {
  variant: string
  value: T
  experimentId: string
}

/**
 * Run an experiment and return a variant
 *
 * @example
 * ```ts
 * const { variant, value } = await experiment({
 *   name: 'button-color',
 *   variants: [
 *     { name: 'control', weight: 0.5, value: 'blue' },
 *     { name: 'treatment', weight: 0.5, value: 'green' },
 *   ],
 *   userId: 'user-123',
 * })
 * ```
 */
export async function experiment<T = unknown>(
  config: ExperimentConfig<T>,
  db?: AnyDatabase
): Promise<ExperimentResult<T>> {
  const database = db || $.db

  // Generate experiment ID
  const experimentId = `${config.name}:${config.userId || Date.now()}`

  // Check for existing assignment
  const existing = await database.get(`experiments/${experimentId}`) as { data?: { variant: string; value: T } } | null
  if (existing?.data) {
    return {
      variant: existing.data.variant,
      value: existing.data.value,
      experimentId,
    }
  }

  // Assign variant based on weights
  const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0)
  let random = Math.random() * totalWeight
  let selectedVariant = config.variants[0]!

  for (const variant of config.variants) {
    random -= variant.weight
    if (random <= 0) {
      selectedVariant = variant
      break
    }
  }

  // Store assignment
  await database.set(`experiments/${experimentId}`, {
    type: 'ExperimentAssignment',
    data: {
      experiment: config.name,
      variant: selectedVariant.name,
      value: selectedVariant.value,
      userId: config.userId,
      assignedAt: new Date().toISOString(),
    },
    content: '',
  })

  return {
    variant: selectedVariant.name,
    value: selectedVariant.value,
    experimentId,
  }
}

/**
 * Simplified experiment helper
 *
 * @example
 * ```ts
 * const color = await decide(['blue', 'green', 'red'], 'button-color-experiment')
 * ```
 */
export async function decide<T extends string>(
  options: T[],
  context?: string,
  db?: AnyDatabase
): Promise<T> {
  const result = await experiment(
    {
      name: context || 'decision',
      variants: options.map((value, i) => ({
        name: `option-${i}`,
        weight: 1,
        value,
      })),
    },
    db
  )
  return result.value as T
}

// =============================================================================
// Event/Metrics Tracking
// =============================================================================

/**
 * Track an event or metric
 *
 * @example
 * ```ts
 * await track('page.view', { path: '/home', userId: 'user-123' })
 * await track('button.click', { buttonId: 'signup' })
 * ```
 */
export async function track(
  event: string,
  properties: Record<string, unknown> = {},
  db?: AnyDatabase
): Promise<void> {
  const database = db || $.db

  const eventId = `${event}:${Date.now()}:${Math.random().toString(36).slice(2)}`

  await database.set(`events/${eventId}`, {
    type: 'TrackedEvent',
    data: {
      event,
      properties,
      timestamp: new Date().toISOString(),
    },
    content: '',
  })
}

/**
 * Track experiment conversion
 *
 * @example
 * ```ts
 * await trackConversion('button-color', 'signup')
 * ```
 */
export async function trackConversion(
  experimentName: string,
  conversionEvent: string,
  properties: Record<string, unknown> = {},
  db?: AnyDatabase
): Promise<void> {
  const database = db || $.db

  const conversionId = `${experimentName}:${conversionEvent}:${Date.now()}`

  await database.set(`conversions/${conversionId}`, {
    type: 'ExperimentConversion',
    data: {
      experiment: experimentName,
      event: conversionEvent,
      properties,
      timestamp: new Date().toISOString(),
    },
    content: '',
  })
}

// =============================================================================
// Workflow Persistence
// =============================================================================

/**
 * Create a persistent workflow that stores state in mdxdb
 *
 * @example
 * ```ts
 * const workflow = createPersistentWorkflow('order-processing', db, $ => {
 *   $.on.Order.created(async (order, $) => {
 *     await $.db.Orders.set(order.id, order)
 *     await $.send('Email.confirmation', { orderId: order.id })
 *   })
 * })
 *
 * await workflow.start()
 * await workflow.send('Order.created', { id: '123', items: [...] })
 * ```
 */
export function createPersistentWorkflow(
  name: string,
  db: AnyDatabase,
  setup: ($: import('ai-workflows').WorkflowContext) => void
) {
  return Workflow(setup, {
    db: {
      async recordEvent(event: string, data: unknown) {
        const eventId = `${name}:${event}:${Date.now()}`
        await db.set(`workflow-events/${eventId}`, {
          type: 'WorkflowEvent',
          data: {
            workflow: name,
            event,
            data,
            timestamp: new Date().toISOString(),
          },
          content: '',
        })
      },
      async createAction(action: { actor: string; object: string; action: string; metadata?: unknown }) {
        const actionId = `${name}:${action.action}:${Date.now()}`
        await db.set(`workflow-actions/${actionId}`, {
          type: 'WorkflowAction',
          data: {
            workflow: name,
            ...action,
            status: 'pending',
            timestamp: new Date().toISOString(),
          },
          content: '',
        })
      },
      async completeAction(id: string, result: unknown) {
        const existing = await db.get(`workflow-actions/${id}`)
        if (existing) {
          const existingData = (existing as { data?: Record<string, unknown> }).data || {}
          await db.set(`workflow-actions/${id}`, {
            type: 'WorkflowAction',
            data: {
              ...existingData,
              status: 'completed',
              result,
              completedAt: new Date().toISOString(),
            },
            content: '',
          })
        }
      },
      async storeArtifact(artifact: { key: string; type: string; content: unknown }) {
        await db.set(`workflow-artifacts/${artifact.key}`, {
          type: 'WorkflowArtifact',
          data: {
            workflow: name,
            ...artifact,
            timestamp: new Date().toISOString(),
          },
          content: '',
        })
      },
      async getArtifact(key: string) {
        const result = await db.get(`workflow-artifacts/${key}`)
        if (result) {
          const data = (result as { data?: { content?: unknown } }).data
          return data?.content ?? null
        }
        return null
      },
    },
  })
}

// =============================================================================
// Delay/Sleep Utility
// =============================================================================

/**
 * Delay execution for a specified duration
 *
 * @example
 * ```ts
 * await delay(1000) // 1 second
 * await delay('5s')  // 5 seconds
 * await delay('1m')  // 1 minute
 * ```
 */
export function delay(duration: number | string): Promise<void> {
  let ms: number

  if (typeof duration === 'number') {
    ms = duration
  } else {
    const match = duration.match(/^(\d+)(ms|s|m|h|d)?$/)
    if (!match) {
      throw new Error(`Invalid duration: ${duration}`)
    }

    const [, value, unit = 'ms'] = match
    const numValue = parseInt(value!, 10)

    switch (unit) {
      case 'ms':
        ms = numValue
        break
      case 's':
        ms = numValue * 1000
        break
      case 'm':
        ms = numValue * 60 * 1000
        break
      case 'h':
        ms = numValue * 60 * 60 * 1000
        break
      case 'd':
        ms = numValue * 24 * 60 * 60 * 1000
        break
      default:
        ms = numValue
    }
  }

  return new Promise(resolve => setTimeout(resolve, ms))
}
