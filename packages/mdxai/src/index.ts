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
  setProvider,
  parseSchema,
  MemoryProvider,
  createMemoryProvider,
  type DatabaseSchema,
  type EntitySchema,
  type FieldDefinition,
  type PrimitiveType,
  type ParsedSchema,
  type ParsedEntity,
  type ParsedField,
  type TypedDB,
  type EntityOperations,
  type DBProvider,
  type ListOptions as DBListOptions,
  type SearchOptions as DBSearchOptions,
  type InferEntity,
} from 'ai-database'

// =============================================================================
// Re-export everything from ai-providers
// =============================================================================

// Note: Import types directly from 'ai-providers' if needed
export {
  createRegistry,
  getRegistry,
  configureRegistry,
  model,
  embeddingModel,
  DIRECT_PROVIDERS,
} from 'ai-providers'

// =============================================================================
// Re-export everything from ai-experiments
// =============================================================================

// Note: Most types from ai-experiments conflict with existing types in this file
// Import types directly from 'ai-experiments' if needed
export {
  // Experiment functionality
  Experiment,
  createVariantsFromGrid,
  // Cartesian product utilities
  cartesian,
  cartesianFilter,
  cartesianSample,
  cartesianCount,
  cartesianWithLabels,
  // Decision making utilities (aliased to avoid conflicts)
  decide as decideExperiment,
  decideWeighted,
  decideEpsilonGreedy,
  decideThompsonSampling,
  decideUCB,
  // Tracking utilities (aliased to avoid conflicts)
  track as trackExperiment,
  flush,
  configureTracking,
  getTrackingConfig,
  createConsoleBackend,
  createMemoryBackend,
  createBatchBackend,
  createFileBackend,
} from 'ai-experiments'

// =============================================================================
// Re-export everything from autonomous-agents
// =============================================================================

// Note: Import types directly from 'autonomous-agents' if needed
export {
  // Agent creation and management
  Agent,
  // Role definitions
  Role as AgentRole,
  Roles,
  hasPermission,
  hasSkill,
  getPermissions,
  getSkills,
  mergeRoles,
  // Team collaboration
  Team as AgentTeam,
  createTeamMember,
  teamMemberFromAgent,
  calculateTeamCapacity,
  getTeamSkills,
  teamHasSkill,
  findBestMemberForTask,
  // Goals and objectives
  Goals as AgentGoals,
  createGoal,
  createGoalWithSubgoals,
  isGoalOverdue,
  getOverdueGoals,
  getGoalsDueSoon,
  getGoalsByStatus,
  getTimeRemaining,
  // Action primitives (aliased to avoid conflicts)
  do as agentDo,
  doAction,
  ask as agentAsk,
  decide as agentDecide,
  approve as agentApprove,
  generate as agentGenerate,
  is as agentIs,
  notify as agentNotify,
  // Metrics and performance tracking
  kpi as agentKpi,
  kpis as agentKpis,
  okr as agentOkr,
  okrs as agentOkrs,
  createKeyResult,
  updateKeyResultStatus,
} from 'autonomous-agents'

// =============================================================================
// Re-export everything from digital-workers
// =============================================================================

// Note: Import types directly from 'digital-workers' if needed
export {
  // Core functions
  Role as DigitalWorkerRole,
  Team as DigitalWorkerTeam,
  Goals as DigitalWorkerGoals,
  approve as workerApprove,
  ask as workerAsk,
  do as workerDo,
  decide as workerDecide,
  generate as workerGenerate,
  is as workerIs,
  notify as workerNotify,
  kpis as workerKpis,
  okrs as workerOkrs,
} from 'digital-workers'

// =============================================================================
// Re-export everything from human-in-the-loop
// =============================================================================

// Note: Import types directly from 'human-in-the-loop' if needed
export {
  // Main Human constructor and manager
  Human,
  HumanManager,
  // Helper functions (convenience API)
  Role as HumanRole,
  Team as HumanTeam,
  Goals as HumanGoals,
  approve as humanApprove,
  ask as humanAsk,
  do as humanDo,
  decide as humanDecide,
  generate as humanGenerate,
  is as humanIs,
  notify as humanNotify,
  kpis as humanKpis,
  okrs as humanOkrs,
  registerHuman,
  getDefaultHuman,
  // Store implementations
  InMemoryHumanStore,
} from 'human-in-the-loop'

// =============================================================================
// Re-export everything from services-as-software
// =============================================================================

// Note: Import types directly from 'services-as-software' if needed
export {
  // Core service primitives
  Service,
  Endpoint,
  GET,
  POST,
  PUT,
  DELETE,
  PATCH,
  Client as ServiceClient,
  Provider as ServiceProvider,
  providers,
  // Helper functions for common operations
  ask as serviceAsk,
  deliver,
  do as serviceDo,
  generate as serviceGenerate,
  is as serviceIs,
  notify as serviceNotify,
  on as serviceOn,
  order,
  queue,
  quote,
  subscribe,
  every as serviceEvery,
  entitlements,
  kpis as serviceKpis,
  okrs as serviceOkrs,
  Plan,
  KPI as ServiceKPI,
  OKR as ServiceOKR,
  Entitlement,
} from 'services-as-software'

// =============================================================================
// Re-export everything from language-models
// =============================================================================

// Note: Import types directly from 'language-models' if needed
export {
  resolve as resolveModel,
  resolveWithProvider,
  list as listModels,
  get as getModel,
  search as searchModels,
  DIRECT_PROVIDERS as MODEL_DIRECT_PROVIDERS,
  ALIASES as MODEL_ALIASES,
} from 'language-models'

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
export type { MDXLDDocument, MDXLDData } from 'mdxld'

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
import { DB, type DatabaseSchema, MemoryProvider, createMemoryProvider } from 'ai-database'
import { AI, ai, generateObject, generateText, type AIProxy } from 'ai-functions'

/**
 * Options for creating a unified $ context
 */
export interface ContextOptions {
  /** Database configuration or instance */
  db?: AnyDatabase | DatabaseSchema | string
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
  // Initialize database - use simple in-memory object as placeholder
  let database: AnyDatabase
  if (!options.db) {
    // Simple in-memory database placeholder
    database = createMemoryProvider() as unknown as AnyDatabase
  } else if (typeof options.db === 'string') {
    database = DB(options.db as any) as unknown as AnyDatabase
  } else if (typeof options.db === 'object' && !('list' in options.db)) {
    database = DB(options.db as DatabaseSchema) as unknown as AnyDatabase
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
// Helper Factories for Combining Primitives
// =============================================================================

import {
  Agent,
  do as agentDo,
  ask as agentAsk,
  decide as agentDecide,
  approve as agentApprove,
  notify as agentNotify,
  is as agentIs,
  type AgentConfig,
} from 'autonomous-agents'

import {
  Service,
  do as serviceDo,
  ask as serviceAsk,
  notify as serviceNotify,
  is as serviceIs,
  quote,
  order,
  subscribe,
  queue,
  deliver,
  type ServiceDefinition,
} from 'services-as-software'

import {
  Experiment,
  decide as decideExperiment,
  decideWeighted,
  decideEpsilonGreedy,
  decideThompsonSampling,
  decideUCB,
  track as trackExperiment,
  flush,
  cartesian,
  cartesianFilter,
  cartesianSample,
  cartesianCount,
  cartesianWithLabels,
  configureTracking,
} from 'ai-experiments'

import {
  model,
  embeddingModel,
  configureRegistry,
  DIRECT_PROVIDERS,
} from 'ai-providers'

import {
  resolve as resolveModel,
  resolveWithProvider,
  list as listModels,
  get as getModel,
  search as searchModels,
  ALIASES as MODEL_ALIASES,
} from 'language-models'

/**
 * Agent context with combined ai-functions and autonomous-agents capabilities
 */
export interface AgentContext {
  /** Agent instance */
  agent: ReturnType<typeof Agent>
  /** Database instance */
  db: AnyDatabase
  /** AI instance */
  ai: AIProxy
  /** Generate structured objects */
  generate: typeof generateObject
  /** Generate text */
  generateText: typeof generateText
  /** Execute tasks */
  do: typeof agentDo
  /** Ask questions */
  ask: typeof agentAsk
  /** Make decisions */
  decide: typeof agentDecide
  /** Request approval */
  approve: typeof agentApprove
  /** Send notifications */
  notify: typeof agentNotify
  /** Check conditions */
  is: typeof agentIs
}

/**
 * Create an agent context that combines AI functions with autonomous agent capabilities
 *
 * @example
 * ```ts
 * import { createAgentContext } from 'mdxai'
 *
 * const ctx = createAgentContext({
 *   name: 'ProductAgent',
 *   role: {
 *     name: 'Product Manager',
 *     skills: ['product strategy', 'roadmap planning'],
 *   },
 *   mode: 'autonomous',
 *   goals: [
 *     { id: 'g1', description: 'Define Q1 roadmap', target: '100%' }
 *   ],
 * })
 *
 * // Use agent capabilities
 * const result = await ctx.do('Create product brief')
 * const decision = await ctx.decide(['A', 'B', 'C'], 'Which feature?')
 *
 * // Use AI capabilities
 * const summary = await ctx.generate({
 *   schema: z.object({ summary: z.string() }),
 *   prompt: 'Summarize the roadmap'
 * })
 * ```
 */
export function createAgentContext(
  config: AgentConfig,
  options: { db?: AnyDatabase; ai?: AIProxy } = {}
): AgentContext {
  const database = options.db || $.db
  const aiInstance = options.ai || ai

  const agent = Agent(config)

  return {
    agent,
    db: database,
    ai: aiInstance,
    generate: generateObject,
    generateText,
    do: agentDo,
    ask: agentAsk,
    decide: agentDecide,
    approve: agentApprove,
    notify: agentNotify,
    is: agentIs,
  }
}

/**
 * Service context with combined services-as-software and ai-functions capabilities
 */
export interface ServiceContext {
  /** Service instance */
  service: ReturnType<typeof Service>
  /** Database instance */
  db: AnyDatabase
  /** AI instance */
  ai: AIProxy
  /** Generate structured objects */
  generate: typeof generateObject
  /** Generate text */
  generateText: typeof generateText
  /** Execute service tasks */
  do: typeof serviceDo
  /** Ask questions */
  ask: typeof serviceAsk
  /** Send notifications */
  notify: typeof serviceNotify
  /** Check conditions */
  is: typeof serviceIs
  /** Create quotes */
  quote: typeof quote
  /** Create orders */
  order: typeof order
  /** Create subscriptions */
  subscribe: typeof subscribe
  /** Queue tasks */
  queue: typeof queue
  /** Deliver results */
  deliver: typeof deliver
}

/**
 * Create a service context that combines service capabilities with AI functions
 *
 * @example
 * ```ts
 * import { createServiceContext } from 'mdxai'
 *
 * const ctx = createServiceContext({
 *   name: 'SummaryService',
 *   description: 'Generates summaries of documents',
 *   version: '1.0.0',
 *   endpoints: {
 *     '/summarize': {
 *       POST: async ({ text }) => {
 *         return await ctx.generate({
 *           schema: z.object({ summary: z.string() }),
 *           prompt: `Summarize: ${text}`
 *         })
 *       }
 *     }
 *   },
 *   pricing: {
 *     model: 'usage',
 *     unit: 'request',
 *     price: 0.01,
 *   },
 * })
 *
 * // Use service capabilities
 * const quote = await ctx.quote({ items: [{ sku: 'summary', quantity: 100 }] })
 * const subscription = await ctx.subscribe({ plan: 'pro' })
 *
 * // Use AI capabilities
 * const result = await ctx.generate({
 *   schema: z.object({ category: z.string() }),
 *   prompt: 'Categorize this request'
 * })
 * ```
 */
export function createServiceContext(
  definition: ServiceDefinition,
  options: { db?: AnyDatabase; ai?: AIProxy } = {}
): ServiceContext {
  const database = options.db || $.db
  const aiInstance = options.ai || ai

  const service = Service(definition)

  return {
    service,
    db: database,
    ai: aiInstance,
    generate: generateObject,
    generateText,
    do: serviceDo,
    ask: serviceAsk,
    notify: serviceNotify,
    is: serviceIs,
    quote,
    order,
    subscribe,
    queue,
    deliver,
  }
}

/**
 * Helper to create an experiment context with tracking
 *
 * @example
 * ```ts
 * import { createExperimentContext } from 'mdxai'
 *
 * const ctx = createExperimentContext({
 *   name: 'button-color-test',
 *   backend: createFileBackend('./experiments.jsonl'),
 * })
 *
 * // Run experiments
 * const variant = await ctx.decide(['blue', 'green', 'red'])
 * await ctx.track('button_click', { variant, converted: true })
 *
 * // Run complex experiments
 * const experiment = ctx.Experiment({
 *   name: 'model-comparison',
 *   variants: [
 *     { name: 'gpt-4', value: 'gpt-4' },
 *     { name: 'claude', value: 'claude-3-opus' },
 *   ],
 * })
 *
 * const result = await experiment.run(async (variant) => {
 *   return await generateText({ model: variant.value, prompt: 'Hello!' })
 * })
 * ```
 */
export interface ExperimentContext {
  /** Experiment factory */
  Experiment: typeof Experiment
  /** Simple decision making */
  decide: typeof decideExperiment
  /** Weighted decision making */
  decideWeighted: typeof decideWeighted
  /** Epsilon-greedy decision making */
  decideEpsilonGreedy: typeof decideEpsilonGreedy
  /** Thompson sampling decision making */
  decideThompsonSampling: typeof decideThompsonSampling
  /** UCB decision making */
  decideUCB: typeof decideUCB
  /** Track events */
  track: typeof trackExperiment
  /** Flush tracking backend */
  flush: typeof flush
  /** Cartesian product utilities */
  cartesian: typeof cartesian
  cartesianFilter: typeof cartesianFilter
  cartesianSample: typeof cartesianSample
  cartesianCount: typeof cartesianCount
  cartesianWithLabels: typeof cartesianWithLabels
}

/**
 * Create an experiment context with tracking configured
 */
export function createExperimentContext(options: {
  name?: string
  backend?: import('ai-experiments').TrackingBackend
} = {}): ExperimentContext {
  // Configure tracking if backend provided
  if (options.backend) {
    configureTracking({
      backend: options.backend,
      enabled: true,
    })
  }

  return {
    Experiment,
    decide: decideExperiment,
    decideWeighted,
    decideEpsilonGreedy,
    decideThompsonSampling,
    decideUCB,
    track: trackExperiment,
    flush,
    cartesian,
    cartesianFilter,
    cartesianSample,
    cartesianCount,
    cartesianWithLabels,
  }
}

/**
 * Helper to create a model registry context
 *
 * @example
 * ```ts
 * import { createModelContext } from 'mdxai'
 *
 * const ctx = createModelContext({
 *   gateway: 'my-gateway',
 *   accountId: 'account-123',
 * })
 *
 * // Use models by name
 * const response = await generateText({
 *   model: ctx.model('gpt-4'),
 *   prompt: 'Hello world'
 * })
 *
 * // Search and list models
 * const claudeModels = ctx.search('claude')
 * const allModels = ctx.list()
 * ```
 */
export interface ModelContext {
  /** Create model from string identifier */
  model: typeof model
  /** Create embedding model */
  embeddingModel: typeof embeddingModel
  /** List all models */
  list: typeof listModels
  /** Get specific model */
  get: typeof getModel
  /** Search models */
  search: typeof searchModels
  /** Resolve model alias */
  resolve: typeof resolveModel
  /** Resolve with provider */
  resolveWithProvider: typeof resolveWithProvider
  /** Available providers */
  providers: typeof DIRECT_PROVIDERS
  /** Model aliases */
  aliases: typeof MODEL_ALIASES
}

/**
 * Create a model context with registry configured
 */
export function createModelContext(options: {
  gatewayUrl?: string
  accountId?: string
} = {}): ModelContext {
  // Configure registry if options provided
  if (options.gatewayUrl || options.accountId) {
    configureRegistry({
      gatewayUrl: options.gatewayUrl,
      cloudflareAccountId: options.accountId,
    })
  }

  return {
    model,
    embeddingModel,
    list: listModels,
    get: getModel,
    search: searchModels,
    resolve: resolveModel,
    resolveWithProvider,
    providers: DIRECT_PROVIDERS,
    aliases: MODEL_ALIASES,
  }
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
