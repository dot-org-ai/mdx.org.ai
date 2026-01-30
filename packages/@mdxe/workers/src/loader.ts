/**
 * Worker Loaders integration for MDX execution
 *
 * This module provides a wrapper around Cloudflare's Dynamic Worker Loaders API
 * to enable secure, sandboxed execution of MDX content in isolated workers.
 *
 * @packageDocumentation
 */

import { compileToModule, createWorkerConfig, generateModuleId } from '@mdxe/isolate'
import type { CompiledModule, SandboxOptions } from './runtime.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Worker Loader binding interface from Cloudflare Workers
 * This represents the env.LOADER binding from [[worker_loaders]] config
 */
export interface WorkerLoaderBinding {
  /**
   * Get or create a dynamic worker instance
   *
   * @param id - Unique identifier for the worker (used for caching)
   * @param callback - Async function that returns the worker configuration
   * @returns Worker instance that can be used to make requests
   */
  get(id: string, callback: () => Promise<WorkerLoaderConfig>): LoaderWorkerInstance
}

/**
 * Worker instance returned by Worker Loader binding
 */
export interface LoaderWorkerInstance {
  /**
   * Get an entrypoint from the worker
   *
   * @param name - Optional entrypoint name (default is the main export)
   * @returns Worker entrypoint that can handle fetch requests
   */
  getEntrypoint(name?: string): LoaderWorkerEntrypoint
}

/**
 * Worker entrypoint with fetch capability
 */
export interface LoaderWorkerEntrypoint {
  /**
   * Make a fetch request to the worker
   *
   * @param request - Request object or URL string
   * @returns Response from the worker
   */
  fetch(request: Request | string): Promise<Response>
}

/**
 * Worker configuration for Dynamic Worker Loader
 */
export interface WorkerLoaderConfig {
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
 * Environment with Worker Loader binding
 */
export interface WorkerLoaderEnv {
  /** Worker Loader binding from [[worker_loaders]] config */
  LOADER: WorkerLoaderBinding
  /** Allow additional environment bindings */
  [key: string]: unknown
}

/**
 * Options for creating a worker from MDX
 */
export interface WorkerLoaderOptions extends SandboxOptions {
  /** Custom bindings to pass to the worker */
  bindings?: Record<string, unknown>
  /** ID generation strategy */
  idStrategy?: 'explicit' | 'content-hash' | 'versioned'
  /** Version string (used with versioned ID strategy) */
  version?: string
  /** Skip caching this worker */
  noCache?: boolean
}

/**
 * MDX Worker wrapper with convenience methods
 */
export interface MDXWorker {
  /** Unique identifier for this worker */
  id: string
  /** Parsed frontmatter data from MDX */
  data: Record<string, unknown>
  /** Make a raw fetch request to the worker */
  fetch(path: string, init?: RequestInit): Promise<Response>
  /** Call an exported function by name */
  call<T = unknown>(name: string, ...args: unknown[]): Promise<T>
  /** Get module metadata (available exports) */
  meta(): Promise<{ exports: string[]; hasDefault: boolean }>
  /** Destroy the worker and remove from cache */
  destroy(): void
}

// ============================================================================
// Module Cache
// ============================================================================

/**
 * Internal cache for worker wrappers
 */
const workerCache = new Map<string, MDXWorker>()

/**
 * Internal cache for compiled modules
 */
const moduleCache = new Map<string, CompiledModule>()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate worker ID based on strategy
 */
function generateWorkerId(
  baseId: string,
  content: string,
  options: WorkerLoaderOptions
): string {
  const { idStrategy = 'explicit', version } = options

  switch (idStrategy) {
    case 'content-hash':
      return `${baseId}-${generateModuleId(content)}`
    case 'versioned':
      return version ? `${baseId}-${version}` : baseId
    case 'explicit':
    default:
      return baseId
  }
}

/**
 * Create worker configuration from compiled module and options
 */
function createConfig(
  module: CompiledModule,
  options: WorkerLoaderOptions
): WorkerLoaderConfig {
  const config = createWorkerConfig(module, options)

  // Add custom bindings if provided
  if (options.bindings) {
    config.env = {
      ...config.env,
      ...options.bindings,
    }
  }

  return config
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Create a worker from MDX content using the Worker Loaders API
 *
 * This function compiles MDX to a worker module and creates an isolated
 * worker instance via Cloudflare's Dynamic Worker Loaders binding.
 *
 * @param id - Unique identifier for the worker (used for caching)
 * @param mdxContent - MDX content string to compile and execute
 * @param env - Worker environment with LOADER binding
 * @param options - Worker loader options
 * @returns MDX Worker wrapper with convenience methods
 *
 * @example
 * ```ts
 * // In your Cloudflare Worker (wrangler.toml must have [[worker_loaders]] binding)
 * import { createWorkerFromMDX } from '@mdxe/workers/loader'
 *
 * export default {
 *   async fetch(request, env) {
 *     const mdx = \`
 *       export function greet(name) {
 *         return \\\`Hello, \\\${name}!\\\`
 *       }
 *     \`
 *
 *     const worker = await createWorkerFromMDX('greeting', mdx, env)
 *     const result = await worker.call('greet', 'World')
 *     return new Response(result)
 *   }
 * }
 * ```
 */
export async function createWorkerFromMDX(
  id: string,
  mdxContent: string,
  env: WorkerLoaderEnv,
  options: WorkerLoaderOptions = {}
): Promise<MDXWorker> {
  // Generate final worker ID
  const workerId = generateWorkerId(id, mdxContent, options)

  // Check cache first (unless noCache is set)
  if (!options.noCache && workerCache.has(workerId)) {
    return workerCache.get(workerId)!
  }

  // Compile MDX to module
  let module: CompiledModule

  // Check module cache
  const moduleId = generateModuleId(mdxContent)
  if (moduleCache.has(moduleId)) {
    module = moduleCache.get(moduleId)!
  } else {
    module = await compileToModule(mdxContent)
    moduleCache.set(moduleId, module)
  }

  // Get worker instance from loader
  const loaderInstance = env.LOADER.get(workerId, async () => {
    return createConfig(module, options)
  })

  const entrypoint = loaderInstance.getEntrypoint()

  // Track if worker has been destroyed
  let destroyed = false

  // Create worker wrapper
  const worker: MDXWorker = {
    id: workerId,
    data: module.data,

    async fetch(path: string, init?: RequestInit): Promise<Response> {
      if (destroyed) {
        throw new Error(`Worker "${workerId}" has been destroyed`)
      }
      const url = path.startsWith('http') ? path : `http://worker${path}`
      return entrypoint.fetch(new Request(url, init))
    },

    async call<T = unknown>(name: string, ...args: unknown[]): Promise<T> {
      if (destroyed) {
        throw new Error(`Worker "${workerId}" has been destroyed`)
      }
      const response = await entrypoint.fetch(
        new Request(`http://worker/call/${name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args }),
        })
      )

      if (!response.ok) {
        const error = (await response.json()) as { error: string }
        throw new Error(error.error)
      }

      const result = (await response.json()) as { result: T }
      return result.result
    },

    async meta(): Promise<{ exports: string[]; hasDefault: boolean }> {
      if (destroyed) {
        throw new Error(`Worker "${workerId}" has been destroyed`)
      }
      const response = await entrypoint.fetch('http://worker/meta')
      return response.json() as Promise<{ exports: string[]; hasDefault: boolean }>
    },

    destroy(): void {
      destroyed = true
      workerCache.delete(workerId)
    },
  }

  // Cache the worker wrapper
  if (!options.noCache) {
    workerCache.set(workerId, worker)
  }

  return worker
}

/**
 * Create a Worker Loader adapter with pre-configured options
 *
 * @param env - Worker environment with LOADER binding
 * @param defaultOptions - Default options for all workers created by this adapter
 * @returns Adapter function for creating workers
 *
 * @example
 * ```ts
 * const adapter = createWorkerLoaderAdapter(env, {
 *   blockNetwork: true,
 *   timeout: 10000,
 * })
 *
 * const worker = await adapter('my-worker', mdxContent)
 * ```
 */
export function createWorkerLoaderAdapter(
  env: WorkerLoaderEnv,
  defaultOptions: WorkerLoaderOptions = {}
): (
  id: string,
  mdxContent: string,
  options?: WorkerLoaderOptions
) => Promise<MDXWorker> {
  return (id: string, mdxContent: string, options: WorkerLoaderOptions = {}) =>
    createWorkerFromMDX(id, mdxContent, env, { ...defaultOptions, ...options })
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Clear worker cache
 *
 * @param workerId - Specific worker ID to clear, or all if not provided
 */
export function clearWorkerCache(workerId?: string): void {
  if (workerId) {
    const worker = workerCache.get(workerId)
    if (worker) {
      // Call destroy to mark as destroyed
      workerCache.delete(workerId)
    }
  } else {
    workerCache.clear()
  }
}

/**
 * Check if a worker is cached
 *
 * @param workerId - Worker ID to check
 * @returns Whether the worker is cached
 */
export function isWorkerCached(workerId: string): boolean {
  return workerCache.has(workerId)
}

/**
 * Get worker cache statistics
 *
 * @returns Cache size and worker IDs
 */
export function getWorkerCacheStats(): { size: number; workerIds: string[] } {
  return {
    size: workerCache.size,
    workerIds: Array.from(workerCache.keys()),
  }
}

/**
 * Clear the module compilation cache
 *
 * @param moduleId - Specific module ID to clear, or all if not provided
 */
export function clearModuleCache(moduleId?: string): void {
  if (moduleId) {
    moduleCache.delete(moduleId)
  } else {
    moduleCache.clear()
  }
}

/**
 * Get module cache statistics
 *
 * @returns Cache size and module IDs
 */
export function getModuleCacheStats(): { size: number; moduleIds: string[] } {
  return {
    size: moduleCache.size,
    moduleIds: Array.from(moduleCache.keys()),
  }
}
