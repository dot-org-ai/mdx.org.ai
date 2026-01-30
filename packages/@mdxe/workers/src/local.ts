/**
 * @mdxe/workers/local - Local execution using Miniflare
 *
 * This module provides local execution of MDX modules using Miniflare,
 * which runs workerd locally. This is intended for Node.js development
 * and testing environments.
 *
 * IMPORTANT: This is a SEPARATE entry point from the main @mdxe/workers package.
 * It has Node.js dependencies (miniflare) and should not be bundled with
 * the pure Workers runtime.
 *
 * @packageDocumentation
 */

import type { Miniflare } from 'miniflare'
import {
  compileToModule,
  createWorkerConfig,
  generateModuleId,
  type CompiledModule,
  type CompileToModuleOptions,
  type SandboxOptions,
  type WorkerConfig,
} from '@mdxe/isolate'

// Re-export from isolate for convenience
export {
  compileToModule,
  createWorkerConfig,
  generateModuleId,
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
  /** Dispose the miniflare instance */
  dispose: () => Promise<void>
}

/**
 * Local evaluator instance that manages miniflare lifecycle
 */
export interface LocalEvaluator {
  /** Evaluate MDX content */
  evaluate: <T = unknown>(content: string, options?: EvaluateOptions) => Promise<EvaluateResult<T>>
  /** Dispose all miniflare instances */
  dispose: () => Promise<void>
  /** Get active instance count */
  getInstanceCount: () => number
}

/**
 * Active miniflare instances
 */
const instances = new Map<string, Miniflare>()

/**
 * Lazily load Miniflare to avoid bundling in non-Node environments
 */
let MiniflareClass: typeof Miniflare | null = null

async function getMiniflare(): Promise<typeof Miniflare> {
  if (!MiniflareClass) {
    const miniflareModule = await import('miniflare')
    MiniflareClass = miniflareModule.Miniflare
  }
  return MiniflareClass
}

/**
 * Create a miniflare instance for the compiled module
 */
async function createMiniflareInstance(
  module: CompiledModule,
  sandbox: SandboxOptions = {},
  options: MiniflareConfig = {}
): Promise<Miniflare> {
  const Miniflare = await getMiniflare()
  const config = createWorkerConfig(module, sandbox)

  // Build ES modules array for Miniflare
  const modules = Object.entries(config.modules).map(([name, content]) => ({
    type: 'ESModule' as const,
    path: `./${name}`,
    contents: content,
  }))

  // Find the main module
  const mainModule = modules.find(m => m.path === `./${config.mainModule}`)
  if (!mainModule) {
    throw new Error(`Main module ${config.mainModule} not found`)
  }

  const mf = new Miniflare({
    modules: [
      // Main module first
      mainModule,
      // Then other modules
      ...modules.filter(m => m !== mainModule),
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
 * import { evaluate } from '@mdxe/workers/local'
 *
 * const mdx = \`
 *   export function greet(name) {
 *     return \\\`Hello, \\\${name}!\\\`
 *   }
 * \`
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

  // Create or reuse miniflare instance
  let mf = instances.get(moduleId)
  if (!mf) {
    mf = await createMiniflareInstance(module, sandbox, miniflareOptions)
    instances.set(moduleId, mf)
  }

  // Helper to call exported functions
  const call = async <R = unknown>(name: string, ...args: unknown[]): Promise<R> => {
    const response = await mf!.dispatchFetch(`http://localhost/call/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args }),
    })

    if (!response.ok) {
      const error = await response.json() as { error: string; stack?: string }
      throw new Error(error.error)
    }

    const result = await response.json() as { result: R }
    return result.result
  }

  // Helper to get metadata
  const meta = async () => {
    const response = await mf!.dispatchFetch('http://localhost/meta')
    return response.json() as Promise<{ exports: string[]; hasDefault: boolean }>
  }

  // Dispose helper
  const dispose = async () => {
    const instance = instances.get(moduleId)
    if (instance) {
      await instance.dispose()
      instances.delete(moduleId)
    }
  }

  return {
    exports: {},
    data: module.data,
    call,
    meta,
    moduleId,
    dispose,
  }
}

/**
 * Create a local MDX evaluator with pre-configured options
 *
 * @param defaultOptions - Default options for all evaluations
 * @returns LocalEvaluator instance
 *
 * @example
 * ```ts
 * import { createLocalEvaluator } from '@mdxe/workers/local'
 *
 * const evaluator = createLocalEvaluator({
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
export function createLocalEvaluator(defaultOptions: EvaluateOptions = {}): LocalEvaluator {
  const localInstances = new Set<string>()

  return {
    evaluate: async <T = unknown>(content: string, options: EvaluateOptions = {}) => {
      const result = await evaluate<T>(content, { ...defaultOptions, ...options })
      localInstances.add(result.moduleId)
      return result
    },

    dispose: async () => {
      for (const moduleId of localInstances) {
        const instance = instances.get(moduleId)
        if (instance) {
          await instance.dispose()
          instances.delete(moduleId)
        }
      }
      localInstances.clear()
    },

    getInstanceCount: () => localInstances.size,
  }
}

/**
 * Dispose all active miniflare instances
 */
export async function disposeAll(): Promise<void> {
  const disposals = Array.from(instances.entries()).map(async ([id, mf]) => {
    await mf.dispose()
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
 * import { run } from '@mdxe/workers/local'
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
    const meta = await result.meta()
    await result.dispose()

    return {
      success: true,
      exports: meta.exports,
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
