/**
 * SDK - Expose SDK provider publicly
 *
 * This module provides programmatic access to the SDK provider factory,
 * which creates local or remote implementations of the SDK globals
 * ($, db, ai, on, every, send) used in MDX documents.
 *
 * ## SDK Provider Variants
 *
 * ### Legacy SDK Provider (sdk-provider.ts)
 * The original multi-runtime SDK provider supporting various Node.js backends.
 * Use this for traditional Node.js/Bun execution environments.
 *
 * ### Workerd SDK Provider (sdk-workerd.ts)
 * Simplified SDK provider that assumes workerd execution context.
 * Use this for Cloudflare Workers and local development with Miniflare.
 *
 * @packageDocumentation
 */

// =============================================================================
// LEGACY SDK PROVIDER - Multi-runtime support (Node.js, Bun)
// =============================================================================

// Re-export the SDK provider factory and types
export {
  createSDKProvider,
  generateSDKInjectionCode,
  type SDKProviderConfig,
  type SDKProvider,
  type AIProvider,
  type WorkflowProvider,
  type ContextProvider,
} from './sdk-provider.js'

// =============================================================================
// WORKERD SDK PROVIDER - Simplified workerd-based execution
// =============================================================================

export {
  // Main factory function
  createWorkerdSDKProvider,

  // Code generation
  generateWorkerdSDKCode,

  // Context utilities
  createWorkerdContext,
  injectDatabaseBindings,

  // Context detection
  isLocalContext,
  isRemoteContext,

  // Types
  type WorkerdSDKConfig,
  type WorkerdSDKProvider,
  type WorkerdSDKContext,
  type WorkerdContext,
  type WorkerdDBClient,
  type WorkerdAIProvider,
  type WorkerdWorkflowProvider,
  type DatabaseBindings,
  type WorkerEnv,
  type D1Database,
  type KVNamespace,
  type R2Bucket,
} from './sdk-workerd.js'

/**
 * SDK Context Modes
 *
 * ## Workerd SDK Provider (Recommended)
 *
 * The workerd SDK provider assumes workerd execution context throughout.
 * This simplifies the SDK by removing Node.js/Bun-specific code paths.
 *
 * ### Local Development
 *
 * In local mode, the SDK uses in-memory implementations suitable for development:
 *
 * @example
 * ```ts
 * import { createWorkerdSDKProvider } from 'mdxe/sdk'
 *
 * const sdk = await createWorkerdSDKProvider({
 *   context: 'local',
 *   ns: 'my-app'
 * })
 *
 * // Use the SDK
 * const post = await sdk.$.db.Posts.create('hello', { title: 'Hello World' })
 * const response = await sdk.ai.generate('Write a poem')
 *
 * // Clean up
 * await sdk.dispose()
 * ```
 *
 * ### Production (Cloudflare Workers)
 *
 * In remote mode, the SDK uses Worker Loader bindings for secure, isolated execution:
 *
 * @example
 * ```ts
 * import { createWorkerdSDKProvider } from 'mdxe/sdk'
 *
 * // In your Cloudflare Worker
 * export default {
 *   async fetch(request, env) {
 *     const sdk = await createWorkerdSDKProvider({
 *       context: 'remote',
 *       ns: 'production',
 *       env
 *     })
 *
 *     const result = await sdk.$.db.Posts.get('hello')
 *     return new Response(JSON.stringify(result))
 *   }
 * }
 * ```
 *
 * ### Code Generation for Workers
 *
 * Generate workerd-compatible SDK code for injection:
 *
 * @example
 * ```ts
 * import { generateWorkerdSDKCode } from 'mdxe/sdk'
 *
 * const code = generateWorkerdSDKCode({
 *   context: 'local',
 *   ns: 'my-app'
 * })
 *
 * // Code does not use process.env or other Node.js APIs
 * // Safe to use in Cloudflare Workers
 * ```
 *
 * ## Legacy SDK Provider
 *
 * The legacy SDK provider supports multiple Node.js backends (sqlite, postgres, etc.)
 * Use this only if you need Node.js-specific database backends.
 *
 * @example
 * ```ts
 * import { createSDKProvider } from 'mdxe/sdk'
 *
 * const sdk = await createSDKProvider({
 *   context: 'local',
 *   db: 'sqlite',
 *   dbPath: './data.db',
 *   aiMode: 'remote',
 *   ns: 'my-app'
 * })
 *
 * // Use the SDK
 * await sdk.db.create({ type: 'Post', data: { title: 'Hello' } })
 * const response = await sdk.ai.generate('Write a poem')
 *
 * // Clean up
 * await sdk.close()
 * ```
 */
