/**
 * MDXDatabase Client
 *
 * Client wrapper for calling MDXDatabase via Workers RPC.
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
  CallOptions,
  CallResult,
  ExportMeta,
  CompiledModule,
  MDXDatabaseRPC,
  MDXDatabaseStub,
  MDXClientConfig,
} from './types.js'

/**
 * MDXClient - wrapper for MDXDatabase RPC calls
 *
 * The Durable Object cannot read its own name, so the client tells it once
 * via `$init()` before the first RPC (memoized per client instance; the DO
 * persists the result, so this costs one extra round trip per client).
 */
export class MDXClient implements Omit<MDXDatabaseRPC, '$init'> {
  private stub: MDXDatabaseStub
  private _$id: string
  private init?: Promise<string>

  constructor(config: MDXClientConfig) {
    if (!config.binding) {
      throw new Error('MDXClient requires a binding')
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

  // Code execution

  async compile(url: string): Promise<CompiledModule> {
    await this.$init()
    return this.stub.compile(url)
  }

  async call<T = unknown>(url: string, options: CallOptions): Promise<CallResult<T>> {
    await this.$init()
    return this.stub.call(url, options) as Promise<CallResult<T>>
  }

  async meta(url: string): Promise<ExportMeta> {
    await this.$init()
    return this.stub.meta(url)
  }

  async render(url: string, props?: Record<string, unknown>): Promise<string> {
    await this.$init()
    return this.stub.render(url, props)
  }

  getDatabaseSize(): number {
    // Note: This is sync in the DO but async over RPC
    // Return 0 as placeholder - use stub directly for this
    return 0
  }
}

/**
 * Create an MDXClient instance
 */
export function createClient(config: MDXClientConfig): MDXClient {
  return new MDXClient(config)
}
