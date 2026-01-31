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
import type { ExportOptions, ChildInfo, Env } from './types.js'

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
   * Handle incoming HTTP requests
   *
   * Uses rpc.do/server's newWorkersRpcResponse which automatically handles:
   * - WebSocket upgrade → hibernatable capnweb RPC session
   * - HTTP POST → capnweb batch RPC
   *
   * All public methods on this DO are automatically exposed via capnweb's
   * RpcTarget mechanism - no manual dispatch needed.
   */
  async fetch(request: Request): Promise<Response> {
    return newWorkersRpcResponse(request, this)
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
