/**
 * In-memory ai-database `DBClient`.
 *
 * Plays two roles in the contract run for ApiProvider:
 *
 * 1. Handed straight to `createApiProvider({ client })` it is the in-process
 *    fake of `DBApiClient` (the way `fake-do.ts` fakes the Durable Object).
 * 2. Handed to `@mdxdb/server`'s `createDBServer({ client })` it is the
 *    backend behind a real JSON:API round trip, with the real `@mdxdb/api`
 *    `DBApiClient` on the other side.
 *
 * Semantics follow the ai-database DBClient contract and the messages the
 * real backends emit (`Thing already exists: <url>`, `Thing not found: <url>`,
 * `related(url, type, 'to')` = outbound). Errors are plain `Error`s — that is
 * what crosses the wire, and what ApiProvider has to map.
 */
import type {
  DBClient,
  Thing,
  Relationship,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
} from 'ai-database'

type Data = Record<string, unknown>

let counter = 0

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === undefined || a === null) return 1
  if (b === undefined || b === null) return -1
  return (a as number) < (b as number) ? -1 : 1
}

export class MemoryDBClient implements DBClient<Data> {
  private things = new Map<string, Thing<Data>>()
  private rels = new Map<string, Relationship<Data>>()
  /** Every method call, for assertions on what ApiProvider sends. */
  readonly calls: Array<{ method: string; args: unknown[] }> = []

  private log(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args })
  }

  private url(ns: string, type: string, id: string): string {
    return `https://${ns}/${type}/${id}`
  }

  private clone(thing: Thing<Data>): Thing<Data> {
    return { ...thing, data: { ...thing.data } }
  }

  private select(options: QueryOptions): Thing<Data>[] {
    let rows = [...this.things.values()]
    if (options.ns) rows = rows.filter((t) => t.ns === options.ns)
    if (options.type) rows = rows.filter((t) => t.type === options.type)
    if (options.where) {
      for (const [k, v] of Object.entries(options.where)) {
        rows = rows.filter((t) => t.data[k] === v)
      }
    }
    if (options.orderBy) {
      const key = options.orderBy
      const dir = options.order === 'desc' ? -1 : 1
      rows.sort((a, b) => dir * compare(a.data[key], b.data[key]))
    }
    const offset = options.offset ?? 0
    return (options.limit === undefined ? rows.slice(offset) : rows.slice(offset, offset + options.limit)).map((t) =>
      this.clone(t)
    )
  }

  // ---------------------------------------------------------------------------
  // Things
  // ---------------------------------------------------------------------------

  async list(options: QueryOptions = {}): Promise<Thing<Data>[]> {
    this.log('list', options)
    // Mirrors DBApiClient.list(): `where` is not part of the /things request.
    const { where: _where, ...rest } = options
    return this.select(rest)
  }

  async find(options: QueryOptions): Promise<Thing<Data>[]> {
    this.log('find', options)
    return this.select(options)
  }

  async search(options: ThingSearchOptions): Promise<Thing<Data>[]> {
    this.log('search', options)
    const q = options.query.toLowerCase()
    const { query: _q, fields, minScore: _m, ...rest } = options
    const rows = this.select({ ...rest, limit: undefined, offset: undefined })
    const hits = rows.filter((t) => {
      const keys = fields ?? Object.keys(t.data)
      return keys.some((k) => {
        const v = t.data[k]
        return typeof v === 'string' && v.toLowerCase().includes(q)
      })
    })
    const offset = options.offset ?? 0
    return options.limit === undefined ? hits.slice(offset) : hits.slice(offset, offset + options.limit)
  }

  async get(url: string): Promise<Thing<Data> | null> {
    this.log('get', url)
    const t = this.things.get(url)
    return t ? this.clone(t) : null
  }

  async getById(ns: string, type: string, id: string): Promise<Thing<Data> | null> {
    this.log('getById', ns, type, id)
    return this.get(this.url(ns, type, id))
  }

  async set(url: string, data: Data): Promise<Thing<Data>> {
    return this.update(url, { data })
  }

  async create(options: CreateOptions<Data>): Promise<Thing<Data>> {
    this.log('create', options)
    const id = options.id ?? `${Date.now().toString(36)}_${(++counter).toString(36)}`
    const url = options.url ?? this.url(options.ns, options.type, id)
    if (this.things.has(url)) throw new Error(`Thing already exists: ${url}`)
    const now = new Date()
    const thing: Thing<Data> = {
      ns: options.ns,
      type: options.type,
      id,
      url,
      data: { ...options.data },
      createdAt: now,
      updatedAt: now,
    }
    this.things.set(url, thing)
    return this.clone(thing)
  }

  async update(url: string, options: UpdateOptions<Data>): Promise<Thing<Data>> {
    this.log('update', url, options)
    const existing = this.things.get(url)
    if (!existing) throw new Error(`Thing not found: ${url}`)
    const updated: Thing<Data> = {
      ...existing,
      data: { ...existing.data, ...options.data },
      updatedAt: new Date(),
    }
    this.things.set(url, updated)
    return this.clone(updated)
  }

  async upsert(options: CreateOptions<Data>): Promise<Thing<Data>> {
    const url = options.url ?? this.url(options.ns, options.type, options.id ?? '')
    if (options.id && this.things.has(url)) return this.update(url, { data: options.data })
    return this.create(options)
  }

  async delete(url: string): Promise<boolean> {
    this.log('delete', url)
    for (const [key, rel] of this.rels) {
      if (rel.from === url || rel.to === url) this.rels.delete(key)
    }
    return this.things.delete(url)
  }

  async forEach(options: QueryOptions, callback: (thing: Thing<Data>) => void | Promise<void>): Promise<void> {
    for (const thing of await this.list(options)) await callback(thing)
  }

  // ---------------------------------------------------------------------------
  // Relationships
  // ---------------------------------------------------------------------------

  private relKey(from: string, type: string, to: string): string {
    return `${from}|${type}|${to}`
  }

  async relate<T extends Data = Data>(options: RelateOptions<T>): Promise<Relationship<T>> {
    this.log('relate', options)
    const id = this.relKey(options.from, options.type, options.to)
    const rel: Relationship<Data> = {
      id,
      type: options.type,
      from: options.from,
      to: options.to,
      createdAt: this.rels.get(id)?.createdAt ?? new Date(),
      data: options.data,
    }
    this.rels.set(id, rel)
    return rel as Relationship<T>
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    this.log('unrelate', from, type, to)
    return this.rels.delete(this.relKey(from, type, to))
  }

  async related(url: string, relationshipType?: string, direction: 'from' | 'to' | 'both' = 'to'): Promise<Thing<Data>[]> {
    this.log('related', url, relationshipType, direction)
    const urls: string[] = []
    for (const rel of this.rels.values()) {
      if (relationshipType && rel.type !== relationshipType) continue
      if ((direction === 'to' || direction === 'both') && rel.from === url) urls.push(rel.to)
      if ((direction === 'from' || direction === 'both') && rel.to === url) urls.push(rel.from)
    }
    const out: Thing<Data>[] = []
    for (const u of new Set(urls)) {
      const t = this.things.get(u)
      if (t) out.push(this.clone(t))
    }
    return out
  }

  async relationships(url: string, type?: string, direction: 'from' | 'to' | 'both' = 'both'): Promise<Relationship[]> {
    this.log('relationships', url, type, direction)
    return [...this.rels.values()].filter((rel) => {
      if (type && rel.type !== type) return false
      if (direction === 'to') return rel.from === url
      if (direction === 'from') return rel.to === url
      return rel.from === url || rel.to === url
    })
  }

  async references(url: string, relationshipType?: string): Promise<Thing<Data>[]> {
    return this.related(url, relationshipType, 'from')
  }

  /** Test hook: raw edges. */
  edges(): Relationship<Data>[] {
    return [...this.rels.values()]
  }
}
