/**
 * @mdxe/workers - Securely evaluate MDX in Cloudflare Workers
 *
 * Uses the Dynamic Worker Loader API to run compiled MDX code in isolated
 * workerd instances with configurable sandboxing.
 *
 * @packageDocumentation
 */

import {
  compileToModule,
  compileToWorkerConfig,
  createWorkerConfig,
  generateModuleId,
  getExports,
  type CompiledModule,
  type CompileToModuleOptions,
  type SandboxOptions,
  type WorkerConfig,
} from '@mdxe/isolate'

// Re-export from isolate
export {
  compileToModule,
  compileToWorkerConfig,
  createWorkerConfig,
  generateModuleId,
  getExports,
  type CompiledModule,
  type CompileToModuleOptions,
  type SandboxOptions,
  type WorkerConfig,
} from '@mdxe/isolate'

/**
 * Worker Loader binding interface
 * This is the type for env.LOADER when using [[worker_loaders]] binding
 */
export interface WorkerLoader {
  get(
    id: string,
    callback: () => Promise<WorkerConfig>
  ): WorkerInstance
}

/**
 * Worker instance returned by Worker Loader
 */
export interface WorkerInstance {
  getEntrypoint(name?: string): WorkerEntrypoint
}

/**
 * Worker entrypoint with fetch capability
 */
export interface WorkerEntrypoint {
  fetch(request: Request | string): Promise<Response>
}

/**
 * Environment with Worker Loader binding
 */
export interface WorkerEnv {
  LOADER: WorkerLoader
}

/**
 * Evaluate options for MDX execution
 */
export interface EvaluateOptions extends CompileToModuleOptions {
  /** Sandbox options */
  sandbox?: SandboxOptions
  /** Cache compiled modules */
  cache?: boolean
  /** Custom module ID (defaults to content hash) */
  moduleId?: string
}

/**
 * Evaluate result containing exports and utilities
 */
export interface EvaluateResult<T = unknown> {
  /** Default MDX component export */
  default?: T
  /** All named exports */
  exports: Record<string, unknown>
  /** Frontmatter data */
  data: Record<string, unknown>
  /** Call an exported function */
  call: <R = unknown>(name: string, ...args: unknown[]) => Promise<R>
  /** Get module metadata */
  meta: () => Promise<{ exports: string[]; hasDefault: boolean }>
  /** Module ID for caching reference */
  moduleId: string
}

/**
 * Module cache for compiled MDX
 */
const moduleCache = new Map<string, CompiledModule>()

/**
 * Evaluate MDX content securely in an isolated Worker
 *
 * @param content - MDX content string
 * @param env - Worker environment with LOADER binding
 * @param options - Evaluate options
 * @returns Evaluate result with exports and call utilities
 *
 * @example
 * ```ts
 * // In your Cloudflare Worker
 * import { evaluate } from '@mdxe/workers'
 *
 * export default {
 *   async fetch(request, env) {
 *     const mdx = \`
 *       export function greet(name) {
 *         return \\\`Hello, \\\${name}!\\\`
 *       }
 *     \`
 *
 *     const result = await evaluate(mdx, env, {
 *       sandbox: { blockNetwork: true }
 *     })
 *
 *     const greeting = await result.call('greet', 'World')
 *     return new Response(greeting)
 *   }
 * }
 * ```
 */
export async function evaluate<T = unknown>(
  content: string,
  env: WorkerEnv,
  options: EvaluateOptions = {}
): Promise<EvaluateResult<T>> {
  const { sandbox, cache = true, moduleId: customId, ...compileOpts } = options

  // Generate module ID
  const moduleId = customId || generateModuleId(content)

  // Check cache
  let module: CompiledModule
  if (cache && moduleCache.has(moduleId)) {
    module = moduleCache.get(moduleId)!
  } else {
    module = await compileToModule(content, compileOpts)
    if (cache) {
      moduleCache.set(moduleId, module)
    }
  }

  // Create worker config
  const config = createWorkerConfig(module, sandbox)

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
      const error = await response.json() as { error: string; stack?: string }
      throw new Error(error.error)
    }

    const result = await response.json() as { result: R }
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
 * Create an MDX evaluator with pre-configured options
 *
 * @param env - Worker environment with LOADER binding
 * @param defaultOptions - Default options for all evaluations
 * @returns Evaluator function
 *
 * @example
 * ```ts
 * const evaluator = createEvaluator(env, {
 *   sandbox: { blockNetwork: true }
 * })
 *
 * const result = await evaluator(mdxContent)
 * ```
 */
export function createEvaluator(
  env: WorkerEnv,
  defaultOptions: EvaluateOptions = {}
) {
  return <T = unknown>(content: string, options: EvaluateOptions = {}) =>
    evaluate<T>(content, env, { ...defaultOptions, ...options })
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
 * Precompile MDX content and cache it
 *
 * @param content - MDX content string
 * @param options - Compile options
 * @returns Module ID for later use
 */
export async function precompile(
  content: string,
  options: CompileToModuleOptions = {}
): Promise<string> {
  const module = await compileToModule(content, options)
  const moduleId = generateModuleId(content)
  moduleCache.set(moduleId, module)
  return moduleId
}

/**
 * Create a Worker handler for MDX evaluation requests
 *
 * @param env - Worker environment
 * @param options - Default evaluate options
 * @returns Fetch handler function
 *
 * @example
 * ```ts
 * // wrangler.toml
 * // [[worker_loaders]]
 * // binding = "LOADER"
 *
 * import { createHandler } from '@mdxe/workers'
 *
 * export default {
 *   fetch: createHandler(env, { sandbox: { blockNetwork: true } })
 * }
 * ```
 */
export function createHandler(
  env: WorkerEnv,
  options: EvaluateOptions = {}
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const body = await request.json() as {
        content: string
        action?: string
        args?: unknown[]
        options?: EvaluateOptions
      }

      const result = await evaluate(body.content, env, {
        ...options,
        ...body.options,
      })

      if (body.action) {
        const value = await result.call(body.action, ...(body.args || []))
        return new Response(JSON.stringify({ result: value }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const meta = await result.meta()
      return new Response(JSON.stringify({
        moduleId: result.moduleId,
        data: result.data,
        ...meta,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const err = error as Error
      return new Response(JSON.stringify({
        error: err.message,
        stack: err.stack,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}
