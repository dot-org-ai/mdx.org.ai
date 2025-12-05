/**
 * ClickHouse adapter for Payload CMS using mdxdb HTTP client
 *
 * Maps Payload collections to mdxdb Things and Relationships.
 * Runs on Cloudflare Workers with HTTP calls to ClickHouse.
 *
 * @example
 * ```ts
 * import { clickhouseAdapter } from '@mdxdb/payload/clickhouse'
 *
 * export default buildConfig({
 *   db: clickhouseAdapter({
 *     url: env.CLICKHOUSE_URL,
 *     username: env.CLICKHOUSE_USERNAME,
 *     password: env.CLICKHOUSE_PASSWORD,
 *     namespace: 'example.com',
 *   }),
 *   collections: [Posts, Authors],
 * })
 * ```
 *
 * @packageDocumentation
 */

import type {
  ClickHouseAdapterConfig,
  MDXDBClient,
  Thing,
  Relationship,
  QueryOptions,
  SearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
} from './types.js'

// =============================================================================
// ClickHouse HTTP Client
// =============================================================================

/**
 * HTTP client for mdxdb ClickHouse
 */
export class ClickHouseClient implements MDXDBClient {
  private baseUrl: string
  private auth?: string
  private database: string
  private namespace: string
  private cacheTtl: number

  constructor(config: ClickHouseAdapterConfig & { namespace: string }) {
    this.baseUrl = config.url.replace(/\/$/, '')
    this.database = config.database ?? 'mdxdb'
    this.namespace = config.namespace
    this.cacheTtl = config.cacheTtl ?? 60

    if (config.username) {
      this.auth = `Basic ${btoa(`${config.username}:${config.password ?? ''}`)}`
    }
  }

  private async executeQuery<T = unknown>(sql: string, cacheTtl?: number): Promise<T[]> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('database', this.database)
    url.searchParams.set('default_format', 'JSONEachRow')
    url.searchParams.set('query', sql)

    const headers: Record<string, string> = { 'Accept': 'application/json' }
    if (this.auth) headers['Authorization'] = this.auth

    const fetchOptions: RequestInit & { cf?: { cacheTtl: number; cacheEverything: boolean } } = {
      method: 'GET',
      headers,
    }

    if (cacheTtl) {
      fetchOptions.cf = { cacheTtl, cacheEverything: true }
    }

    const response = await fetch(url.toString(), fetchOptions as RequestInit)
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ClickHouse error: ${error}`)
    }

    const text = await response.text()
    if (!text.trim()) return []

    return text
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as T)
  }

  private async executeCommand(sql: string): Promise<void> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('database', this.database)

    const headers: Record<string, string> = { 'Content-Type': 'text/plain' }
    if (this.auth) headers['Authorization'] = this.auth

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: sql,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ClickHouse error: ${error}`)
    }
  }

  private async insert<T extends Record<string, unknown>>(table: string, rows: T[]): Promise<void> {
    if (rows.length === 0) return

    const url = new URL(this.baseUrl)
    url.searchParams.set('database', this.database)
    url.searchParams.set('query', `INSERT INTO ${table} FORMAT JSONEachRow`)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.auth) headers['Authorization'] = this.auth

    const body = rows.map(row => JSON.stringify(row)).join('\n')

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ClickHouse error: ${error}`)
    }
  }

  // ===========================================================================
  // MDXDBClient Implementation
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing[]> {
    const conditions: string[] = ["event != 'deleted'"]

    if (options.ns) conditions.push(`ns = '${escape(options.ns)}'`)
    if (options.type) conditions.push(`type = '${escape(options.type)}'`)

    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
        conditions.push(`JSONExtractString(data, '${key}') = '${escape(jsonValue)}'`)
      }
    }

    let sql = `SELECT * FROM Things FINAL WHERE ${conditions.join(' AND ')}`

    if (options.orderBy) {
      const dir = options.order === 'desc' ? 'DESC' : 'ASC'
      if (['url', 'ns', 'type', 'id', 'ts', 'version'].includes(options.orderBy)) {
        sql += ` ORDER BY ${options.orderBy} ${dir}`
      } else {
        sql += ` ORDER BY JSONExtractString(data, '${options.orderBy}') ${dir}`
      }
    } else {
      sql += ' ORDER BY ts DESC'
    }

    if (options.limit) sql += ` LIMIT ${options.limit}`
    if (options.offset) sql += ` OFFSET ${options.offset}`

    const rows = await this.executeQuery<ThingRow>(sql, this.cacheTtl)
    return rows.map(row => rowToThing(row))
  }

  async get(url: string): Promise<Thing | null> {
    const sql = `SELECT * FROM Things FINAL WHERE url = '${escape(url)}' AND event != 'deleted' LIMIT 1`
    const rows = await this.executeQuery<ThingRow>(sql, this.cacheTtl)
    return rows.length > 0 ? rowToThing(rows[0]!) : null
  }

  async getById(type: string, id: string): Promise<Thing | null> {
    return this.get(buildUrl(this.namespace, type, id))
  }

  async create<T = Record<string, unknown>>(options: CreateOptions<T>): Promise<Thing<T>> {
    const id = options.id ?? generateId()
    const url = options.url ?? buildUrl(options.ns, options.type, id)
    const now = new Date().toISOString()

    await this.insert('Things', [{
      url,
      ns: options.ns,
      type: options.type,
      id,
      branch: 'main',
      variant: '',
      version: 1,
      repo: '',
      patch: '',
      commit: '',
      data: options.data,
      content: options.content ?? '',
      code: '',
      meta: options['@context'] ? { '@context': options['@context'] } : {},
      visibility: 'tenant',
      event: 'created',
      ts: now,
    }])

    return {
      ns: options.ns,
      type: options.type,
      id,
      url,
      data: options.data,
      content: options.content,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      '@context': options['@context'],
    }
  }

  async update<T = Record<string, unknown>>(url: string, options: UpdateOptions<T>): Promise<Thing<T>> {
    const existing = await this.get(url)
    if (!existing) throw new Error(`Thing not found: ${url}`)

    const merged = { ...existing.data, ...options.data } as T
    const now = new Date().toISOString()
    const { ns, type, id } = parseUrl(url)

    await this.insert('Things', [{
      url,
      ns,
      type,
      id,
      branch: 'main',
      variant: '',
      version: (existing as any).version + 1,
      repo: '',
      patch: '',
      commit: '',
      data: merged,
      content: options.content ?? existing.content ?? '',
      code: '',
      meta: {},
      visibility: 'tenant',
      event: 'updated',
      ts: now,
    }])

    return {
      ...existing,
      data: merged,
      content: options.content ?? existing.content,
      updatedAt: new Date(now),
    } as Thing<T>
  }

  async upsert<T = Record<string, unknown>>(options: CreateOptions<T>): Promise<Thing<T>> {
    const id = options.id ?? generateId()
    const url = options.url ?? buildUrl(options.ns, options.type, id)

    const existing = await this.get(url)
    if (existing) {
      return this.update<T>(url, { data: options.data, content: options.content })
    }
    return this.create({ ...options, id, url })
  }

  async delete(url: string): Promise<boolean> {
    const existing = await this.get(url)
    if (!existing) return false

    const { ns, type, id } = parseUrl(url)
    const now = new Date().toISOString()

    await this.insert('Things', [{
      url,
      ns,
      type,
      id,
      branch: 'main',
      variant: '',
      version: (existing as any).version + 1,
      repo: '',
      patch: '',
      commit: '',
      data: existing.data,
      content: '',
      code: '',
      meta: {},
      visibility: 'tenant',
      event: 'deleted',
      ts: now,
    }])

    return true
  }

  async search(options: SearchOptions): Promise<Thing[]> {
    const queryLower = escape(options.query.toLowerCase())
    const conditions: string[] = [
      "event != 'deleted'",
      `(positionCaseInsensitive(id, '${queryLower}') > 0 OR positionCaseInsensitive(toString(data), '${queryLower}') > 0)`,
    ]

    if (options.type) conditions.push(`type = '${escape(options.type)}'`)

    let sql = `SELECT * FROM Things FINAL WHERE ${conditions.join(' AND ')} ORDER BY ts DESC`
    if (options.limit) sql += ` LIMIT ${options.limit}`
    if (options.offset) sql += ` OFFSET ${options.offset}`

    const rows = await this.executeQuery<ThingRow>(sql, this.cacheTtl)
    return rows.map(row => rowToThing(row))
  }

  async relate<T = Record<string, unknown>>(options: RelateOptions<T>): Promise<Relationship<T>> {
    const now = new Date().toISOString()
    const { ns } = parseUrl(options.from)

    await this.insert('Relationships', [{
      ns,
      from: options.from,
      to: options.to,
      predicate: options.type,
      reverse: '',
      data: options.data ?? {},
      meta: {},
      visibility: '',
      event: 'created',
      ts: now,
    }])

    return {
      id: generateRelationshipId(options.from, options.type, options.to),
      type: options.type,
      from: options.from,
      to: options.to,
      data: options.data,
      createdAt: new Date(now),
    }
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    await this.executeCommand(
      `ALTER TABLE Relationships DELETE WHERE \`from\` = '${escape(from)}' AND predicate = '${escape(type)}' AND \`to\` = '${escape(to)}'`
    )
    return true
  }

  async related(url: string, type?: string, direction: 'from' | 'to' | 'both' = 'from'): Promise<Thing[]> {
    const urls: string[] = []

    if (direction === 'from' || direction === 'both') {
      const predicateClause = type ? `AND predicate = '${escape(type)}'` : ''
      const rows = await this.executeQuery<{ to: string }>(
        `SELECT \`to\` FROM Relationships WHERE \`from\` = '${escape(url)}' ${predicateClause}`
      )
      urls.push(...rows.map(r => r.to))
    }

    if (direction === 'to' || direction === 'both') {
      const predicateClause = type ? `AND predicate = '${escape(type)}'` : ''
      const rows = await this.executeQuery<{ from: string }>(
        `SELECT \`from\` FROM Relationships WHERE \`to\` = '${escape(url)}' ${predicateClause}`
      )
      urls.push(...rows.map(r => r.from))
    }

    const uniqueUrls = [...new Set(urls)]
    if (uniqueUrls.length === 0) return []

    const urlList = uniqueUrls.map(u => `'${escape(u)}'`).join(', ')
    const rows = await this.executeQuery<ThingRow>(
      `SELECT * FROM Things FINAL WHERE url IN (${urlList}) AND event != 'deleted'`
    )
    return rows.map(row => rowToThing(row))
  }

  async relationships(url: string, type?: string, direction: 'from' | 'to' | 'both' = 'both'): Promise<Relationship[]> {
    const results: Relationship[] = []

    if (direction === 'from' || direction === 'both') {
      const predicateClause = type ? `AND predicate = '${escape(type)}'` : ''
      const rows = await this.executeQuery<RelationshipRow>(
        `SELECT * FROM Relationships WHERE \`from\` = '${escape(url)}' ${predicateClause}`
      )
      results.push(...rows.map(row => rowToRelationship(row)))
    }

    if (direction === 'to' || direction === 'both') {
      const predicateClause = type ? `AND predicate = '${escape(type)}'` : ''
      const rows = await this.executeQuery<RelationshipRow>(
        `SELECT * FROM Relationships WHERE \`to\` = '${escape(url)}' ${predicateClause}`
      )
      results.push(...rows.map(row => rowToRelationship(row)))
    }

    return results
  }

  // ===========================================================================
  // Event Operations
  // ===========================================================================

  async track(options: { type: string; source: string; data?: Record<string, unknown> }): Promise<void> {
    const now = new Date().toISOString()
    let ns = 'default'
    try {
      const parsed = parseUrl(options.source)
      ns = parsed.ns
    } catch {}

    await this.insert('Events', [{
      ns,
      actor: options.source,
      actorData: {},
      event: options.type,
      object: '',
      objectData: options.data ?? {},
      result: '',
      resultData: {},
      meta: {},
      ts: now,
    }])
  }

  async queryEvents(options: { type?: string; source?: string; limit?: number } = {}): Promise<unknown[]> {
    const conditions: string[] = []
    if (options.type) conditions.push(`event = '${escape(options.type)}'`)
    if (options.source) conditions.push(`actor = '${escape(options.source)}'`)

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    let sql = `SELECT * FROM Events ${whereClause} ORDER BY ts DESC`
    if (options.limit) sql += ` LIMIT ${options.limit}`

    return this.executeQuery(sql, this.cacheTtl)
  }

  // ===========================================================================
  // Action Operations
  // ===========================================================================

  async send(options: { actor: string; object: string; action: string; metadata?: Record<string, unknown> }): Promise<unknown> {
    const now = new Date().toISOString()
    let ns = 'default'
    try {
      const parsed = parseUrl(options.actor)
      ns = parsed.ns
    } catch {}

    const id = generateId()
    await this.insert('Actions', [{
      ns,
      id,
      act: options.action,
      action: `${options.action}s`,
      activity: `${options.action}ing`,
      event: '',
      actor: options.actor,
      actorData: {},
      object: options.object,
      objectData: {},
      status: 'pending',
      progress: 0,
      total: 0,
      result: {},
      error: '',
      data: options.metadata ?? {},
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
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }])

    return { id, status: 'pending' }
  }

  async queryActions(options: { status?: string; actor?: string; limit?: number } = {}): Promise<unknown[]> {
    const conditions: string[] = []
    if (options.status) conditions.push(`status = '${escape(options.status)}'`)
    if (options.actor) conditions.push(`actor = '${escape(options.actor)}'`)

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    let sql = `SELECT * FROM Actions FINAL ${whereClause} ORDER BY createdAt DESC`
    if (options.limit) sql += ` LIMIT ${options.limit}`

    return this.executeQuery(sql, 0) // Don't cache action status
  }
}

// =============================================================================
// Row Types
// =============================================================================

interface ThingRow {
  url: string
  ns: string
  type: string
  id: string
  version: number
  data: Record<string, unknown> | string
  content: string
  meta: Record<string, unknown> | string
  event: string
  ts: string
}

interface RelationshipRow {
  from: string
  to: string
  predicate: string
  data: Record<string, unknown> | string
  ts: string
}

// =============================================================================
// Helper Functions
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

function parseUrl(url: string): { ns: string; type: string; id: string } {
  const parsed = new URL(url)
  const parts = parsed.pathname.split('/').filter(Boolean)
  return {
    ns: parsed.host,
    type: parts[0] ?? '',
    id: parts.slice(1).join('/'),
  }
}

function escape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function rowToThing(row: ThingRow): Thing {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  const meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta
  return {
    ns: row.ns,
    type: row.type,
    id: row.id,
    url: row.url,
    data,
    content: row.content || undefined,
    createdAt: new Date(row.ts),
    updatedAt: new Date(row.ts),
    '@context': meta?.['@context'],
  }
}

function rowToRelationship(row: RelationshipRow): Relationship {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  return {
    id: generateRelationshipId(row.from, row.predicate, row.to),
    type: row.predicate,
    from: row.from,
    to: row.to,
    data: data || undefined,
    createdAt: new Date(row.ts),
  }
}

// =============================================================================
// Payload Adapter
// =============================================================================

/**
 * Create a ClickHouse adapter for Payload CMS
 */
export function clickhouseAdapter(config: ClickHouseAdapterConfig) {
  const {
    url,
    username,
    password,
    database = 'mdxdb',
    namespace = 'default',
    idType = 'uuid',
    debug = false,
    cacheTtl = 60,
  } = config

  const client = new ClickHouseClient({
    url,
    username,
    password,
    database,
    namespace,
    cacheTtl,
  })

  return {
    name: '@mdxdb/payload/clickhouse',
    defaultIDType: idType,
    client,
    namespace,

    getType(collectionSlug: string): string {
      return collectionSlug
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
    },

    async connect(): Promise<void> {
      if (debug) console.log('[mdxdb/clickhouse] Connected to ClickHouse')
    },

    async init(): Promise<void> {
      if (debug) console.log('[mdxdb/clickhouse] Schema managed by ClickHouse')
    },

    // CRUD operations follow the same pattern as SQLite adapter
    // (implementation similar to sqlite.ts but using ClickHouseClient)

    async create({ collection, data }: {
      collection: { slug: string }
      data: Record<string, unknown>
    }): Promise<Record<string, unknown>> {
      const type = this.getType(collection.slug)
      const id = (data.id as string) ?? generateId()

      const { relationshipFields, cleanData } = extractRelationships(data, collection.slug)

      const thing = await client.create({
        ns: namespace,
        type,
        id,
        data: cleanData,
      })

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

    async find({ collection, where, sort, limit, page }: {
      collection: { slug: string }
      where?: Record<string, unknown>
      sort?: string
      limit?: number
      page?: number
    }): Promise<{ docs: Record<string, unknown>[]; totalDocs: number; totalPages: number; page: number }> {
      const type = this.getType(collection.slug)

      const queryOptions: any = {
        ns: namespace,
        type,
        where: where ? convertPayloadWhere(where) : undefined,
        limit,
        offset: page && limit ? (page - 1) * limit : undefined,
      }

      if (sort) {
        const isDesc = sort.startsWith('-')
        queryOptions.orderBy = isDesc ? sort.slice(1) : sort
        queryOptions.order = isDesc ? 'desc' : 'asc'
      }

      const things = await client.list(queryOptions)
      const docs = await Promise.all(things.map(t => populateRelationships(t, client, namespace)))

      const allThings = await client.list({ ns: namespace, type })
      const totalDocs = allThings.length
      const totalPages = limit ? Math.ceil(totalDocs / limit) : 1

      return { docs, totalDocs, totalPages, page: page ?? 1 }
    },

    async findByID({ collection, id }: {
      collection: { slug: string }
      id: string | number
    }): Promise<Record<string, unknown> | null> {
      const type = this.getType(collection.slug)
      const url = buildUrl(namespace, type, String(id))
      const thing = await client.get(url)
      return thing ? populateRelationships(thing, client, namespace) : null
    },

    async findOne({ collection, where }: {
      collection: { slug: string }
      where: Record<string, unknown>
    }): Promise<Record<string, unknown> | null> {
      const result = await this.find({ collection, where, limit: 1 })
      return result.docs[0] ?? null
    },

    async update({ collection, id, data }: {
      collection: { slug: string }
      id: string | number
      data: Record<string, unknown>
    }): Promise<Record<string, unknown>> {
      const type = this.getType(collection.slug)
      const url = buildUrl(namespace, type, String(id))

      const { relationshipFields, cleanData } = extractRelationships(data, collection.slug)
      const thing = await client.update(url, { data: cleanData })

      for (const rel of relationshipFields) {
        const existing = await client.relationships(url, rel.field, 'from')
        for (const existingRel of existing) {
          await client.unrelate(url, rel.field, existingRel.to)
        }

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

    async delete({ collection, id }: {
      collection: { slug: string }
      id: string | number
    }): Promise<Record<string, unknown>> {
      const type = this.getType(collection.slug)
      const url = buildUrl(namespace, type, String(id))

      const thing = await client.get(url)
      if (!thing) throw new Error(`Document not found: ${url}`)

      const relationships = await client.relationships(url)
      for (const rel of relationships) {
        await client.unrelate(rel.from, rel.type, rel.to)
      }

      await client.delete(url)
      return thingToDocument(thing)
    },

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

    async beginTransaction(): Promise<void> {},
    async commitTransaction(): Promise<void> {},
    async rollbackTransaction(): Promise<void> {},

    async migrate(): Promise<void> {
      if (debug) console.log('[mdxdb/clickhouse] Migration handled by ClickHouse schema')
    },

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

    async findVersions({ collection, where, sort, limit, page }: {
      collection: { slug: string }
      where?: Record<string, unknown>
      sort?: string
      limit?: number
      page?: number
    }): Promise<{ docs: Record<string, unknown>[]; totalDocs: number }> {
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
      const parentUrl = buildUrl(namespace, this.getType(collection.slug), id)
      const versions = await client.related(parentUrl, 'versionOf', 'to')
      for (const version of versions) {
        await client.delete(version.url)
      }
    },
  }
}

// =============================================================================
// Shared Helpers
// =============================================================================

function thingToDocument(thing: Thing): Record<string, unknown> {
  return {
    id: thing.id,
    ...thing.data,
    createdAt: thing.createdAt.toISOString(),
    updatedAt: thing.updatedAt.toISOString(),
  }
}

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
    if (isRelationshipValue(value)) {
      const toType = key.charAt(0).toUpperCase() + key.slice(1).replace(/s$/, '')
      relationshipFields.push({ field: key, value, toType })
    } else {
      cleanData[key] = value
    }
  }

  return { relationshipFields, cleanData }
}

function isRelationshipValue(value: unknown): boolean {
  if (!value) return false
  if (Array.isArray(value)) {
    return value.every(v => typeof v === 'string' || typeof v === 'number')
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    return 'id' in obj || 'value' in obj
  }
  return false
}

async function populateRelationships(
  thing: Thing,
  client: ClickHouseClient,
  namespace: string
): Promise<Record<string, unknown>> {
  const doc = thingToDocument(thing)

  const relationships = await client.relationships(thing.url, undefined, 'from')

  const byType: Record<string, Relationship[]> = {}
  for (const rel of relationships) {
    if (!byType[rel.type]) byType[rel.type] = []
    byType[rel.type]!.push(rel)
  }

  for (const [type, rels] of Object.entries(byType)) {
    if (rels.length === 1) {
      const relatedThing = await client.get(rels[0]!.to)
      if (relatedThing) {
        doc[type] = thingToDocument(relatedThing)
      }
    } else {
      const relatedThings = await Promise.all(rels.map(r => client.get(r.to)))
      doc[type] = relatedThings.filter(Boolean).map(t => thingToDocument(t!))
    }
  }

  return doc
}

function convertPayloadWhere(where: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(where)) {
    if (key === 'and' || key === 'or') continue

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>
      if ('equals' in obj) {
        result[key] = obj.equals
      } else if ('in' in obj) {
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
