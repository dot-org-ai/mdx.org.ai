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
 */
export class MDXClient implements MDXDatabaseRPC {
  private stub: MDXDatabaseStub
  private _$id: string

  constructor(config: MDXClientConfig) {
    if (!config.binding) {
      throw new Error('MDXClient requires a binding')
    }

    this._$id = config.$id
    const doId = config.binding.idFromName(config.$id)
    this.stub = config.binding.get(doId)
  }

  $id(): string {
    return this._$id
  }

  async list(options?: ListOptions): Promise<Thing[]> {
    return this.stub.list(options)
  }

  async get(url: string): Promise<Thing | null> {
    return this.stub.get(url)
  }

  async getById(type: string, id: string): Promise<Thing | null> {
    return this.stub.getById(type, id)
  }

  async create<TData = Record<string, unknown>>(
    options: CreateOptions<TData>
  ): Promise<Thing<TData>> {
    return this.stub.create(options) as Promise<Thing<TData>>
  }

  async update<TData = Record<string, unknown>>(
    url: string,
    options: UpdateOptions<TData>
  ): Promise<Thing<TData>> {
    return this.stub.update(url, options) as Promise<Thing<TData>>
  }

  async upsert<TData = Record<string, unknown>>(
    options: CreateOptions<TData>
  ): Promise<Thing<TData>> {
    return this.stub.upsert(options) as Promise<Thing<TData>>
  }

  async delete(url: string): Promise<boolean> {
    return this.stub.delete(url)
  }

  async relate<TData = Record<string, unknown>>(
    options: RelateOptions<TData>
  ): Promise<Relationship<TData>> {
    return this.stub.relate(options) as Promise<Relationship<TData>>
  }

  async unrelate(from: string, predicate: string, to: string): Promise<boolean> {
    return this.stub.unrelate(from, predicate, to)
  }

  async related(url: string, predicate: string): Promise<Thing[]> {
    return this.stub.related(url, predicate)
  }

  async relatedBy(url: string, reverse: string): Promise<Thing[]> {
    return this.stub.relatedBy(url, reverse)
  }

  async relationships(
    url: string,
    options?: RelationshipQueryOptions
  ): Promise<Relationship[]> {
    return this.stub.relationships(url, options)
  }

  // Code execution

  async compile(url: string): Promise<CompiledModule> {
    return this.stub.compile(url)
  }

  async call<T = unknown>(url: string, options: CallOptions): Promise<CallResult<T>> {
    return this.stub.call(url, options) as Promise<CallResult<T>>
  }

  async meta(url: string): Promise<ExportMeta> {
    return this.stub.meta(url)
  }

  async render(url: string, props?: Record<string, unknown>): Promise<string> {
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
