/**
 * Durable Object provider
 *
 * ai-database `DBProvider` over an `@mdxdb/do` MDXDurableObject (or the
 * `@mdxdb/sqlite` MDXDatabase it extends) reached through a Workers RPC stub.
 *
 * The DO speaks *Things* (url/type/id/data) and *Relationships*
 * (predicate/reverse/from/to); ai-database speaks flat records
 * (`{ ...data, $id, $type }`) and `(type, id)` pairs. This module is the
 * translation between the two. It never imports `@mdxdb/do` — the stub is
 * typed structurally so the provider works against any namespace binding
 * whose objects implement the MDXDatabase RPC surface.
 *
 * @packageDocumentation
 */

import type { DBProvider, ListOptions, SearchOptions } from 'ai-database'
import { EntityAlreadyExistsError, EntityNotFoundError } from 'ai-database'
import type { SchemaRelations, SchemaAwareProvider } from '../relations.js'

// =============================================================================
// Structural RPC types (subset of @mdxdb/sqlite MDXDatabaseRPC)
// =============================================================================

/** A Thing as it crosses the RPC boundary (`at` may be a Date or ISO string). */
export interface DOThing<TData = Record<string, unknown>> {
  url: string
  type: string
  id: string
  data: TData
  content?: string
  at: Date | string
  version: number
}

export interface DORelationship<TData = Record<string, unknown>> {
  id: string
  predicate: string
  reverse?: string
  from: string
  to: string
  data?: TData
}

export interface DOListOptions {
  type?: string
  where?: Record<string, unknown>
  orderBy?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * The RPC methods the provider needs. Every method is awaited, so a stub
 * that returns plain values (an in-process fake) works as well as a real
 * `DurableObjectStub`.
 */
export interface MDXDatabaseStubLike {
  /** Canonical `$id` base (`https://<name>`). */
  $id(): string | Promise<string>
  /** Name handshake (present on @mdxdb/sqlite ≥ the mdx-8je.24 fix; optional). */
  $init?(name: string): string | Promise<string>
  getById(type: string, id: string): Promise<DOThing | null>
  list(options?: DOListOptions): Promise<DOThing[]>
  create(options: { type: string; id?: string; data: Record<string, unknown> }): Promise<DOThing>
  update(url: string, options: { data?: Record<string, unknown> }): Promise<DOThing>
  delete(url: string): Promise<boolean>
  relate(options: {
    predicate: string
    reverse?: string
    from: string
    to: string
    data?: Record<string, unknown>
  }): Promise<DORelationship>
  unrelate(from: string, predicate: string, to: string): Promise<boolean>
  related(url: string, predicate: string): Promise<DOThing[]>
  relatedBy(url: string, reverse: string): Promise<DOThing[]>
}

export interface DurableObjectIdLike {
  toString(): string
  readonly name?: string
}

/** The subset of `DurableObjectNamespace` the provider uses. */
export interface MDXDatabaseNamespaceLike {
  idFromName(name: string): DurableObjectIdLike
  get(id: DurableObjectIdLike): MDXDatabaseStubLike
}

export interface DOProviderOptions {
  /** DO namespace binding from the Workers env (e.g. `env.MDXDB`). */
  namespace: MDXDatabaseNamespaceLike
  /** DO name; becomes the `$id` base `https://<name>`. */
  name: string
  /** Relationship map from the schema (filled in by `DB()`); makes edges bidirectional. */
  relations?: SchemaRelations
}

// =============================================================================
// Helpers
// =============================================================================

export type FlatRecord = Record<string, unknown> & { $id: string; $type: string }

/** Thing → ai-database flat record. */
export function thingToRecord(thing: DOThing): FlatRecord {
  return { ...thing.data, $id: thing.id, $type: thing.type }
}

/** Strip the keys ai-database adds so they are not persisted inside `data`. */
function recordToData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === '$id' || k === '$type') continue
    if (v === undefined) continue
    out[k] = v
  }
  return out
}

function isMethodMissing(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /does not implement|is not a function|not implemented|unknown method|no such method/i.test(msg)
}

/** Case-insensitive substring search across string fields (no FTS in the DO). */
function matchesQuery(record: Record<string, unknown>, query: string, fields?: string[]): boolean {
  const q = query.toLowerCase()
  const keys = fields ?? Object.keys(record)
  for (const key of keys) {
    const v = record[key]
    if (typeof v === 'string' && v.toLowerCase().includes(q)) return true
  }
  return false
}

// =============================================================================
// Provider
// =============================================================================

/**
 * DBProvider backed by one MDXDurableObject.
 */
export class DOProvider implements DBProvider, SchemaAwareProvider {
  readonly stub: MDXDatabaseStubLike
  readonly name: string
  private relations: SchemaRelations
  private base?: string
  private basePromise?: Promise<string>

  constructor(options: DOProviderOptions) {
    this.name = options.name
    this.stub = options.namespace.get(options.namespace.idFromName(options.name))
    this.relations = options.relations ?? {}
  }

  setSchemaRelations(relations: SchemaRelations): void {
    this.relations = relations
  }

  /**
   * Resolve the DO's `$id` base once. Newer `@mdxdb/sqlite` objects cannot
   * read their own name inside workerd and expose `$init(name)` for the
   * client to supply it; older ones only have `$id()`. Try the handshake
   * first, then fall back.
   */
  async $id(): Promise<string> {
    if (this.base) return this.base
    if (!this.basePromise) {
      this.basePromise = (async () => {
        let base: string
        try {
          if (typeof this.stub.$init !== 'function') throw new TypeError('$init is not a function')
          base = await this.stub.$init(this.name)
        } catch (err) {
          if (!isMethodMissing(err)) throw err
          base = await this.stub.$id()
        }
        this.base = base
        return base
      })().catch((err: unknown) => {
        this.basePromise = undefined
        throw err
      })
    }
    return this.basePromise
  }

  /** Canonical URL of an entity. */
  async url(type: string, id: string): Promise<string> {
    return `${await this.$id()}/${type}/${id}`
  }

  // ---------------------------------------------------------------------------
  // Things
  // ---------------------------------------------------------------------------

  async get(type: string, id: string): Promise<FlatRecord | null> {
    await this.$id()
    const thing = await this.stub.getById(type, id)
    return thing ? thingToRecord(thing) : null
  }

  async list(type: string, options?: ListOptions): Promise<FlatRecord[]> {
    await this.$id()
    const things = await this.stub.list({
      type,
      where: options?.where,
      orderBy: options?.orderBy,
      order: options?.order,
      limit: options?.limit,
      offset: options?.offset,
    })
    return things.map(thingToRecord)
  }

  async search(type: string, query: string, options?: SearchOptions): Promise<FlatRecord[]> {
    // MDXDatabase has no full-text index; filter client-side over the type.
    const all = await this.list(type, { where: options?.where })
    const hits = all.filter((r) => matchesQuery(r, query, options?.fields))
    const offset = options?.offset ?? 0
    const limit = options?.limit
    return limit === undefined ? hits.slice(offset) : hits.slice(offset, offset + limit)
  }

  async create(type: string, id: string | undefined, data: Record<string, unknown>): Promise<FlatRecord> {
    await this.$id()
    try {
      const thing = await this.stub.create({ type, id, data: recordToData(data) })
      return thingToRecord(thing)
    } catch (err) {
      if (err instanceof Error && /already exists/i.test(err.message)) {
        throw new EntityAlreadyExistsError(type, id ?? '', 'create', err)
      }
      throw err
    }
  }

  async update(type: string, id: string, data: Record<string, unknown>): Promise<FlatRecord> {
    const url = await this.url(type, id)
    try {
      const thing = await this.stub.update(url, { data: recordToData(data) })
      return thingToRecord(thing)
    } catch (err) {
      if (err instanceof Error && /not found/i.test(err.message)) {
        throw new EntityNotFoundError(type, id, 'update', err)
      }
      throw err
    }
  }

  async delete(type: string, id: string): Promise<boolean> {
    return this.stub.delete(await this.url(type, id))
  }

  // ---------------------------------------------------------------------------
  // Relationships
  // ---------------------------------------------------------------------------

  async related(type: string, id: string, relation: string): Promise<FlatRecord[]> {
    const url = await this.url(type, id)
    const reverse = this.relations[type]?.[relation]
    // A field declared as the *reverse* side of an edge is served from the
    // edge's reverse index; everything else is a forward predicate.
    const things =
      reverse?.direction === 'reverse'
        ? await this.stub.relatedBy(url, relation)
        : await this.stub.related(url, relation)
    return things.map(thingToRecord)
  }

  async relate(
    fromType: string,
    fromId: string,
    relation: string,
    toType: string,
    toId: string,
    metadata?: { matchMode?: 'exact' | 'fuzzy'; similarity?: number; matchedType?: string }
  ): Promise<void> {
    const [from, to] = await Promise.all([this.url(fromType, fromId), this.url(toType, toId)])
    const spec = this.relations[fromType]?.[relation]
    await this.stub.relate({
      predicate: relation,
      reverse: spec?.direction === 'forward' ? spec.reverse : undefined,
      from,
      to,
      data: metadata && Object.keys(metadata).length > 0 ? { ...metadata } : undefined,
    })
  }

  async unrelate(fromType: string, fromId: string, relation: string, toType: string, toId: string): Promise<void> {
    const [from, to] = await Promise.all([this.url(fromType, fromId), this.url(toType, toId)])
    await this.stub.unrelate(from, relation, to)
  }
}

/**
 * Create a DBProvider over an `@mdxdb/do` Durable Object.
 *
 * @example
 * ```ts
 * import { DB, createDOProvider } from 'mdxdb'
 *
 * export default {
 *   async fetch(request, env) {
 *     const db = DB(schema, {
 *       provider: createDOProvider({ namespace: env.MDXDB, name: 'headless.ly' }),
 *     })
 *     return Response.json(await db.Post.list())
 *   },
 * }
 * ```
 */
export function createDOProvider(options: DOProviderOptions): DOProvider {
  return new DOProvider(options)
}
