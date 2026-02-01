/**
 * @mdxe/bun - MDX evaluation using Miniflare (workerd)
 *
 * Securely evaluate MDX in Bun using miniflare. Provides the same
 * secure isolation as Cloudflare Workers, with the same API as @mdxe/node.
 *
 * @packageDocumentation
 */

import { Miniflare } from 'miniflare'
import {
  compileToModule,
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
  createWorkerConfig,
  generateModuleId,
  getExports,
  type CompiledModule,
  type CompileToModuleOptions,
  type SandboxOptions,
  type WorkerConfig,
} from '@mdxe/isolate'

/**
 * Miniflare configuration options
 */
export interface MiniflareConfig {
  /** Compatibility date */
  compatibilityDate?: string
  /** Additional miniflare options */
  [key: string]: unknown
}

/**
 * Evaluate options for MDX execution
 */
export interface EvaluateOptions extends CompileToModuleOptions {
  /** Sandbox options */
  sandbox?: SandboxOptions
  /** Miniflare options override */
  miniflareOptions?: MiniflareConfig
  /** Global variables to expose to the evaluated code (for backward compatibility) */
  globals?: Record<string, unknown>
  /** Whether to strip TypeScript types (legacy, not used with Miniflare) */
  stripTypes?: boolean
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
  /** Raw content (markdown body) */
  content: string
  /** The original parsed document (for backward compatibility) */
  doc?: { data: Record<string, unknown>; content: string }
  /** Call an exported function */
  call: <R = unknown>(name: string, ...args: unknown[]) => Promise<R>
  /** Get module metadata */
  meta: () => Promise<{ exports: string[]; hasDefault: boolean }>
  /** Module ID for caching reference */
  moduleId: string
  /** Dispose the miniflare instance */
  dispose: () => Promise<void>
}

/**
 * Evaluator instance that manages miniflare lifecycle
 */
export interface Evaluator {
  /** Evaluate MDX content */
  evaluate: <T = unknown>(content: string, options?: EvaluateOptions) => Promise<EvaluateResult<T>>
  /** Dispose all miniflare instances */
  dispose: () => Promise<void>
  /** Get active instance count */
  getInstanceCount: () => number
}

/**
 * Maximum number of Miniflare instances to keep in cache.
 * When this limit is reached, the least recently used instance is evicted.
 */
export const MAX_INSTANCES = 50

/**
 * Cached instance with metadata for LRU eviction
 */
interface CachedInstance {
  mf: Miniflare
  lastUsed: number
}

/**
 * Active miniflare instances with LRU metadata
 */
const instances = new Map<string, CachedInstance>()

/**
 * Generate a cache key that includes both content hash and sandbox options
 */
function getCacheKey(moduleId: string, sandbox?: SandboxOptions): string {
  if (!sandbox || Object.keys(sandbox).length === 0) {
    return moduleId
  }
  // Sort keys for consistent cache keys
  const sortedSandbox = Object.keys(sandbox)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = sandbox[key as keyof SandboxOptions]
        return acc
      },
      {} as Record<string, unknown>
    )
  return `${moduleId}-${JSON.stringify(sortedSandbox)}`
}

/**
 * Evict the least recently used instance when at capacity
 */
async function evictLRU(): Promise<void> {
  if (instances.size < MAX_INSTANCES) {
    return
  }

  let oldest: { key: string; time: number } | null = null
  for (const [key, value] of instances) {
    if (!oldest || value.lastUsed < oldest.time) {
      oldest = { key, time: value.lastUsed }
    }
  }

  if (oldest) {
    const instance = instances.get(oldest.key)
    if (instance) {
      await instance.mf.dispose()
      instances.delete(oldest.key)
    }
  }
}

/**
 * Create a miniflare instance for the compiled module
 */
async function createMiniflareInstance(
  module: CompiledModule,
  sandbox: SandboxOptions = {},
  options: MiniflareConfig = {}
): Promise<Miniflare> {
  const config = createWorkerConfig(module, sandbox)

  // Build ES modules array for Miniflare
  const modules = Object.entries(config.modules).map(([name, content]) => ({
    type: 'ESModule' as const,
    path: `./${name}`,
    contents: content,
  }))

  // Find the main module
  const mainModule = modules.find((m) => m.path === `./${config.mainModule}`)
  if (!mainModule) {
    throw new Error(`Main module ${config.mainModule} not found`)
  }

  const mf = new Miniflare({
    modules: [
      // Main module first
      mainModule,
      // Then other modules
      ...modules.filter((m) => m !== mainModule),
    ],
    compatibilityDate: config.compatibilityDate,
    ...options,
  })

  return mf
}

/**
 * Evaluate MDX content securely in an isolated workerd instance
 *
 * @param content - MDX content string
 * @param options - Evaluate options
 * @returns Evaluate result with exports and call utilities
 *
 * @example
 * ```ts
 * import { evaluate } from '@mdxe/bun'
 *
 * const mdx = `
 *   export function greet(name) {
 *     return \`Hello, \${name}!\`
 *   }
 * `
 *
 * const result = await evaluate(mdx, {
 *   sandbox: { blockNetwork: true }
 * })
 *
 * const greeting = await result.call('greet', 'World')
 * console.log(greeting) // "Hello, World!"
 *
 * await result.dispose()
 * ```
 */
export async function evaluate<T = unknown>(
  content: string,
  options: EvaluateOptions = {}
): Promise<EvaluateResult<T>> {
  const { sandbox, miniflareOptions, ...compileOpts } = options

  // Compile MDX to module - always bundle JSX runtime since we're in isolated env
  const module = await compileToModule(content, {
    bundleRuntime: true,
    ...compileOpts,
  })
  const moduleId = generateModuleId(content)
  const cacheKey = getCacheKey(moduleId, sandbox)

  // Create or reuse miniflare instance
  let cached = instances.get(cacheKey)
  let mf: Miniflare
  if (cached) {
    // Update last used time for LRU tracking
    cached.lastUsed = Date.now()
    mf = cached.mf
  } else {
    // Evict LRU if at capacity
    await evictLRU()
    mf = await createMiniflareInstance(module, sandbox, miniflareOptions)
    instances.set(cacheKey, { mf, lastUsed: Date.now() })
  }

  // Helper to call exported functions
  const call = async <R = unknown>(name: string, ...args: unknown[]): Promise<R> => {
    const response = await mf!.dispatchFetch(`http://localhost/call/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args }),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error: string; stack?: string }
      throw new Error(error.error)
    }

    const result = (await response.json()) as { result: R }
    return result.result
  }

  // Helper to get metadata
  const meta = async () => {
    const response = await mf!.dispatchFetch('http://localhost/meta')
    return response.json() as Promise<{ exports: string[]; hasDefault: boolean }>
  }

  // Dispose helper - uses cacheKey for proper lookup
  const dispose = async () => {
    const instance = instances.get(cacheKey)
    if (instance) {
      await instance.mf.dispose()
      instances.delete(cacheKey)
    }
  }

  return {
    exports: {},
    data: module.data,
    content: content,
    doc: { data: module.data, content: content },
    call,
    meta,
    moduleId,
    dispose,
  }
}

/**
 * Evaluate an MDX file
 *
 * @param filePath - Path to the MDX file
 * @param options - Evaluation options
 * @returns Evaluated module exports and metadata
 */
export async function evaluateFile<T = unknown>(
  filePath: string,
  options: EvaluateOptions = {}
): Promise<EvaluateResult<T>> {
  const content = await Bun.file(filePath).text()
  return evaluate<T>(content, options)
}

/**
 * Run MDX content and get result directly (convenience function)
 *
 * @param content - MDX content string
 * @param functionName - Function to call
 * @param args - Arguments to pass
 * @param options - Evaluate options
 * @returns Function result
 *
 * @example
 * ```ts
 * import { run } from '@mdxe/bun'
 *
 * const result = await run(
 *   'export const add = (a, b) => a + b',
 *   'add',
 *   [1, 2]
 * )
 * console.log(result) // 3
 * ```
 */
export async function run<R = unknown>(
  content: string,
  functionName: string,
  args: unknown[] = [],
  options: EvaluateOptions = {}
): Promise<R> {
  const result = await evaluate(content, options)
  try {
    return await result.call<R>(functionName, ...args)
  } finally {
    await result.dispose()
  }
}

/**
 * Run a specific exported function from an MDX file
 *
 * @param filePath - Path to the MDX file
 * @param functionName - Name of the function to call
 * @param args - Arguments to pass to the function
 * @param options - Evaluation options
 * @returns Function result
 */
export async function runFile<R = unknown>(
  filePath: string,
  functionName: string,
  args: unknown[] = [],
  options: EvaluateOptions = {}
): Promise<R> {
  const content = await Bun.file(filePath).text()
  return run<R>(content, functionName, args, options)
}

/**
 * Create an MDX evaluator with pre-configured options
 *
 * @param defaultOptions - Default options for all evaluations
 * @returns Evaluator instance
 *
 * @example
 * ```ts
 * const evaluator = createEvaluator({
 *   sandbox: { blockNetwork: true }
 * })
 *
 * const result = await evaluator.evaluate(mdxContent)
 * const greeting = await result.call('greet', 'World')
 *
 * // Clean up when done
 * await evaluator.dispose()
 * ```
 */
export function createEvaluator(defaultOptions: EvaluateOptions = {}): Evaluator {
  // Track cache keys for this evaluator's instances
  const localCacheKeys = new Set<string>()

  return {
    evaluate: async <T = unknown>(content: string, options: EvaluateOptions = {}) => {
      const mergedOptions = { ...defaultOptions, ...options }
      const result = await evaluate<T>(content, mergedOptions)
      // Calculate cache key to track for disposal
      const cacheKey = getCacheKey(result.moduleId, mergedOptions.sandbox)
      localCacheKeys.add(cacheKey)
      return result
    },

    dispose: async () => {
      for (const cacheKey of localCacheKeys) {
        const instance = instances.get(cacheKey)
        if (instance) {
          await instance.mf.dispose()
          instances.delete(cacheKey)
        }
      }
      localCacheKeys.clear()
    },

    getInstanceCount: () => localCacheKeys.size,
  }
}

/**
 * Dispose all active miniflare instances
 */
export async function disposeAll(): Promise<void> {
  const disposals = Array.from(instances.entries()).map(async ([id, cached]) => {
    await cached.mf.dispose()
    instances.delete(id)
  })
  await Promise.all(disposals)
}

/**
 * Get the number of active miniflare instances
 */
export function getActiveInstanceCount(): number {
  return instances.size
}

/**
 * Test MDX content by running it and checking for errors
 *
 * @param content - MDX content string
 * @param options - Evaluate options
 * @returns Test result
 */
export async function test(
  content: string,
  options: EvaluateOptions = {}
): Promise<{
  success: boolean
  exports: string[]
  data: Record<string, unknown>
  error?: string
}> {
  try {
    const result = await evaluate(content, options)
    const metaData = await result.meta()
    await result.dispose()

    return {
      success: true,
      exports: metaData.exports,
      data: result.data,
    }
  } catch (error) {
    return {
      success: false,
      exports: [],
      data: {},
      error: (error as Error).message,
    }
  }
}

/**
 * Create a simple expect function for test assertions
 * Kept for backward compatibility with existing @mdxe/bun tests
 */
export function createExpect() {
  return function expect(actual: unknown) {
    return {
      toBe(expected: unknown) {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`)
        }
      },
      toEqual(expected: unknown) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(
            `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
          )
        }
      },
      toBeTruthy() {
        if (!actual) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`)
        }
      },
      toBeFalsy() {
        if (actual) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`)
        }
      },
      toContain(expected: unknown) {
        if (typeof actual === 'string' && typeof expected === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected "${actual}" to contain "${expected}"`)
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${JSON.stringify(expected)}`)
          }
        }
      },
      toBeDefined() {
        if (actual === undefined) {
          throw new Error(`Expected value to be defined`)
        }
      },
      toBeUndefined() {
        if (actual !== undefined) {
          throw new Error(`Expected value to be undefined`)
        }
      },
      toBeNull() {
        if (actual !== null) {
          throw new Error(`Expected value to be null`)
        }
      },
      toBeGreaterThan(expected: number) {
        if (typeof actual !== 'number' || actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`)
        }
      },
      toBeLessThan(expected: number) {
        if (typeof actual !== 'number' || actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`)
        }
      },
      toThrow(message?: string | RegExp) {
        if (typeof actual !== 'function') {
          throw new Error(`Expected a function`)
        }
        try {
          ;(actual as () => void)()
          throw new Error(`Expected function to throw`)
        } catch (e) {
          if (message) {
            const errorMessage = (e as Error).message
            if (typeof message === 'string' && !errorMessage.includes(message)) {
              throw new Error(`Expected error message to contain "${message}"`)
            }
            if (message instanceof RegExp && !message.test(errorMessage)) {
              throw new Error(`Expected error message to match ${message}`)
            }
          }
        }
      },
      toHaveLength(expected: number) {
        const len = (actual as { length: number })?.length
        if (len !== expected) {
          throw new Error(`Expected length ${expected}, got ${len}`)
        }
      },
      toHaveProperty(key: string, value?: unknown) {
        if (actual === null || actual === undefined) {
          throw new Error(`Expected ${JSON.stringify(actual)} to have property '${key}'`)
        }
        if (!(key in (actual as object))) {
          throw new Error(`Expected object to have property '${key}'`)
        }
        if (value !== undefined && (actual as Record<string, unknown>)[key] !== value) {
          throw new Error(`Expected property '${key}' to be ${JSON.stringify(value)}`)
        }
      },
      not: {
        toBe(expected: unknown) {
          if (actual === expected) {
            throw new Error(
              `Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`
            )
          }
        },
        toEqual(expected: unknown) {
          if (JSON.stringify(actual) === JSON.stringify(expected)) {
            throw new Error(
              `Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`
            )
          }
        },
        toContain(expected: unknown) {
          if (
            typeof actual === 'string' &&
            typeof expected === 'string' &&
            actual.includes(expected)
          ) {
            throw new Error(`Expected "${actual}" not to contain "${expected}"`)
          }
          if (Array.isArray(actual) && actual.includes(expected)) {
            throw new Error(`Expected array not to contain ${JSON.stringify(expected)}`)
          }
        },
        toBeDefined() {
          if (actual !== undefined) {
            throw new Error(`Expected value to be undefined`)
          }
        },
        toBeNull() {
          if (actual === null) {
            throw new Error(`Expected value not to be null`)
          }
        },
      },
    }
  }
}
