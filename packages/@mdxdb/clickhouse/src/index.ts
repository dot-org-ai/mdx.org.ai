/**
 * @mdxdb/clickhouse - ClickHouse adapter for mdxdb
 *
 * Supports two modes:
 * 1. chDB mode (local/CLI) - Embedded ClickHouse with persistent file storage
 * 2. Web client mode (Workers) - HTTP-based client for remote ClickHouse
 *
 * Optimized for analytics and event sourcing with:
 * - Things: Graph nodes with MergeTree storage
 * - Relationships: Graph edges with efficient joining
 * - Events: Immutable event log (append-only)
 * - Actions: Pending/active work tracking
 * - Artifacts: Cached compiled content
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
} from 'mdxdb'

export const name = '@mdxdb/clickhouse'

// =============================================================================
// Client Abstraction
// =============================================================================

/**
 * Abstract interface for ClickHouse operations
 * Implemented by both chDB (local) and HTTP (remote) clients
 */
export interface ClickHouseExecutor {
  /** Execute a query and return results */
  query<T = unknown>(sql: string): Promise<T[]>
  /** Execute a command (no results expected) */
  command(sql: string): Promise<void>
  /** Insert rows into a table */
  insert<T>(table: string, values: T[]): Promise<void>
  /** Close connection/cleanup */
  close(): Promise<void>
}

// =============================================================================
// chDB Client (Local/CLI mode)
// =============================================================================

/**
 * chDB session type (imported dynamically to avoid bundling in Workers)
 */
interface ChDBSession {
  query(sql: string, format?: string): string
  cleanup(): void
}

/**
 * Create a chDB-based executor for local development
 * Uses embedded ClickHouse with persistent file storage
 */
export async function createChDBExecutor(dataPath: string): Promise<ClickHouseExecutor> {
  // Dynamic import to avoid bundling chdb in Workers
  const { Session } = await import('chdb')
  const session: ChDBSession = new Session(dataPath)

  return {
    async query<T = unknown>(sql: string): Promise<T[]> {
      const result = session.query(sql, 'JSONEachRow')
      if (!result || result.trim() === '') return []
      // Parse newline-delimited JSON
      return result
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as T)
    },

    async command(sql: string): Promise<void> {
      session.query(sql)
    },

    async insert<T>(table: string, values: T[]): Promise<void> {
      if (values.length === 0) return
      // Build INSERT statement with VALUES
      const columns = Object.keys(values[0] as object)
      const rows = values.map(v => {
        const vals = columns.map(col => {
          const val = (v as Record<string, unknown>)[col]
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'string') return `'${escapeString(val)}'`
          if (typeof val === 'number') return String(val)
          if (typeof val === 'boolean') return val ? '1' : '0'
          return `'${escapeString(JSON.stringify(val))}'`
        })
        return `(${vals.join(', ')})`
      })
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${rows.join(', ')}`
      session.query(sql)
    },

    async close(): Promise<void> {
      // Don't cleanup - preserve data. Call cleanup() explicitly if needed.
    },
  }
}

// =============================================================================
// HTTP/Web Client (Workers mode)
// =============================================================================

/**
 * Configuration for HTTP-based ClickHouse client
 */
export interface ClickHouseHttpConfig {
  /** ClickHouse HTTP URL */
  url: string
  /** Username for authentication */
  username?: string
  /** Password for authentication */
  password?: string
  /** Database name */
  database?: string
}

/**
 * Create an HTTP-based executor for Cloudflare Workers and remote ClickHouse
 * Uses fetch API - no Node.js dependencies
 */
export function createHttpExecutor(config: ClickHouseHttpConfig): ClickHouseExecutor {
  const baseUrl = config.url.replace(/\/$/, '')
  const database = config.database ?? 'default'
  const auth = config.username
    ? `Basic ${btoa(`${config.username}:${config.password ?? ''}`)}`
    : undefined

  const executeQuery = async (sql: string, format = 'JSONEachRow'): Promise<Response> => {
    const url = new URL(baseUrl)
    url.searchParams.set('database', database)
    url.searchParams.set('default_format', format)

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    }
    if (auth) headers['Authorization'] = auth

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: sql,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ClickHouse error: ${error}`)
    }

    return response
  }

  return {
    async query<T = unknown>(sql: string): Promise<T[]> {
      const response = await executeQuery(sql, 'JSONEachRow')
      const text = await response.text()
      if (!text || text.trim() === '') return []
      return text
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as T)
    },

    async command(sql: string): Promise<void> {
      await executeQuery(sql)
    },

    async insert<T>(table: string, values: T[]): Promise<void> {
      if (values.length === 0) return
      // Use JSONEachRow format for insert
      const rows = values.map(v => JSON.stringify(v)).join('\n')
      const sql = `INSERT INTO ${table} FORMAT JSONEachRow\n${rows}`
      await executeQuery(sql)
    },

    async close(): Promise<void> {
      // HTTP is stateless, nothing to close
    },
  }
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for ClickHouse database
 */
export interface ClickHouseConfig {
  /**
   * Mode of operation:
   * - 'chdb': Use embedded chDB with local file storage (for dev/CLI)
   * - 'http': Use HTTP client for remote ClickHouse (for Workers/production)
   */
  mode?: 'chdb' | 'http'

  /**
   * For chdb mode: Path to store database files
   * For http mode: ClickHouse HTTP URL
   */
  url?: string

  /** ClickHouse username (http mode only) */
  username?: string
  /** ClickHouse password (http mode only) */
  password?: string
  /** Database name (default: mdxdb) */
  database?: string

  /** Custom executor (for testing or advanced use) */
  executor?: ClickHouseExecutor
}

// =============================================================================
// Schema (imported from modular schema files)
// =============================================================================

import {
  FULL_SCHEMA,
  getAllSchemaStatements,
  TABLES,
  TABLE_SCHEMAS,
  SCHEMA_VERSION,
  type TableName,
  // Row types
  type ThingRow,
  type RelationshipRow,
  type EventRow,
  type ActionRow,
  type ArtifactRow,
  type SearchRow,
} from '../schema/index.js'

// Re-export schema modules
export * from '../schema/index.js'
export { migrate, rollback, cleanupBackups, needsMigration } from '../schema/migrate.js'
export type { MigrateOptions, MigrateResult } from '../schema/migrate.js'

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

function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// =============================================================================
// Database Implementation
// =============================================================================

/**
 * ClickHouse database with graph and event sourcing support
 * Implements DBClientExtended for Events, Actions, and Artifacts
 *
 * @example
 * ```ts
 * // Local development with chDB (persistent file storage)
 * const localDb = await createClickHouseDatabase({
 *   mode: 'chdb',
 *   url: './data/clickhouse',
 * })
 *
 * // Cloudflare Workers with HTTP client
 * const remoteDb = await createClickHouseDatabase({
 *   mode: 'http',
 *   url: 'https://your-clickhouse.example.com:8443',
 *   username: 'default',
 *   password: 'secret',
 * })
 * ```
 */
export class ClickHouseDatabase<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClientExtended<TData>
{
  private executor: ClickHouseExecutor
  private database: string

  constructor(executor: ClickHouseExecutor, database = 'mdxdb') {
    this.executor = executor
    this.database = database
  }

  /**
   * Initialize database schema
   */
  async init(): Promise<void> {
    // Create database if not exists
    await this.executor.command(`CREATE DATABASE IF NOT EXISTS ${this.database}`)

    // Execute schema statements one by one
    const statements = getAllSchemaStatements()

    for (const statement of statements) {
      await this.executor.command(statement)
    }
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    const conditions: string[] = ["event != 'deleted'"]

    if (options.ns) {
      conditions.push(`ns = '${escapeString(options.ns)}'`)
    }

    if (options.type) {
      conditions.push(`type = '${escapeString(options.type)}'`)
    }

    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
        conditions.push(`data.${key} = '${escapeString(jsonValue)}'`)
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    let orderClause = 'ORDER BY ts DESC'
    if (options.orderBy) {
      const dir = options.order === 'desc' ? 'DESC' : 'ASC'
      if (['url', 'ns', 'type', 'id', 'ts', 'version'].includes(options.orderBy)) {
        orderClause = `ORDER BY ${options.orderBy} ${dir}`
      } else {
        orderClause = `ORDER BY data.${options.orderBy} ${dir}`
      }
    }

    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM Things FINAL ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToThing(row))
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    return this.list(options)
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    const query = escapeString(options.query.toLowerCase())
    const conditions: string[] = [
      "event != 'deleted'",
      `(positionCaseInsensitive(id, '${query}') > 0 OR positionCaseInsensitive(toString(data), '${query}') > 0 OR positionCaseInsensitive(content, '${query}') > 0)`,
    ]

    if (options.ns) {
      conditions.push(`ns = '${escapeString(options.ns)}'`)
    }

    if (options.type) {
      conditions.push(`type = '${escapeString(options.type)}'`)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM Things FINAL ${whereClause} ORDER BY ts DESC ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToThing(row))
  }

  async get(url: string): Promise<Thing<TData> | null> {
    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM Things FINAL WHERE url = '${escapeString(url)}' AND event != 'deleted' LIMIT 1`
    )
    if (rows.length === 0) return null
    return this.rowToThing(rows[0]!)
  }

  async getById(ns: string, type: string, id: string): Promise<Thing<TData> | null> {
    return this.get(buildUrl(ns, type, id))
  }

  async set(url: string, data: TData): Promise<Thing<TData>> {
    const { ns, type, id } = parseThingUrl(url)
    const now = new Date().toISOString()

    const existing = await this.get(url)
    const version = existing ? (existing as any).version + 1 : 1

    await this.executor.insert('Things', [{
      url,
      ns,
      type,
      id,
      branch: 'main',
      variant: '',
      version,
      repo: '',
      patch: '',
      commit: '',
      data,
      content: '',
      code: '',
      meta: {},
      visibility: 'tenant',
      event: existing ? 'updated' : 'created',
      ts: now,
    }])

    return {
      ns,
      type,
      id,
      url,
      data,
      createdAt: existing?.createdAt ?? new Date(now),
      updatedAt: new Date(now),
    }
  }

  async create(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const id = options.id ?? generateId()
    const url = options.url ?? buildUrl(options.ns, options.type, id)

    const existing = await this.get(url)
    if (existing) {
      throw new Error(`Thing already exists: ${url}`)
    }

    const now = new Date().toISOString()

    await this.executor.insert('Things', [{
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
      content: '',
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
      createdAt: new Date(now),
      updatedAt: new Date(now),
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
    const existing = await this.get(url)
    if (!existing) return false

    const { ns, type, id } = parseThingUrl(url)
    const now = new Date().toISOString()

    // Soft delete by setting event = 'deleted'
    await this.executor.insert('Things', [{
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
    const now = new Date().toISOString()
    const { ns } = parseThingUrl(options.from)

    await this.executor.insert('Relationships', [{
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
      createdAt: new Date(now),
      data: options.data,
    }
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    await this.executor.command(
      `ALTER TABLE Relationships DELETE WHERE \`from\` = '${escapeString(from)}' AND predicate = '${escapeString(type)}' AND \`to\` = '${escapeString(to)}'`
    )
    return true
  }

  async related(
    url: string,
    relationshipType?: string,
    direction: 'from' | 'to' | 'both' = 'from'
  ): Promise<Thing<TData>[]> {
    const urls: string[] = []

    if (direction === 'from' || direction === 'both') {
      const predicateClause = relationshipType ? `AND predicate = '${escapeString(relationshipType)}'` : ''
      const rows = await this.executor.query<{ to: string }>(
        `SELECT \`to\` FROM Relationships WHERE \`from\` = '${escapeString(url)}' ${predicateClause}`
      )
      urls.push(...rows.map(r => r.to))
    }

    if (direction === 'to' || direction === 'both') {
      const predicateClause = relationshipType ? `AND predicate = '${escapeString(relationshipType)}'` : ''
      const rows = await this.executor.query<{ from: string }>(
        `SELECT \`from\` FROM Relationships WHERE \`to\` = '${escapeString(url)}' ${predicateClause}`
      )
      urls.push(...rows.map(r => r.from))
    }

    const uniqueUrls = [...new Set(urls)]
    if (uniqueUrls.length === 0) return []

    const urlList = uniqueUrls.map(u => `'${escapeString(u)}'`).join(', ')
    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM Things FINAL WHERE url IN (${urlList}) AND event != 'deleted'`
    )
    return rows.map(row => this.rowToThing(row))
  }

  async relationships(
    url: string,
    type?: string,
    direction: 'from' | 'to' | 'both' = 'both'
  ): Promise<Relationship[]> {
    const results: Relationship[] = []

    if (direction === 'from' || direction === 'both') {
      const predicateClause = type ? `AND predicate = '${escapeString(type)}'` : ''
      const rows = await this.executor.query<RelationshipRow>(
        `SELECT * FROM Relationships WHERE \`from\` = '${escapeString(url)}' ${predicateClause}`
      )
      results.push(...rows.map(row => this.rowToRelationship(row)))
    }

    if (direction === 'to' || direction === 'both') {
      const predicateClause = type ? `AND predicate = '${escapeString(type)}'` : ''
      const rows = await this.executor.query<RelationshipRow>(
        `SELECT * FROM Relationships WHERE \`to\` = '${escapeString(url)}' ${predicateClause}`
      )
      results.push(...rows.map(row => this.rowToRelationship(row)))
    }

    return results
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    return this.related(url, relationshipType, 'to')
  }

  // ===========================================================================
  // Event Operations (Actor-Event-Object-Result pattern)
  // ===========================================================================

  async track<T extends Record<string, unknown>>(
    options: CreateEventOptions<T>
  ): Promise<Event<T>> {
    const now = new Date().toISOString()
    // Extract ns from source URL or use 'default'
    let ns = 'default'
    try {
      const { ns: sourceNs } = parseThingUrl(options.source)
      ns = sourceNs
    } catch {
      // Use default ns if source is not a valid URL
    }

    await this.executor.insert('Events', [{
      // ulid is auto-generated by ClickHouse
      ns,
      actor: options.source,
      actorData: {},
      event: options.type,
      object: '',
      objectData: options.data ?? {},
      result: '',
      resultData: {},
      meta: {
        correlationId: options.correlationId,
        causationId: options.causationId,
      },
      ts: now,
    }])

    return {
      id: '', // Will be generated by ClickHouse
      type: options.type,
      timestamp: new Date(now),
      source: options.source,
      data: options.data,
      correlationId: options.correlationId,
      causationId: options.causationId,
    }
  }

  async getEvent(id: string): Promise<Event | null> {
    const rows = await this.executor.query<EventRow>(
      `SELECT * FROM Events WHERE ulid = '${escapeString(id)}' LIMIT 1`
    )
    if (rows.length === 0) return null
    return this.rowToEvent(rows[0]!)
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    const conditions: string[] = []

    if (options.type) {
      conditions.push(`event = '${escapeString(options.type)}'`)
    }

    if (options.source) {
      conditions.push(`actor = '${escapeString(options.source)}'`)
    }

    if (options.correlationId) {
      conditions.push(`meta.correlationId = '${escapeString(options.correlationId)}'`)
    }

    if (options.after) {
      conditions.push(`ts > '${options.after.toISOString()}'`)
    }

    if (options.before) {
      conditions.push(`ts < '${options.before.toISOString()}'`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const rows = await this.executor.query<EventRow>(
      `SELECT * FROM Events ${whereClause} ORDER BY ts DESC ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToEvent(row))
  }

  // ===========================================================================
  // Action Operations (Linguistic verb conjugations: act → action → activity)
  // ===========================================================================

  async send<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const now = new Date().toISOString()
    // Extract ns from actor URL or use 'default'
    let ns = 'default'
    try {
      const { ns: actorNs } = parseThingUrl(options.actor)
      ns = actorNs
    } catch {
      // Use default ns if actor is not a valid URL
    }

    // Derive linguistic forms from the action verb
    const act = options.action
    const action = `${act}s`      // e.g., publish → publishes
    const activity = `${act}ing`  // e.g., publish → publishing

    await this.executor.insert('Actions', [{
      ns,
      // id is auto-generated by ClickHouse with generateULID()
      act,
      action,
      activity,
      event: '',
      actor: options.actor,
      actorData: {},
      object: options.object,
      objectData: {},
      status: options.status ?? 'pending',
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

    return {
      id: '', // Will be generated by ClickHouse
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: options.status ?? 'pending',
      createdAt: new Date(now),
      updatedAt: new Date(now),
      metadata: options.metadata,
    }
  }

  async do<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const now = new Date().toISOString()
    // Extract ns from actor URL or use 'default'
    let ns = 'default'
    try {
      const { ns: actorNs } = parseThingUrl(options.actor)
      ns = actorNs
    } catch {
      // Use default ns if actor is not a valid URL
    }

    // Derive linguistic forms from the action verb
    const act = options.action
    const action = `${act}s`      // e.g., publish → publishes
    const activity = `${act}ing`  // e.g., publish → publishing

    await this.executor.insert('Actions', [{
      ns,
      // id is auto-generated by ClickHouse with generateULID()
      act,
      action,
      activity,
      event: '',
      actor: options.actor,
      actorData: {},
      object: options.object,
      objectData: {},
      status: 'active',
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
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }])

    return {
      id: '', // Will be generated by ClickHouse
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: 'active',
      createdAt: new Date(now),
      updatedAt: new Date(now),
      startedAt: new Date(now),
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
    const rows = await this.executor.query<ActionRow>(
      `SELECT * FROM Actions FINAL WHERE id = '${escapeString(id)}' LIMIT 1`
    )
    if (rows.length === 0) return null
    return this.rowToAction(rows[0]!)
  }

  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    const conditions: string[] = []

    if (options.actor) {
      conditions.push(`actor = '${escapeString(options.actor)}'`)
    }

    if (options.object) {
      conditions.push(`object = '${escapeString(options.object)}'`)
    }

    if (options.action) {
      conditions.push(`act = '${escapeString(options.action)}'`)
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        const statusList = options.status.map(s => `'${escapeString(s)}'`).join(', ')
        conditions.push(`status IN (${statusList})`)
      } else {
        conditions.push(`status = '${escapeString(options.status)}'`)
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const rows = await this.executor.query<ActionRow>(
      `SELECT * FROM Actions FINAL ${whereClause} ORDER BY createdAt DESC ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToAction(row))
  }

  async startAction(id: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date().toISOString()

    await this.executor.insert('Actions', [{
      ...this.actionToRow(existing),
      status: 'active',
      startedAt: now,
      updatedAt: now,
    }])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date().toISOString()

    await this.executor.insert('Actions', [{
      ...this.actionToRow(existing),
      status: 'completed',
      completedAt: now,
      updatedAt: now,
      result: result !== undefined ? result : {},
    }])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async failAction(id: string, error: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date().toISOString()

    await this.executor.insert('Actions', [{
      ...this.actionToRow(existing),
      status: 'failed',
      completedAt: now,
      updatedAt: now,
      error,
    }])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async cancelAction(id: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date().toISOString()

    await this.executor.insert('Actions', [{
      ...this.actionToRow(existing),
      status: 'cancelled',
      completedAt: now,
      updatedAt: now,
    }])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  // ===========================================================================
  // Artifact Operations
  // ===========================================================================

  async storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>> {
    const now = new Date().toISOString()
    const content = JSON.stringify(options.content)
    const expiresAt = options.ttl
      ? new Date(Date.now() + options.ttl).toISOString()
      : '2999-12-31 23:59:59'

    // Parse source URL for ns
    let ns = 'default'
    try {
      const { ns: sourceNs } = parseThingUrl(options.source)
      ns = sourceNs
    } catch {
      // Use default ns if source is not a valid URL
    }

    const id = generateId()

    await this.executor.insert('Artifacts', [{
      ns,
      id,
      type: options.type,
      thing: '',
      source: options.source,
      name: '',
      description: '',
      path: '',
      storage: '',
      content,
      code: '',
      data: {},
      meta: options.metadata ?? {},
      contentType: '',
      encoding: 'utf-8',
      size: content.length,
      hash: options.sourceHash,
      build: '',
      status: 'success',
      log: '',
      expires: expiresAt,
      event: 'created',
      ts: now,
    }])

    return {
      key: options.key,
      type: options.type,
      source: options.source,
      sourceHash: options.sourceHash,
      createdAt: new Date(now),
      expiresAt: expiresAt !== '2999-12-31 23:59:59' ? new Date(expiresAt) : undefined,
      content: options.content,
      size: content.length,
      metadata: options.metadata,
    }
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    // Parse key format: "ns:type:id" or "url:type"
    const parts = key.split(':')
    if (parts.length < 2) return null

    if (parts.length === 3) {
      // Format: ns:type:id
      const [ns, type, id] = parts
      const rows = await this.executor.query<ArtifactRow>(
        `SELECT * FROM Artifacts WHERE ns = '${escapeString(ns!)}' AND type = '${escapeString(type!)}' AND id = '${escapeString(id!)}' ORDER BY ts DESC LIMIT 1`
      )
      if (rows.length === 0) return null
      return this.rowToArtifact(rows[0]!)
    }

    // Format: url:type (legacy)
    const lastColon = key.lastIndexOf(':')
    const url = key.substring(0, lastColon)
    const type = key.substring(lastColon + 1)
    return this.getArtifactBySource(url, type as ArtifactType) as Promise<Artifact<T> | null>
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    const rows = await this.executor.query<ArtifactRow>(
      `SELECT * FROM Artifacts WHERE source = '${escapeString(source)}' AND type = '${escapeString(type)}' ORDER BY ts DESC LIMIT 1`
    )
    if (rows.length === 0) return null

    const row = rows[0]!

    // Check if expired
    if (row.expires && new Date(row.expires) < new Date()) {
      await this.deleteArtifactBySource(source, type)
      return null
    }

    return this.rowToArtifact(row)
  }

  async deleteArtifact(key: string): Promise<boolean> {
    // Parse key format: "ns:type:id" or "url:type"
    const parts = key.split(':')
    if (parts.length < 2) return false

    if (parts.length === 3) {
      const [ns, type, id] = parts
      await this.executor.command(
        `ALTER TABLE Artifacts DELETE WHERE ns = '${escapeString(ns!)}' AND type = '${escapeString(type!)}' AND id = '${escapeString(id!)}'`
      )
      return true
    }

    const lastColon = key.lastIndexOf(':')
    const url = key.substring(0, lastColon)
    const type = key.substring(lastColon + 1)
    return this.deleteArtifactBySource(url, type as ArtifactType)
  }

  async deleteArtifactBySource(source: string, type: ArtifactType): Promise<boolean> {
    await this.executor.command(
      `ALTER TABLE Artifacts DELETE WHERE source = '${escapeString(source)}' AND type = '${escapeString(type)}'`
    )
    return true
  }

  async cleanExpiredArtifacts(): Promise<number> {
    const now = new Date().toISOString()

    // Count expired artifacts first
    const countRows = await this.executor.query<{ count: string }>(
      `SELECT count() as count FROM Artifacts WHERE expires < '${now}'`
    )
    const count = parseInt(countRows[0]?.count ?? '0', 10)

    // Delete expired
    await this.executor.command(
      `ALTER TABLE Artifacts DELETE WHERE expires < '${now}'`
    )

    return count
  }

  // ===========================================================================
  // Search Operations (Hybrid Full-Text + Vector Search with HNSW)
  // ===========================================================================

  /**
   * Index content for search (with optional embedding for semantic search)
   */
  async indexForSearch(options: {
    url: string
    id?: string
    ns: string
    type: string
    title?: string
    description?: string
    content: string
    keywords?: string[]
    embedding?: number[]
    model?: string
    metadata?: Record<string, unknown>
    language?: string
    locale?: string
  }): Promise<void> {
    const now = new Date().toISOString()

    await this.executor.insert('Search', [{
      url: options.url,
      ns: options.ns,
      type: options.type,
      id: options.id ?? '',
      title: options.title ?? '',
      description: options.description ?? '',
      content: options.content,
      keywords: options.keywords ?? [],
      embedding: options.embedding ?? [],
      model: options.model ?? '',
      data: {},
      meta: options.metadata ?? {},
      language: options.language ?? 'en',
      locale: options.locale ?? 'en-US',
      event: 'created',
      ts: now,
    }])
  }

  /**
   * Full-text search
   */
  async fullTextSearch(
    query: string,
    options: {
      ns?: string
      type?: string
      limit?: number
    } = {}
  ): Promise<Array<{ url: string; title: string; content: string; score: number }>> {
    const { limit = 10 } = options
    const escapedQuery = escapeString(query.toLowerCase())

    const conditions: string[] = []

    if (options.ns) {
      conditions.push(`ns = '${escapeString(options.ns)}'`)
    }
    if (options.type) {
      conditions.push(`type = '${escapeString(options.type)}'`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const sql = `
      SELECT
        url,
        title,
        description,
        content,
        (multiSearchAllPositionsCaseInsensitive(content, ['${escapedQuery}'])[1] > 0) as hasMatch,
        length(content) as contentLen
      FROM Search
      ${whereClause}
      ORDER BY hasMatch DESC, contentLen ASC
      LIMIT ${limit}
    `

    const rows = await this.executor.query<{
      url: string
      title: string
      description: string
      content: string
      hasMatch: number
      contentLen: number
    }>(sql)

    return rows.map(row => ({
      url: row.url,
      title: row.title,
      content: row.content,
      score: row.hasMatch ? 1 : 0,
    }))
  }

  /**
   * Vector similarity search using cosine distance with HNSW index
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
    const { limit = 10, minScore = 0 } = options

    // Build embedding array literal
    const embeddingLiteral = `[${queryEmbedding.join(', ')}]`

    // Build conditions
    const conditions: string[] = [
      'length(embedding) > 0',
    ]

    if (options.model) {
      conditions.push(`model = '${escapeString(options.model)}'`)
    }
    if (options.ns) {
      conditions.push(`ns = '${escapeString(options.ns)}'`)
    }
    if (options.type) {
      conditions.push(`type = '${escapeString(options.type)}'`)
    }

    // Use cosineDistance for semantic similarity (works with HNSW index)
    const sql = `
      SELECT
        url,
        title,
        content,
        cosineDistance(embedding, ${embeddingLiteral}) as distance
      FROM Search
      WHERE ${conditions.join(' AND ')}
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    const rows = await this.executor.query<{
      url: string
      title: string
      content: string
      distance: number
    }>(sql)

    // Convert cosine distance to score (1 - distance) and filter by minScore
    // Cosine distance ranges from 0 (identical) to 2 (opposite), so score = 1 - distance/2
    return rows
      .map(row => ({
        url: row.url,
        title: row.title,
        content: row.content,
        score: 1 - row.distance / 2,
      }))
      .filter(r => r.score >= minScore)
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
      vectorResults = await this.vectorSearch(queryEmbedding, { ...options, limit: limit * 2 })
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
      const urlList = uniqueUrls.map(u => `'${escapeString(u)}'`).join(', ')
      const thingConditions: string[] = [
        `url IN (${urlList})`,
        "event != 'deleted'",
      ]

      const things = await this.executor.query<ThingRow>(
        `SELECT * FROM Things FINAL WHERE ${thingConditions.join(' AND ')}`
      )

      const thingMap = new Map(things.map(t => [t.url, this.rowToThing(t)]))

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
    await this.executor.command(
      `ALTER TABLE Search DELETE WHERE url = '${escapeString(url)}'`
    )
    return true
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private rowToThing(row: ThingRow): Thing<TData> {
    return {
      ns: row.ns,
      type: row.type,
      id: row.id,
      url: row.url,
      data: (row.data || {}) as TData,
      createdAt: new Date(row.ts),
      updatedAt: new Date(row.ts),
      '@context': row.meta?.['@context'] as string | undefined,
    }
  }

  private rowToRelationship(row: RelationshipRow): Relationship {
    return {
      id: generateRelationshipId(row.from, row.predicate, row.to),
      type: row.predicate,
      from: row.from,
      to: row.to,
      createdAt: new Date(row.ts),
      data: row.data || undefined,
    }
  }

  private rowToEvent<T extends Record<string, unknown>>(row: EventRow): Event<T> {
    return {
      id: row.ulid,
      type: row.event,
      timestamp: new Date(row.ts),
      source: row.actor,
      data: (row.objectData || {}) as T,
      correlationId: row.meta?.correlationId as string | undefined,
      causationId: row.meta?.causationId as string | undefined,
    }
  }

  private rowToAction<T extends Record<string, unknown>>(row: ActionRow): Action<T> {
    return {
      id: row.id,
      actor: row.actor,
      object: row.object,
      action: row.act, // map act column to action field
      status: row.status as ActionStatus,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      result: row.result || undefined,
      error: row.error || undefined,
      metadata: (row.data || undefined) as T | undefined,
    }
  }

  private actionToRow(action: Action): ActionRow {
    // Derive linguistic forms from the action verb
    const act = action.action
    const actionForm = `${act}s`      // e.g., publish → publishes
    const activity = `${act}ing`      // e.g., publish → publishing

    return {
      // Identity
      ns: 'default',
      id: action.id,

      // Linguistic verb conjugations
      act,
      action: actionForm,
      activity,
      event: '',

      // Actor
      actor: action.actor,
      actorData: {},

      // Target object
      object: action.object,
      objectData: {},

      // Staged objects (new)
      objects: null,
      objectsCount: 0,

      // Git integration (new)
      repo: '',
      branch: 'main',
      commit: '',
      commitMessage: '',
      commitAuthor: '',
      commitEmail: '',
      commitTs: null,
      diff: '',

      // Workflow state
      status: action.status,
      progress: 0,
      total: 0,
      result: (action.result ?? {}) as Record<string, unknown>,
      error: action.error ?? '',

      // Action data
      data: (action.metadata ?? {}) as Record<string, unknown>,
      meta: {},

      // Execution control
      priority: 5,
      attempts: 0,
      maxAttempts: 3,
      timeout: 0,
      ttl: 0,

      // Batch processing
      batch: '',
      batchIndex: 0,
      batchTotal: 0,

      // Hierarchy
      parent: '',
      children: [],
      dependencies: [],

      // Timestamps
      scheduledAt: null,
      startedAt: action.startedAt?.toISOString() ?? null,
      completedAt: action.completedAt?.toISOString() ?? null,
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
    }
  }

  private rowToArtifact<T>(row: ArtifactRow): Artifact<T> {
    let content: T
    try {
      content = JSON.parse(row.content) as T
    } catch {
      content = row.content as unknown as T
    }
    return {
      key: `${row.ns}:${row.type}:${row.id}`,
      type: row.type as ArtifactType,
      source: row.source,
      sourceHash: row.hash,
      createdAt: new Date(row.ts),
      expiresAt: row.expires ? new Date(row.expires) : undefined,
      content,
      size: row.size,
      metadata: row.meta || undefined,
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.executor.close()
  }

  /**
   * Get the underlying executor for advanced operations
   */
  getExecutor(): ClickHouseExecutor {
    return this.executor
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a ClickHouse database instance
 *
 * @example
 * ```ts
 * // Local development with chDB (persistent file storage)
 * const localDb = await createClickHouseDatabase({
 *   mode: 'chdb',
 *   url: './data/clickhouse',
 * })
 *
 * // Cloudflare Workers with HTTP client
 * const remoteDb = await createClickHouseDatabase({
 *   mode: 'http',
 *   url: 'https://your-clickhouse.example.com:8443',
 *   username: 'default',
 *   password: 'secret',
 * })
 *
 * // Track events (high-volume analytics)
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
export async function createClickHouseDatabase<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: ClickHouseConfig = {}
): Promise<ClickHouseDatabase<TData>> {
  let executor: ClickHouseExecutor

  if (config.executor) {
    // Use provided executor (for testing)
    executor = config.executor
  } else if (config.mode === 'chdb') {
    // Use chDB for local development
    const dataPath = config.url ?? './data/clickhouse'
    executor = await createChDBExecutor(dataPath)
  } else {
    // Default to HTTP mode
    executor = createHttpExecutor({
      url: config.url ?? 'http://localhost:8123',
      username: config.username,
      password: config.password,
      database: config.database,
    })
  }

  const db = new ClickHouseDatabase<TData>(executor, config.database ?? 'mdxdb')
  await db.init()
  return db
}

// Re-export types from mdxdb for convenience
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

// Provider (schema-first interface)
export { ClickHouseProvider, createClickhouseProvider } from './provider.js'
