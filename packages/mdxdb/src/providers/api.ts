/**
 * HTTP API provider
 *
 * ai-database `DBProvider` over an `@mdxdb/api` `DBApiClient` (JSON:API
 * over fetch). Selected by `DATABASE_URL=https://…`.
 *
 * The client is typed structurally so this module never imports
 * `@mdxdb/api`; `resolveProvider()` loads it on demand.
 *
 * @packageDocumentation
 */

import type { DBProvider, ListOptions, SearchOptions } from 'ai-database'
import { EntityAlreadyExistsError, EntityNotFoundError } from 'ai-database'

/** A Thing as returned by `@mdxdb/api` (ai-database `Thing` shape). */
export interface ApiThing {
  ns: string
  type: string
  id: string
  url?: string
  data: Record<string, unknown>
}

/**
 * The `DBApiClient` methods the provider uses.
 *
 * Structurally a subset of ai-database's `DBClient`, so a real client is
 * assignable without a cast (`resolve.ts` relies on that: a drift between
 * `@mdxdb/api` and this shape is a type error, not a runtime surprise).
 *
 * `related(url, type, direction)` follows the ai-database DBClient contract:
 * `'to'` = outbound (things this url points to), `'from'` = inbound
 * (`references`), `'both'` = either.
 */
export interface ThingClientLike {
  list(options?: {
    ns?: string
    type?: string
    where?: Record<string, unknown>
    orderBy?: string
    order?: 'asc' | 'desc'
    limit?: number
    offset?: number
  }): Promise<ApiThing[]>
  search(options: {
    ns?: string
    type?: string
    query: string
    fields?: string[]
    limit?: number
    offset?: number
  }): Promise<ApiThing[]>
  getById(ns: string, type: string, id: string): Promise<ApiThing | null>
  create(options: { ns: string; type: string; id?: string; data: Record<string, unknown> }): Promise<ApiThing>
  update(url: string, options: { data: Record<string, unknown> }): Promise<ApiThing>
  delete(url: string): Promise<boolean>
  relate(options: { type: string; from: string; to: string; data?: Record<string, unknown> }): Promise<unknown>
  unrelate(from: string, type: string, to: string): Promise<boolean>
  related(url: string, relationshipType?: string, direction?: 'from' | 'to' | 'both'): Promise<ApiThing[]>
}

export interface ApiProviderOptions {
  /** `DBApiClient` (or anything with the same surface). */
  client: ThingClientLike
  /** Namespace that scopes every entity (`https://<ns>/<Type>/<id>`). */
  ns: string
}

type FlatRecord = Record<string, unknown> & { $id: string; $type: string }

function toRecord(thing: ApiThing): FlatRecord {
  return { ...thing.data, $id: thing.id, $type: thing.type }
}

function toData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === '$id' || k === '$type' || v === undefined) continue
    out[k] = v
  }
  return out
}

function matchesWhere(record: Record<string, unknown>, where?: Record<string, unknown>): boolean {
  if (!where) return true
  for (const [k, v] of Object.entries(where)) {
    if (record[k] !== v) return false
  }
  return true
}

/**
 * DBProvider over the mdxdb HTTP API.
 */
export class ApiProvider implements DBProvider {
  readonly client: ThingClientLike
  readonly ns: string

  constructor(options: ApiProviderOptions) {
    this.client = options.client
    this.ns = options.ns
  }

  url(type: string, id: string): string {
    return `https://${this.ns}/${type}/${id}`
  }

  async get(type: string, id: string): Promise<FlatRecord | null> {
    const thing = await this.client.getById(this.ns, type, id)
    return thing ? toRecord(thing) : null
  }

  async list(type: string, options?: ListOptions): Promise<FlatRecord[]> {
    // `DBApiClient.list()` does not send `where` over the wire (its `find()`
    // does, but drops `orderBy`). Filter here, and only push paging to the
    // server when there is nothing to filter — a server-side page of an
    // unfiltered list is not a page of the filtered one.
    const filtered = Boolean(options?.where && Object.keys(options.where).length > 0)
    const things = await this.client.list({
      ns: this.ns,
      type,
      orderBy: options?.orderBy,
      order: options?.order,
      limit: filtered ? undefined : options?.limit,
      offset: filtered ? undefined : options?.offset,
    })
    let records = things.map(toRecord)
    if (filtered) {
      records = records.filter((r) => matchesWhere(r, options?.where))
      const offset = options?.offset ?? 0
      records = options?.limit === undefined ? records.slice(offset) : records.slice(offset, offset + options.limit)
    }
    return records
  }

  async search(type: string, query: string, options?: SearchOptions): Promise<FlatRecord[]> {
    // Same paging rule as list(): `where` is applied here, so the server may
    // only page when there is no `where` to apply afterwards.
    const filtered = Boolean(options?.where && Object.keys(options.where).length > 0)
    const things = await this.client.search({
      ns: this.ns,
      type,
      query,
      fields: options?.fields,
      limit: filtered ? undefined : options?.limit,
      offset: filtered ? undefined : options?.offset,
    })
    let records = things.map(toRecord)
    if (filtered) {
      records = records.filter((r) => matchesWhere(r, options?.where))
      const offset = options?.offset ?? 0
      records = options?.limit === undefined ? records.slice(offset) : records.slice(offset, offset + options.limit)
    }
    return records
  }

  /**
   * The wire carries JSON:API `errors[].detail`, which `DBApiClient` rethrows
   * as a plain `Error(detail)` — the status and `code` are not surfaced. Map
   * the backend messages (`Thing already exists: …`, `Thing not found: …`,
   * shared by @mdxdb/sqlite, @mdxdb/do and @mdxdb/clickhouse) onto the
   * ai-database error classes, as DOProvider does.
   */
  async create(type: string, id: string | undefined, data: Record<string, unknown>): Promise<FlatRecord> {
    try {
      const thing = await this.client.create({ ns: this.ns, type, id, data: toData(data) })
      return toRecord(thing)
    } catch (err) {
      if (err instanceof Error && /already exists/i.test(err.message)) {
        throw new EntityAlreadyExistsError(type, id ?? '', 'create', err)
      }
      throw err
    }
  }

  async update(type: string, id: string, data: Record<string, unknown>): Promise<FlatRecord> {
    try {
      const thing = await this.client.update(this.url(type, id), { data: toData(data) })
      return toRecord(thing)
    } catch (err) {
      if (err instanceof Error && /not found/i.test(err.message)) {
        throw new EntityNotFoundError(type, id, 'update', err)
      }
      throw err
    }
  }

  async delete(type: string, id: string): Promise<boolean> {
    return this.client.delete(this.url(type, id))
  }

  async related(type: string, id: string, relation: string): Promise<FlatRecord[]> {
    // DBProvider.related() = the targets of `relation` edges leaving this
    // entity. In DBClient terms that is direction `'to'` (outbound); `'from'`
    // would be the inbound `references()` set.
    const things = await this.client.related(this.url(type, id), relation, 'to')
    return things.map(toRecord)
  }

  async relate(
    fromType: string,
    fromId: string,
    relation: string,
    toType: string,
    toId: string,
    metadata?: { matchMode?: 'exact' | 'fuzzy'; similarity?: number; matchedType?: string }
  ): Promise<void> {
    await this.client.relate({
      type: relation,
      from: this.url(fromType, fromId),
      to: this.url(toType, toId),
      data: metadata && Object.keys(metadata).length > 0 ? { ...metadata } : undefined,
    })
  }

  async unrelate(fromType: string, fromId: string, relation: string, toType: string, toId: string): Promise<void> {
    await this.client.unrelate(this.url(fromType, fromId), relation, this.url(toType, toId))
  }
}

export function createApiProvider(options: ApiProviderOptions): ApiProvider {
  return new ApiProvider(options)
}
