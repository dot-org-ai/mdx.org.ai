/**
 * @mdxe/node - Securely evaluate MDX in Node.js using miniflare
 *
 * @deprecated This package is deprecated. Use `@mdxe/workers/local` instead.
 *
 * This package now re-exports from `@mdxe/workers/local`, which provides the same
 * functionality using Miniflare to run workerd locally for development and testing.
 *
 * Migration:
 * ```ts
 * // Before (deprecated)
 * import { evaluate, createEvaluator } from '@mdxe/node'
 *
 * // After
 * import { evaluate, createLocalEvaluator } from '@mdxe/workers/local'
 * ```
 *
 * Note: `createEvaluator` has been renamed to `createLocalEvaluator` for clarity.
 * The original `createEvaluator` name is still exported here for backwards compatibility.
 *
 * @packageDocumentation
 */

// Re-export everything from @mdxe/workers/local
export {
  // Core evaluation functions
  evaluate,
  createLocalEvaluator,
  run,
  test,
  disposeAll,
  getActiveInstanceCount,

  // Re-exports from @mdxe/isolate
  compileToModule,
  createWorkerConfig,
  generateModuleId,

  // Types
  type EvaluateOptions,
  type EvaluateResult,
  type LocalEvaluator,
  type MiniflareConfig,
  type CompiledModule,
  type CompileToModuleOptions,
  type SandboxOptions,
  type WorkerConfig,
} from '@mdxe/workers/local'

// Backwards compatibility alias
import { createLocalEvaluator, type LocalEvaluator } from '@mdxe/workers/local'

/**
 * @deprecated Use `LocalEvaluator` instead
 */
export type Evaluator = LocalEvaluator

/**
 * Create an MDX evaluator with pre-configured options
 *
 * @deprecated Use `createLocalEvaluator` from `@mdxe/workers/local` instead
 *
 * @param defaultOptions - Default options for all evaluations
 * @returns Evaluator instance
 */
export const createEvaluator = createLocalEvaluator
