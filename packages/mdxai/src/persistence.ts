/**
 * Persistent Function Registry using mdxdb
 *
 * Provides persistent storage for AI function definitions,
 * implementing the FunctionRegistry interface from ai-functions.
 *
 * @packageDocumentation
 */

import type { Database } from '@mdxdb/fs'
import type {
  FunctionRegistry,
  DefinedFunction,
  FunctionDefinition,
  AIFunctionDefinition,
} from 'ai-functions'

/**
 * Configuration for persistent registry
 */
export interface PersistentRegistryConfig {
  /** Database instance to use for storage */
  database: Database
  /** Namespace for function storage (default: 'functions') */
  namespace?: string
  /** Cache TTL in milliseconds (default: 60000 - 1 minute) */
  cacheTtl?: number
}

/**
 * Create a callable function from a definition
 */
function createCallable<TArgs = unknown, TReturn = unknown>(
  definition: FunctionDefinition<TArgs, TReturn>
): (args: TArgs) => Promise<TReturn> {
  // This is a placeholder - in production, this would:
  // - For 'code': compile and execute the generated code
  // - For 'generative': call the AI with the prompt template
  // - For 'agentic': run the agent loop with tools
  // - For 'human': send the request to the appropriate channel
  return async (args: TArgs): Promise<TReturn> => {
    throw new Error(
      `Function ${definition.name} of type ${definition.type} requires runtime implementation. ` +
      `Use the mdxai runtime to execute this function.`
    )
  }
}

/**
 * Convert a function definition to a tool definition
 */
function definitionToTool<TArgs = unknown, TReturn = unknown>(
  definition: FunctionDefinition<TArgs, TReturn>
): AIFunctionDefinition<TArgs, TReturn> {
  return {
    name: definition.name,
    description: definition.description ?? `Function: ${definition.name}`,
    parameters: {
      type: 'object',
      properties: definition.args as Record<string, import('ai-functions').JSONSchema>,
      required: Object.keys(definition.args as object || {}),
    },
    handler: createCallable(definition),
  }
}

/**
 * Create a DefinedFunction from a stored definition
 */
function hydrateFunction<TArgs = unknown, TReturn = unknown>(
  definition: FunctionDefinition<TArgs, TReturn>
): DefinedFunction<TArgs, TReturn> {
  return {
    definition,
    call: createCallable(definition),
    asTool: () => definitionToTool(definition),
  }
}

/**
 * Persistent Function Registry
 *
 * Stores AI function definitions in mdxdb for persistence across
 * application restarts. Implements the FunctionRegistry interface
 * from ai-functions.
 *
 * @example
 * ```ts
 * import { createFsDatabase } from '@mdxdb/fs'
 * import { PersistentFunctionRegistry } from 'mdxai'
 *
 * const db = createFsDatabase({ root: './functions' })
 * const registry = new PersistentFunctionRegistry({ database: db })
 *
 * // Store a function
 * const fn = defineFunction({
 *   type: 'generative',
 *   name: 'summarize',
 *   args: { text: 'Text to summarize' },
 *   output: 'string',
 * })
 * await registry.set('summarize', fn)
 *
 * // Retrieve later
 * const retrieved = await registry.get('summarize')
 * ```
 */
export class PersistentFunctionRegistry implements FunctionRegistry {
  private readonly db: Database
  private readonly namespace: string
  private readonly cacheTtl: number

  // In-memory cache for performance
  private cache = new Map<string, { fn: DefinedFunction; timestamp: number }>()

  constructor(config: PersistentRegistryConfig) {
    this.db = config.database
    this.namespace = config.namespace ?? 'functions'
    this.cacheTtl = config.cacheTtl ?? 60000
  }

  /**
   * Generate document ID for a function
   */
  private docId(name: string): string {
    return `${this.namespace}/${name}`
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(entry: { fn: DefinedFunction; timestamp: number }): boolean {
    return Date.now() - entry.timestamp < this.cacheTtl
  }

  /**
   * Get a function by name (sync - returns from cache or undefined)
   *
   * Note: For async retrieval, use getAsync()
   */
  get(name: string): DefinedFunction | undefined {
    const cached = this.cache.get(name)
    if (cached && this.isCacheValid(cached)) {
      return cached.fn
    }
    return undefined
  }

  /**
   * Get a function by name (async - reads from database)
   */
  async getAsync(name: string): Promise<DefinedFunction | undefined> {
    // Check cache first
    const cached = this.cache.get(name)
    if (cached && this.isCacheValid(cached)) {
      return cached.fn
    }

    // Load from database
    const doc = await this.db.get(this.docId(name))
    if (!doc) return undefined

    const definition = doc.data as unknown as FunctionDefinition
    const fn = hydrateFunction(definition)

    // Update cache
    this.cache.set(name, { fn, timestamp: Date.now() })

    return fn
  }

  /**
   * Store a function (sync interface - queues write)
   */
  set(name: string, fn: DefinedFunction): void {
    // Update cache immediately
    this.cache.set(name, { fn, timestamp: Date.now() })

    // Queue async write (fire and forget)
    this.setAsync(name, fn).catch(err => {
      console.error(`Failed to persist function ${name}:`, err)
    })
  }

  /**
   * Store a function (async - writes to database)
   */
  async setAsync(name: string, fn: DefinedFunction): Promise<void> {
    const definition = fn.definition
    // Extract properties to avoid duplicate 'name' and 'type' keys
    const { name: defName, type: defType, ...restDefinition } = definition

    await this.db.set(this.docId(name), {
      type: 'AIFunction',
      data: {
        $type: 'AIFunction',
        name: defName,
        functionType: defType,
        ...restDefinition,
      },
      content: `# ${defName}\n\n${definition.description ?? ''}\n\nType: ${defType}`,
    })

    // Update cache
    this.cache.set(name, { fn, timestamp: Date.now() })
  }

  /**
   * Check if a function exists (sync - checks cache only)
   *
   * Note: For async check, use hasAsync()
   */
  has(name: string): boolean {
    const cached = this.cache.get(name)
    return cached !== undefined && this.isCacheValid(cached)
  }

  /**
   * Check if a function exists (async - checks database)
   */
  async hasAsync(name: string): Promise<boolean> {
    if (this.has(name)) return true

    const doc = await this.db.get(this.docId(name))
    return doc !== null
  }

  /**
   * List all function names (sync - returns cached names only)
   *
   * Note: For complete list, use listAsync()
   */
  list(): string[] {
    const names: string[] = []
    for (const [name, entry] of this.cache) {
      if (this.isCacheValid(entry)) {
        names.push(name)
      }
    }
    return names
  }

  /**
   * List all function names (async - reads from database)
   */
  async listAsync(): Promise<string[]> {
    const result = await this.db.list({
      type: 'AIFunction',
      prefix: this.namespace,
    })

    const names = result.documents.map(doc => {
      const id = doc.id ?? ''
      return id.startsWith(`${this.namespace}/`)
        ? id.slice(this.namespace.length + 1)
        : id
    })

    // Update cache with all functions
    for (const doc of result.documents) {
      const definition = doc.data as unknown as FunctionDefinition
      const fn = hydrateFunction(definition)
      const name = definition.name
      this.cache.set(name, { fn, timestamp: Date.now() })
    }

    return names
  }

  /**
   * Delete a function (sync - updates cache, queues delete)
   */
  delete(name: string): boolean {
    const existed = this.cache.has(name)
    this.cache.delete(name)

    // Queue async delete
    this.deleteAsync(name).catch(err => {
      console.error(`Failed to delete function ${name}:`, err)
    })

    return existed
  }

  /**
   * Delete a function (async - deletes from database)
   */
  async deleteAsync(name: string): Promise<boolean> {
    this.cache.delete(name)
    const result = await this.db.delete(this.docId(name))
    return result.deleted
  }

  /**
   * Clear all functions (sync - clears cache, queues full clear)
   */
  clear(): void {
    this.cache.clear()

    // Queue async clear
    this.clearAsync().catch(err => {
      console.error('Failed to clear functions:', err)
    })
  }

  /**
   * Clear all functions (async - deletes all from database)
   */
  async clearAsync(): Promise<void> {
    const names = await this.listAsync()
    await Promise.all(names.map(name => this.deleteAsync(name)))
    this.cache.clear()
  }

  /**
   * Preload all functions into cache
   */
  async preload(): Promise<void> {
    await this.listAsync()
  }

  /**
   * Get all functions (async)
   */
  async getAllAsync(): Promise<DefinedFunction[]> {
    const names = await this.listAsync()
    const functions: DefinedFunction[] = []

    for (const name of names) {
      const fn = await this.getAsync(name)
      if (fn) functions.push(fn)
    }

    return functions
  }

  /**
   * Store a function definition directly
   */
  async defineAsync<TArgs = unknown, TReturn = unknown>(
    definition: FunctionDefinition<TArgs, TReturn>
  ): Promise<DefinedFunction<TArgs, TReturn>> {
    const fn = hydrateFunction(definition)
    await this.setAsync(definition.name, fn as DefinedFunction)
    return fn
  }

  /**
   * Close the registry (closes database connection)
   */
  async close(): Promise<void> {
    await this.db.close?.()
  }
}

/**
 * Create a persistent function registry
 *
 * @example
 * ```ts
 * import { createFsDatabase } from '@mdxdb/fs'
 * import { createPersistentRegistry } from 'mdxai'
 *
 * const db = createFsDatabase({ root: './ai-functions' })
 * const registry = createPersistentRegistry({ database: db })
 *
 * // Define and persist a function
 * await registry.defineAsync({
 *   type: 'generative',
 *   name: 'translate',
 *   args: { text: 'Text to translate', targetLang: 'Target language' },
 *   output: 'string',
 *   promptTemplate: 'Translate "{{text}}" to {{targetLang}}',
 * })
 *
 * // Later, retrieve the function
 * const translate = await registry.getAsync('translate')
 * ```
 */
export function createPersistentRegistry(config: PersistentRegistryConfig): PersistentFunctionRegistry {
  return new PersistentFunctionRegistry(config)
}
