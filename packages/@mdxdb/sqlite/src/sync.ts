/**
 * @mdxdb/sqlite Sync
 *
 * Synchronization hooks for forwarding mutations to Vectorize and ClickHouse.
 * Designed to be called from the MDXDatabase Durable Object.
 *
 * Architecture:
 * - MDXDatabase (DO) is the primary source of truth
 * - Mutations are forwarded to Vectorize for vector search
 * - Mutations are forwarded to ClickHouse for analytics
 *
 * @packageDocumentation
 */

import type { Thing, Relationship, Event, Action, Artifact } from './types.js'

// =============================================================================
// Sync Target Types
// =============================================================================

/**
 * Sync target configuration
 */
export interface SyncTarget {
  /** Target name */
  name: string
  /** Target type */
  type: 'vectorize' | 'clickhouse' | 'custom'
  /** Worker URL for HTTP calls */
  url?: string
  /** Service binding for Worker-to-Worker RPC */
  binding?: {
    fetch(request: Request): Promise<Response>
  }
  /** Whether sync is enabled */
  enabled: boolean
  /** Retry configuration */
  retry?: {
    maxAttempts?: number
    backoffMs?: number
  }
}

/**
 * Mutation types
 */
export type MutationType = 'create' | 'update' | 'delete'

/**
 * Mutation event
 */
export interface MutationEvent<T = unknown> {
  /** Mutation type */
  type: MutationType
  /** Entity type (thing, relationship, event, action, artifact) */
  entity: 'thing' | 'relationship' | 'event' | 'action' | 'artifact'
  /** Namespace */
  namespace: string
  /** Entity URL or ID */
  id: string
  /** Entity data (for create/update) */
  data?: T
  /** Previous data (for update) */
  previousData?: T
  /** Timestamp */
  timestamp: Date
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Target name */
  target: string
  /** Success status */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Duration in ms */
  durationMs: number
}

// =============================================================================
// Sync Manager
// =============================================================================

/**
 * SyncManager handles forwarding mutations to sync targets
 */
export class SyncManager {
  private targets: SyncTarget[] = []
  private namespace: string
  private embedFn?: (text: string) => Promise<number[]>

  constructor(
    namespace: string,
    options?: {
      embedFn?: (text: string) => Promise<number[]>
    }
  ) {
    this.namespace = namespace
    this.embedFn = options?.embedFn
  }

  /**
   * Add a sync target
   */
  addTarget(target: SyncTarget): void {
    this.targets.push(target)
  }

  /**
   * Remove a sync target
   */
  removeTarget(name: string): void {
    this.targets = this.targets.filter((t) => t.name !== name)
  }

  /**
   * Get all sync targets
   */
  getTargets(): SyncTarget[] {
    return [...this.targets]
  }

  /**
   * Sync a mutation to all enabled targets
   */
  async sync(event: MutationEvent): Promise<SyncResult[]> {
    const results: SyncResult[] = []
    const enabledTargets = this.targets.filter((t) => t.enabled)

    await Promise.all(
      enabledTargets.map(async (target) => {
        const start = Date.now()
        try {
          await this.syncToTarget(target, event)
          results.push({
            target: target.name,
            success: true,
            durationMs: Date.now() - start,
          })
        } catch (error) {
          results.push({
            target: target.name,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - start,
          })
        }
      })
    )

    return results
  }

  /**
   * Sync to a specific target
   */
  private async syncToTarget(target: SyncTarget, event: MutationEvent): Promise<void> {
    switch (target.type) {
      case 'vectorize':
        await this.syncToVectorize(target, event)
        break
      case 'clickhouse':
        await this.syncToClickHouse(target, event)
        break
      case 'custom':
        await this.syncToCustom(target, event)
        break
    }
  }

  /**
   * Sync to Vectorize
   */
  private async syncToVectorize(target: SyncTarget, event: MutationEvent): Promise<void> {
    // Only sync things to vectorize
    if (event.entity !== 'thing') return

    const thing = event.data as Thing | undefined

    if (event.type === 'delete') {
      // Delete vectors for this thing
      await this.callTarget(target, 'delete', {
        thingUrls: [event.id],
      })
    } else if (thing && this.embedFn) {
      // Get content to embed
      const content = this.getThingContent(thing)
      if (!content) return

      // Chunk and embed
      const chunks = this.chunkContent(content)
      const vectors = await Promise.all(
        chunks.map(async (chunk, index) => ({
          thingUrl: thing.url,
          chunkIndex: index,
          embedding: await this.embedFn!(chunk),
          content: chunk,
          type: thing.type,
        }))
      )

      // Upsert vectors
      await this.callTarget(target, 'upsert', vectors)
    }
  }

  /**
   * Sync to ClickHouse
   */
  private async syncToClickHouse(target: SyncTarget, event: MutationEvent): Promise<void> {
    // Map entity to ClickHouse table
    const tableMap: Record<string, string> = {
      thing: 'Things',
      relationship: 'Relationships',
      event: 'Events',
      action: 'Actions',
      artifact: 'Artifacts',
    }

    const table = tableMap[event.entity]
    if (!table) return

    if (event.type === 'delete') {
      // Soft delete in ClickHouse
      await this.callTarget(target, 'command', {
        query: `ALTER TABLE ${table} UPDATE event = 'deleted' WHERE url = {url:String}`,
        params: { url: event.id },
      })
    } else {
      // Insert/update - ClickHouse uses ReplacingMergeTree so just insert
      const row = this.toClickHouseRow(event.entity, event.data)
      if (row) {
        await this.callTarget(target, 'insert', {
          table,
          rows: [row],
        })
      }
    }
  }

  /**
   * Sync to custom target
   */
  private async syncToCustom(target: SyncTarget, event: MutationEvent): Promise<void> {
    await this.callTarget(target, 'sync', event)
  }

  /**
   * Call a sync target
   */
  private async callTarget(
    target: SyncTarget,
    method: string,
    params: unknown
  ): Promise<unknown> {
    const body = JSON.stringify({ method, params: [params] })
    const headers = {
      'Content-Type': 'application/json',
      'X-MDXDB-Namespace': this.namespace,
    }

    let response: Response

    if (target.binding) {
      response = await target.binding.fetch(
        new Request(`https://internal/${target.type}`, {
          method: 'POST',
          headers,
          body,
        })
      )
    } else if (target.url) {
      response = await fetch(target.url, {
        method: 'POST',
        headers,
        body,
      })
    } else {
      throw new Error(`No URL or binding configured for target: ${target.name}`)
    }

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Sync failed: ${error}`)
    }

    const result = await response.json() as { result?: unknown; error?: string }
    if (result.error) {
      throw new Error(result.error)
    }

    return result.result
  }

  /**
   * Get content to embed from a thing
   */
  private getThingContent(thing: Thing): string | null {
    const parts: string[] = []
    const data = thing.data as Record<string, unknown>

    // Extract text fields
    for (const field of ['title', 'name', 'description', 'content', 'text', 'body']) {
      const value = data[field]
      if (typeof value === 'string' && value.trim()) {
        parts.push(value)
      }
    }

    // Add thing.content if present
    if (thing.content) {
      parts.push(thing.content)
    }

    return parts.length > 0 ? parts.join('\n\n') : null
  }

  /**
   * Chunk content for embedding
   */
  private chunkContent(content: string, size = 1000, overlap = 200): string[] {
    if (!content || content.length === 0) return []

    const chunks: string[] = []
    let start = 0

    while (start < content.length) {
      let end = Math.min(start + size, content.length)

      if (end < content.length) {
        const slice = content.slice(start, end)
        const lastPara = slice.lastIndexOf('\n\n')
        const lastSentence = Math.max(
          slice.lastIndexOf('. '),
          slice.lastIndexOf('! '),
          slice.lastIndexOf('? ')
        )

        if (lastPara > size * 0.5) {
          end = start + lastPara + 2
        } else if (lastSentence > size * 0.5) {
          end = start + lastSentence + 2
        }
      }

      chunks.push(content.slice(start, end).trim())

      start = end - overlap
      if (start >= content.length - overlap) break
    }

    return chunks
  }

  /**
   * Convert entity to ClickHouse row format
   */
  private toClickHouseRow(entity: string, data: unknown): Record<string, unknown> | null {
    if (!data) return null

    const now = new Date().toISOString()

    switch (entity) {
      case 'thing': {
        const thing = data as Thing
        return {
          url: thing.url,
          ns: thing.ns,
          type: thing.type,
          id: thing.id,
          branch: 'main',
          variant: '',
          version: 1,
          repo: '',
          patch: '',
          commit: '',
          data: thing.data,
          content: thing.content ?? '',
          code: '',
          meta: thing['@context'] ? { '@context': thing['@context'] } : {},
          visibility: 'tenant',
          event: 'synced',
          ts: now,
        }
      }
      case 'relationship': {
        const rel = data as Relationship
        return {
          ns: this.namespace,
          from: rel.from,
          to: rel.to,
          predicate: rel.type,
          reverse: '',
          data: rel.data ?? {},
          meta: {},
          visibility: '',
          event: 'synced',
          ts: now,
        }
      }
      case 'event': {
        const evt = data as Event
        return {
          ns: this.namespace,
          actor: evt.source,
          actorData: {},
          event: evt.type,
          object: '',
          objectData: evt.data,
          result: '',
          resultData: {},
          meta: {
            correlationId: evt.correlationId,
            causationId: evt.causationId,
          },
          ts: now,
        }
      }
      case 'action': {
        const action = data as Action
        return {
          ns: this.namespace,
          id: action.id,
          act: action.action,
          action: `${action.action}s`,
          activity: `${action.action}ing`,
          event: '',
          actor: action.actor,
          actorData: {},
          object: action.object,
          objectData: {},
          status: action.status,
          progress: 0,
          total: 0,
          result: action.result ?? {},
          error: action.error ?? '',
          data: action.metadata ?? {},
          meta: {},
          priority: 5,
          attempts: 0,
          maxAttempts: 3,
          timeout: 0,
          ttl: 0,
          batch: '',
          batchIndex: 0,
          batchTotal: 0,
          parent: '',
          children: [],
          dependencies: [],
          scheduledAt: null,
          startedAt: action.startedAt?.toISOString() ?? null,
          completedAt: action.completedAt?.toISOString() ?? null,
          createdAt: action.createdAt.toISOString(),
          updatedAt: action.updatedAt.toISOString(),
        }
      }
      case 'artifact': {
        const artifact = data as Artifact
        return {
          ns: this.namespace,
          id: artifact.key,
          type: artifact.type,
          thing: '',
          source: artifact.source,
          name: '',
          description: '',
          path: '',
          storage: '',
          content: JSON.stringify(artifact.content),
          code: '',
          data: {},
          meta: artifact.metadata ?? {},
          contentType: '',
          encoding: 'utf-8',
          size: artifact.size ?? 0,
          hash: artifact.sourceHash,
          build: '',
          status: 'success',
          log: '',
          expires: artifact.expiresAt?.toISOString() ?? '2999-12-31 23:59:59',
          event: 'synced',
          ts: now,
        }
      }
      default:
        return null
    }
  }
}

/**
 * Create a sync manager with default targets
 */
export function createSyncManager(
  namespace: string,
  options?: {
    vectorizeUrl?: string
    vectorizeBinding?: SyncTarget['binding']
    clickhouseUrl?: string
    clickhouseBinding?: SyncTarget['binding']
    embedFn?: (text: string) => Promise<number[]>
  }
): SyncManager {
  const manager = new SyncManager(namespace, { embedFn: options?.embedFn })

  // Add vectorize target if configured
  if (options?.vectorizeUrl || options?.vectorizeBinding) {
    manager.addTarget({
      name: 'vectorize',
      type: 'vectorize',
      url: options.vectorizeUrl,
      binding: options.vectorizeBinding,
      enabled: true,
    })
  }

  // Add clickhouse target if configured
  if (options?.clickhouseUrl || options?.clickhouseBinding) {
    manager.addTarget({
      name: 'clickhouse',
      type: 'clickhouse',
      url: options.clickhouseUrl,
      binding: options.clickhouseBinding,
      enabled: true,
    })
  }

  return manager
}

// Re-export types
export type { Thing, Relationship, Event, Action, Artifact }
