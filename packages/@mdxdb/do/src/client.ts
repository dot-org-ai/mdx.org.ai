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
  MDXDOClientConfig,
} from './types.js'

/**
 * MDXDOClient - wrapper for MDXDurableObject RPC calls
 */
export class MDXDOClient implements MDXDurableObjectRPC {
  private stub: DurableObjectStub<MDXDurableObjectRPC>
  private _$id: string

  constructor(config: MDXDOClientConfig) {
    this._$id = config.$id
    const doId = config.binding.idFromName(config.$id)
    this.stub = config.binding.get(doId)
  }

  $id(): string {
    return this._$id
  }

  async $context(): Promise<string | null> {
    return this.stub.$context()
  }

  async $contextDoId(): Promise<string | null> {
    return this.stub.$contextDoId()
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

  async getChildren(): Promise<ChildInfo[]> {
    return this.stub.getChildren()
  }

  async getChild(path: string): Promise<ChildInfo | null> {
    return this.stub.getChild(path)
  }

  async exportToParquet(options?: ExportOptions): Promise<ArrayBuffer> {
    return this.stub.exportToParquet(options)
  }

  async fetch(request: Request): Promise<Response> {
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
