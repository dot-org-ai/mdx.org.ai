/**
 * Vitest Setup for MDX Tests
 *
 * Provides global `db` and `ai` objects for tests.
 */

import { beforeEach, vi } from 'vitest'
import { MemoryDBClient } from 'mdxdb'
import type { Thing, DBClient, CreateOptions, QueryOptions, ThingSearchOptions } from 'mdxdb'

// Default namespace for tests
const DEFAULT_NS = 'test.example.com'

/**
 * Create a proxy-based database API for easy test usage
 *
 * This provides the `db.Type.method()` syntax used in MDX tests:
 * - db.Users.create(data)
 * - db.Users.create('id', data)
 * - db.Users.get('id')
 * - db.Users.list()
 * - etc.
 */
function createTestDatabase(client: DBClient<Record<string, unknown>>) {
  const handler: ProxyHandler<DBClient<Record<string, unknown>>> = {
    get(target, prop: string) {
      // Direct methods on db
      if (prop === 'get') {
        return async (urlOrId: string, options?: { create?: Record<string, unknown> }) => {
          // If it's a full URL
          if (urlOrId.startsWith('http')) {
            return target.get(urlOrId)
          }
          // If it's Type/id format
          if (urlOrId.includes('/')) {
            const [type, ...idParts] = urlOrId.split('/')
            const id = idParts.join('/')
            const url = `https://${DEFAULT_NS}/${type}/${id}`
            const result = await target.get(url)
            if (!result && options?.create) {
              return target.create({
                ns: DEFAULT_NS,
                type,
                id,
                data: options.create,
              })
            }
            return result
          }
          return null
        }
      }

      if (prop === 'create') {
        return async (url: string, data: Record<string, unknown>) => {
          return target.set(url, data)
        }
      }

      if (prop === 'generate') {
        return async (_path: string, _options: { prompt: string }) => {
          // Mock generation - return a generated document
          const [type, id] = _path.split('/')
          return target.create({
            ns: DEFAULT_NS,
            type: type || 'Generated',
            id: id || 'generated',
            data: { _generated: true, prompt: _options.prompt },
          })
        }
      }

      // Return type accessor proxy
      return createTypeProxy(target, prop)
    },
  }

  return new Proxy(client, handler)
}

/**
 * Create a proxy for a specific type
 *
 * Provides: db.Users.create(), db.Users.get(), etc.
 */
function createTypeProxy(client: DBClient<Record<string, unknown>>, type: string) {
  return {
    async create(
      idOrData: string | Record<string, unknown>,
      maybeData?: Record<string, unknown>
    ): Promise<Thing<Record<string, unknown>>> {
      const id = typeof idOrData === 'string' ? idOrData : undefined
      const data = typeof idOrData === 'string' ? (maybeData ?? {}) : idOrData
      return client.create({
        ns: DEFAULT_NS,
        type,
        id,
        data,
      })
    },

    async get(
      id: string,
      options?: { create?: Record<string, unknown>; generate?: string | { prompt: string; model?: string } }
    ): Promise<Thing<Record<string, unknown>> | null> {
      const url = `https://${DEFAULT_NS}/${type}/${id}`
      const result = await client.get(url)
      if (!result && options?.create) {
        return client.create({ ns: DEFAULT_NS, type, id, data: options.create })
      }
      if (!result && options?.generate) {
        const prompt = typeof options.generate === 'string' ? options.generate : options.generate.prompt
        return client.create({
          ns: DEFAULT_NS,
          type,
          id,
          data: { _generated: true, prompt },
        })
      }
      return result
    },

    async update(id: string, data: Record<string, unknown>): Promise<Thing<Record<string, unknown>>> {
      const url = `https://${DEFAULT_NS}/${type}/${id}`
      // Add small delay to ensure updatedAt is different from createdAt
      await new Promise((r) => setTimeout(r, 1))
      return client.update(url, { data })
    },

    async upsert(id: string, data: Record<string, unknown>): Promise<Thing<Record<string, unknown>>> {
      return client.upsert({ ns: DEFAULT_NS, type, id, data })
    },

    async delete(id: string): Promise<boolean> {
      const url = `https://${DEFAULT_NS}/${type}/${id}`
      return client.delete(url)
    },

    async list(options: Partial<QueryOptions> = {}): Promise<Thing<Record<string, unknown>>[]> {
      return client.list({ ...options, ns: DEFAULT_NS, type })
    },

    async find(options: { where?: Record<string, unknown>; limit?: number; offset?: number } = {}): Promise<
      Thing<Record<string, unknown>>[]
    > {
      return client.find({ ...options, ns: DEFAULT_NS, type })
    },

    async search(options: { query: string; semantic?: boolean; limit?: number }): Promise<
      Thing<Record<string, unknown>>[]
    > {
      return client.search({ ...options, ns: DEFAULT_NS, type })
    },

    async forEach(
      optionsOrCallback: Partial<QueryOptions> | ((thing: Thing<Record<string, unknown>>) => void | Promise<void>),
      maybeCallback?: (thing: Thing<Record<string, unknown>>) => void | Promise<void>
    ): Promise<void> {
      const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!
      return client.forEach({ ...options, ns: DEFAULT_NS, type }, callback)
    },
  }
}

/**
 * Mock AI tools for testing
 */
function createTestAI() {
  return {
    createDatabaseTools(db: ReturnType<typeof createTestDatabase>) {
      return [
        {
          name: 'mdxdb_list',
          description: 'List documents',
          handler: async (args: { type?: string; limit?: number }) => {
            const result = args.type
              ? await (db as any)[args.type].list({ limit: args.limit })
              : await (db as any).list?.() ?? []
            return { content: [{ type: 'text', text: JSON.stringify(result) }] }
          },
        },
        {
          name: 'mdxdb_search',
          description: 'Search documents',
          handler: async (args: { query: string; type?: string }) => {
            const client = (db as any).__client as DBClient<Record<string, unknown>>
            const result = await client.search({ query: args.query, type: args.type })
            return { content: [{ type: 'text', text: JSON.stringify(result) }] }
          },
        },
        {
          name: 'mdxdb_get',
          description: 'Get a document',
          handler: async (args: { id: string }) => {
            const result = await (db as any).get(args.id)
            if (!result) {
              return { isError: true, content: [{ type: 'text', text: `Document not found: ${args.id}` }] }
            }
            return { content: [{ type: 'text', text: JSON.stringify(result) }] }
          },
        },
        {
          name: 'mdxdb_set',
          description: 'Set a document',
          handler: async (args: { url: string; data: Record<string, unknown> }) => {
            const client = (db as any).__client as DBClient<Record<string, unknown>>
            await client.set(args.url, args.data)
            return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
          },
        },
        {
          name: 'mdxdb_delete',
          description: 'Delete a document',
          handler: async (args: { id: string }) => {
            const [type, ...idParts] = args.id.split('/')
            const id = idParts.join('/')
            const result = await (db as any)[type]?.delete(id) ?? false
            return { content: [{ type: 'text', text: JSON.stringify({ deleted: result }) }] }
          },
        },
      ]
    },
  }
}

// Global instances
let memoryClient: MemoryDBClient
let testDb: ReturnType<typeof createTestDatabase>
let testAi: ReturnType<typeof createTestAI>

// Reset database before each test
beforeEach(() => {
  memoryClient = new MemoryDBClient({ ns: DEFAULT_NS })
  testDb = createTestDatabase(memoryClient)
  // Attach the client for tools that need it
  ;(testDb as any).__client = memoryClient
  testAi = createTestAI()

  // Set globals
  ;(globalThis as any).db = testDb
  ;(globalThis as any).ai = testAi
})

// Export for manual usage
export { createTestDatabase, createTestAI, createTypeProxy }
