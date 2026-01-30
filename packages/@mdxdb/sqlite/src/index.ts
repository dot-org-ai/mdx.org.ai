/**
 * @mdxdb/sqlite
 *
 * Cloudflare Durable Objects SQLite adapter.
 * Clean graph database with _data (nodes) and _rels (edges).
 *
 * @example
 * ```ts
 * // In a Worker
 * const id = env.MDXDB.idFromName('headless.ly')
 * const db = env.MDXDB.get(id)
 *
 * // Create a thing
 * const post = await db.create({
 *   type: 'Post',
 *   data: { title: 'Hello World' }
 * })
 *
 * // Create a relationship with bidirectional predicates
 * await db.relate({
 *   predicate: 'author',    // Post.author -> User
 *   reverse: 'posts',       // User.posts -> Post[]
 *   from: post.url,
 *   to: userUrl
 * })
 *
 * // Query forward: get author of post
 * const author = await db.related(post.url, 'author')
 *
 * // Query reverse: get posts by user
 * const posts = await db.relatedBy(userUrl, 'posts')
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
  DataRow,
  RelsRow,
  MDXDatabaseRPC,
  Env,
  MDXClientConfig,
} from './types.js'

// Durable Object
export { MDXDatabase } from './durable-object.js'

// Schema
export {
  DATA_TABLE,
  RELS_TABLE,
  DATA_SCHEMA,
  DATA_INDEXES,
  RELS_SCHEMA,
  RELS_INDEXES,
  TABLES,
  getAllSchemaStatements,
  SCHEMA_VERSION,
} from './schema/index.js'
