/**
 * DBClient Implementation
 *
 * Provides a graph database interface following ai-database conventions.
 * Includes MemoryDBClient for in-memory storage and adapters for existing backends.
 *
 * @packageDocumentation
 */

import type {
  DBClient,
  Thing,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  Relationship,
  Database,
} from './types.js'
import { resolveUrl, parseUrl } from './types.js'

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Generate a relationship ID
 */
function generateRelationshipId(from: string, type: string, to: string): string {
  const hash = simpleHash(`${from}:${type}:${to}`)
  return `rel_${hash}`
}

/**
 * Simple hash function
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Configuration for DBClient
 */
export interface DBClientConfig {
  /** Default namespace for operations */
  ns?: string
}

/**
 * In-memory implementation of DBClient
 *
 * Provides full graph database functionality with Things and Relationships
 * stored in memory. Useful for testing and development.
 *
 * @example
 * ```ts
 * const db = new MemoryDBClient()
 *
 * // Create a thing
 * const user = await db.create({
 *   ns: 'example.com',
 *   type: 'User',
 *   data: { name: 'Alice' }
 * })
 *
 * // Create a relationship
 * await db.relate({
 *   type: 'follows',
 *   from: user.url!,
 *   to: 'https://example.com/User/bob'
 * })
 *
 * // Get related things
 * const following = await db.related(user.url!, 'follows', 'from')
 * ```
 */
export class MemoryDBClient<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClient<TData>
{
  private things = new Map<string, Thing<TData>>()
  private relationshipMap = new Map<string, Relationship>()

  // Indexes for fast lookups
  private byNsType = new Map<string, Set<string>>() // "ns:type" -> urls
  private relFrom = new Map<string, Set<string>>()  // url -> relationship ids (outbound)
  private relTo = new Map<string, Set<string>>()    // url -> relationship ids (inbound)

  private readonly defaultNs?: string

  constructor(config: DBClientConfig = {}) {
    this.defaultNs = config.ns
  }

  /**
   * List all things with optional filtering
   */
  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    let results = Array.from(this.things.values())

    // Filter by namespace
    if (options.ns) {
      results = results.filter(t => t.ns === options.ns)
    }

    // Filter by type
    if (options.type) {
      results = results.filter(t => t.type === options.type)
    }

    // Filter by where conditions
    if (options.where) {
      results = results.filter(t => {
        for (const [key, value] of Object.entries(options.where!)) {
          if (t.data[key] !== value) return false
        }
        return true
      })
    }

    // Sort
    if (options.orderBy) {
      const field = options.orderBy
      const dir = options.order === 'desc' ? -1 : 1
      results.sort((a, b) => {
        const aVal = a.data[field] ?? a[field as keyof Thing<TData>]
        const bVal = b.data[field] ?? b[field as keyof Thing<TData>]
        if (aVal === undefined && bVal === undefined) return 0
        if (aVal === undefined) return dir
        if (bVal === undefined) return -dir
        if (aVal < bVal) return -dir
        if (aVal > bVal) return dir
        return 0
      })
    }

    // Pagination
    if (options.offset) {
      results = results.slice(options.offset)
    }
    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  /**
   * Find things matching query (alias for list with required options)
   */
  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    return this.list(options)
  }

  /**
   * Search things by query string
   */
  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    const query = options.query.toLowerCase()
    const fields = options.fields || ['content', 'title', 'name', 'description']

    let results = Array.from(this.things.values())

    // Filter by query
    results = results.filter(thing => {
      // Search in data fields
      for (const field of fields) {
        const value = thing.data[field]
        if (typeof value === 'string' && value.toLowerCase().includes(query)) {
          return true
        }
      }
      // Also search in id
      if (thing.id.toLowerCase().includes(query)) {
        return true
      }
      return false
    })

    // Apply other filters from QueryOptions
    if (options.ns) {
      results = results.filter(t => t.ns === options.ns)
    }
    if (options.type) {
      results = results.filter(t => t.type === options.type)
    }
    if (options.where) {
      results = results.filter(t => {
        for (const [key, value] of Object.entries(options.where!)) {
          if (t.data[key] !== value) return false
        }
        return true
      })
    }

    // Pagination
    if (options.offset) {
      results = results.slice(options.offset)
    }
    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  /**
   * Get a thing by URL
   */
  async get(url: string): Promise<Thing<TData> | null> {
    return this.things.get(url) ?? null
  }

  /**
   * Get a thing by ns/type/id
   */
  async getById(ns: string, type: string, id: string): Promise<Thing<TData> | null> {
    const url = `https://${ns}/${type}/${id}`
    return this.get(url)
  }

  /**
   * Set/replace data for a thing (creates if doesn't exist)
   */
  async set(url: string, data: TData): Promise<Thing<TData>> {
    const existing = this.things.get(url)
    const now = new Date()

    if (existing) {
      const updated: Thing<TData> = {
        ...existing,
        data,
        updatedAt: now,
      }
      this.things.set(url, updated)
      return updated
    }

    // Create new thing from URL
    const entityId = parseUrl(url)
    const thing: Thing<TData> = {
      ...entityId,
      url,
      createdAt: now,
      updatedAt: now,
      data,
    }

    this.things.set(url, thing)
    this.indexThing(thing)

    return thing
  }

  /**
   * Create a new thing
   */
  async create(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const id = options.id ?? generateId()
    const ns = options.ns ?? this.defaultNs
    if (!ns) throw new Error('Namespace is required')

    const url = options.url ?? `https://${ns}/${options.type}/${id}`

    // Check if already exists
    if (this.things.has(url)) {
      throw new Error(`Thing already exists: ${url}`)
    }

    const now = new Date()
    const thing: Thing<TData> = {
      ns,
      type: options.type,
      id,
      url,
      createdAt: now,
      updatedAt: now,
      data: options.data,
      '@context': options['@context'],
    }

    this.things.set(url, thing)
    this.indexThing(thing)

    return thing
  }

  /**
   * Update an existing thing (partial update)
   */
  async update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>> {
    const existing = this.things.get(url)
    if (!existing) {
      throw new Error(`Thing not found: ${url}`)
    }

    const updated: Thing<TData> = {
      ...existing,
      data: { ...existing.data, ...options.data } as TData,
      updatedAt: new Date(),
    }

    this.things.set(url, updated)
    return updated
  }

  /**
   * Create or update a thing
   */
  async upsert(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const id = options.id ?? generateId()
    const ns = options.ns ?? this.defaultNs
    if (!ns) throw new Error('Namespace is required')

    const url = options.url ?? `https://${ns}/${options.type}/${id}`
    const existing = this.things.get(url)

    if (existing) {
      return this.update(url, { data: options.data })
    }

    return this.create({ ...options, id, url })
  }

  /**
   * Delete a thing and its relationships
   */
  async delete(url: string): Promise<boolean> {
    const thing = this.things.get(url)
    if (!thing) return false

    // Remove from indexes
    this.unindexThing(thing)

    // Remove relationships
    const outbound = this.relFrom.get(url) ?? new Set()
    const inbound = this.relTo.get(url) ?? new Set()

    for (const relId of [...outbound, ...inbound]) {
      this.relationshipMap.delete(relId)
    }

    this.relFrom.delete(url)
    this.relTo.delete(url)

    // Remove thing
    this.things.delete(url)

    return true
  }

  /**
   * Iterate over things
   */
  async forEach(
    options: QueryOptions,
    callback: (thing: Thing<TData>) => void | Promise<void>
  ): Promise<void> {
    const things = await this.list(options)
    for (const thing of things) {
      await callback(thing)
    }
  }

  /**
   * Create a relationship between two things
   */
  async relate<T extends Record<string, unknown> = Record<string, unknown>>(
    options: RelateOptions<T>
  ): Promise<Relationship<T>> {
    const id = generateRelationshipId(options.from, options.type, options.to)

    const relationship: Relationship<T> = {
      id,
      type: options.type,
      from: options.from,
      to: options.to,
      createdAt: new Date(),
      data: options.data,
    }

    this.relationshipMap.set(id, relationship as Relationship)

    // Index relationship
    if (!this.relFrom.has(options.from)) {
      this.relFrom.set(options.from, new Set())
    }
    this.relFrom.get(options.from)!.add(id)

    if (!this.relTo.has(options.to)) {
      this.relTo.set(options.to, new Set())
    }
    this.relTo.get(options.to)!.add(id)

    return relationship
  }

  /**
   * Remove a relationship
   */
  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    const id = generateRelationshipId(from, type, to)
    const rel = this.relationshipMap.get(id)

    if (!rel) return false

    this.relationshipMap.delete(id)
    this.relFrom.get(from)?.delete(id)
    this.relTo.get(to)?.delete(id)

    return true
  }

  /**
   * Get things related to a thing
   */
  async related(
    url: string,
    relationshipType?: string,
    direction: 'from' | 'to' | 'both' = 'from'
  ): Promise<Thing<TData>[]> {
    const results: Thing<TData>[] = []
    const seen = new Set<string>()

    // Get outbound relationships (this thing is the source)
    if (direction === 'from' || direction === 'both') {
      const outbound = this.relFrom.get(url) ?? new Set()
      for (const relId of outbound) {
        const rel = this.relationshipMap.get(relId)
        if (!rel) continue
        if (relationshipType && rel.type !== relationshipType) continue
        if (seen.has(rel.to)) continue

        const thing = this.things.get(rel.to)
        if (thing) {
          results.push(thing)
          seen.add(rel.to)
        }
      }
    }

    // Get inbound relationships (this thing is the target)
    if (direction === 'to' || direction === 'both') {
      const inbound = this.relTo.get(url) ?? new Set()
      for (const relId of inbound) {
        const rel = this.relationshipMap.get(relId)
        if (!rel) continue
        if (relationshipType && rel.type !== relationshipType) continue
        if (seen.has(rel.from)) continue

        const thing = this.things.get(rel.from)
        if (thing) {
          results.push(thing)
          seen.add(rel.from)
        }
      }
    }

    return results
  }

  /**
   * Get relationships for a thing
   */
  async relationships(
    url: string,
    type?: string,
    direction: 'from' | 'to' | 'both' = 'both'
  ): Promise<Relationship[]> {
    const results: Relationship[] = []

    // Outbound
    if (direction === 'from' || direction === 'both') {
      const outbound = this.relFrom.get(url) ?? new Set()
      for (const relId of outbound) {
        const rel = this.relationshipMap.get(relId)
        if (!rel) continue
        if (type && rel.type !== type) continue
        results.push(rel)
      }
    }

    // Inbound
    if (direction === 'to' || direction === 'both') {
      const inbound = this.relTo.get(url) ?? new Set()
      for (const relId of inbound) {
        const rel = this.relationshipMap.get(relId)
        if (!rel) continue
        if (type && rel.type !== type) continue
        results.push(rel)
      }
    }

    return results
  }

  /**
   * Get things that reference this thing (inbound links / backlinks)
   */
  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    return this.related(url, relationshipType, 'to')
  }

  /**
   * Close the client (no-op for memory)
   */
  async close(): Promise<void> {
    // No-op
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.things.clear()
    this.relationshipMap.clear()
    this.byNsType.clear()
    this.relFrom.clear()
    this.relTo.clear()
  }

  /**
   * Get stats
   */
  stats(): { things: number; relationships: number } {
    return {
      things: this.things.size,
      relationships: this.relationshipMap.size,
    }
  }

  /**
   * Index a thing for fast lookups
   */
  private indexThing(thing: Thing<TData>): void {
    const key = `${thing.ns}:${thing.type}`
    if (!this.byNsType.has(key)) {
      this.byNsType.set(key, new Set())
    }
    this.byNsType.get(key)!.add(thing.url ?? resolveUrl(thing))
  }

  /**
   * Remove thing from indexes
   */
  private unindexThing(thing: Thing<TData>): void {
    const key = `${thing.ns}:${thing.type}`
    this.byNsType.get(key)?.delete(thing.url ?? resolveUrl(thing))
  }
}

/**
 * Create a DBClient from an existing Database implementation
 *
 * Wraps a simple document-based Database interface with the full
 * DBClient graph database interface. Relationships are stored in
 * a separate collection prefixed with "_rel:".
 *
 * @example
 * ```ts
 * import { createFsDatabase } from '@mdxdb/fs'
 * import { createDBClient } from 'mdxdb'
 *
 * const docDb = createFsDatabase({ root: './content' })
 * const db = createDBClient(docDb, { ns: 'example.com' })
 *
 * // Now use the full DBClient interface
 * const thing = await db.create({
 *   ns: 'example.com',
 *   type: 'Post',
 *   data: { title: 'Hello' }
 * })
 * ```
 */
export function createDBClient<TData extends Record<string, unknown> = Record<string, unknown>>(
  database: Database,
  config: DBClientConfig = {}
): DBClient<TData> {
  const defaultNs = config.ns

  // Helper to convert URL to document ID
  const urlToDocId = (url: string): string => {
    try {
      const entity = parseUrl(url)
      return `${entity.type}/${entity.id}`
    } catch {
      return url
    }
  }

  // Helper to convert document to Thing
  const docToThing = (id: string, doc: any): Thing<TData> => {
    const ns = doc.data?.$ns ?? defaultNs ?? 'default'
    const type = doc.type ?? doc.data?.$type ?? 'Document'
    const thingId = id.includes('/') ? id.split('/').slice(1).join('/') : id

    return {
      ns,
      type,
      id: thingId,
      url: `https://${ns}/${type}/${thingId}`,
      createdAt: doc.data?.createdAt ? new Date(doc.data.createdAt) : new Date(),
      updatedAt: doc.data?.updatedAt ? new Date(doc.data.updatedAt) : new Date(),
      data: doc.data as TData,
      '@context': doc.context,
    }
  }

  const client: DBClient<TData> = {
    async list(options = {}) {
      const result = await database.list({
        limit: options.limit,
        offset: options.offset,
        sortBy: options.orderBy,
        sortOrder: options.order,
        type: options.type,
      })

      return result.documents
        .filter(doc => !doc.id?.startsWith('_rel:'))
        .map(doc => docToThing(doc.id ?? '', doc))
    },

    async find(options) {
      return client.list(options)
    },

    async search(options) {
      const result = await database.search({
        query: options.query,
        limit: options.limit,
        offset: options.offset,
        fields: options.fields,
        type: options.type,
      })

      return result.documents
        .filter(doc => !doc.id?.startsWith('_rel:'))
        .map(doc => docToThing(doc.id ?? '', doc))
    },

    async get(url) {
      const docId = urlToDocId(url)
      const doc = await database.get(docId)
      if (!doc) return null
      return docToThing(docId, doc)
    },

    async getById(ns, type, id) {
      const url = `https://${ns}/${type}/${id}`
      return client.get(url)
    },

    async set(url, data) {
      const docId = urlToDocId(url)
      const entity = parseUrl(url)
      const now = new Date()

      await database.set(docId, {
        type: entity.type,
        data: {
          ...data,
          $ns: entity.ns,
          createdAt: data.createdAt ?? now.toISOString(),
          updatedAt: now.toISOString(),
        },
        content: '',
      })

      return {
        ...entity,
        url,
        createdAt: new Date(data.createdAt as string ?? now),
        updatedAt: now,
        data,
      }
    },

    async create(options) {
      const ns = options.ns ?? defaultNs
      if (!ns) throw new Error('Namespace is required')

      const id = options.id ?? generateId()
      const url = options.url ?? `https://${ns}/${options.type}/${id}`

      // Check if exists
      const existing = await database.get(`${options.type}/${id}`)
      if (existing) {
        throw new Error(`Thing already exists: ${url}`)
      }

      return client.set(url, options.data)
    },

    async update(url, options) {
      const existing = await client.get(url)
      if (!existing) {
        throw new Error(`Thing not found: ${url}`)
      }

      const merged = { ...existing.data, ...options.data } as TData
      return client.set(url, merged)
    },

    async upsert(options) {
      const ns = options.ns ?? defaultNs
      if (!ns) throw new Error('Namespace is required')

      const id = options.id ?? generateId()
      const url = options.url ?? `https://${ns}/${options.type}/${id}`

      const existing = await client.get(url)
      if (existing) {
        return client.update(url, { data: options.data })
      }

      return client.create({ ...options, id, url })
    },

    async delete(url) {
      const docId = urlToDocId(url)
      const result = await database.delete(docId)
      return result.deleted
    },

    async forEach(options, callback) {
      const things = await client.list(options)
      for (const thing of things) {
        await callback(thing)
      }
    },

    async relate<T extends Record<string, unknown> = Record<string, unknown>>(
      options: RelateOptions<T>
    ): Promise<Relationship<T>> {
      const id = generateRelationshipId(options.from, options.type, options.to)
      const now = new Date()

      const relationship: Relationship<T> = {
        id,
        type: options.type,
        from: options.from,
        to: options.to,
        createdAt: now,
        data: options.data,
      }

      // Store relationship as a special document
      await database.set(`_rel:${id}`, {
        type: '_relationship',
        data: {
          id,
          type: options.type,
          from: options.from,
          to: options.to,
          createdAt: now.toISOString(),
          ...(options.data ?? {}),
        },
        content: '',
      })

      return relationship
    },

    async unrelate(from, type, to) {
      const id = generateRelationshipId(from, type, to)
      const result = await database.delete(`_rel:${id}`)
      return result.deleted
    },

    async related(url, relationshipType, direction = 'from') {
      // Get all relationships
      const result = await database.list({ type: '_relationship' })
      const things: Thing<TData>[] = []
      const seen = new Set<string>()

      for (const doc of result.documents) {
        const rel = doc.data as { from?: string; to?: string; type?: string }
        if (relationshipType && rel.type !== relationshipType) continue

        let targetUrl: string | undefined

        if ((direction === 'from' || direction === 'both') && rel.from === url) {
          targetUrl = rel.to
        }
        if ((direction === 'to' || direction === 'both') && rel.to === url) {
          targetUrl = rel.from
        }

        if (targetUrl && !seen.has(targetUrl)) {
          const thing = await client.get(targetUrl)
          if (thing) {
            things.push(thing)
            seen.add(targetUrl)
          }
        }
      }

      return things
    },

    async relationships(url, type, direction = 'both') {
      const result = await database.list({ type: '_relationship' })
      const relationships: Relationship[] = []

      for (const doc of result.documents) {
        // Doc data contains relationship properties stored as flat object
        const data = doc.data as Record<string, unknown>
        const relId = data.id as string
        const relType = data.type as string
        const relFrom = data.from as string
        const relTo = data.to as string
        const relCreatedAt = data.createdAt as string

        if (!relId || !relType || !relFrom || !relTo) continue
        if (type && relType !== type) continue

        const isFrom = relFrom === url
        const isTo = relTo === url

        if (
          (direction === 'from' && isFrom) ||
          (direction === 'to' && isTo) ||
          (direction === 'both' && (isFrom || isTo))
        ) {
          relationships.push({
            id: relId,
            type: relType,
            from: relFrom,
            to: relTo,
            createdAt: new Date(relCreatedAt),
            data: data.data as Record<string, unknown> | undefined,
          })
        }
      }

      return relationships
    },

    async references(url, relationshipType) {
      return client.related(url, relationshipType, 'to')
    },

    async close() {
      await database.close?.()
    },
  }

  return client
}
