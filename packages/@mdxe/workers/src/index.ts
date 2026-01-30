/**
 * @mdxe/workers - Pure Cloudflare Workers execution for MDX
 *
 * This is the MAIN EXPORT - it contains ONLY code that runs in Cloudflare Workers
 * with ZERO Node.js dependencies.
 *
 * For build-time tools (build, publish, etc.) that run on your development machine,
 * import from '@mdxe/workers/build' instead.
 *
 * ## Architecture
 *
 * This package separates concerns:
 * - **Runtime** (this file): Pure Workers APIs, runs at the edge
 * - **Build** ('@mdxe/workers/build'): Node.js tools for bundling and deployment
 *
 * ## Usage
 *
 * ```ts
 * // In your Cloudflare Worker (wrangler.toml must have [[worker_loaders]] binding)
 * import { evaluateModule, type WorkerEnv } from '@mdxe/workers'
 *
 * export default {
 *   async fetch(request: Request, env: WorkerEnv) {
 *     // Pre-compiled module (compile at build time with @mdxe/isolate)
 *     const result = await evaluateModule(compiledModule, env)
 *     const greeting = await result.call('greet', 'World')
 *     return new Response(greeting)
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// RUNTIME EXPORTS - Pure Cloudflare Workers, no Node.js dependencies
// =============================================================================

export {
  // Core evaluation (requires pre-compiled modules)
  evaluateModule,
  createModuleHandler,

  // Cache utilities
  clearCache,
  isCached,
  getCacheStats,
  getCachedModule,
  cacheModule,

  // Pure utility functions
  createWorkerConfigFromModule,
  generateModuleIdFromContent,

  // Types
  type WorkerLoader,
  type WorkerInstance,
  type WorkerEntrypoint,
  type WorkerEnv,
  type WorkerConfig,
  type CompiledModule,
  type SandboxOptions,
  type EvaluateOptions as RuntimeEvaluateOptions,
  type EvaluateResult,
} from './runtime.js'

// =============================================================================
// CODE GENERATION UTILITIES - Pure, no Node.js dependencies
// These can be used in Workers or Node.js
// =============================================================================

export {
  generateWorkerCode,
  generateWorkerFromMDX,
  transformModuleCode,
  getExportNames,
  wrapScriptForReturn,
  type GenerateWorkerOptions,
} from './generate.js'

// =============================================================================
// WORKER LOADERS INTEGRATION
// Dynamic Worker Loaders API wrapper for MDX execution
// =============================================================================

export {
  // Main API
  createWorkerFromMDX,
  createWorkerLoaderAdapter,

  // Cache utilities
  clearWorkerCache,
  isWorkerCached,
  getWorkerCacheStats,
  clearModuleCache,
  getModuleCacheStats,

  // Types
  type WorkerLoaderBinding,
  type LoaderWorkerInstance,
  type LoaderWorkerEntrypoint,
  type WorkerLoaderConfig,
  type WorkerLoaderEnv,
  type WorkerLoaderOptions,
  type MDXWorker,
} from './loader.js'

// =============================================================================
// RE-EXPORTS FROM @mdxe/isolate (compilation utilities)
// Note: These pull in @mdx-js/mdx which works in both Workers and Node.js
// =============================================================================

import {
  compileToModule,
  compileToWorkerConfig,
  createWorkerConfig,
  generateModuleId,
  getExports,
  type CompiledModule as IsolateCompiledModule,
  type CompileToModuleOptions,
  type SandboxOptions as IsolateSandboxOptions,
  type WorkerConfig as IsolateWorkerConfig,
} from '@mdxe/isolate'

export {
  // Compilation functions (work in both Workers and Node.js)
  compileToModule,
  compileToWorkerConfig,
  createWorkerConfig,
  generateModuleId,
  getExports,
  // Types
  type CompileToModuleOptions,
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// These combine compilation + evaluation for environments that support both
// =============================================================================

import type {
  WorkerEnv,
  CompiledModule,
  SandboxOptions,
  EvaluateResult,
} from './runtime.js'
import { evaluateModule, generateModuleIdFromContent, cacheModule, isCached as runtimeIsCached, getCachedModule } from './runtime.js'

/**
 * Extended evaluate options that include compilation options
 */
export interface EvaluateOptions extends CompileToModuleOptions {
  /** Sandbox options for secure execution */
  sandbox?: SandboxOptions
  /** Cache compiled modules */
  cache?: boolean
  /** Custom module ID (defaults to content hash) */
  moduleId?: string
}

// Note: We use the cache from runtime.js for consistency

/**
 * Evaluate MDX content in an isolated Worker
 *
 * This function compiles MDX at runtime, which requires @mdxe/isolate.
 * For production Workers, consider pre-compiling your MDX at build time
 * and using evaluateModule() directly.
 *
 * @param content - MDX content string
 * @param env - Worker environment with LOADER binding
 * @param options - Evaluate options
 * @returns Evaluate result with exports and call utilities
 *
 * @example
 * ```ts
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
  const moduleId = customId || generateModuleIdFromContent(content)

  // Check cache (using runtime cache)
  let module: CompiledModule
  const cachedModule = getCachedModule(moduleId)
  if (cache && cachedModule) {
    module = cachedModule
  } else {
    // Compile using @mdxe/isolate
    module = await compileToModule(content, compileOpts)
    if (cache) {
      cacheModule(module, moduleId)
    }
  }

  return evaluateModule<T>(module, env, { sandbox, cache: false, moduleId })
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
export function createEvaluator(env: WorkerEnv, defaultOptions: EvaluateOptions = {}) {
  return <T = unknown>(content: string, options: EvaluateOptions = {}) =>
    evaluate<T>(content, env, { ...defaultOptions, ...options })
}

/**
 * Precompile MDX content and cache it
 *
 * @param content - MDX content string
 * @param options - Compile options
 * @returns Module ID for later use
 */
export async function precompile(content: string, options: CompileToModuleOptions = {}): Promise<string> {
  const module = await compileToModule(content, options)
  const moduleId = generateModuleId(content)
  cacheModule(module, moduleId)
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
export function createHandler(env: WorkerEnv, options: EvaluateOptions = {}): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const body = (await request.json()) as {
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
