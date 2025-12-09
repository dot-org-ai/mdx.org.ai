/**
 * @mdxdb/mongo - MongoDB adapter for mdxdb
 *
 * Uses MongoDB driver for both local and Atlas:
 * - Local: Connect to MongoDB running on localhost
 * - Atlas: Connect to MongoDB Atlas (vector search enabled)
 * - Works in Node.js and Bun
 *
 * Optimized for document storage with:
 * - Things: Graph nodes with flexible schema
 * - Relationships: Graph edges with efficient indexing
 * - Events: Immutable event log (append-only)
 * - Actions: Pending/active work tracking
 * - Artifacts: Cached compiled content
 * - Search: Full-text search with MongoDB Atlas Vector Search
 *
 * @packageDocumentation
 */

import type {
  DBClientExtended,
  Thing,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  Relationship,
  Event,
  Action,
  Artifact,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  ArtifactType,
  ActionStatus,
} from 'ai-database'

export const name = '@mdxdb/mongo'

// =============================================================================
// MongoDB Client Types
// =============================================================================

/**
 * MongoDB client interface for database operations
 */
export interface MongoClient {
  /** Insert one document */
  insertOne(collection: string, doc: Record<string, unknown>): Promise<{ insertedId: unknown }>
  /** Find documents */
  find<T = unknown>(
    collection: string,
    filter: Record<string, unknown>,
    options?: { sort?: Record<string, unknown>; limit?: number; skip?: number }
  ): Promise<T[]>
  /** Find one document */
  findOne<T = unknown>(collection: string, filter: Record<string, unknown>): Promise<T | null>
  /** Update one document */
  updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ modifiedCount: number }>
  /** Delete one document */
  deleteOne(collection: string, filter: Record<string, unknown>): Promise<{ deletedCount: number }>
  /** Create index */
  createIndex(collection: string, keys: Record<string, 1 | -1 | string>, options?: Record<string, unknown>): Promise<void>
  /** Vector search (Atlas only) */
  vectorSearch?<T = unknown>(
    collection: string,
    pipeline: Record<string, unknown>[]
  ): Promise<T[]>
  /** Text search */
  textSearch?<T = unknown>(
    collection: string,
    query: string,
    options?: { limit?: number }
  ): Promise<T[]>
  /** Close connection */
  close(): Promise<void>
}

// =============================================================================
// Native MongoDB Driver Client
// =============================================================================

import { MongoClient as NativeMongoClient, type Document, ObjectId } from 'mongodb'

/**
 * Configuration for MongoDB database
 */
export interface MongoConfig {
  /** MongoDB connection string (default: mongodb://localhost:27017) */
  url?: string
  /** Database name (default: mdxdb) */
  database?: string
  /** Custom client (for testing or advanced use) */
  client?: MongoClient
}

/**
 * Create a MongoDB client using the native driver
 */
export async function createNativeMongoClient(config: MongoConfig): Promise<MongoClient> {
  const url = config.url ?? 'mongodb://localhost:27017'
  const dbName = config.database ?? 'mdxdb'

  const nativeClient = new NativeMongoClient(url)
  await nativeClient.connect()
  const db = nativeClient.db(dbName)

  return {
    async insertOne(collection: string, doc: Record<string, unknown>) {
      const coll = db.collection(collection)
      const result = await coll.insertOne(doc as Document)
      return { insertedId: result.insertedId }
    },

    async find<T = unknown>(
      collection: string,
      filter: Record<string, unknown>,
      options?: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number }
    ): Promise<T[]> {
      const coll = db.collection(collection)
      let cursor = coll.find(filter as Document)
      if (options?.sort) cursor = cursor.sort(options.sort)
      if (options?.limit) cursor = cursor.limit(options.limit)
      if (options?.skip) cursor = cursor.skip(options.skip)
      return (await cursor.toArray()) as T[]
    },

    async findOne<T = unknown>(collection: string, filter: Record<string, unknown>): Promise<T | null> {
      const coll = db.collection(collection)
      return (await coll.findOne(filter as Document)) as T | null
    },

    async updateOne(
      collection: string,
      filter: Record<string, unknown>,
      update: Record<string, unknown>
    ) {
      const coll = db.collection(collection)
      const result = await coll.updateOne(filter as Document, update as Document)
      return { modifiedCount: result.modifiedCount }
    },

    async deleteOne(collection: string, filter: Record<string, unknown>) {
      const coll = db.collection(collection)
      const result = await coll.deleteOne(filter as Document)
      return { deletedCount: result.deletedCount }
    },

    async createIndex(collection: string, keys: Record<string, 1 | -1 | string>, options?: Record<string, unknown>) {
      const coll = db.collection(collection)
      await coll.createIndex(keys as Document, options)
    },

    async vectorSearch<T = unknown>(
      collection: string,
      pipeline: Record<string, unknown>[]
    ): Promise<T[]> {
      const coll = db.collection(collection)
      return (await coll.aggregate(pipeline as Document[]).toArray()) as T[]
    },

    async textSearch<T = unknown>(
      collection: string,
      query: string,
      options?: { limit?: number }
    ): Promise<T[]> {
      const coll = db.collection(collection)
      const cursor = coll.find({ $text: { $search: query } } as Document)
      if (options?.limit) cursor.limit(options.limit)
      return (await cursor.toArray()) as T[]
    },

    async close() {
      await nativeClient.close()
    },
  }
}

// =============================================================================
// Document Types
// =============================================================================

interface ThingDoc extends Record<string, unknown> {
  _id?: ObjectId
  url: string
  ns: string
  type: string
  id: string
  data: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  context?: string | Record<string, unknown>
}

interface RelationshipDoc extends Record<string, unknown> {
  _id?: ObjectId
  relId: string
  type: string
  from: string
  to: string
  createdAt: Date
  data?: Record<string, unknown>
}

interface EventDoc extends Record<string, unknown> {
  _id?: ObjectId
  eventId: string
  type: string
  timestamp: Date
  source: string
  data: Record<string, unknown>
  correlationId?: string
  causationId?: string
}

interface ActionDoc extends Record<string, unknown> {
  _id?: ObjectId
  actionId: string
  actor: string
  object: string
  action: string
  status: ActionStatus
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: unknown
  error?: string
  metadata?: Record<string, unknown>
}

interface ArtifactDoc extends Record<string, unknown> {
  _id?: ObjectId
  key: string
  type: string
  source: string
  sourceHash: string
  createdAt: Date
  expiresAt?: Date
  content: string
  size: number
  metadata?: Record<string, unknown>
}

interface SearchDoc extends Record<string, unknown> {
  _id?: ObjectId
  url: string
  ns: string
  type: string
  title: string
  description: string
  content: string
  keywords: string[]
  embedding?: number[]
  model?: string
  metadata?: Record<string, unknown>
}

// =============================================================================
// Utilities
// =============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function generateRelationshipId(from: string, type: string, to: string): string {
  let hash = 0
  const str = `${from}:${type}:${to}`
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `rel_${Math.abs(hash).toString(36)}`
}

function buildUrl(ns: string, type: string, id: string): string {
  return `https://${ns}/${type}/${id}`
}

function parseThingUrl(url: string): { ns: string; type: string; id: string } {
  const parsed = new URL(url)
  const parts = parsed.pathname.split('/').filter(Boolean)

  if (parts.length >= 2) {
    return {
      ns: parsed.host,
      type: parts[0]!,
      id: parts.slice(1).join('/'),
    }
  }

  throw new Error(`Invalid thing URL: ${url}`)
}

// =============================================================================
// Database Implementation
// =============================================================================

/**
 * MongoDB database with graph and event sourcing support
 * Implements DBClientExtended for Events, Actions, and Artifacts
 *
 * @example
 * ```ts
 * // Connect to local MongoDB (default localhost:27017)
 * const localDb = await createMongoDatabase()
 *
 * // Connect to MongoDB Atlas
 * const atlasDb = await createMongoDatabase({
 *   url: 'mongodb+srv://user:pass@cluster.mongodb.net',
 *   database: 'mydb',
 * })
 * ```
 */
export class MongoDatabase<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClientExtended<TData>
{
  private client: MongoClient

  constructor(client: MongoClient) {
    this.client = client
  }

  /**
   * Initialize database indices
   */
  async init(): Promise<void> {
    // Things indices
    await this.client.createIndex('things', { url: 1 }, { unique: true })
    await this.client.createIndex('things', { ns: 1, type: 1 })
    await this.client.createIndex('things', { type: 1, createdAt: -1 })

    // Relationships indices
    await this.client.createIndex('relationships', { relId: 1 }, { unique: true })
    await this.client.createIndex('relationships', { from: 1, type: 1 })
    await this.client.createIndex('relationships', { to: 1 })

    // Events indices
    await this.client.createIndex('events', { eventId: 1 }, { unique: true })
    await this.client.createIndex('events', { type: 1, timestamp: -1 })
    await this.client.createIndex('events', { source: 1, timestamp: -1 })
    await this.client.createIndex('events', { correlationId: 1 })

    // Actions indices
    await this.client.createIndex('actions', { actionId: 1 }, { unique: true })
    await this.client.createIndex('actions', { actor: 1, createdAt: -1 })
    await this.client.createIndex('actions', { object: 1 })
    await this.client.createIndex('actions', { status: 1, createdAt: -1 })

    // Artifacts indices
    await this.client.createIndex('artifacts', { key: 1 }, { unique: true })
    await this.client.createIndex('artifacts', { source: 1, type: 1 })
    await this.client.createIndex('artifacts', { expiresAt: 1 })

    // Search indices
    await this.client.createIndex('search', { url: 1 }, { unique: true })
    await this.client.createIndex('search', { ns: 1, type: 1 })
    // Text index for full-text search
    await this.client.createIndex('search', { title: 'text', description: 'text', content: 'text' })
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    const filter: Record<string, unknown> = {}

    if (options.ns) filter.ns = options.ns
    if (options.type) filter.type = options.type
    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        filter[`data.${key}`] = value
      }
    }

    const sort: Record<string, 1 | -1> = {}
    if (options.orderBy) {
      const dir = options.order === 'asc' ? 1 : -1
      if (['url', 'ns', 'type', 'id', 'createdAt', 'updatedAt'].includes(options.orderBy)) {
        sort[options.orderBy] = dir
      } else {
        sort[`data.${options.orderBy}`] = dir
      }
    } else {
      sort.createdAt = -1
    }

    const docs = await this.client.find<ThingDoc>('things', filter, {
      sort,
      limit: options.limit,
      skip: options.offset,
    })

    return docs.map(doc => this.docToThing(doc))
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    return this.list(options)
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    const filter: Record<string, unknown> = {
      $or: [
        { id: { $regex: options.query, $options: 'i' } },
        { 'data.title': { $regex: options.query, $options: 'i' } },
        { 'data.content': { $regex: options.query, $options: 'i' } },
      ],
    }

    if (options.ns) filter.ns = options.ns
    if (options.type) filter.type = options.type

    const docs = await this.client.find<ThingDoc>('things', filter, {
      sort: { createdAt: -1 },
      limit: options.limit,
      skip: options.offset,
    })

    return docs.map(doc => this.docToThing(doc))
  }

  async get(url: string): Promise<Thing<TData> | null> {
    const doc = await this.client.findOne<ThingDoc>('things', { url })
    if (!doc) return null
    return this.docToThing(doc)
  }

  async getById(ns: string, type: string, id: string): Promise<Thing<TData> | null> {
    return this.get(buildUrl(ns, type, id))
  }

  async set(url: string, data: TData): Promise<Thing<TData>> {
    const { ns, type, id } = parseThingUrl(url)
    const now = new Date()

    const existing = await this.get(url)

    const doc: ThingDoc = {
      url,
      ns,
      type,
      id,
      data,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      context: existing?.['@context'],
    }

    await this.client.updateOne(
      'things',
      { url },
      { $set: doc, $setOnInsert: { createdAt: now } }
    )

    return {
      ns,
      type,
      id,
      url,
      data,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      '@context': doc.context,
    }
  }

  async create(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const id = options.id ?? generateId()
    const url = options.url ?? buildUrl(options.ns, options.type, id)

    const existing = await this.get(url)
    if (existing) {
      throw new Error(`Thing already exists: ${url}`)
    }

    const now = new Date()

    const doc: ThingDoc = {
      url,
      ns: options.ns,
      type: options.type,
      id,
      data: options.data,
      createdAt: now,
      updatedAt: now,
      context: options['@context'],
    }

    await this.client.insertOne('things', doc)

    return {
      ns: options.ns,
      type: options.type,
      id,
      url,
      data: options.data,
      createdAt: now,
      updatedAt: now,
      '@context': options['@context'],
    }
  }

  async update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>> {
    const existing = await this.get(url)
    if (!existing) {
      throw new Error(`Thing not found: ${url}`)
    }

    const merged = { ...existing.data, ...options.data } as TData
    return this.set(url, merged)
  }

  async upsert(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const id = options.id ?? generateId()
    const url = options.url ?? buildUrl(options.ns, options.type, id)

    const existing = await this.get(url)
    if (existing) {
      return this.update(url, { data: options.data })
    }

    return this.create({ ...options, id, url })
  }

  async delete(url: string): Promise<boolean> {
    const result = await this.client.deleteOne('things', { url })
    return result.deletedCount > 0
  }

  async forEach(
    options: QueryOptions,
    callback: (thing: Thing<TData>) => void | Promise<void>
  ): Promise<void> {
    const things = await this.list(options)
    for (const thing of things) {
      await callback(thing)
    }
  }

  // ===========================================================================
  // Relationship Operations
  // ===========================================================================

  async relate<T extends Record<string, unknown> = Record<string, unknown>>(
    options: RelateOptions<T>
  ): Promise<Relationship<T>> {
    const now = new Date()
    const relId = generateRelationshipId(options.from, options.type, options.to)

    const doc: RelationshipDoc = {
      relId,
      type: options.type,
      from: options.from,
      to: options.to,
      createdAt: now,
      data: options.data,
    }

    await this.client.insertOne('relationships', doc)

    return {
      id: relId,
      type: options.type,
      from: options.from,
      to: options.to,
      createdAt: now,
      data: options.data,
    }
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    const relId = generateRelationshipId(from, type, to)
    const result = await this.client.deleteOne('relationships', { relId })
    return result.deletedCount > 0
  }

  async related(
    url: string,
    relationshipType?: string,
    direction: 'from' | 'to' | 'both' = 'from'
  ): Promise<Thing<TData>[]> {
    const urls: string[] = []

    // direction='to': Return things this URL points TO (outbound, where from=url)
    // direction='from': Return things that point TO this URL (inbound, where to=url)
    if (direction === 'to' || direction === 'both') {
      const filter: Record<string, unknown> = { from: url }
      if (relationshipType) filter.type = relationshipType

      const rels = await this.client.find<RelationshipDoc>('relationships', filter)
      urls.push(...rels.map(r => r.to))
    }

    if (direction === 'from' || direction === 'both') {
      const filter: Record<string, unknown> = { to: url }
      if (relationshipType) filter.type = relationshipType

      const rels = await this.client.find<RelationshipDoc>('relationships', filter)
      urls.push(...rels.map(r => r.from))
    }

    const uniqueUrls = [...new Set(urls)]
    if (uniqueUrls.length === 0) return []

    const things = await this.client.find<ThingDoc>('things', { url: { $in: uniqueUrls } })
    return things.map(doc => this.docToThing(doc))
  }

  async relationships(
    url: string,
    type?: string,
    direction: 'from' | 'to' | 'both' = 'both'
  ): Promise<Relationship[]> {
    const results: Relationship[] = []

    // direction='to': Return relationships where this URL is the FROM (outbound)
    // direction='from': Return relationships where this URL is the TO (inbound)
    if (direction === 'to' || direction === 'both') {
      const filter: Record<string, unknown> = { from: url }
      if (type) filter.type = type

      const rels = await this.client.find<RelationshipDoc>('relationships', filter)
      results.push(...rels.map(doc => this.docToRelationship(doc)))
    }

    if (direction === 'from' || direction === 'both') {
      const filter: Record<string, unknown> = { to: url }
      if (type) filter.type = type

      const rels = await this.client.find<RelationshipDoc>('relationships', filter)
      results.push(...rels.map(doc => this.docToRelationship(doc)))
    }

    return results
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    // References are inbound - things that point TO this url
    return this.related(url, relationshipType, 'from')
  }

  // ===========================================================================
  // Event Operations (Actor-Event-Object-Result pattern)
  // ===========================================================================

  async track<T extends Record<string, unknown>>(
    options: CreateEventOptions<T>
  ): Promise<Event<T>> {
    const now = new Date()
    const eventId = generateId()

    const doc: EventDoc = {
      eventId,
      type: options.type,
      timestamp: now,
      source: options.source,
      data: options.data,
      correlationId: options.correlationId,
      causationId: options.causationId,
    }

    await this.client.insertOne('events', doc)

    return {
      id: eventId,
      type: options.type,
      timestamp: now,
      source: options.source,
      data: options.data,
      correlationId: options.correlationId,
      causationId: options.causationId,
    }
  }

  async getEvent(id: string): Promise<Event | null> {
    const doc = await this.client.findOne<EventDoc>('events', { eventId: id })
    if (!doc) return null
    return this.docToEvent(doc)
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    const filter: Record<string, unknown> = {}

    if (options.type) filter.type = options.type
    if (options.source) filter.source = options.source
    if (options.correlationId) filter.correlationId = options.correlationId
    if (options.after || options.before) {
      filter.timestamp = {}
      if (options.after) (filter.timestamp as Record<string, unknown>).$gte = options.after
      if (options.before) (filter.timestamp as Record<string, unknown>).$lte = options.before
    }

    const docs = await this.client.find<EventDoc>('events', filter, {
      sort: { timestamp: -1 },
      limit: options.limit,
      skip: options.offset,
    })

    return docs.map(doc => this.docToEvent(doc))
  }

  // ===========================================================================
  // Action Operations (Linguistic verb conjugations: act → action → activity)
  // ===========================================================================

  async send<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const now = new Date()
    const actionId = generateId()

    const doc: ActionDoc = {
      actionId,
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: options.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
      metadata: options.metadata,
    }

    await this.client.insertOne('actions', doc)

    return {
      id: actionId,
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: options.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
      metadata: options.metadata,
    }
  }

  async do<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const now = new Date()
    const actionId = generateId()

    const doc: ActionDoc = {
      actionId,
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      metadata: options.metadata,
    }

    await this.client.insertOne('actions', doc)

    return {
      id: actionId,
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      metadata: options.metadata,
    }
  }

  async try<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>,
    fn: () => Promise<unknown>
  ): Promise<Action<T>> {
    // Create and start the action
    const action = await this.do<T>(options)

    try {
      // Execute the function
      const result = await fn()
      // Complete on success
      return await this.completeAction(action.id, result) as Action<T>
    } catch (error) {
      // Fail on error
      const errorMessage = error instanceof Error ? error.message : String(error)
      return await this.failAction(action.id, errorMessage) as Action<T>
    }
  }

  async getAction(id: string): Promise<Action | null> {
    const doc = await this.client.findOne<ActionDoc>('actions', { actionId: id })
    if (!doc) return null
    return this.docToAction(doc)
  }

  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    const filter: Record<string, unknown> = {}

    if (options.actor) filter.actor = options.actor
    if (options.object) filter.object = options.object
    if (options.action) filter.action = options.action
    if (options.status) {
      if (Array.isArray(options.status)) {
        filter.status = { $in: options.status }
      } else {
        filter.status = options.status
      }
    }

    const docs = await this.client.find<ActionDoc>('actions', filter, {
      sort: { createdAt: -1 },
      limit: options.limit,
      skip: options.offset,
    })

    return docs.map(doc => this.docToAction(doc))
  }

  async startAction(id: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date()

    await this.client.updateOne(
      'actions',
      { actionId: id },
      {
        $set: {
          status: 'active',
          startedAt: now,
          updatedAt: now,
        },
      }
    )

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date()

    await this.client.updateOne(
      'actions',
      { actionId: id },
      {
        $set: {
          status: 'completed',
          completedAt: now,
          updatedAt: now,
          result: result !== undefined ? result : undefined,
        },
      }
    )

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async failAction(id: string, error: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date()

    await this.client.updateOne(
      'actions',
      { actionId: id },
      {
        $set: {
          status: 'failed',
          completedAt: now,
          updatedAt: now,
          error,
        },
      }
    )

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async cancelAction(id: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date()

    await this.client.updateOne(
      'actions',
      { actionId: id },
      {
        $set: {
          status: 'cancelled',
          completedAt: now,
          updatedAt: now,
        },
      }
    )

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  // ===========================================================================
  // Artifact Operations
  // ===========================================================================

  async storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>> {
    const now = new Date()
    const content = JSON.stringify(options.content)
    const expiresAt = options.ttl ? new Date(Date.now() + options.ttl) : undefined

    const doc: ArtifactDoc = {
      key: options.key,
      type: options.type,
      source: options.source,
      sourceHash: options.sourceHash,
      createdAt: now,
      expiresAt,
      content,
      size: content.length,
      metadata: options.metadata,
    }

    await this.client.updateOne(
      'artifacts',
      { key: options.key },
      { $set: doc, $setOnInsert: { createdAt: now } }
    )

    return {
      key: options.key,
      type: options.type,
      source: options.source,
      sourceHash: options.sourceHash,
      createdAt: now,
      expiresAt,
      content: options.content,
      size: content.length,
      metadata: options.metadata,
    }
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    const doc = await this.client.findOne<ArtifactDoc>('artifacts', { key })
    if (!doc) return null

    // Check if expired
    if (doc.expiresAt && doc.expiresAt < new Date()) {
      await this.deleteArtifact(key)
      return null
    }

    return this.docToArtifact(doc)
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    const doc = await this.client.findOne<ArtifactDoc>('artifacts', { source, type })
    if (!doc) return null

    // Check if expired
    if (doc.expiresAt && doc.expiresAt < new Date()) {
      await this.deleteArtifactBySource(source, type)
      return null
    }

    return this.docToArtifact(doc)
  }

  async deleteArtifact(key: string): Promise<boolean> {
    const result = await this.client.deleteOne('artifacts', { key })
    return result.deletedCount > 0
  }

  async deleteArtifactBySource(source: string, type: ArtifactType): Promise<boolean> {
    const result = await this.client.deleteOne('artifacts', { source, type })
    return result.deletedCount > 0
  }

  async cleanExpiredArtifacts(): Promise<number> {
    const now = new Date()
    const docs = await this.client.find<ArtifactDoc>('artifacts', {
      expiresAt: { $lt: now },
    })

    for (const doc of docs) {
      await this.client.deleteOne('artifacts', { key: doc.key })
    }

    return docs.length
  }

  // ===========================================================================
  // Search Operations (Full-Text + Vector Search with MongoDB Atlas)
  // ===========================================================================

  /**
   * Index content for search (with optional embedding for semantic search)
   */
  async indexForSearch(options: {
    url: string
    ns: string
    type: string
    title?: string
    description?: string
    content: string
    keywords?: string[]
    embedding?: number[]
    model?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    const doc: SearchDoc = {
      url: options.url,
      ns: options.ns,
      type: options.type,
      title: options.title ?? '',
      description: options.description ?? '',
      content: options.content,
      keywords: options.keywords ?? [],
      embedding: options.embedding,
      model: options.model,
      metadata: options.metadata,
    }

    await this.client.updateOne(
      'search',
      { url: options.url },
      { $set: doc }
    )
  }

  /**
   * Full-text search using MongoDB text index
   */
  async fullTextSearch(
    query: string,
    options: {
      ns?: string
      type?: string
      limit?: number
    } = {}
  ): Promise<Array<{ url: string; title: string; content: string; score: number }>> {
    const filter: Record<string, unknown> = {
      $text: { $search: query },
    }

    if (options.ns) filter.ns = options.ns
    if (options.type) filter.type = options.type

    const docs = await this.client.find<SearchDoc & { score: { $meta: 'textScore' } }>(
      'search',
      filter,
      {
        sort: { score: { $meta: 'textScore' } },
        limit: options.limit ?? 10,
      }
    )

    return docs.map(doc => ({
      url: doc.url,
      title: doc.title,
      content: doc.content,
      score: 1, // MongoDB doesn't expose text score in the same way
    }))
  }

  /**
   * Vector similarity search using MongoDB Atlas Vector Search
   * Requires Atlas with vector search index configured
   */
  async vectorSearch(
    queryEmbedding: number[],
    options: {
      model?: string
      limit?: number
      minScore?: number
      ns?: string
      type?: string
    } = {}
  ): Promise<Array<{ url: string; title: string; content: string; score: number }>> {
    if (!this.client.vectorSearch) {
      throw new Error('Vector search not available. Use MongoDB Atlas with vector search enabled.')
    }

    const pipeline: Record<string, unknown>[] = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: (options.limit ?? 10) * 10,
          limit: options.limit ?? 10,
        },
      },
    ]

    // Add filters
    const matchStage: Record<string, unknown> = {}
    if (options.ns) matchStage.ns = options.ns
    if (options.type) matchStage.type = options.type
    if (options.model) matchStage.model = options.model

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage })
    }

    const docs = await this.client.vectorSearch<SearchDoc & { score: number }>('search', pipeline)

    return docs
      .map(doc => ({
        url: doc.url,
        title: doc.title,
        content: doc.content,
        score: doc.score ?? 0,
      }))
      .filter(r => !options.minScore || r.score >= options.minScore)
  }

  /**
   * Hybrid search combining full-text and vector similarity
   */
  async hybridSearch(
    query: string,
    queryEmbedding: number[] | null,
    options: {
      model?: string
      limit?: number
      ns?: string
      type?: string
      textWeight?: number
      vectorWeight?: number
    } = {}
  ): Promise<Array<{ url: string; title: string; content: string; score: number; thing?: Thing<TData> }>> {
    const { limit = 10, textWeight = 0.3, vectorWeight = 0.7 } = options

    // Get text search results
    const textResults = await this.fullTextSearch(query, { ...options, limit: limit * 2 })

    // Get vector search results if embedding provided
    let vectorResults: Array<{ url: string; title: string; content: string; score: number }> = []
    if (queryEmbedding && queryEmbedding.length > 0) {
      try {
        vectorResults = await this.vectorSearch(queryEmbedding, { ...options, limit: limit * 2 })
      } catch {
        // Vector search not available, use text only
      }
    }

    // Combine and score results
    const scoreMap = new Map<string, { url: string; title: string; content: string; textScore: number; vectorScore: number }>()

    for (const r of textResults) {
      scoreMap.set(r.url, {
        url: r.url,
        title: r.title,
        content: r.content,
        textScore: r.score,
        vectorScore: 0,
      })
    }

    for (const r of vectorResults) {
      const existing = scoreMap.get(r.url)
      if (existing) {
        existing.vectorScore = r.score
      } else {
        scoreMap.set(r.url, {
          url: r.url,
          title: r.title,
          content: r.content,
          textScore: 0,
          vectorScore: r.score,
        })
      }
    }

    // Calculate combined scores and sort
    const combined = Array.from(scoreMap.values())
      .map(r => ({
        url: r.url,
        title: r.title,
        content: r.content,
        score: r.textScore * textWeight + r.vectorScore * vectorWeight,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // Optionally fetch the things
    if (combined.length > 0) {
      const uniqueUrls = [...new Set(combined.map(r => r.url))]
      const things = await this.client.find<ThingDoc>('things', { url: { $in: uniqueUrls } })
      const thingMap = new Map(things.map(t => [t.url, this.docToThing(t)]))

      return combined.map(r => ({
        ...r,
        thing: thingMap.get(r.url),
      }))
    }

    return combined
  }

  /**
   * Remove search index entries for a URL
   */
  async removeFromSearch(url: string): Promise<boolean> {
    const result = await this.client.deleteOne('search', { url })
    return result.deletedCount > 0
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private docToThing(doc: ThingDoc): Thing<TData> {
    return {
      ns: doc.ns,
      type: doc.type,
      id: doc.id,
      url: doc.url,
      data: doc.data as TData,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      '@context': doc.context,
    }
  }

  private docToRelationship(doc: RelationshipDoc): Relationship {
    return {
      id: doc.relId,
      type: doc.type,
      from: doc.from,
      to: doc.to,
      createdAt: doc.createdAt,
      data: doc.data,
    }
  }

  private docToEvent<T extends Record<string, unknown>>(doc: EventDoc): Event<T> {
    return {
      id: doc.eventId,
      type: doc.type,
      timestamp: doc.timestamp,
      source: doc.source,
      data: doc.data as T,
      correlationId: doc.correlationId,
      causationId: doc.causationId,
    }
  }

  private docToAction<T extends Record<string, unknown>>(doc: ActionDoc): Action<T> {
    return {
      id: doc.actionId,
      actor: doc.actor,
      object: doc.object,
      action: doc.action,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      result: doc.result,
      error: doc.error,
      metadata: doc.metadata as T | undefined,
    }
  }

  private docToArtifact<T>(doc: ArtifactDoc): Artifact<T> {
    let content: T
    try {
      content = JSON.parse(doc.content) as T
    } catch {
      content = doc.content as unknown as T
    }
    return {
      key: doc.key,
      type: doc.type as ArtifactType,
      source: doc.source,
      sourceHash: doc.sourceHash,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      content,
      size: doc.size,
      metadata: doc.metadata,
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.client.close()
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a MongoDB database instance
 *
 * @example
 * ```ts
 * // Connect to local MongoDB (default)
 * const db = await createMongoDatabase()
 *
 * // Connect to MongoDB Atlas
 * const atlasDb = await createMongoDatabase({
 *   url: 'mongodb+srv://user:pass@cluster.mongodb.net',
 *   database: 'mydb',
 * })
 *
 * // Create things
 * await db.create({
 *   ns: 'example.com',
 *   type: 'Post',
 *   data: { title: 'Hello World', content: '...' },
 * })
 *
 * // Track events (analytics)
 * await db.track({
 *   type: 'User.visited',
 *   source: 'web',
 *   data: { userId: '123', page: '/home' },
 * })
 *
 * // Do action (create and start)
 * const action = await db.do({
 *   actor: 'user:123',
 *   object: 'https://example.com/Document/report',
 *   action: 'review',
 * })
 *
 * // Try action (with automatic error handling)
 * await db.try(
 *   { actor: 'system', object: 'file.pdf', action: 'process' },
 *   async () => {
 *     // Process file...
 *     return { pages: 10 }
 *   }
 * )
 * ```
 */
export async function createMongoDatabase<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: MongoConfig = {}
): Promise<MongoDatabase<TData>> {
  const client = config.client ?? await createNativeMongoClient(config)
  const db = new MongoDatabase<TData>(client)
  await db.init()
  return db
}

// Re-export types from ai-database for convenience
export type {
  DBClientExtended,
  Thing,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  Relationship,
  Event,
  Action,
  Artifact,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  ArtifactType,
  ActionStatus,
}
