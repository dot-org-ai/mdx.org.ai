/**
 * AI Functions primitives integration
 *
 * Re-exports from ai-functions package for convenient access via mdxld.
 * This is an optional integration - ai-functions must be installed separately.
 *
 * @example
 * ```ts
 * import { AI, generateText } from 'mdxld/functions'
 *
 * // Note: ai-functions@2.4 ships no RPC / RPCPromise. capnweb RPC is rpc.do:
 * //   import { RPC } from 'rpc.do'
 *
 * // Use AI function constructors
 * const ai = AI('Generate a summary', { input: schema({ text: 'string' }) })
 *
 * // Use generation utilities
 * const result = await generateText({ model, prompt })
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from ai-functions
export * from 'ai-functions'
