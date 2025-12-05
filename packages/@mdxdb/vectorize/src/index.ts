/**
 * @mdxdb/vectorize - Cloudflare Vectorize adapter for mdxdb
 *
 * Vector search with Workers RPC.
 *
 * @packageDocumentation
 */

// Export types
export * from './types.js'

// Export client
export { VectorizeClient, createVectorizeClient } from './client.js'

// Export worker (for deployment)
export { VectorizeDatabase } from './worker.js'
export { default as worker } from './worker.js'
