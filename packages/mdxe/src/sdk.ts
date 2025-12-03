/**
 * SDK - Expose SDK provider publicly
 *
 * This module provides programmatic access to the SDK provider factory,
 * which creates local or remote implementations of the SDK globals
 * ($, db, ai, on, every, send) used in MDX documents.
 *
 * @packageDocumentation
 */

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

/**
 * SDK Context Modes
 *
 * The SDK provider supports two execution contexts:
 *
 * ## Local Context
 *
 * In local mode, the SDK uses in-process implementations:
 * - `db`: Uses mdxdb with the specified backend (memory, fs, sqlite, postgres, clickhouse, mongo)
 * - `ai`: Can use local models or remote AI APIs
 * - `on/every/send`: Uses ai-workflows for event-driven workflows
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
 *
 * ## Remote Context
 *
 * In remote mode, the SDK proxies calls to a remote RPC server:
 * - All SDK methods are proxied over RPC
 * - Useful for distributed execution or multi-tenant isolation
 * - Supports custom authentication via headers
 *
 * @example
 * ```ts
 * import { createSDKProvider } from 'mdxe/sdk'
 *
 * const sdk = await createSDKProvider({
 *   context: 'remote',
 *   rpcUrl: 'https://rpc.example.com',
 *   token: process.env.API_TOKEN,
 *   ns: 'tenant-123'
 * })
 *
 * // All calls are proxied to the RPC server
 * await sdk.db.create({ type: 'Post', data: { title: 'Hello' } })
 * ```
 *
 * ## Code Generation
 *
 * For sandboxed execution (e.g., in ai-sandbox), use `generateSDKInjectionCode`
 * to generate the SDK implementation code that will be injected into the worker:
 *
 * @example
 * ```ts
 * import { generateSDKInjectionCode } from 'mdxe/sdk'
 * import { evaluate } from 'ai-sandbox'
 *
 * const sdkCode = generateSDKInjectionCode({
 *   context: 'local',
 *   db: 'memory',
 *   aiMode: 'remote',
 *   ns: 'my-app'
 * })
 *
 * const result = await evaluate({
 *   code: userCode,
 *   sdkConfig: {
 *   context: 'local',
 *   db: 'memory',
 *   aiMode: 'remote',
 *   ns: 'my-app'
 * }
 * })
 * ```
 */
