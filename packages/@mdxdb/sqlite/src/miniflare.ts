/**
 * Miniflare Integration
 *
 * Provides a miniflare-based Durable Object binding for Node.js development/testing.
 * This allows you to use the same MDXDatabase API locally.
 *
 * @example
 * ```ts
 * import { createMiniflareBinding } from '@mdxdb/sqlite/miniflare'
 *
 * const binding = await createMiniflareBinding('./.data')
 * const id = binding.idFromName('example.com')
 * const db = binding.get(id)
 *
 * // Use the same RPC methods
 * await db.create({ ns: 'example.com', type: 'Post', data: { title: 'Hello' } })
 * ```
 *
 * @packageDocumentation
 */

// DurableObjectNamespace, DurableObjectId, DurableObjectStub are global from @cloudflare/workers-types
import type {
  MDXDatabaseRPC,
  Thing,
  Artifact,
  ArtifactType,
  ActionStatus,
} from './types.js'

// Miniflare types (we'll import dynamically)
interface MiniflareOptions {
  modules: boolean
  script?: string
  scriptPath?: string
  durableObjects: Record<string, string>
  durableObjectsPersist?: string
}

interface Miniflare {
  getDurableObjectNamespace(name: string): Promise<DurableObjectNamespace<MDXDatabaseRPC>>
  dispose(): Promise<void>
}

// Cache miniflare instance
let miniflareInstance: Miniflare | null = null
let miniflareBinding: DurableObjectNamespace<MDXDatabaseRPC> | null = null

/**
 * Create a miniflare-based Durable Object binding
 *
 * This creates a local miniflare instance that emulates the Cloudflare Workers
 * runtime with Durable Objects SQLite storage.
 */
export async function createMiniflareBinding(
  persistPath?: string
): Promise<DurableObjectNamespace<MDXDatabaseRPC>> {
  // Return cached binding if available
  if (miniflareBinding) {
    return miniflareBinding
  }

  // Dynamic import miniflare and path
  const { Miniflare: MF } = await import('miniflare')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join } = await import('node:path')
  const { existsSync } = await import('node:fs')

  // Get the path to the durable-object.js file
  // When running from source (vitest), __dirname is src/
  // When running from dist, __dirname is dist/
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  // Check if we're running from source (src/) or dist
  // Miniflare needs the bundled version (no code splitting)
  let doPath = join(__dirname, 'durable-object.bundled.js')
  if (!existsSync(doPath)) {
    // Try dist directory (when running tests from src/)
    const distPath = join(__dirname, '..', 'dist', 'durable-object.bundled.js')
    if (existsSync(distPath)) {
      doPath = distPath
    } else {
      throw new Error(
        `Cannot find durable-object.bundled.js. Tried:\n  - ${doPath}\n  - ${distPath}\n` +
        `Run 'pnpm build' first if testing with miniflare.`
      )
    }
  }

  // Create miniflare instance with the actual module file
  // Using type assertion because newer miniflare versions changed the script field to required
  // but we're using scriptPath which is a valid alternative
  miniflareInstance = new MF({
    modules: true,
    scriptPath: doPath,
    durableObjects: {
      MDXDB: {
        className: 'MDXDatabase',
        // Enable SQLite for this DO class
        useSQLite: true,
      },
    },
    durableObjectsPersist: persistPath ?? '.mf/do',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as unknown as Miniflare

  // Get the binding
  miniflareBinding = await miniflareInstance.getDurableObjectNamespace('MDXDB')

  return miniflareBinding
}

/**
 * Dispose the miniflare instance
 *
 * Call this when you're done to clean up resources.
 */
export async function disposeMiniflare(): Promise<void> {
  if (miniflareInstance) {
    await miniflareInstance.dispose()
    miniflareInstance = null
    miniflareBinding = null
  }
}

/**
 * Create a simple in-memory implementation for testing
 *
 * This is a lighter alternative to miniflare for unit tests.
 */
export function createInMemoryBinding(): DurableObjectNamespace<MDXDatabaseRPC> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instances = new Map<string, any>()

  // Create a simple in-memory SQLite-like storage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createInMemoryInstance = (name: string): any => {
    // Storage maps
    const things = new Map<string, Record<string, unknown>>()
    const relationships = new Map<string, Record<string, unknown>>()
    const search = new Map<string, Record<string, unknown>>()
    const events = new Map<string, Record<string, unknown>>()
    const actions = new Map<string, Record<string, unknown>>()
    const artifacts = new Map<string, Record<string, unknown>>()

    const generateId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`

    const instance: MDXDatabaseRPC = {
      // Thing operations
      async list(options = {}) {
        let result = Array.from(things.values())
          .filter((t: Record<string, unknown>) => !t.deleted_at)

        if (options.type) {
          result = result.filter((t: Record<string, unknown>) => t.type === options.type)
        }
        if (options.ns) {
          result = result.filter((t: Record<string, unknown>) => t.ns === options.ns)
        }

        // Handle where clause
        if (options.where) {
          for (const [key, value] of Object.entries(options.where)) {
            result = result.filter((t: Record<string, unknown>) => {
              const data = t.data as Record<string, unknown>
              return data[key] === value
            })
          }
        }

        // Handle ordering
        if (options.orderBy) {
          const orderBy = options.orderBy as string
          result.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            let aVal: string | number | boolean | null | undefined
            let bVal: string | number | boolean | null | undefined
            if (['url', 'ns', 'type', 'id', 'created_at', 'updated_at'].includes(orderBy)) {
              aVal = a[orderBy] as string | number | boolean | null | undefined
              bVal = b[orderBy] as string | number | boolean | null | undefined
            } else {
              // JSON field
              aVal = (a.data as Record<string, unknown>)[orderBy] as string | number | boolean | null | undefined
              bVal = (b.data as Record<string, unknown>)[orderBy] as string | number | boolean | null | undefined
            }
            if (aVal === undefined || aVal === null) return 1
            if (bVal === undefined || bVal === null) return -1
            if (aVal < bVal) return -1
            if (aVal > bVal) return 1
            return 0
          })
          if (options.order === 'desc') {
            result.reverse()
          }
        }

        // Handle offset and limit
        if (options.offset) {
          result = result.slice(options.offset)
        }
        if (options.limit) {
          result = result.slice(0, options.limit)
        }

        return result.map((row: Record<string, unknown>) => ({
          ns: row.ns as string,
          type: row.type as string,
          id: row.id as string,
          url: row.url as string,
          data: row.data as Record<string, unknown>,
          content: row.content as string | undefined,
          createdAt: new Date(row.created_at as string),
          updatedAt: new Date(row.updated_at as string),
        }))
      },

      async read(url) {
        const row = things.get(url)
        if (!row || row.deleted_at) return null

        return {
          ns: row.ns as string,
          type: row.type as string,
          id: row.id as string,
          url: row.url as string,
          data: row.data as Record<string, unknown>,
          content: row.content as string | undefined,
          createdAt: new Date(row.created_at as string),
          updatedAt: new Date(row.updated_at as string),
        }
      },

      async readById(type, id) {
        const url = `https://${name}/${type}/${id}`
        return instance.read(url)
      },

      async create(options) {
        const id = options.id ?? generateId()
        const url = options.url ?? `https://${options.ns}/${options.type}/${id}`
        const now = new Date().toISOString()

        if (things.has(url)) {
          throw new Error(`Thing already exists: ${url}`)
        }

        const row = {
          url,
          ns: options.ns,
          type: options.type,
          id,
          data: options.data,
          content: options.content ?? '',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        }

        things.set(url, row)

        return {
          ns: options.ns,
          type: options.type,
          id,
          url,
          data: options.data,
          content: options.content,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        }
      },

      async update(url, options) {
        const existing = things.get(url)
        if (!existing || existing.deleted_at) {
          throw new Error(`Thing not found: ${url}`)
        }

        const now = new Date().toISOString()
        const merged = { ...(existing.data as Record<string, unknown>), ...options.data }

        existing.data = merged
        existing.updated_at = now
        if (options.content !== undefined) {
          existing.content = options.content
        }

        return {
          ns: existing.ns as string,
          type: existing.type as string,
          id: existing.id as string,
          url: existing.url as string,
          data: merged as Record<string, unknown>,
          content: existing.content as string | undefined,
          createdAt: new Date(existing.created_at as string),
          updatedAt: new Date(now),
        } as Thing
      },

      async upsert(options) {
        const id = options.id ?? generateId()
        const url = options.url ?? `https://${options.ns}/${options.type}/${id}`

        const existing = things.get(url)
        if (existing && !existing.deleted_at) {
          return instance.update(url, { data: options.data, content: options.content })
        }

        return instance.create({ ...options, id, url })
      },

      async remove(url) {
        const deleted = things.delete(url)
        // Also delete relationships
        for (const [key, rel] of relationships) {
          if (rel.from_url === url || rel.to_url === url) {
            relationships.delete(key)
          }
        }
        return deleted
      },

      async search(options) {
        const queryLower = options.query.toLowerCase()
        const all = await instance.list({ type: options.type, limit: options.limit })

        return all.filter(thing => {
          const searchText = JSON.stringify(thing).toLowerCase()
          return searchText.includes(queryLower)
        })
      },

      // Relationship operations
      async relate(options) {
        const id = `rel_${options.from}_${options.type}_${options.to}`
        const now = new Date().toISOString()

        relationships.set(id, {
          id,
          type: options.type,
          from_url: options.from,
          to_url: options.to,
          data: options.data,
          created_at: now,
        })

        return {
          id,
          type: options.type,
          from: options.from,
          to: options.to,
          data: options.data,
          createdAt: new Date(now),
        }
      },

      async unrelate(from, type, to) {
        const id = `rel_${from}_${type}_${to}`
        return relationships.delete(id)
      },

      async related(url, type, direction = 'from') {
        const urls: string[] = []

        for (const rel of relationships.values()) {
          if (type && rel.type !== type) continue

          // direction='to': Return things this URL points TO (outbound, where from_url = url)
          if ((direction === 'to' || direction === 'both') && rel.from_url === url) {
            urls.push(rel.to_url as string)
          }
          // direction='from': Return things that point TO this URL (inbound, where to_url = url)
          if ((direction === 'from' || direction === 'both') && rel.to_url === url) {
            urls.push(rel.from_url as string)
          }
        }

        const result = []
        for (const u of [...new Set(urls)]) {
          const thing = await instance.read(u)
          if (thing) result.push(thing)
        }
        return result
      },

      async relationships(url, type, direction = 'both') {
        const result = []

        for (const rel of relationships.values()) {
          if (type && rel.type !== type) continue

          const matches =
            (direction === 'from' && rel.from_url === url) ||
            (direction === 'to' && rel.to_url === url) ||
            (direction === 'both' && (rel.from_url === url || rel.to_url === url))

          if (matches) {
            result.push({
              id: rel.id as string,
              type: rel.type as string,
              from: rel.from_url as string,
              to: rel.to_url as string,
              data: rel.data as Record<string, unknown> | undefined,
              createdAt: new Date(rel.created_at as string),
            })
          }
        }

        return result
      },

      // Vector search (placeholder - requires Vectorize binding in production)
      async vectorSearch() {
        return []
      },

      async setEmbedding() {},

      async upsertEmbeddings() {},

      async deleteVectors() {},

      // Event operations
      async track(options) {
        const id = generateId()
        const now = new Date().toISOString()

        events.set(id, {
          id,
          type: options.type,
          timestamp: now,
          source: options.source,
          data: options.data,
          correlation_id: options.correlationId,
          causation_id: options.causationId,
        })

        return {
          id,
          type: options.type,
          timestamp: new Date(now),
          source: options.source,
          data: options.data,
          correlationId: options.correlationId,
          causationId: options.causationId,
        }
      },

      async getEvent(id) {
        const row = events.get(id)
        if (!row) return null

        return {
          id: row.id as string,
          type: row.type as string,
          timestamp: new Date(row.timestamp as string),
          source: row.source as string,
          data: row.data as Record<string, unknown>,
          correlationId: row.correlation_id as string | undefined,
          causationId: row.causation_id as string | undefined,
        }
      },

      async queryEvents(options = {}) {
        let result = Array.from(events.values())

        if (options.type) {
          result = result.filter((e: Record<string, unknown>) => e.type === options.type)
        }
        if (options.source) {
          result = result.filter((e: Record<string, unknown>) => e.source === options.source)
        }
        if (options.limit) {
          result = result.slice(0, options.limit)
        }

        return result.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          type: row.type as string,
          timestamp: new Date(row.timestamp as string),
          source: row.source as string,
          data: row.data as Record<string, unknown>,
          correlationId: row.correlation_id as string | undefined,
          causationId: row.causation_id as string | undefined,
        }))
      },

      // Action operations
      async send(options) {
        const id = generateId()
        const now = new Date().toISOString()

        actions.set(id, {
          id,
          actor: options.actor,
          object: options.object,
          action: options.action,
          status: options.status ?? 'pending',
          created_at: now,
          updated_at: now,
          metadata: options.metadata,
        })

        return {
          id,
          actor: options.actor,
          object: options.object,
          action: options.action,
          status: options.status ?? 'pending',
          createdAt: new Date(now),
          updatedAt: new Date(now),
          metadata: options.metadata,
        }
      },

      async do(options) {
        const id = generateId()
        const now = new Date().toISOString()

        actions.set(id, {
          id,
          actor: options.actor,
          object: options.object,
          action: options.action,
          status: 'active',
          created_at: now,
          updated_at: now,
          started_at: now,
          metadata: options.metadata,
        })

        return {
          id,
          actor: options.actor,
          object: options.object,
          action: options.action,
          status: 'active',
          createdAt: new Date(now),
          updatedAt: new Date(now),
          startedAt: new Date(now),
          metadata: options.metadata,
        }
      },

      async getAction(id) {
        const row = actions.get(id)
        if (!row) return null

        return {
          id: row.id as string,
          actor: row.actor as string,
          object: row.object as string,
          action: row.action as string,
          status: row.status as 'pending' | 'active' | 'completed' | 'failed' | 'cancelled',
          createdAt: new Date(row.created_at as string),
          updatedAt: new Date(row.updated_at as string),
          startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
          result: row.result,
          error: row.error as string | undefined,
          metadata: row.metadata as Record<string, unknown> | undefined,
        }
      },

      async queryActions(options = {}) {
        let result = Array.from(actions.values())

        if (options.actor) {
          result = result.filter((a: Record<string, unknown>) => a.actor === options.actor)
        }
        if (options.status) {
          const statuses = Array.isArray(options.status) ? options.status : [options.status]
          result = result.filter((a: Record<string, unknown>) => statuses.includes(a.status as ActionStatus))
        }
        if (options.limit) {
          result = result.slice(0, options.limit)
        }

        return result.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          actor: row.actor as string,
          object: row.object as string,
          action: row.action as string,
          status: row.status as 'pending' | 'active' | 'completed' | 'failed' | 'cancelled',
          createdAt: new Date(row.created_at as string),
          updatedAt: new Date(row.updated_at as string),
          startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
          result: row.result,
          error: row.error as string | undefined,
          metadata: row.metadata as Record<string, unknown> | undefined,
        }))
      },

      async startAction(id) {
        const row = actions.get(id)
        if (!row) throw new Error(`Action not found: ${id}`)

        const now = new Date().toISOString()
        row.status = 'active'
        row.started_at = now
        row.updated_at = now

        return instance.getAction(id) as Promise<import('./types.js').Action>
      },

      async completeAction(id, result) {
        const row = actions.get(id)
        if (!row) throw new Error(`Action not found: ${id}`)

        const now = new Date().toISOString()
        row.status = 'completed'
        row.completed_at = now
        row.updated_at = now
        row.result = result

        return instance.getAction(id) as Promise<import('./types.js').Action>
      },

      async failAction(id, error) {
        const row = actions.get(id)
        if (!row) throw new Error(`Action not found: ${id}`)

        const now = new Date().toISOString()
        row.status = 'failed'
        row.completed_at = now
        row.updated_at = now
        row.error = error

        return instance.getAction(id) as Promise<import('./types.js').Action>
      },

      async cancelAction(id) {
        const row = actions.get(id)
        if (!row) throw new Error(`Action not found: ${id}`)

        const now = new Date().toISOString()
        row.status = 'cancelled'
        row.completed_at = now
        row.updated_at = now

        return instance.getAction(id) as Promise<import('./types.js').Action>
      },

      // Artifact operations
      async storeArtifact(options) {
        const now = new Date().toISOString()
        const expiresAt = options.ttl
          ? new Date(Date.now() + options.ttl).toISOString()
          : undefined

        artifacts.set(options.key, {
          key: options.key,
          type: options.type,
          source: options.source,
          source_hash: options.sourceHash,
          created_at: now,
          expires_at: expiresAt,
          content: options.content,
          metadata: options.metadata,
        })

        return {
          key: options.key,
          type: options.type,
          source: options.source,
          sourceHash: options.sourceHash,
          createdAt: new Date(now),
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          content: options.content,
          metadata: options.metadata,
        }
      },

      async getArtifact(key) {
        const row = artifacts.get(key)
        if (!row) return null

        if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
          artifacts.delete(key)
          return null
        }

        return {
          key: row.key as string,
          type: row.type as ArtifactType,
          source: row.source as string,
          sourceHash: row.source_hash as string,
          createdAt: new Date(row.created_at as string),
          expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
          content: row.content,
          metadata: row.metadata as Record<string, unknown> | undefined,
        } as Artifact
      },

      async getArtifactBySource(source, type) {
        for (const row of artifacts.values()) {
          if (row.source === source && row.type === type) {
            return instance.getArtifact(row.key as string)
          }
        }
        return null
      },

      async deleteArtifact(key) {
        return artifacts.delete(key)
      },

      async cleanExpiredArtifacts() {
        const now = new Date()
        let count = 0

        for (const [key, row] of artifacts) {
          if (row.expires_at && new Date(row.expires_at as string) < now) {
            artifacts.delete(key)
            count++
          }
        }

        return count
      },

      // Database info
      getDatabaseSize() {
        return 0
      },

      getNamespace() {
        return name
      },
    }

    return instance
  }

  return {
    idFromName(name: string): DurableObjectId {
      return { toString: () => name, name }
    },

    idFromString(id: string): DurableObjectId {
      return { toString: () => id }
    },

    newUniqueId(): DurableObjectId {
      const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
      return { toString: () => id }
    },

    get(id: DurableObjectId): DurableObjectStub<MDXDatabaseRPC> {
      const name = id.name ?? id.toString()

      if (!instances.has(name)) {
        instances.set(name, createInMemoryInstance(name))
      }

      const instance = instances.get(name)!

      return {
        ...instance,
        id,
        name,
      } as DurableObjectStub<MDXDatabaseRPC>
    },
  }
}
