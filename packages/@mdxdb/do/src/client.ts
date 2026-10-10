/**
 * MDXDurableObject Client
 *
 * Client wrapper for calling MDXDurableObject via Workers RPC.
 *
 * @packageDocumentation
 */

import type {
  Thing,
  Relationship,
  ListOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  RelationshipQueryOptions,
  ExportOptions,
  ChildInfo,
  MDXDurableObjectRPC,
  MDXDurableObjectStub,
  MDXDOClientConfig,
} from './types.js'

/**
 * MDXDOClient - wrapper for MDXDurableObject RPC calls
 *
 * The Durable Object cannot read its own name (`ctx.id.name` is undefined
 * inside the object in workerd), so the client tells it once via `$init()`
 * before the first RPC. The handshake is memoized per client instance and
 * the DO persists the result, so it costs one extra round trip per client.
 * Mirrors `MDXClient` in @mdxdb/sqlite.
 */
export class MDXDOClient implements Omit<MDXDurableObjectRPC, '$init'> {
  private stub: MDXDurableObjectStub
  private _$id: string
  private init?: Promise<string>

  constructor(config: MDXDOClientConfig) {
    if (!config.binding) {
      throw new Error('MDXDOClient requires a binding')
    }

    this._$id = config.$id
    const doId = config.binding.idFromName(config.$id)
    this.stub = config.binding.get(doId)
  }

  /** The configured $id (the DO name) */
  $id(): string {
    return this._$id
  }

  /**
   * Ensure the Durable Object knows its name and resolve its canonical $id
   * (`https://<name>`, no trailing slash). Called automatically before every
   * RPC; call it directly when you need the DO-side base URL.
   */
  $init(): Promise<string> {
    if (!this.init) {
      const stub = this.stub
      const name = this._$id
      this.init = (async () => stub.$init(name))().catch((err: unknown) => {
        // Let a later call retry instead of caching a transient failure.
        this.init = undefined
        throw err
      })
    }
    return this.init
  }

  async $context(): Promise<string | null> {
    await this.$init()
    return this.stub.$context()
  }

  async $contextDoId(): Promise<string | null> {
    await this.$init()
    return this.stub.$contextDoId()
  }

  async list(options?: ListOptions): Promise<Thing[]> {
    await this.$init()
    return this.stub.list(options)
  }

  async get(url: string): Promise<Thing | null> {
    await this.$init()
    return this.stub.get(url)
  }

  async getById(type: string, id: string): Promise<Thing | null> {
    await this.$init()
    return this.stub.getById(type, id)
  }

  async create<TData = Record<string, unknown>>(
    options: CreateOptions<TData>
  ): Promise<Thing<TData>> {
    await this.$init()
    return this.stub.create(options) as Promise<Thing<TData>>
  }

  async update<TData = Record<string, unknown>>(
    url: string,
    options: UpdateOptions<TData>
  ): Promise<Thing<TData>> {
    await this.$init()
    return this.stub.update(url, options) as Promise<Thing<TData>>
  }

  async upsert<TData = Record<string, unknown>>(
    options: CreateOptions<TData>
  ): Promise<Thing<TData>> {
    await this.$init()
    return this.stub.upsert(options) as Promise<Thing<TData>>
  }

  async delete(url: string): Promise<boolean> {
    await this.$init()
    return this.stub.delete(url)
  }

  async relate<TData = Record<string, unknown>>(
    options: RelateOptions<TData>
  ): Promise<Relationship<TData>> {
    await this.$init()
    return this.stub.relate(options) as Promise<Relationship<TData>>
  }

  async unrelate(from: string, predicate: string, to: string): Promise<boolean> {
    await this.$init()
    return this.stub.unrelate(from, predicate, to)
  }

  async related(url: string, predicate: string): Promise<Thing[]> {
    await this.$init()
    return this.stub.related(url, predicate)
  }

  async relatedBy(url: string, reverse: string): Promise<Thing[]> {
    await this.$init()
    return this.stub.relatedBy(url, reverse)
  }

  async relationships(
    url: string,
    options?: RelationshipQueryOptions
  ): Promise<Relationship[]> {
    await this.$init()
    return this.stub.relationships(url, options)
  }

  async getChildren(): Promise<ChildInfo[]> {
    await this.$init()
    return this.stub.getChildren()
  }

  async getChild(path: string): Promise<ChildInfo | null> {
    await this.$init()
    return this.stub.getChild(path)
  }

  async exportToParquet(options?: ExportOptions): Promise<ArrayBuffer> {
    await this.$init()
    return this.stub.exportToParquet(options)
  }

  async fetch(request: Request): Promise<Response> {
    await this.$init()
    return this.stub.fetch(request)
  }

  getDatabaseSize(): number {
    return 0
  }
}

/**
 * Create an MDXDOClient instance
 */
export function createClient(config: MDXDOClientConfig): MDXDOClient {
  return new MDXDOClient(config)
}
