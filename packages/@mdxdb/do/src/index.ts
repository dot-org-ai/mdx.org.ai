/**
 * @mdxdb/do
 *
 * Extended Durable Object with hierarchy support, hibernatable WebSocket, and parquet export.
 *
 * @example
 * ```ts
 * // In wrangler.toml
 * [[durable_objects.bindings]]
 * name = "MDXDB"
 * class_name = "MDXDurableObject"
 *
 * // In Worker
 * import { MDXDurableObject } from '@mdxdb/do/durable-object'
 * export { MDXDurableObject }
 *
 * export default {
 *   fetch(request, env) {
 *     const id = env.MDXDB.idFromName('headless.ly')
 *     const db = env.MDXDB.get(id)
 *     return db.fetch(request)
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  Thing,
  Relationship,
  Provenance,
  ListOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  RelationshipQueryOptions,
  ExportOptions,
  Env,
  ChildInfo,
  MDXDurableObjectRPC,
  MDXDOClientConfig,
} from './types.js'

// Durable Object
export { MDXDurableObject } from './durable-object.js'
