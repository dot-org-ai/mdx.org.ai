/**
 * mdxdb
 *
 * Schema-first database for MDX content — a thin facade over ai-database's
 * `DB()` with the mdxdb backends registered and resolved from DATABASE_URL.
 *
 * ```ts
 * import { DB } from 'mdxdb'
 *
 * const db = DB({
 *   Post: {
 *     title: 'string',
 *     content: 'markdown',
 *     author: 'Author.posts',  // Post.author -> Author AND Author.posts -> Post[]
 *   },
 *   Author: {
 *     name: 'string',
 *     email: 'string',
 *   },
 * })
 *
 * const post = await db.Post.get('hello-world')
 * const author = await post.author
 * const posts = await db.Author.get('john').posts
 * ```
 *
 * Backend from `DATABASE_URL` (see `parseDatabaseUrl`):
 *
 * ```bash
 * DATABASE_URL=do://headless.ly          # @mdxdb/do (Durable Object SQLite) — primary
 * DATABASE_URL=./content                 # @mdxdb/fs (git-friendly .mdx files)
 * DATABASE_URL=chdb://./content          # @mdxdb/clickhouse (local chDB)
 * DATABASE_URL=clickhouse://host:8123    # @mdxdb/clickhouse (HTTP)
 * DATABASE_URL=https://db.example.com    # @mdxdb/api
 * DATABASE_URL=:memory:                  # in-memory (tests)
 * ```
 *
 * In a Worker there is no `process.env`; pass the env so bindings resolve:
 *
 * ```ts
 * const db = DB(schema, { env })   // env.DATABASE_URL, env.MDXDB, …
 * ```
 *
 * @packageDocumentation
 */

import { DB as aiDB, setProvider } from 'ai-database'
import type { DatabaseSchema, DBOptions, DBProvider, DBResult } from 'ai-database'
import { createLazyProvider, type LazyProvider } from './lazy.js'
import { schemaRelations, withSchemaRelations } from './relations.js'
import { resolveProvider, type Bindings } from './resolve.js'

export type ProviderFactory = () => DBProvider | Promise<DBProvider>

export interface MdxdbOptions extends Omit<DBOptions, 'provider'> {
  /** DATABASE_URL override (else `env.DATABASE_URL`, then `process.env.DATABASE_URL`, then `./content`). */
  url?: string
  /** Workers env — Durable Object / Vectorize / R2 bindings and vars. */
  env?: Bindings
  /** Explicit provider; skips URL resolution. */
  provider?: DBProvider | ProviderFactory
}

export type MdxdbResult<TSchema extends DatabaseSchema> = DBResult<TSchema> & {
  /** The resolved backend provider (loads it on first call). */
  $provider(): Promise<DBProvider>
}

/**
 * Create a typed database from a schema.
 *
 * Identical to ai-database's `DB()` except that the provider comes from
 * DATABASE_URL via mdxdb's adapters, and `'Author.posts'` reverse fields
 * resolve on every backend.
 *
 * ai-database keeps one process-wide provider for entity operations, so the
 * most recent `DB()` call decides which backend *all* `DB()` instances use.
 * Create one `DB()` per process (or per Worker request with its `env`).
 */
export function DB<TSchema extends DatabaseSchema>(
  schema: TSchema,
  options: MdxdbOptions = {}
): MdxdbResult<TSchema> {
  const { url, env, provider: explicit, ...rest } = options
  const relations = schemaRelations(schema)

  const lazy: LazyProvider = createLazyProvider(async () => {
    const base = explicit
      ? typeof explicit === 'function'
        ? await explicit()
        : explicit
      : await resolveProvider({ url, env })
    return withSchemaRelations(base, relations)
  })

  // Entity operations in ai-database 2.4 read the global provider, not the
  // `provider` option (model gap mdx-8je.56); register the lazy provider in both places.
  setProvider(lazy)
  const db = aiDB(schema, { ...rest, provider: lazy })

  return Object.assign(db, { $provider: () => lazy.resolved() })
}

// URL parsing and resolution
export {
  parseDatabaseUrl,
  UnsupportedDatabaseUrlError,
  DEFAULT_DO_BINDING,
  DEFAULT_FS_ROOT,
  type ParsedDatabaseUrl,
  type ProviderKind,
} from './url.js'
export {
  resolveProvider,
  providerFor,
  databaseUrl,
  AdapterNotInstalledError,
  MissingBindingError,
  type ResolveOptions,
  type Bindings,
} from './resolve.js'

// Providers
export {
  DOProvider,
  createDOProvider,
  thingToRecord,
  type DOProviderOptions,
  type MDXDatabaseStubLike,
  type MDXDatabaseNamespaceLike,
  type DurableObjectIdLike,
  type DOThing,
  type DORelationship,
  type DOListOptions,
  type FlatRecord,
} from './providers/do.js'
export {
  ApiProvider,
  createApiProvider,
  type ApiProviderOptions,
  type ThingClientLike,
  type ApiThing,
} from './providers/api.js'
export { LazyProvider, createLazyProvider } from './lazy.js'

// Relationships
export {
  schemaRelations,
  withSchemaRelations,
  isSchemaAware,
  type SchemaRelations,
  type RelationSpec,
  type SchemaAwareProvider,
} from './relations.js'

// Re-exported from ai-database so consumers need only `mdxdb`
export {
  setProvider,
  createMemoryProvider,
  parseSchema,
  DatabaseError,
  EntityNotFoundError,
  EntityAlreadyExistsError,
} from 'ai-database'
export type {
  DatabaseSchema,
  DBOptions,
  DBProvider,
  DBResult,
  TypedDB,
  InferEntity,
  ListOptions,
  SearchOptions,
  ParsedSchema,
} from 'ai-database'
