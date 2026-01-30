/**
 * MDXDurableObject
 *
 * Extended Durable Object with hierarchy support and parquet export.
 * Uses $context relationship to track parent DO.
 *
 * @packageDocumentation
 */

import { MDXDatabase } from '@mdxdb/sqlite/durable-object'
import { writeThings, writeRelationshipsIndexed } from '@mdxdb/parquet'
import type { ExportOptions, ChildInfo, Env, SessionData, RPCMessage, RPCResponse } from './types.js'

/**
 * MDXDurableObject extends MDXDatabase with:
 * - Parent/child hierarchy via $context relationship
 * - Parquet export
 * - Hibernatable WebSocket support
 */
export class MDXDurableObject extends MDXDatabase {
  private wsState: Map<WebSocket, SessionData> = new Map()

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
    // Children have relationships where to = this.$id() and predicate = '$context'
    const rels = await this.relatedBy(this.$id(), '$child')
    const children: ChildInfo[] = []

    for (const rel of rels) {
      // Get the relationship to extract the do field
      const fullRels = await this.relationships(rel.url, { predicate: '$context' })
      const contextRel = fullRels.find(r => r.to === this.$id())

      if (contextRel) {
        // Extract path from URL (child's $id relative to parent)
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
    // Get all things
    let things = await this.list({
      type: options.types?.[0],
      limit: 10000,
    })

    // Filter by types if multiple specified
    if (options.types && options.types.length > 1) {
      things = things.filter(t => options.types!.includes(t.type))
    }

    // Filter by since date
    if (options.since) {
      things = things.filter(t => t.at >= options.since!)
    }

    // Get all relationships
    const allRels = []
    for (const thing of things) {
      const rels = await this.relationships(thing.url)
      allRels.push(...rels)
    }

    // Combine things and relationships into single parquet file
    // Things go first, then indexed relationships
    const thingsBuffer = await writeThings(things, { compression: options.compression })
    const relsBuffer = await writeRelationshipsIndexed(allRels, { compression: options.compression })

    // For now, return things buffer (full implementation would merge)
    // TODO: Implement proper multi-table parquet or return zip of both
    return thingsBuffer
  }

  /**
   * Handle incoming HTTP requests including WebSocket upgrade
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    // JSON-RPC endpoint
    if (url.pathname === '/rpc' && request.method === 'POST') {
      return this.handleJsonRpc(request)
    }

    // Default: return info
    return new Response(JSON.stringify({
      $id: this.$id(),
      size: this.getDatabaseSize(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Handle WebSocket upgrade with hibernation support
   */
  private handleWebSocketUpgrade(request: Request): Response {
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]

    // Accept with hibernation
    // @ts-expect-error - acceptWebSocket is available on DurableObjectState
    this.ctx.acceptWebSocket(server)

    // Store session data
    const sessionId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
    this.wsState.set(server, {
      id: sessionId,
      lastActivity: Date.now(),
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  /**
   * Handle WebSocket message (called after hibernation wake)
   */
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    const session = this.wsState.get(ws)
    if (session) {
      session.lastActivity = Date.now()
    }

    // Parse RPC message
    let rpcMessage: RPCMessage
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message)
      rpcMessage = JSON.parse(text)
    } catch {
      this.sendRpcError(ws, 'unknown', -32700, 'Parse error')
      return
    }

    // Handle RPC call
    this.handleRpcCall(ws, rpcMessage)
  }

  /**
   * Handle WebSocket close
   */
  webSocketClose(ws: WebSocket): void {
    this.wsState.delete(ws)
  }

  /**
   * Handle WebSocket error
   */
  webSocketError(ws: WebSocket, error: unknown): void {
    console.error('WebSocket error:', error)
    this.wsState.delete(ws)
  }

  /**
   * Handle JSON-RPC over HTTP
   */
  private async handleJsonRpc(request: Request): Promise<Response> {
    let rpcMessage: RPCMessage
    try {
      rpcMessage = await request.json()
    } catch {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error' },
        id: null,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await this.executeRpcMethod(rpcMessage.method, rpcMessage.params)

    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result,
      id: rpcMessage.id,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Handle RPC call from WebSocket
   */
  private async handleRpcCall(ws: WebSocket, message: RPCMessage): Promise<void> {
    try {
      const result = await this.executeRpcMethod(message.method, message.params)
      this.sendRpcResult(ws, message.id, result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.sendRpcError(ws, message.id, -32603, errorMessage)
    }
  }

  /**
   * Execute RPC method
   */
  private async executeRpcMethod(method: string, params?: unknown[]): Promise<unknown> {
    const args = params ?? []

    switch (method) {
      case '$id':
        return this.$id()
      case '$context':
        return this.$context()
      case 'list':
        return this.list(args[0] as Parameters<typeof this.list>[0])
      case 'get':
        return this.get(args[0] as string)
      case 'getById':
        return this.getById(args[0] as string, args[1] as string)
      case 'create':
        return this.create(args[0] as Parameters<typeof this.create>[0])
      case 'update':
        return this.update(args[0] as string, args[1] as Parameters<typeof this.update>[1])
      case 'upsert':
        return this.upsert(args[0] as Parameters<typeof this.upsert>[0])
      case 'delete':
        return this.delete(args[0] as string)
      case 'relate':
        return this.relate(args[0] as Parameters<typeof this.relate>[0])
      case 'unrelate':
        return this.unrelate(args[0] as string, args[1] as string, args[2] as string)
      case 'related':
        return this.related(args[0] as string, args[1] as string)
      case 'relatedBy':
        return this.relatedBy(args[0] as string, args[1] as string)
      case 'relationships':
        return this.relationships(args[0] as string, args[1] as Parameters<typeof this.relationships>[1])
      case 'getChildren':
        return this.getChildren()
      case 'getChild':
        return this.getChild(args[0] as string)
      case 'exportToParquet':
        return this.exportToParquet(args[0] as ExportOptions)
      default:
        throw new Error(`Unknown method: ${method}`)
    }
  }

  /**
   * Send RPC result
   */
  private sendRpcResult(ws: WebSocket, id: string, result: unknown): void {
    const response: RPCResponse = { id, result }
    ws.send(JSON.stringify(response))
  }

  /**
   * Send RPC error
   */
  private sendRpcError(ws: WebSocket, id: string, code: number, message: string): void {
    const response: RPCResponse = {
      id,
      error: { code, message },
    }
    ws.send(JSON.stringify(response))
  }
}

/**
 * Default export for Workers
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Route to appropriate DO based on hostname or path
    const url = new URL(request.url)
    const doName = url.hostname

    const id = env.MDXDB.idFromName(doName)
    const stub = env.MDXDB.get(id)

    return stub.fetch(request)
  },
}
