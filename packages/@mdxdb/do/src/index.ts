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
 *   async fetch(request, env) {
 *     const id = env.MDXDB.idFromName('headless.ly')
 *     const db = env.MDXDB.get(id)
 *     // The object cannot read its own name: hand it over once so it can
 *     // derive its $id (idempotent, persisted). MDXDOClient does this for you.
 *     await db.$init('headless.ly')
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
  MDXDurableObjectTarget,
  MDXDurableObjectNamespace,
  MDXDurableObjectStub,
  MDXDOClientConfig,
} from './types.js'

// Durable Object
export { MDXDurableObject } from './durable-object.js'
