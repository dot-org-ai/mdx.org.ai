/**
 * @mdxe/workers Runtime - Pure Cloudflare Workers execution
 *
 * This module provides RUNTIME-ONLY exports that work in Cloudflare Workers
 * with ZERO Node.js dependencies. All functions here use only:
 * - Web Platform APIs (Request, Response, URL, etc.)
 * - Cloudflare Workers APIs (env bindings, worker_loaders)
 *
 * For BUILD-TIME tools (build, publish), import from '@mdxe/workers/build'
 *
 * @packageDocumentation
 */

/**
 * Worker Loader binding interface
 * This is the type for env.LOADER when using [[worker_loaders]] binding in wrangler.toml
 *
 * Configuration:
 * ```toml
 * [[worker_loaders]]
 * binding = "LOADER"
 * ```
 */
export interface WorkerLoader {
  /**
   * Get or create a dynamic worker instance
   *
   * @param id - Unique identifier for the worker (used for caching)
   * @param callback - Async function that returns the worker configuration
   * @returns Worker instance that can be used to make requests
   */
  get(id: string, callback: () => Promise<WorkerConfig>): WorkerInstance
}

/**
 * Worker instance returned by Worker Loader
 */
export interface WorkerInstance {
  /**
   * Get an entrypoint from the worker
   *
   * @param name - Optional entrypoint name (default is the main export)
   * @returns Worker entrypoint that can handle fetch requests
   */
  getEntrypoint(name?: string): WorkerEntrypoint
}

/**
 * Worker entrypoint with fetch capability
 */
export interface WorkerEntrypoint {
  /**
   * Make a fetch request to the worker
   *
   * @param request - Request object or URL string
   * @returns Response from the worker
   */
  fetch(request: Request | string): Promise<Response>
}

/**
 * Environment with Worker Loader binding
 */
export interface WorkerEnv {
  /** Worker Loader binding from [[worker_loaders]] config */
  LOADER: WorkerLoader
  /** Allow additional environment bindings */
  [key: string]: unknown
}

/**
 * Worker configuration for Dynamic Worker Loader
 * This matches the format expected by the worker_loaders binding
 */
export interface WorkerConfig {
  /** Compatibility date for Workers runtime */
  compatibilityDate?: string
  /** Main module entry point filename */
  mainModule: string
  /** Module source code map (filename -> code) */
  modules: Record<string, string>
  /** Environment bindings to pass to the worker */
  env?: Record<string, unknown>
  /** Global outbound handler (null to block all network) */
  globalOutbound?: unknown | null
}

/**
 * Compiled module ready for Worker Loader
 */
export interface CompiledModule {
  /** Main module entry point filename */
  mainModule: string
  /** Module source code map (filename -> code) */
  modules: Record<string, string>
  /** Parsed frontmatter data */
  data: Record<string, unknown>
  /** Original content hash for caching */
  hash: string
}

/**
 * Sandbox options for secure execution
 */
export interface SandboxOptions {
  /** Block all network access (default: true) */
  blockNetwork?: boolean
  /** Allowed environment bindings */
  allowedBindings?: string[]
  /** Maximum execution time in ms */
  timeout?: number
  /** Memory limit in MB */
  memoryLimit?: number
}

/**
 * Evaluate options for MDX execution
 */
export interface EvaluateOptions {
  /** Sandbox options */
  sandbox?: SandboxOptions
  /** Cache compiled modules */
  cache?: boolean
  /** Custom module ID (defaults to content hash) */
  moduleId?: string
  /** Pre-compiled module (skip compilation) */
  compiledModule?: CompiledModule
}

/**
 * Evaluate result containing exports and utilities
 */
export interface EvaluateResult<T = unknown> {
  /** Default MDX component export */
  default?: T
  /** All named exports (empty until fetched via call/meta) */
  exports: Record<string, unknown>
  /** Frontmatter data */
  data: Record<string, unknown>
  /** Call an exported function */
  call: <R = unknown>(name: string, ...args: unknown[]) => Promise<R>
  /** Get module metadata (available exports) */
  meta: () => Promise<{ exports: string[]; hasDefault: boolean }>
  /** Module ID for caching reference */
  moduleId: string
}

/**
 * Simple hash function for content-based caching
 * Works in Workers environment (no Node.js crypto)
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Create a Worker configuration from compiled module
 * Pure function with no external dependencies
 */
export function createWorkerConfigFromModule(
  module: CompiledModule,
  sandbox: SandboxOptions = {}
): WorkerConfig {
  const { blockNetwork = true } = sandbox

  return {
    compatibilityDate: '2024-01-01',
    mainModule: module.mainModule,
    modules: module.modules,
    env: {},
    globalOutbound: blockNetwork ? null : undefined,
  }
}

/**
 * Generate module ID from content
 * Pure function for caching keys
 */
export function generateModuleIdFromContent(content: string, version?: string): string {
  const contentHash = hashContent(content)
  return version ? `${contentHash}-${version}` : contentHash
}

/**
 * Module cache for compiled modules
 * In-memory cache for the current worker instance
 */
const moduleCache = new Map<string, CompiledModule>()

/**
 * Evaluate a pre-compiled MDX module securely in an isolated Worker
 *
 * This function requires:
 * 1. A pre-compiled module (use @mdxe/isolate for compilation)
 * 2. An environment with LOADER binding from [[worker_loaders]]
 *
 * @param module - Pre-compiled MDX module
 * @param env - Worker environment with LOADER binding
 * @param options - Evaluate options
 * @returns Evaluate result with call and meta utilities
 *
 * @example
 * ```ts
 * // In your Cloudflare Worker with [[worker_loaders]] binding
 * import { evaluateModule } from '@mdxe/workers'
 *
 * export default {
 *   async fetch(request, env) {
 *     // Module pre-compiled elsewhere
 *     const module = {
 *       mainModule: 'entry.js',
 *       modules: { 'entry.js': '...', 'mdx.js': '...' },
 *       data: { title: 'Hello' },
 *       hash: 'abc123'
 *     }
 *
 *     const result = await evaluateModule(module, env)
 *     const greeting = await result.call('greet', 'World')
 *     return new Response(greeting)
 *   }
 * }
 * ```
 */
export async function evaluateModule<T = unknown>(
  module: CompiledModule,
  env: WorkerEnv,
  options: Omit<EvaluateOptions, 'compiledModule'> = {}
): Promise<EvaluateResult<T>> {
  const { sandbox, cache = true, moduleId: customId } = options

  // Generate module ID
  const moduleId = customId || module.hash

  // Cache the module if requested
  if (cache) {
    moduleCache.set(moduleId, module)
  }

  // Create worker config
  const config = createWorkerConfigFromModule(module, sandbox)

  // Get worker instance from loader
  const worker = env.LOADER.get(moduleId, async () => config)
  const entrypoint = worker.getEntrypoint()

  // Helper to call exported functions
  const call = async <R = unknown>(name: string, ...args: unknown[]): Promise<R> => {
    const response = await entrypoint.fetch(
      new Request(`http://worker/call/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args }),
      })
    )

    if (!response.ok) {
      const error = (await response.json()) as { error: string; stack?: string }
      throw new Error(error.error)
    }

    const result = (await response.json()) as { result: R }
    return result.result
  }

  // Helper to get metadata
  const meta = async () => {
    const response = await entrypoint.fetch('http://worker/meta')
    return response.json() as Promise<{ exports: string[]; hasDefault: boolean }>
  }

  return {
    exports: {},
    data: module.data,
    call,
    meta,
    moduleId,
  }
}

/**
 * Clear the module cache
 *
 * @param moduleId - Specific module ID to clear, or all if not provided
 */
export function clearCache(moduleId?: string): void {
  if (moduleId) {
    moduleCache.delete(moduleId)
  } else {
    moduleCache.clear()
  }
}

/**
 * Check if a module is cached
 *
 * @param moduleId - Module ID to check
 * @returns Whether the module is cached
 */
export function isCached(moduleId: string): boolean {
  return moduleCache.has(moduleId)
}

/**
 * Get cache statistics
 *
 * @returns Cache size and module IDs
 */
export function getCacheStats(): { size: number; moduleIds: string[] } {
  return {
    size: moduleCache.size,
    moduleIds: Array.from(moduleCache.keys()),
  }
}

/**
 * Get a cached module by ID
 *
 * @param moduleId - Module ID to retrieve
 * @returns Cached module or undefined
 */
export function getCachedModule(moduleId: string): CompiledModule | undefined {
  return moduleCache.get(moduleId)
}

/**
 * Store a compiled module in the cache
 *
 * @param module - Compiled module to cache
 * @param moduleId - Optional custom module ID (defaults to module.hash)
 * @returns The module ID used for caching
 */
export function cacheModule(module: CompiledModule, moduleId?: string): string {
  const id = moduleId || module.hash
  moduleCache.set(id, module)
  return id
}

/**
 * Create a request handler for MDX evaluation
 *
 * @param env - Worker environment with LOADER binding
 * @param getModule - Function to get the compiled module for a request
 * @returns Fetch handler function
 *
 * @example
 * ```ts
 * import { createModuleHandler } from '@mdxe/workers'
 *
 * // Your pre-compiled modules
 * const modules = { '/hello': helloModule, '/calc': calcModule }
 *
 * export default {
 *   fetch: createModuleHandler(env, async (request) => {
 *     const url = new URL(request.url)
 *     return modules[url.pathname]
 *   })
 * }
 * ```
 */
export function createModuleHandler(
  env: WorkerEnv,
  getModule: (request: Request) => Promise<CompiledModule | undefined>,
  options: Omit<EvaluateOptions, 'compiledModule'> = {}
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      const module = await getModule(request)

      if (!module) {
        return new Response('Module not found', { status: 404 })
      }

      const result = await evaluateModule(module, env, options)

      // Parse request for action
      if (request.method === 'POST') {
        const body = (await request.json()) as {
          action?: string
          args?: unknown[]
        }

        if (body.action) {
          const value = await result.call(body.action, ...(body.args || []))
          return new Response(JSON.stringify({ result: value }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }

      // Return module info
      const meta = await result.meta()
      return new Response(
        JSON.stringify({
          moduleId: result.moduleId,
          data: result.data,
          ...meta,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      const err = error as Error
      return new Response(
        JSON.stringify({
          error: err.message,
          stack: err.stack,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
