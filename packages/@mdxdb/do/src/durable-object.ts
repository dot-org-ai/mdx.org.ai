/**
 * MDXDurableObject
 *
 * Extended Durable Object with hierarchy support and parquet export.
 * Uses rpc.do/server's newWorkersRpcResponse for automatic RPC exposure over
 * WebSocket (hibernatable) and HTTP batch - all methods exposed automatically.
 *
 * @packageDocumentation
 */

import { MDXDatabase } from '@mdxdb/sqlite/durable-object'
import { writeThings, writeRelationshipsIndexed } from '@mdxdb/parquet'
import { newWorkersRpcResponse } from 'rpc.do/server'
import type { ExportOptions, ChildInfo, Env, SerializableThing, SerializableRelationship } from './types.js'
import type { Thing, Relationship, CreateOptions, UpdateOptions, ListOptions, RelateOptions, RelationshipQueryOptions } from '@mdxdb/sqlite/types'

/**
 * Convert a Thing to a serializable format (Date -> ISO string)
 */
function serializeThing<T>(thing: Thing<T>): SerializableThing<T> {
  return {
    ...thing,
    at: thing.at instanceof Date ? thing.at.toISOString() : thing.at as string,
  }
}

/**
 * Convert a Relationship to a serializable format (Date -> ISO string)
 */
function serializeRelationship<T>(rel: Relationship<T>): SerializableRelationship<T> {
  return {
    ...rel,
    at: rel.at instanceof Date ? rel.at.toISOString() : rel.at as string,
  }
}

/**
 * MDXDurableObject extends MDXDatabase with:
 * - Parent/child hierarchy via $context relationship
 * - Parquet export
 * - capnweb RPC (WebSocket + HTTP) via rpc.do/server
 *
 * All public methods on MDXDatabase are automatically exposed via RPC.
 * Clients use rpc.do transports (capnweb, reconnectingWs, http) to connect.
 *
 * @example
 * ```ts
 * // Workers RPC (direct stub)
 * const stub = env.MDXDB.get(id)
 * await stub.create({ type: 'Post', data: { title: 'Hello' } })
 *
 * // rpc.do client
 * import { RPC } from 'rpc.do'
 * const db = RPC('wss://my-do.workers.dev')
 * await db.create({ type: 'Post', data: { title: 'Hello' } })
 *
 * // With reconnection support
 * const db = RPC('wss://my-do.workers.dev', { reconnect: true })
 *
 * // capnweb pipelining - single round trip
 * const thing = db.get('https://example.com/Post/hello')
 * const result = await thing.add(1, 2) // runs server-side
 * ```
 */
export class MDXDurableObject extends MDXDatabase {
  /**
   * Code execution is not available in Durable Objects.
   * Use @mdxe/workers for code execution in Workers.
   */
  override async compile(_url: string): Promise<never> {
    throw new Error('Code execution not available in MDXDurableObject. Use @mdxe/workers.')
  }

  /**
   * Code execution is not available in Durable Objects.
   */
  override async call(_url: string, _fn: string, _args?: unknown[]): Promise<never> {
    throw new Error('Code execution not available in MDXDurableObject. Use @mdxe/workers.')
  }

  /**
   * Code execution is not available in Durable Objects.
   */
  override async meta(_url: string): Promise<never> {
    throw new Error('Code execution not available in MDXDurableObject. Use @mdxe/workers.')
  }

  /**
   * Code execution is not available in Durable Objects.
   */
  override async render(_url: string, _props?: Record<string, unknown>): Promise<never> {
    throw new Error('Code execution not available in MDXDurableObject. Use @mdxe/workers.')
  }

  // ==========================================================================
  // Override CRUD methods to return serializable data (Date -> ISO string)
  // ==========================================================================

  override async get<TData = Record<string, unknown>>(url: string): Promise<SerializableThing<TData> | null> {
    const thing = await super.get<TData>(url)
    return thing ? serializeThing(thing) : null
  }

  override async create<TData = Record<string, unknown>>(options: CreateOptions<TData>): Promise<SerializableThing<TData>> {
    const thing = await super.create(options)
    return serializeThing(thing)
  }

  override async update<TData = Record<string, unknown>>(url: string, options: UpdateOptions<TData>): Promise<SerializableThing<TData>> {
    const thing = await super.update(url, options)
    return serializeThing(thing)
  }

  override async list<TData = Record<string, unknown>>(options?: ListOptions): Promise<SerializableThing<TData>[]> {
    const things = await super.list<TData>(options)
    return things.map(serializeThing)
  }

  override async relate<TData = Record<string, unknown>>(options: RelateOptions<TData>): Promise<SerializableRelationship<TData>> {
    const rel = await super.relate(options)
    return serializeRelationship(rel)
  }

  override async relationships<TData = Record<string, unknown>>(url: string, options?: RelationshipQueryOptions): Promise<SerializableRelationship<TData>[]> {
    const rels = await super.relationships<TData>(url, options)
    return rels.map(serializeRelationship)
  }

  override async relatedBy<TData = Record<string, unknown>>(url: string, predicate?: string): Promise<SerializableThing<TData>[]> {
    const things = await super.relatedBy<TData>(url, predicate)
    return things.map(serializeThing)
  }

  // ==========================================================================
  // Hierarchy methods
  // ==========================================================================

  /**
   * Get parent DO's $id URL
   * Returns null if this is a root DO
   */
  async $context(): Promise<string | null> {
    const rels = await this.relationships(this.$id(), { predicate: '$context' })
    if (rels.length === 0) return null
    return rels[0]!.to
  }

  /**
   * Get parent DO's stub ID
   */
  async $contextDoId(): Promise<string | null> {
    const rels = await this.relationships(this.$id(), { predicate: '$context' })
    if (rels.length === 0) return null
    return rels[0]!.do ?? null
  }

  /**
   * Set parent DO (creates $context relationship)
   */
  async setContext(parentId: string, parentDoId: string): Promise<void> {
    await this.relate({
      predicate: '$context',
      from: this.$id(),
      to: parentId,
      do: parentDoId,
    })
  }

  /**
   * Get all child DOs
   * Children are things that have a $context relationship pointing to this DO
   */
  async getChildren(): Promise<ChildInfo[]> {
    const rels = await this.relatedBy(this.$id(), '$child')
    const children: ChildInfo[] = []

    for (const rel of rels) {
      const fullRels = await this.relationships(rel.url, { predicate: '$context' })
      const contextRel = fullRels.find(r => r.to === this.$id())

      if (contextRel) {
        const childUrl = new URL(rel.url)
        const parentUrl = new URL(this.$id())
        const path = childUrl.host === parentUrl.host
          ? childUrl.pathname
          : `/${childUrl.host}`

        children.push({
          id: rel.url,
          path,
          doId: contextRel.do ?? '',
        })
      }
    }

    return children
  }

  /**
   * Get child by path
   */
  async getChild(path: string): Promise<ChildInfo | null> {
    const children = await this.getChildren()
    return children.find(c => c.path === path) ?? null
  }

  /**
   * Export this namespace to parquet
   */
  async exportToParquet(options: ExportOptions = {}): Promise<ArrayBuffer> {
    let things = await this.list({
      type: options.types?.[0],
      limit: 10000,
    })

    if (options.types && options.types.length > 1) {
      things = things.filter(t => options.types!.includes(t.type))
    }

    if (options.since) {
      things = things.filter(t => t.at >= options.since!)
    }

    const allRels = []
    for (const thing of things) {
      const rels = await this.relationships(thing.url)
      allRels.push(...rels)
    }

    const thingsBuffer = await writeThings(things, { compression: options.compression })
    const _relsBuffer = await writeRelationshipsIndexed(allRels, { compression: options.compression })

    // TODO: Implement proper multi-table parquet or return zip of both
    return thingsBuffer
  }

  /**
   * Create RPC handler that only exposes safe methods
   * (avoiding serialization of internal state like sql, doCtx)
   */
  private createRpcTarget() {
    return {
      // Core CRUD
      $id: () => this.$id(),
      get: <TData = Record<string, unknown>>(url: string) => this.get<TData>(url),
      getById: <TData = Record<string, unknown>>(type: string, id: string) => this.getById<TData>(type, id),
      create: <TData = Record<string, unknown>>(options: CreateOptions<TData>) => this.create<TData>(options),
      update: <TData = Record<string, unknown>>(url: string, options: UpdateOptions<TData>) => this.update<TData>(url, options),
      delete: (url: string) => this.delete(url),
      list: <TData = Record<string, unknown>>(options?: ListOptions) => this.list<TData>(options),

      // Relationships
      relate: <TData = Record<string, unknown>>(options: RelateOptions<TData>) => this.relate<TData>(options),
      unrelate: (from: string, predicate: string, to: string) => this.unrelate(from, predicate, to),
      relationships: <TData = Record<string, unknown>>(url: string, options?: RelationshipQueryOptions) => this.relationships<TData>(url, options),
      relatedBy: <TData = Record<string, unknown>>(url: string, predicate?: string) => this.relatedBy<TData>(url, predicate),

      // Hierarchy
      $context: () => this.$context(),
      $contextDoId: () => this.$contextDoId(),
      getChildren: () => this.getChildren(),
      getChild: (path: string) => this.getChild(path),

      // Parquet export
      exportToParquet: (options?: ExportOptions) => this.exportToParquet(options),
    }
  }

  /**
   * Handle incoming HTTP requests
   *
   * Uses rpc.do/server's newWorkersRpcResponse which automatically handles:
   * - WebSocket upgrade → hibernatable capnweb RPC session
   * - HTTP POST → capnweb batch RPC
   *
   * Creates a wrapper object that only exposes the RPC-safe methods,
   * avoiding serialization of internal state.
   */
  async fetch(request: Request): Promise<Response> {
    return newWorkersRpcResponse(request, this.createRpcTarget())
  }
}

/**
 * Default export for Workers
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const doName = url.hostname

    const id = env.MDXDB.idFromName(doName)
    const stub = env.MDXDB.get(id)

    return stub.fetch(request)
  },
}
