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

import type {
  MDXDatabaseRPC,
  MDXDatabaseNamespace,
  MDXDatabaseStub,
  Thing,
  Relationship,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
} from './types.js'

// Miniflare types
interface Miniflare {
  getDurableObjectNamespace(name: string): Promise<MDXDatabaseNamespace>
  dispose(): Promise<void>
}

// Cache miniflare instance
let miniflareInstance: Miniflare | null = null
let miniflareBinding: MDXDatabaseNamespace | null = null

/**
 * Create a miniflare-based Durable Object binding
 */
export async function createMiniflareBinding(
  persistPath?: string
): Promise<MDXDatabaseNamespace> {
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
export function createInMemoryBinding(): MDXDatabaseNamespace {
  const instances = new Map<string, MDXDatabaseRPC>()

  const createInMemoryInstance = (name: string): MDXDatabaseRPC => {
    const data = new Map<string, Record<string, unknown>>()
    const rels = new Map<string, Record<string, unknown>>()

    const baseId = name.includes('://') ? name : `https://${name}`

    const generateId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`

    const buildUrl = (type: string, id: string) => `${baseId}/${type}/${id}`

    const instance: MDXDatabaseRPC = {
      $init(requested: string): string {
        const wanted = requested.includes('://') ? requested : `https://${requested}`
        const normalized = wanted.endsWith('/') ? wanted.slice(0, -1) : wanted
        if (normalized !== baseId) {
          throw new Error(`MDXDatabase $id mismatch: this object is ${baseId}, got ${normalized}`)
        }
        return baseId
      },

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
          const key = options.orderBy
          // SQLite compares mixed types by class (NULL < numbers < text); the in-memory shim
          // only needs a stable, sensible order for the number/string values tests use.
          const valueOf = (row: Record<string, unknown>): number | string => {
            const v = (row.data as Record<string, unknown>)[key] ?? row[key]
            return typeof v === 'number' ? v : v == null ? '' : String(v)
          }
          result.sort((a, b) => {
            const aVal = valueOf(a)
            const bVal = valueOf(b)
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

      async create<TData = Record<string, unknown>>(
        options: CreateOptions<TData>
      ): Promise<Thing<TData>> {
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
        } as Thing<TData>
      },

      async update<TData = Record<string, unknown>>(
        url: string,
        options: UpdateOptions<TData>
      ): Promise<Thing<TData>> {
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
        } as Thing<TData>
      },

      async upsert<TData = Record<string, unknown>>(
        options: CreateOptions<TData>
      ): Promise<Thing<TData>> {
        const id = options.id ?? generateId()
        const url = buildUrl(options.type, id)

        if (data.has(url)) {
          return instance.update<TData>(url, {
            data: options.data,
            content: options.content,
            by: options.by,
            in: options.in,
          })
        }

        return instance.create<TData>({ ...options, id })
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

      async relate<TData = Record<string, unknown>>(
        options: RelateOptions<TData>
      ): Promise<Relationship<TData>> {
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
        } as Relationship<TData>
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

      // Code execution needs @mdxe/isolate plus a Worker loader binding, neither of which
      // the in-memory shim has. Fail loudly instead of pretending to run code.
      async compile(url) {
        throw new Error(`compile(${url}) is not supported by the in-memory binding`)
      },

      async call(url, options) {
        throw new Error(`call(${url}, ${options.fn}) is not supported by the in-memory binding`)
      },

      async meta(url) {
        if (!data.has(url)) {
          throw new Error(`Thing not found: ${url}`)
        }
        return { functions: [], hasDefault: false, exports: [] }
      },

      async render(url) {
        throw new Error(`render(${url}) is not supported by the in-memory binding`)
      },

      getDatabaseSize() {
        return 0
      },
    }

    return instance
  }

  // Minimal DurableObjectId: identity is the string form, `name` is set for
  // name-derived ids so the DO can derive its $id the same way it does in Workers.
  const makeId = (id: string, name?: string): DurableObjectId => ({
    toString: () => id,
    equals: (other: DurableObjectId) => other.toString() === id,
    name,
  })

  const getStub = (id: DurableObjectId): MDXDatabaseStub => {
    const name = id.name ?? id.toString()

    let inst = instances.get(name)
    if (!inst) {
      inst = createInMemoryInstance(name)
      instances.set(name, inst)
    }

    // The in-memory instance implements the structural MDXDatabaseRPC contract but is not
    // a real RPC stub (no Rpc brand, no Disposable, no pipelining thenables), so the cast
    // has to go through `unknown`.
    return { ...inst, id, name } as unknown as MDXDatabaseStub
  }

  const namespace: MDXDatabaseNamespace = {
    idFromName(name: string): DurableObjectId {
      return makeId(name, name)
    },

    idFromString(id: string): DurableObjectId {
      return makeId(id)
    },

    newUniqueId(): DurableObjectId {
      return makeId(`${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`)
    },

    get(id: DurableObjectId): MDXDatabaseStub {
      return getStub(id)
    },

    getByName(name: string): MDXDatabaseStub {
      return getStub(makeId(name, name))
    },

    // Jurisdictions are a placement concern; the in-memory binding has a single location.
    jurisdiction(): MDXDatabaseNamespace {
      return namespace
    },
  }

  return namespace
}
