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
  // Natural Language Query support
  setNLQueryGenerator,
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
  // Natural Language Query types
  type NLQueryResult,
  type NLQueryFn,
  type NLQueryGenerator,
  type NLQueryContext,
  type NLQueryPlan,
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
// Dev Mode
// =============================================================================

export {
  isDevMode,
  initDevMode,
  getDevModeState,
  resetDevModeState,
  saveFunctionDefinition,
  saveSchema,
  generateTypesFile,
  writeTypesFile,
  type DevModeConfig,
  type DevModeState,
} from './devmode.js'

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

// Re-export Node.js-safe exports from @mdxdb/sqlite (MDXDatabase must be imported
// directly from '@mdxdb/sqlite/durable-object' for Workers usage)
export { createMiniflareClient, createMiniflareBinding, createInMemoryBinding } from '@mdxdb/sqlite'

// Re-export types
export type { Database, ListOptions, SearchOptions, GetOptions, SetOptions, DeleteOptions } from '@mdxdb/fs'
export type { FsDatabaseConfig } from '@mdxdb/fs'
export type { MDXLDDocument, MDXLDData } from 'mdxld'

// =============================================================================
// AI Database Tools for Agents
// =============================================================================

import type { Database } from '@mdxdb/fs'

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
          // Create a proper MDXLDDocument structure
          const document = {
            id: identifier,
            type: type || (data as { $type?: string })?.$type || 'Document',
            data: { ...(data || {}), ...(type ? { $type: type } : {}) },
            content: content || '',
            context: {},
          }
          await db.set(identifier, document as never)
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
  const aiInstance = (options.ai || ai) as AIProxy

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
  const aiInstance = (options.ai || ai) as AIProxy

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

// =============================================================================
// Natural Language Query Generator
// =============================================================================

import { z } from 'zod'
import { setNLQueryGenerator, type NLQueryContext, type NLQueryPlan, type NLQueryGenerator } from 'ai-database'

/**
 * Zod schema for NLQueryPlan
 */
const NLQueryPlanSchema = z.object({
  types: z.array(z.string()).describe('The types/entities to query'),
  filters: z.record(z.unknown()).optional().describe('Filters to apply to the query'),
  search: z.string().optional().describe('Search terms to use'),
  timeRange: z.object({
    since: z.date().optional(),
    until: z.date().optional(),
  }).optional().describe('Time range for the query'),
  include: z.array(z.string()).optional().describe('Relationships to include'),
  interpretation: z.string().describe('How to interpret the results - explain what the query will return'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
})

/**
 * Create a default NL query generator using ai-functions.generateObject
 *
 * @example
 * ```ts
 * import { createDefaultNLQueryGenerator, setNLQueryGenerator } from 'mdxai'
 *
 * // Set up the generator
 * const generator = createDefaultNLQueryGenerator()
 * setNLQueryGenerator(generator)
 *
 * // Now you can use natural language queries
 * const db = DB({ Users: { name: 'string', email: 'string' } })
 * const result = await db`how many users do we have?`
 * const topUsers = await db.Users`top 10 by activity`
 * ```
 */
export function createDefaultNLQueryGenerator(options: {
  model?: string
} = {}): NLQueryGenerator {
  return async (prompt: string, context: NLQueryContext): Promise<NLQueryPlan> => {
    const systemPrompt = `You are a database query planner. Given a natural language question and a schema, generate a query plan.

Available types in the database:
${JSON.stringify(context.types, null, 2)}

${context.targetType ? `The user is specifically querying the "${context.targetType}" type.` : ''}

Generate a query plan that answers the user's question. Be specific about:
- Which types to query
- What filters to apply
- What relationships to include
- How to interpret the results`

    const result = await generateObject({
      model: options.model as Parameters<typeof generateObject>[0]['model'],
      schema: NLQueryPlanSchema,
      system: systemPrompt,
      prompt,
    })

    return result.object as unknown as NLQueryPlan
  }
}

/**
 * Set up the default NL query generator
 *
 * Call this once at application startup to enable natural language queries.
 *
 * @example
 * ```ts
 * import { setupNLQuery, DB } from 'mdxai'
 *
 * // Enable NL queries with default settings
 * setupNLQuery()
 *
 * // Or specify a model
 * setupNLQuery({ model: 'gpt-4' })
 *
 * // Use natural language queries
 * const db = DB({ Users: { name: 'string', revenue: 'number' } })
 * const answer = await db`how many users have revenue over $5000?`
 * ```
 */
export function setupNLQuery(options: { model?: string } = {}): void {
  const generator = createDefaultNLQueryGenerator(options)
  setNLQueryGenerator(generator)
}

// =============================================================================
// Persistent AI with Function Storage
// =============================================================================

import { define, defineFunction, type FunctionRegistry, type DefinedFunction } from 'ai-functions'
import { PersistentFunctionRegistry, type PersistentRegistryConfig } from './persistence.js'

/** Built-in methods that should not be auto-defined */
const BUILTIN_METHODS = new Set([
  'do', 'is', 'code', 'decide', 'diagram', 'generate', 'image', 'video', 'write', 'list', 'lists',
  'functions', 'define', 'defineFunction', 'then', 'catch', 'finally',
])

/**
 * Configuration for persistent AI
 */
export interface PersistentAIConfig {
  /** Database to store function definitions */
  database: AnyDatabase
  /** Namespace for function storage (default: 'ai-functions') */
  namespace?: string
  /** Cache TTL in milliseconds (default: 60000 - 1 minute) */
  cacheTtl?: number
  /** Whether to preload functions on startup */
  preload?: boolean
}

/**
 * Persistent AI proxy with function storage
 *
 * Like the regular AI proxy, but auto-defined functions are persisted to mdxdb.
 * Functions are automatically restored on restart.
 */
export interface PersistentAIProxy extends AIProxy {
  /** The persistent function registry */
  functions: PersistentFunctionRegistry
  /** Preload all functions from database */
  preload(): Promise<void>
  /** Close the registry (closes database connection) */
  close(): Promise<void>
}

/**
 * Create a smart AI client with persistent function storage
 *
 * Auto-defined functions are stored in mdxdb and restored on application restart.
 *
 * @example
 * ```ts
 * import { createPersistentAI, createFsDatabase } from 'mdxai'
 *
 * const db = createFsDatabase({ root: './data' })
 * const ai = await createPersistentAI({ database: db })
 *
 * // First call - auto-defines and persists the function
 * const trip = await ai.planTrip({
 *   destination: 'Tokyo',
 *   dates: { start: '2024-03-01', end: '2024-03-10' },
 * })
 *
 * // After restart - function definition is restored from database
 * const trip2 = await ai.planTrip({
 *   destination: 'Paris',
 *   dates: { start: '2024-06-01', end: '2024-06-07' },
 * })
 *
 * // List all persisted functions
 * const names = await ai.functions.listAsync()
 * ```
 */
export async function createPersistentAI(config: PersistentAIConfig): Promise<PersistentAIProxy> {
  const registry = new PersistentFunctionRegistry({
    database: config.database as Database,
    namespace: config.namespace ?? 'ai-functions',
    cacheTtl: config.cacheTtl,
  })

  // Preload functions if requested
  if (config.preload !== false) {
    await registry.preload()
  }

  // Create a define wrapper that uses the persistent registry
  const persistentDefine = Object.assign(
    async (name: string, args: Record<string, unknown> = {}): Promise<DefinedFunction> => {
      // Check if already defined (in cache or database)
      let existing = registry.get(name)
      if (!existing) {
        existing = await registry.getAsync(name)
      }
      if (existing) {
        return existing
      }

      // Auto-define using the original define function
      const fn = await define(name, args)

      // Persist to database
      await registry.setAsync(name, fn)

      return fn
    },
    {
      code: (definition: Parameters<typeof define.code>[0]) => {
        const fn = define.code(definition)
        registry.set(definition.name, fn as DefinedFunction)
        return fn
      },
      generative: (definition: Parameters<typeof define.generative>[0]) => {
        const fn = define.generative(definition)
        registry.set(definition.name, fn as DefinedFunction)
        return fn
      },
      agentic: (definition: Parameters<typeof define.agentic>[0]) => {
        const fn = define.agentic(definition)
        registry.set(definition.name, fn as DefinedFunction)
        return fn
      },
      human: (definition: Parameters<typeof define.human>[0]) => {
        const fn = define.human(definition)
        registry.set(definition.name, fn as DefinedFunction)
        return fn
      },
    }
  )

  const base = {
    functions: registry,
    define: persistentDefine,
    defineFunction,
    preload: () => registry.preload(),
    close: () => registry.close(),
  }

  return new Proxy(base as PersistentAIProxy, {
    get(target, prop: string) {
      // Return built-in properties
      if (prop in target) {
        return (target as Record<string, unknown>)[prop]
      }

      // Skip internal properties
      if (typeof prop === 'symbol' || prop.startsWith('_') || BUILTIN_METHODS.has(prop)) {
        return undefined
      }

      // Return a function that auto-defines, persists, and calls
      return async (args: Record<string, unknown> = {}) => {
        // Check if function is already defined (in cache)
        let fn = registry.get(prop)

        // Check database if not in cache
        if (!fn) {
          fn = await registry.getAsync(prop)
        }

        if (!fn) {
          // Auto-define the function
          fn = await define(prop, args)
          // Persist to database
          await registry.setAsync(prop, fn)
        }

        // Call the function
        return fn.call(args)
      }
    },
  })
}

/**
 * Helper to create a persistent AI instance with filesystem database
 *
 * @example
 * ```ts
 * import { createPersistentAIWithFs } from 'mdxai'
 *
 * const ai = await createPersistentAIWithFs('./ai-functions')
 *
 * const summary = await ai.summarize({ text: 'Long article...' })
 * ```
 */
export async function createPersistentAIWithFs(
  path: string,
  options: Omit<PersistentAIConfig, 'database'> = {}
): Promise<PersistentAIProxy> {
  const { createFsDatabase } = await import('@mdxdb/fs')
  const db = createFsDatabase({ root: path })
  return createPersistentAI({ database: db as unknown as AnyDatabase, ...options })
}

// =============================================================================
// Dev Mode AI
// =============================================================================

import {
  isDevMode,
  getDevModeState,
  saveFunctionDefinition,
  saveSchema,
  writeTypesFile,
  type DevModeConfig,
  type DevModeState,
} from './devmode.js'

/**
 * Dev AI configuration
 */
export interface DevAIConfig extends Omit<PersistentAIConfig, 'database'> {
  /** Project root directory */
  root?: string
  /** Path to .ai folder (default: .ai) */
  aiFolderPath?: string
  /** Path to mdx.d.ts (default: mdx.d.ts) */
  typesPath?: string
  /** Auto-generate types on function define (default: true in dev mode) */
  autoGenerateTypes?: boolean
}

/**
 * Dev AI proxy with type generation
 */
export interface DevAIProxy extends PersistentAIProxy {
  /** Dev mode state */
  devMode: DevModeState
  /** Regenerate types file */
  regenerateTypes(): void
  /** Register a database schema for type generation */
  registerSchema(name: string, schema: DatabaseSchema): void
}

/**
 * Create an AI client for development mode
 *
 * Stores function definitions in .ai/ folder as MDX files and generates
 * TypeScript types in mdx.d.ts.
 *
 * @example
 * ```ts
 * import { createDevAI } from 'mdxai'
 *
 * const ai = await createDevAI()
 *
 * // First call - auto-defines, persists to .ai/functions/, and generates types
 * const summary = await ai.summarize({ text: 'Long article...' })
 *
 * // Types are available in mdx.d.ts:
 * // - SummarizeArgs: { text: string }
 * // - SummarizeResult: string
 * // - SummarizeFunction: (args: SummarizeArgs) => Promise<SummarizeResult>
 *
 * // Register a database schema
 * ai.registerSchema('app', {
 *   User: { name: 'string', email: 'string' },
 *   Post: { title: 'string', author: 'User.posts' },
 * })
 * ```
 */
export async function createDevAI(config: DevAIConfig = {}): Promise<DevAIProxy> {
  const root = config.root ?? process.cwd()

  // Initialize dev mode state
  const devModeState = getDevModeState({
    root,
    aiFolderPath: config.aiFolderPath,
    typesPath: config.typesPath,
  })

  // Create filesystem database in .ai folder
  const { createFsDatabase } = await import('@mdxdb/fs')
  const db = createFsDatabase({ root: devModeState.aiFolder })

  // Create the persistent AI
  const registry = new PersistentFunctionRegistry({
    database: db as unknown as Database,
    namespace: 'functions',
    cacheTtl: config.cacheTtl,
  })

  // Preload existing functions
  if (config.preload !== false) {
    await registry.preload()
  }

  const shouldAutoGenerateTypes = config.autoGenerateTypes ?? isDevMode()

  // Create define wrapper that saves to .ai and generates types
  const devDefine = Object.assign(
    async (name: string, args: Record<string, unknown> = {}): Promise<DefinedFunction> => {
      // Check if already defined
      let existing = registry.get(name)
      if (!existing) {
        existing = await registry.getAsync(name)
      }
      if (existing) {
        return existing
      }

      // Auto-define
      const fn = await define(name, args)

      // Persist to database
      await registry.setAsync(name, fn)

      // Save to .ai/functions/ as MDX
      saveFunctionDefinition(devModeState, fn.definition)

      // Regenerate types
      if (shouldAutoGenerateTypes) {
        writeTypesFile(devModeState)
      }

      return fn
    },
    {
      code: (definition: Parameters<typeof define.code>[0]) => {
        const fn = define.code(definition)
        registry.set(definition.name, fn as DefinedFunction)
        saveFunctionDefinition(devModeState, fn.definition)
        if (shouldAutoGenerateTypes) writeTypesFile(devModeState)
        return fn
      },
      generative: (definition: Parameters<typeof define.generative>[0]) => {
        const fn = define.generative(definition)
        registry.set(definition.name, fn as DefinedFunction)
        saveFunctionDefinition(devModeState, fn.definition)
        if (shouldAutoGenerateTypes) writeTypesFile(devModeState)
        return fn
      },
      agentic: (definition: Parameters<typeof define.agentic>[0]) => {
        const fn = define.agentic(definition)
        registry.set(definition.name, fn as DefinedFunction)
        saveFunctionDefinition(devModeState, fn.definition)
        if (shouldAutoGenerateTypes) writeTypesFile(devModeState)
        return fn
      },
      human: (definition: Parameters<typeof define.human>[0]) => {
        const fn = define.human(definition)
        registry.set(definition.name, fn as DefinedFunction)
        saveFunctionDefinition(devModeState, fn.definition)
        if (shouldAutoGenerateTypes) writeTypesFile(devModeState)
        return fn
      },
    }
  )

  const base = {
    functions: registry,
    define: devDefine,
    defineFunction,
    preload: () => registry.preload(),
    close: () => registry.close(),
    devMode: devModeState,
    regenerateTypes: () => writeTypesFile(devModeState),
    registerSchema: (name: string, schema: DatabaseSchema) => {
      saveSchema(devModeState, name, schema)
      if (shouldAutoGenerateTypes) {
        writeTypesFile(devModeState)
      }
    },
  }

  return new Proxy(base as DevAIProxy, {
    get(target, prop: string) {
      // Return built-in properties
      if (prop in target) {
        return (target as Record<string, unknown>)[prop]
      }

      // Skip internal properties
      if (typeof prop === 'symbol' || prop.startsWith('_') || BUILTIN_METHODS.has(prop)) {
        return undefined
      }

      // Return a function that auto-defines, persists, and calls
      return async (args: Record<string, unknown> = {}) => {
        // Check if function is already defined
        let fn = registry.get(prop)
        if (!fn) {
          fn = await registry.getAsync(prop)
        }

        if (!fn) {
          // Auto-define the function
          fn = await define(prop, args)

          // Persist to database
          await registry.setAsync(prop, fn)

          // Save to .ai/functions/ as MDX
          saveFunctionDefinition(devModeState, fn.definition)

          // Regenerate types
          if (shouldAutoGenerateTypes) {
            writeTypesFile(devModeState)
          }
        }

        // Call the function
        return fn.call(args)
      }
    },
  })
}

/**
 * Create the default AI instance based on environment
 *
 * - In development mode: Uses createDevAI with .ai folder and type generation
 * - In production mode: Uses the default in-memory AI
 *
 * @example
 * ```ts
 * import { createAI } from 'mdxai'
 *
 * // Automatically picks dev or production mode
 * const ai = await createAI()
 *
 * const result = await ai.summarize({ text: 'Article...' })
 * ```
 */
export async function createAI(config?: DevAIConfig): Promise<AIProxy | DevAIProxy> {
  if (isDevMode()) {
    return createDevAI(config)
  }
  // In production, return the default AI proxy
  return ai as unknown as AIProxy
}
