/**
 * SQLite adapter for Payload CMS using mdxdb Durable Objects
 *
 * Maps Payload collections to mdxdb Things and Relationships.
 * Runs on Cloudflare Workers with Durable Objects for SQLite storage.
 *
 * @example
 * ```ts
 * import { sqliteAdapter } from '@mdxdb/payload/sqlite'
 *
 * export default buildConfig({
 *   db: sqliteAdapter({
 *     binding: env.MDXDB,
 *     namespace: 'example.com',
 *   }),
 *   collections: [Posts, Authors],
 * })
 * ```
 *
 * @packageDocumentation
 */

import type {
  SQLiteAdapterConfig,
  MDXDBClient,
  Thing,
  Relationship,
  QueryOptions,
  SearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  DurableObjectNamespace,
  DurableObjectStub,
} from './types.js'

// =============================================================================
// SQLite Client (Durable Objects RPC)
// =============================================================================

/**
 * RPC methods available on the MDX Durable Object stub
 */
interface MDXDurableObjectRPC {
  list(options: QueryOptions): Promise<Thing[]>
  get(url: string): Promise<Thing | null>
  getById(type: string, id: string): Promise<Thing | null>
  create<T>(options: CreateOptions<T>): Promise<Thing<T>>
  update<T>(url: string, options: UpdateOptions<T>): Promise<Thing<T>>
  upsert<T>(options: CreateOptions<T>): Promise<Thing<T>>
  delete(url: string): Promise<boolean>
  search(options: SearchOptions): Promise<Thing[]>
  relate<T>(options: RelateOptions<T>): Promise<Relationship<T>>
  unrelate(from: string, type: string, to: string): Promise<boolean>
  related(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Promise<Thing[]>
  relationships(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Promise<Relationship[]>
}

/**
 * Client for mdxdb SQLite Durable Object
 * Uses Workers RPC to call methods on the DO stub
 */
export class SQLiteClient implements MDXDBClient {
  private stub: MDXDurableObjectRPC
  private namespace: string

  constructor(binding: DurableObjectNamespace, namespace: string) {
    const id = binding.idFromName(namespace)
    this.stub = binding.get(id) as unknown as MDXDurableObjectRPC
    this.namespace = namespace
  }

  async list(options: QueryOptions = {}): Promise<Thing[]> {
    return this.stub.list({ ...options, ns: options.ns ?? this.namespace })
  }

  async get(url: string): Promise<Thing | null> {
    return this.stub.get(url)
  }

  async getById(type: string, id: string): Promise<Thing | null> {
    return this.stub.getById(type, id)
  }

  async create<T = Record<string, unknown>>(options: CreateOptions<T>): Promise<Thing<T>> {
    return this.stub.create({
      ...options,
      ns: options.ns ?? this.namespace,
    })
  }

  async update<T = Record<string, unknown>>(url: string, options: UpdateOptions<T>): Promise<Thing<T>> {
    return this.stub.update(url, options)
  }

  async upsert<T = Record<string, unknown>>(options: CreateOptions<T>): Promise<Thing<T>> {
    return this.stub.upsert({
      ...options,
      ns: options.ns ?? this.namespace,
    })
  }

  async delete(url: string): Promise<boolean> {
    return this.stub.delete(url)
  }

  async search(options: SearchOptions): Promise<Thing[]> {
    return this.stub.search(options)
  }

  async relate<T = Record<string, unknown>>(options: RelateOptions<T>): Promise<Relationship<T>> {
    return this.stub.relate(options)
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    return this.stub.unrelate(from, type, to)
  }

  async related(url: string, type?: string, direction: 'from' | 'to' | 'both' = 'from'): Promise<Thing[]> {
    return this.stub.related(url, type, direction)
  }

  async relationships(url: string, type?: string, direction: 'from' | 'to' | 'both' = 'both'): Promise<Relationship[]> {
    return this.stub.relationships(url, type, direction)
  }
}

// =============================================================================
// URL Utilities
// =============================================================================

function buildUrl(ns: string, type: string, id: string): string {
  return `https://${ns}/${type}/${id}`
}

function parseUrl(url: string): { ns: string; type: string; id: string } {
  const parsed = new URL(url)
  const parts = parsed.pathname.split('/').filter(Boolean)
  return {
    ns: parsed.host,
    type: parts[0] ?? '',
    id: parts.slice(1).join('/'),
  }
}

// =============================================================================
// Payload Adapter Implementation
// =============================================================================

/**
 * Create a SQLite adapter for Payload CMS
 *
 * @param config - Adapter configuration
 * @returns Payload database adapter
 */
export function sqliteAdapter(config: SQLiteAdapterConfig) {
  const {
    binding,
    namespace = 'default',
    idType = 'uuid',
    debug = false,
  } = config

  // Create the mdxdb client
  const client = new SQLiteClient(binding, namespace)

  return {
    name: '@mdxdb/payload/sqlite',
    defaultIDType: idType,

    // The mdxdb client for direct access
    client,
    namespace,

    /**
     * Get the mdxdb type for a collection
     */
    getType(collectionSlug: string): string {
      // Convert slug to PascalCase type name
      return collectionSlug
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
    },

    /**
     * Connect to the database
     */
    async connect(): Promise<void> {
      if (debug) console.log('[mdxdb/sqlite] Connected to Durable Object')
    },

    /**
     * Initialize schema (handled by Durable Object)
     */
    async init(): Promise<void> {
      if (debug) console.log('[mdxdb/sqlite] Schema initialized by Durable Object')
    },

    // =========================================================================
    // CRUD Operations - Map Payload to mdxdb Things
    // =========================================================================

    /**
     * Create a document
     */
    async create({ collection, data, req }: {
      collection: { slug: string }
      data: Record<string, unknown>
      req?: unknown
    }): Promise<Record<string, unknown>> {
      const type = this.getType(collection.slug)
      const id = (data.id as string) ?? generateId()

      // Extract relationship fields before creating
      const { relationshipFields, cleanData } = extractRelationships(data, collection.slug)

      // Create the Thing
      const thing = await client.create({
        ns: namespace,
        type,
        id,
        data: cleanData,
      })

      // Create relationships for relationship fields
      for (const rel of relationshipFields) {
        const toIds = Array.isArray(rel.value) ? rel.value : [rel.value]
        for (const toId of toIds) {
          if (toId) {
            await client.relate({
              from: thing.url,
              to: buildUrl(namespace, rel.toType, String(toId)),
              type: rel.field,
            })
          }
        }
      }

      return thingToDocument(thing)
    },

    /**
     * Find documents
     */
    async find({ collection, where, sort, limit, page }: {
      collection: { slug: string }
      where?: Record<string, unknown>
      sort?: string
      limit?: number
      page?: number
    }): Promise<{ docs: Record<string, unknown>[]; totalDocs: number; totalPages: number; page: number }> {
      const type = this.getType(collection.slug)

      // Convert Payload where to mdxdb query
      const queryOptions: QueryOptions = {
        ns: namespace,
        type,
        where: where ? convertPayloadWhere(where) : undefined,
        limit,
        offset: page && limit ? (page - 1) * limit : undefined,
      }

      // Handle sort
      if (sort) {
        const isDesc = sort.startsWith('-')
        queryOptions.orderBy = isDesc ? sort.slice(1) : sort
        queryOptions.order = isDesc ? 'desc' : 'asc'
      }

      const things = await client.list(queryOptions)
      const docs = await Promise.all(things.map(t => populateRelationships(t, client, namespace)))

      // Get total count (TODO: optimize with count query)
      const allThings = await client.list({ ns: namespace, type })
      const totalDocs = allThings.length
      const totalPages = limit ? Math.ceil(totalDocs / limit) : 1

      return {
        docs,
        totalDocs,
        totalPages,
        page: page ?? 1,
      }
    },

    /**
     * Find a single document by ID
     */
    async findByID({ collection, id }: {
      collection: { slug: string }
      id: string | number
    }): Promise<Record<string, unknown> | null> {
      const type = this.getType(collection.slug)
      const url = buildUrl(namespace, type, String(id))
      const thing = await client.get(url)

      if (!thing) return null

      return populateRelationships(thing, client, namespace)
    },

    /**
     * Find a single document by query
     */
    async findOne({ collection, where }: {
      collection: { slug: string }
      where: Record<string, unknown>
    }): Promise<Record<string, unknown> | null> {
      const result = await this.find({ collection, where, limit: 1 })
      return result.docs[0] ?? null
    },

    /**
     * Update a document
     */
    async update({ collection, id, data }: {
      collection: { slug: string }
      id: string | number
      data: Record<string, unknown>
    }): Promise<Record<string, unknown>> {
      const type = this.getType(collection.slug)
      const url = buildUrl(namespace, type, String(id))

      // Extract relationship fields
      const { relationshipFields, cleanData } = extractRelationships(data, collection.slug)

      // Update the Thing
      const thing = await client.update(url, { data: cleanData })

      // Update relationships - delete old ones first, then create new
      for (const rel of relationshipFields) {
        // Get existing relationships of this type
        const existing = await client.relationships(url, rel.field, 'from')
        for (const existingRel of existing) {
          await client.unrelate(url, rel.field, existingRel.to)
        }

        // Create new relationships
        const toIds = Array.isArray(rel.value) ? rel.value : [rel.value]
        for (const toId of toIds) {
          if (toId) {
            await client.relate({
              from: url,
              to: buildUrl(namespace, rel.toType, String(toId)),
              type: rel.field,
            })
          }
        }
      }

      return thingToDocument(thing)
    },

    /**
     * Delete a document
     */
    async delete({ collection, id }: {
      collection: { slug: string }
      id: string | number
    }): Promise<Record<string, unknown>> {
      const type = this.getType(collection.slug)
      const url = buildUrl(namespace, type, String(id))

      const thing = await client.get(url)
      if (!thing) {
        throw new Error(`Document not found: ${url}`)
      }

      // Delete relationships first
      const relationships = await client.relationships(url)
      for (const rel of relationships) {
        await client.unrelate(rel.from, rel.type, rel.to)
      }

      await client.delete(url)

      return thingToDocument(thing)
    },

    /**
     * Delete many documents
     */
    async deleteMany({ collection, where }: {
      collection: { slug: string }
      where: Record<string, unknown>
    }): Promise<{ deletedCount: number }> {
      const result = await this.find({ collection, where })
      let deletedCount = 0

      for (const doc of result.docs) {
        await this.delete({ collection, id: doc.id as string })
        deletedCount++
      }

      return { deletedCount }
    },

    // =========================================================================
    // Query Operations
    // =========================================================================

    /**
     * Count documents
     */
    async count({ collection, where }: {
      collection: { slug: string }
      where?: Record<string, unknown>
    }): Promise<{ totalDocs: number }> {
      const type = this.getType(collection.slug)
      const things = await client.list({
        ns: namespace,
        type,
        where: where ? convertPayloadWhere(where) : undefined,
      })
      return { totalDocs: things.length }
    },

    // =========================================================================
    // Transaction Support (Durable Objects have built-in transactions)
    // =========================================================================

    async beginTransaction(): Promise<void> {
      // Durable Objects handle transactions automatically
    },

    async commitTransaction(): Promise<void> {
      // Durable Objects handle transactions automatically
    },

    async rollbackTransaction(): Promise<void> {
      // Durable Objects handle transactions automatically
    },

    // =========================================================================
    // Migration Support
    // =========================================================================

    async migrate(): Promise<void> {
      // Schema is managed by mdxdb Durable Object
      if (debug) console.log('[mdxdb/sqlite] Migration handled by Durable Object')
    },

    // =========================================================================
    // Globals Support
    // =========================================================================

    async findGlobal({ slug }: { slug: string }): Promise<Record<string, unknown> | null> {
      const url = buildUrl(namespace, 'Global', slug)
      const thing = await client.get(url)
      return thing ? thingToDocument(thing) : null
    },

    async updateGlobal({ slug, data }: {
      slug: string
      data: Record<string, unknown>
    }): Promise<Record<string, unknown>> {
      const url = buildUrl(namespace, 'Global', slug)
      const existing = await client.get(url)

      if (existing) {
        const thing = await client.update(url, { data })
        return thingToDocument(thing)
      } else {
        const thing = await client.create({
          ns: namespace,
          type: 'Global',
          id: slug,
          data,
        })
        return thingToDocument(thing)
      }
    },

    // =========================================================================
    // Versions Support (for drafts)
    // =========================================================================

    async findVersions({ collection, where, sort, limit, page }: {
      collection: { slug: string }
      where?: Record<string, unknown>
      sort?: string
      limit?: number
      page?: number
    }): Promise<{ docs: Record<string, unknown>[]; totalDocs: number }> {
      // Versions are stored as separate Things with type suffix
      const type = `${this.getType(collection.slug)}Version`
      const things = await client.list({
        ns: namespace,
        type,
        where: where ? convertPayloadWhere(where) : undefined,
        limit,
        offset: page && limit ? (page - 1) * limit : undefined,
      })

      return {
        docs: things.map(thingToDocument),
        totalDocs: things.length,
      }
    },

    async findVersionByID({ collection, id }: {
      collection: { slug: string }
      id: string
    }): Promise<Record<string, unknown> | null> {
      const type = `${this.getType(collection.slug)}Version`
      const url = buildUrl(namespace, type, id)
      const thing = await client.get(url)
      return thing ? thingToDocument(thing) : null
    },

    async createVersion({ collection, parent, data }: {
      collection: { slug: string }
      parent: string
      data: Record<string, unknown>
    }): Promise<Record<string, unknown>> {
      const type = `${this.getType(collection.slug)}Version`
      const id = generateId()

      const thing = await client.create({
        ns: namespace,
        type,
        id,
        data: { ...data, parent },
      })

      // Create relationship to parent
      await client.relate({
        from: thing.url,
        to: buildUrl(namespace, this.getType(collection.slug), parent),
        type: 'versionOf',
      })

      return thingToDocument(thing)
    },

    async deleteVersions({ collection, id }: {
      collection: { slug: string }
      id: string
    }): Promise<void> {
      const type = `${this.getType(collection.slug)}Version`
      const parentUrl = buildUrl(namespace, this.getType(collection.slug), id)

      // Find all versions related to this document
      const versions = await client.related(parentUrl, 'versionOf', 'to')
      for (const version of versions) {
        await client.delete(version.url)
      }
    },
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Convert a Thing to a Payload document
 */
function thingToDocument(thing: Thing): Record<string, unknown> {
  return {
    id: thing.id,
    ...thing.data,
    createdAt: thing.createdAt.toISOString(),
    updatedAt: thing.updatedAt.toISOString(),
  }
}

/**
 * Extract relationship fields from document data
 */
function extractRelationships(
  data: Record<string, unknown>,
  collectionSlug: string
): {
  relationshipFields: Array<{ field: string; value: unknown; toType: string }>
  cleanData: Record<string, unknown>
} {
  const relationshipFields: Array<{ field: string; value: unknown; toType: string }> = []
  const cleanData: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    // Check if this looks like a relationship field
    // In a real implementation, this would use Payload's collection config
    if (isRelationshipValue(value)) {
      // Assume the relationship points to a collection with the same name as the field
      // This is a simplification - real implementation should use field config
      const toType = key.charAt(0).toUpperCase() + key.slice(1).replace(/s$/, '')
      relationshipFields.push({ field: key, value, toType })
    } else {
      cleanData[key] = value
    }
  }

  return { relationshipFields, cleanData }
}

/**
 * Check if a value looks like a relationship value
 */
function isRelationshipValue(value: unknown): boolean {
  if (!value) return false

  // Array of IDs
  if (Array.isArray(value)) {
    return value.every(v => typeof v === 'string' || typeof v === 'number')
  }

  // Single ID reference
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    // Check if it has just an 'id' property (populated relationship)
    return 'id' in obj || 'value' in obj
  }

  return false
}

/**
 * Populate relationships on a Thing to create a full document
 */
async function populateRelationships(
  thing: Thing,
  client: SQLiteClient,
  namespace: string
): Promise<Record<string, unknown>> {
  const doc = thingToDocument(thing)

  // Get outgoing relationships
  const relationships = await client.relationships(thing.url, undefined, 'from')

  // Group by type
  const byType: Record<string, Relationship[]> = {}
  for (const rel of relationships) {
    if (!byType[rel.type]) byType[rel.type] = []
    byType[rel.type]!.push(rel)
  }

  // Populate each relationship type
  for (const [type, rels] of Object.entries(byType)) {
    if (rels.length === 1) {
      // Single relationship - populate as object
      const relatedThing = await client.get(rels[0]!.to)
      if (relatedThing) {
        doc[type] = thingToDocument(relatedThing)
      }
    } else {
      // Multiple relationships - populate as array
      const relatedThings = await Promise.all(
        rels.map(r => client.get(r.to))
      )
      doc[type] = relatedThings.filter(Boolean).map(t => thingToDocument(t!))
    }
  }

  return doc
}

/**
 * Convert Payload where clause to mdxdb query
 */
function convertPayloadWhere(where: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(where)) {
    if (key === 'and' || key === 'or') {
      // TODO: Handle compound queries
      continue
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>
      // Handle operators
      if ('equals' in obj) {
        result[key] = obj.equals
      } else if ('in' in obj) {
        // TODO: Handle 'in' operator
        result[key] = obj.in
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }

  return result
}
