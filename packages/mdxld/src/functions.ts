/**
 * AI Functions primitives integration
 *
 * Re-exports from ai-functions package for convenient access via mdxld.
 * This is an optional integration - ai-functions must be installed separately.
 *
 * @example
 * ```ts
 * import { RPC, AI, generateText } from 'mdxld/functions'
 *
 * // Use RPC primitives
 * const rpc = RPC({ functions: { hello: () => 'world' } })
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
