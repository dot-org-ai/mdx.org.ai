/**
 * In-process fake of the @mdxdb/sqlite MDXDatabase RPC surface.
 *
 * Mirrors the DO's observable semantics (url = `${base}/${type}/${id}`,
 * `where` matches `data` fields exactly, `INSERT OR REPLACE` on edges, reverse
 * index via `relatedBy`) so the DO provider can be unit-tested in node. The
 * workers pool runs the same provider against the real Durable Object.
 */
import type {
  MDXDatabaseNamespaceLike,
  MDXDatabaseStubLike,
  DOThing,
  DORelationship,
  DOListOptions,
  DurableObjectIdLike,
} from '../../src/providers/do.js'

export interface FakeOptions {
  /** Expose `$init(name)` like @mdxdb/sqlite ≥ mdx-8je.24; when false only `$id()` exists. */
  withInit?: boolean
  /** Base returned by `$id()` when no `$init` handshake ran (mirrors the workerd hex-id fallback). */
  unnamedBase?: string
}

let counter = 0

export class FakeMDXDatabase implements MDXDatabaseStubLike {
  private base?: string
  private things = new Map<string, DOThing>()
  private rels = new Map<string, DORelationship>()
  readonly calls: string[] = []
  $init?: (name: string) => string

  constructor(
    readonly doName: string,
    private readonly options: FakeOptions = {}
  ) {
    if (options.withInit !== false) {
      this.$init = (name: string) => {
        this.calls.push(`$init:${name}`)
        const requested = name.includes('://') ? name : `https://${name}`
        if (this.base && this.base !== requested) throw new Error(`MDXDatabase $id mismatch: ${this.base} vs ${requested}`)
        this.base = requested
        return requested
      }
    }
  }

  private get baseId(): string {
    if (this.base) return this.base
    // Unnamed: mimic workerd where ctx.id.name is undefined → hex id.
    this.base = this.options.unnamedBase ?? `https://${'0'.repeat(60)}${(++counter).toString(16).padStart(4, '0')}`
    return this.base
  }

  $id(): string {
    this.calls.push('$id')
    return this.baseId
  }

  private url(type: string, id: string): string {
    return `${this.baseId}/${type}/${id}`
  }

  async getById(type: string, id: string): Promise<DOThing | null> {
    return this.things.get(this.url(type, id)) ?? null
  }

  async list(options: DOListOptions = {}): Promise<DOThing[]> {
    let rows = [...this.things.values()]
    if (options.type) rows = rows.filter((t) => t.type === options.type)
    if (options.where) {
      for (const [k, v] of Object.entries(options.where)) {
        rows = rows.filter((t) => (t.data as Record<string, unknown>)[k] === v)
      }
    }
    const dir = options.order === 'asc' ? 1 : -1
    const key = options.orderBy
    rows.sort((a, b) => {
      const av = key ? (key in a ? (a as unknown as Record<string, unknown>)[key] : (a.data as Record<string, unknown>)[key]) : a.at
      const bv = key ? (key in b ? (b as unknown as Record<string, unknown>)[key] : (b.data as Record<string, unknown>)[key]) : b.at
      if (av === bv) return 0
      if (av === undefined) return 1
      if (bv === undefined) return -1
      return (av as number) < (bv as number) ? -dir : dir
    })
    const offset = options.offset ?? 0
    rows = options.limit === undefined ? rows.slice(offset) : rows.slice(offset, offset + options.limit)
    return rows
  }

  async create(options: { type: string; id?: string; data: Record<string, unknown> }): Promise<DOThing> {
    const id = options.id ?? `${Date.now().toString(36)}_${(++counter).toString(36)}`
    const url = this.url(options.type, id)
    if (this.things.has(url)) throw new Error(`Thing already exists: ${url}`)
    const thing: DOThing = {
      url,
      type: options.type,
      id,
      data: { ...options.data },
      at: new Date().toISOString(),
      version: 1,
    }
    this.things.set(url, thing)
    return thing
  }

  async update(url: string, options: { data?: Record<string, unknown> }): Promise<DOThing> {
    const existing = this.things.get(url)
    if (!existing) throw new Error(`Thing not found: ${url}`)
    const updated: DOThing = {
      ...existing,
      data: { ...(existing.data as Record<string, unknown>), ...(options.data ?? {}) },
      at: new Date().toISOString(),
      version: existing.version + 1,
    }
    this.things.set(url, updated)
    return updated
  }

  async delete(url: string): Promise<boolean> {
    for (const [id, rel] of this.rels) {
      if (rel.from === url || rel.to === url) this.rels.delete(id)
    }
    return this.things.delete(url)
  }

  async relate(options: {
    predicate: string
    reverse?: string
    from: string
    to: string
    data?: Record<string, unknown>
  }): Promise<DORelationship> {
    const id = `rel_${options.from}:${options.predicate}:${options.to}`
    const rel: DORelationship = { id, ...options }
    this.rels.set(id, rel)
    return rel
  }

  async unrelate(from: string, predicate: string, to: string): Promise<boolean> {
    return this.rels.delete(`rel_${from}:${predicate}:${to}`)
  }

  async related(url: string, predicate: string): Promise<DOThing[]> {
    const out: DOThing[] = []
    for (const rel of this.rels.values()) {
      if (rel.from === url && rel.predicate === predicate) {
        const t = this.things.get(rel.to)
        if (t) out.push(t)
      }
    }
    return out
  }

  async relatedBy(url: string, reverse: string): Promise<DOThing[]> {
    const out: DOThing[] = []
    for (const rel of this.rels.values()) {
      if (rel.to === url && rel.reverse === reverse) {
        const t = this.things.get(rel.from)
        if (t) out.push(t)
      }
    }
    return out
  }

  /** Test hook: raw edges. */
  edges(): DORelationship[] {
    return [...this.rels.values()]
  }
}

/** A namespace binding that hands out one fake per name. */
export class FakeNamespace implements MDXDatabaseNamespaceLike {
  readonly objects = new Map<string, FakeMDXDatabase>()
  constructor(private readonly options: FakeOptions = {}) {}

  idFromName(name: string): DurableObjectIdLike {
    return { name, toString: () => name }
  }

  get(id: DurableObjectIdLike): FakeMDXDatabase {
    const name = id.name ?? id.toString()
    let obj = this.objects.get(name)
    if (!obj) {
      obj = new FakeMDXDatabase(name, this.options)
      this.objects.set(name, obj)
    }
    return obj
  }
}
