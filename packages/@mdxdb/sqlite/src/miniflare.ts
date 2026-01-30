/**
 * Miniflare Integration
 *
 * Provides a miniflare-based Durable Object binding for Node.js development/testing.
 *
 * @example
 * ```ts
 * import { createMiniflareBinding } from '@mdxdb/sqlite/miniflare'
 *
 * const binding = await createMiniflareBinding('./.data')
 * const id = binding.idFromName('headless.ly')
 * const db = binding.get(id)
 *
 * // Use the same RPC methods
 * await db.create({ type: 'Post', data: { title: 'Hello' } })
 * ```
 *
 * @packageDocumentation
 */

import type { MDXDatabaseRPC, Thing, Relationship } from './types.js'

// Miniflare types
interface Miniflare {
  getDurableObjectNamespace(name: string): Promise<DurableObjectNamespace<MDXDatabaseRPC>>
  dispose(): Promise<void>
}

// Cache miniflare instance
let miniflareInstance: Miniflare | null = null
let miniflareBinding: DurableObjectNamespace<MDXDatabaseRPC> | null = null

/**
 * Create a miniflare-based Durable Object binding
 */
export async function createMiniflareBinding(
  persistPath?: string
): Promise<DurableObjectNamespace<MDXDatabaseRPC>> {
  if (miniflareBinding) {
    return miniflareBinding
  }

  const { Miniflare: MF } = await import('miniflare')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join } = await import('node:path')
  const { existsSync } = await import('node:fs')

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  let doPath = join(__dirname, 'durable-object.bundled.js')
  if (!existsSync(doPath)) {
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

  miniflareInstance = new MF({
    modules: true,
    scriptPath: doPath,
    durableObjects: {
      MDXDB: {
        className: 'MDXDatabase',
        useSQLite: true,
      },
    },
    durableObjectsPersist: persistPath ?? '.mf/do',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as unknown as Miniflare

  miniflareBinding = await miniflareInstance.getDurableObjectNamespace('MDXDB')

  return miniflareBinding
}

/**
 * Dispose the miniflare instance
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
 */
export function createInMemoryBinding(): DurableObjectNamespace<MDXDatabaseRPC> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instances = new Map<string, any>()

  const createInMemoryInstance = (name: string): MDXDatabaseRPC => {
    const data = new Map<string, Record<string, unknown>>()
    const rels = new Map<string, Record<string, unknown>>()

    const baseId = name.includes('://') ? name : `https://${name}`

    const generateId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`

    const buildUrl = (type: string, id: string) => `${baseId}/${type}/${id}`

    const instance: MDXDatabaseRPC = {
      $id(): string {
        return baseId
      },

      async list(options = {}) {
        let result = Array.from(data.values())

        if (options.type) {
          result = result.filter((t) => t.type === options.type)
        }

        if (options.where) {
          for (const [key, value] of Object.entries(options.where)) {
            result = result.filter((t) => {
              const d = t.data as Record<string, unknown>
              return d[key] === value
            })
          }
        }

        const orderDir = options.order === 'asc' ? 1 : -1
        if (options.orderBy) {
          result.sort((a, b) => {
            const aVal = (a.data as Record<string, unknown>)[options.orderBy!] ?? a[options.orderBy!]
            const bVal = (b.data as Record<string, unknown>)[options.orderBy!] ?? b[options.orderBy!]
            if (aVal < bVal) return -1 * orderDir
            if (aVal > bVal) return 1 * orderDir
            return 0
          })
        }

        if (options.offset) result = result.slice(options.offset)
        if (options.limit) result = result.slice(0, options.limit)

        return result.map((row) => ({
          url: row.url as string,
          type: row.type as string,
          id: row.id as string,
          data: row.data as Record<string, unknown>,
          content: row.content as string | undefined,
          '@context': row.context,
          at: new Date(row.at as string),
          by: row.by as string | undefined,
          in: row.in as string | undefined,
          version: row.version as number,
        })) as Thing[]
      },

      async get(url) {
        const row = data.get(url)
        if (!row) return null

        return {
          url: row.url as string,
          type: row.type as string,
          id: row.id as string,
          data: row.data as Record<string, unknown>,
          content: row.content as string | undefined,
          '@context': row.context,
          at: new Date(row.at as string),
          by: row.by as string | undefined,
          in: row.in as string | undefined,
          version: row.version as number,
        } as Thing
      },

      async getById(type, id) {
        return instance.get(buildUrl(type, id))
      },

      async create(options) {
        const id = options.id ?? generateId()
        const url = buildUrl(options.type, id)
        const now = new Date().toISOString()

        if (data.has(url)) {
          throw new Error(`Thing already exists: ${url}`)
        }

        const row = {
          url,
          type: options.type,
          id,
          data: options.data,
          content: options.content,
          context: options['@context'],
          at: now,
          by: options.by,
          in: options.in,
          version: 1,
        }

        data.set(url, row)

        return {
          url,
          type: options.type,
          id,
          data: options.data,
          content: options.content,
          '@context': options['@context'],
          at: new Date(now),
          by: options.by,
          in: options.in,
          version: 1,
        } as Thing
      },

      async update(url, options) {
        const existing = data.get(url)
        if (!existing) {
          throw new Error(`Thing not found: ${url}`)
        }

        if (options.version !== undefined && options.version !== existing.version) {
          throw new Error(`Version conflict`)
        }

        const now = new Date().toISOString()
        const merged = options.data
          ? { ...(existing.data as Record<string, unknown>), ...options.data }
          : existing.data

        existing.data = merged
        existing.at = now
        existing.by = options.by
        existing.in = options.in
        existing.version = (existing.version as number) + 1
        if (options.content !== undefined) {
          existing.content = options.content
        }

        return {
          url: existing.url as string,
          type: existing.type as string,
          id: existing.id as string,
          data: merged as Record<string, unknown>,
          content: existing.content as string | undefined,
          '@context': existing.context,
          at: new Date(now),
          by: options.by,
          in: options.in,
          version: existing.version as number,
        } as Thing
      },

      async upsert(options) {
        const id = options.id ?? generateId()
        const url = buildUrl(options.type, id)

        if (data.has(url)) {
          return instance.update(url, {
            data: options.data,
            content: options.content,
            by: options.by,
            in: options.in,
          })
        }

        return instance.create({ ...options, id })
      },

      async delete(url) {
        // Delete relationships
        for (const [key, rel] of rels) {
          if (rel.from === url || rel.to === url) {
            rels.delete(key)
          }
        }
        return data.delete(url)
      },

      async relate(options) {
        const id = `rel_${options.from}_${options.predicate}_${options.to}`
        const now = new Date().toISOString()

        rels.set(id, {
          id,
          predicate: options.predicate,
          reverse: options.reverse,
          from: options.from,
          to: options.to,
          data: options.data,
          at: now,
          by: options.by,
          in: options.in,
          do: options.do,
        })

        return {
          id,
          predicate: options.predicate,
          reverse: options.reverse,
          from: options.from,
          to: options.to,
          data: options.data,
          at: new Date(now),
          by: options.by,
          in: options.in,
          do: options.do,
        } as Relationship
      },

      async unrelate(from, predicate, to) {
        const id = `rel_${from}_${predicate}_${to}`
        return rels.delete(id)
      },

      async related(url, predicate) {
        const urls: string[] = []

        for (const rel of rels.values()) {
          if (rel.from === url && rel.predicate === predicate) {
            urls.push(rel.to as string)
          }
        }

        const result = []
        for (const u of [...new Set(urls)]) {
          const thing = await instance.get(u)
          if (thing) result.push(thing)
        }
        return result
      },

      async relatedBy(url, reverse) {
        const urls: string[] = []

        for (const rel of rels.values()) {
          if (rel.to === url && rel.reverse === reverse) {
            urls.push(rel.from as string)
          }
        }

        const result = []
        for (const u of [...new Set(urls)]) {
          const thing = await instance.get(u)
          if (thing) result.push(thing)
        }
        return result
      },

      async relationships(url, options = {}) {
        const result = []

        for (const rel of rels.values()) {
          if (rel.from !== url && rel.to !== url) continue
          if (options.predicate && rel.predicate !== options.predicate) continue
          if (options.reverse && rel.reverse !== options.reverse) continue

          result.push({
            id: rel.id as string,
            predicate: rel.predicate as string,
            reverse: rel.reverse as string | undefined,
            from: rel.from as string,
            to: rel.to as string,
            data: rel.data as Record<string, unknown> | undefined,
            at: new Date(rel.at as string),
            by: rel.by as string | undefined,
            in: rel.in as string | undefined,
            do: rel.do as string | undefined,
          } as Relationship)
        }

        if (options.offset) result.splice(0, options.offset)
        if (options.limit) result.splice(options.limit)

        return result
      },

      getDatabaseSize() {
        return 0
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

      const inst = instances.get(name)!

      return {
        ...inst,
        id,
        name,
      } as DurableObjectStub<MDXDatabaseRPC>
    },
  }
}
