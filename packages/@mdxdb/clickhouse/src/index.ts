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
// Schema
// =============================================================================

const SCHEMA = `
  -- Things table (graph nodes)
  CREATE TABLE IF NOT EXISTS things (
    url String,
    ns String,
    type String,
    id String,
    context String DEFAULT '',
    data String DEFAULT '{}',
    content String DEFAULT '',
    created_at DateTime64(3) DEFAULT now64(3),
    updated_at DateTime64(3) DEFAULT now64(3),
    deleted_at Nullable(DateTime64(3)),
    version UInt32 DEFAULT 1
  ) ENGINE = ReplacingMergeTree(version)
  ORDER BY (ns, type, id)
  PRIMARY KEY (ns, type, id);

  -- Relationships table (graph edges)
  CREATE TABLE IF NOT EXISTS relationships (
    id String,
    type String,
    from_url String,
    to_url String,
    data String DEFAULT '',
    created_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(created_at)
  ORDER BY (from_url, type, to_url)
  PRIMARY KEY (from_url, type, to_url);

  -- Events table (immutable event log - append-only)
  CREATE TABLE IF NOT EXISTS events (
    id String,
    type String,
    timestamp DateTime64(3) DEFAULT now64(3),
    source String,
    data String DEFAULT '{}',
    correlation_id Nullable(String),
    causation_id Nullable(String)
  ) ENGINE = MergeTree()
  ORDER BY (type, timestamp)
  PARTITION BY toYYYYMM(timestamp);

  -- Actions table (pending/active work)
  CREATE TABLE IF NOT EXISTS actions (
    id String,
    actor String,
    object String,
    action String,
    status String DEFAULT 'pending',
    created_at DateTime64(3) DEFAULT now64(3),
    updated_at DateTime64(3) DEFAULT now64(3),
    started_at Nullable(DateTime64(3)),
    completed_at Nullable(DateTime64(3)),
    result String DEFAULT '',
    error String DEFAULT '',
    metadata String DEFAULT ''
  ) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (actor, status, id)
  PRIMARY KEY (actor, status, id);

  -- Artifacts table (cached compiled content)
  CREATE TABLE IF NOT EXISTS artifacts (
    key String,
    type String,
    source String,
    source_hash String,
    created_at DateTime64(3) DEFAULT now64(3),
    expires_at Nullable(DateTime64(3)),
    content String,
    size UInt64 DEFAULT 0,
    metadata String DEFAULT ''
  ) ENGINE = ReplacingMergeTree(created_at)
  ORDER BY (source, type)
  PRIMARY KEY (source, type);
`

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
    const statements = SCHEMA
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const statement of statements) {
      await this.executor.command(statement)
    }
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    const conditions: string[] = ['deleted_at IS NULL']

    if (options.ns) {
      conditions.push(`ns = '${escapeString(options.ns)}'`)
    }

    if (options.type) {
      conditions.push(`type = '${escapeString(options.type)}'`)
    }

    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
        conditions.push(`JSONExtractString(data, '${key}') = '${escapeString(jsonValue)}'`)
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    let orderClause = 'ORDER BY updated_at DESC'
    if (options.orderBy) {
      const dir = options.order === 'desc' ? 'DESC' : 'ASC'
      if (['url', 'ns', 'type', 'id', 'created_at', 'updated_at'].includes(options.orderBy)) {
        orderClause = `ORDER BY ${options.orderBy} ${dir}`
      } else {
        orderClause = `ORDER BY JSONExtractString(data, '${options.orderBy}') ${dir}`
      }
    }

    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM things FINAL ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToThing(row))
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    return this.list(options)
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    const query = escapeString(options.query.toLowerCase())
    const conditions: string[] = [
      'deleted_at IS NULL',
      `(positionCaseInsensitive(id, '${query}') > 0 OR positionCaseInsensitive(data, '${query}') > 0 OR positionCaseInsensitive(content, '${query}') > 0)`,
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
      `SELECT * FROM things FINAL ${whereClause} ORDER BY updated_at DESC ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToThing(row))
  }

  async get(url: string): Promise<Thing<TData> | null> {
    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM things FINAL WHERE url = '${escapeString(url)}' AND deleted_at IS NULL LIMIT 1`
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

    await this.executor.insert('things', [{
      url,
      ns,
      type,
      id,
      context: '',
      data: JSON.stringify(data),
      content: '',
      created_at: existing?.createdAt?.toISOString() ?? now,
      updated_at: now,
      deleted_at: null,
      version,
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

    await this.executor.insert('things', [{
      url,
      ns: options.ns,
      type: options.type,
      id,
      context: options['@context'] ? JSON.stringify(options['@context']) : '',
      data: JSON.stringify(options.data),
      content: '',
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
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

    // Soft delete by setting deleted_at
    await this.executor.insert('things', [{
      url,
      ns,
      type,
      id,
      context: '',
      data: JSON.stringify(existing.data),
      content: '',
      created_at: existing.createdAt.toISOString(),
      updated_at: now,
      deleted_at: now,
      version: (existing as any).version + 1,
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
    const id = generateRelationshipId(options.from, options.type, options.to)
    const now = new Date().toISOString()

    await this.executor.insert('relationships', [{
      id,
      type: options.type,
      from_url: options.from,
      to_url: options.to,
      data: options.data ? JSON.stringify(options.data) : '',
      created_at: now,
    }])

    return {
      id,
      type: options.type,
      from: options.from,
      to: options.to,
      createdAt: new Date(now),
      data: options.data,
    }
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    await this.executor.command(
      `ALTER TABLE relationships DELETE WHERE from_url = '${escapeString(from)}' AND type = '${escapeString(type)}' AND to_url = '${escapeString(to)}'`
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
      const typeClause = relationshipType ? `AND type = '${escapeString(relationshipType)}'` : ''
      const rows = await this.executor.query<{ to_url: string }>(
        `SELECT to_url FROM relationships FINAL WHERE from_url = '${escapeString(url)}' ${typeClause}`
      )
      urls.push(...rows.map(r => r.to_url))
    }

    if (direction === 'to' || direction === 'both') {
      const typeClause = relationshipType ? `AND type = '${escapeString(relationshipType)}'` : ''
      const rows = await this.executor.query<{ from_url: string }>(
        `SELECT from_url FROM relationships FINAL WHERE to_url = '${escapeString(url)}' ${typeClause}`
      )
      urls.push(...rows.map(r => r.from_url))
    }

    const uniqueUrls = [...new Set(urls)]
    if (uniqueUrls.length === 0) return []

    const urlList = uniqueUrls.map(u => `'${escapeString(u)}'`).join(', ')
    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM things FINAL WHERE url IN (${urlList}) AND deleted_at IS NULL`
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
      const typeClause = type ? `AND type = '${escapeString(type)}'` : ''
      const rows = await this.executor.query<RelationshipRow>(
        `SELECT * FROM relationships FINAL WHERE from_url = '${escapeString(url)}' ${typeClause}`
      )
      results.push(...rows.map(row => this.rowToRelationship(row)))
    }

    if (direction === 'to' || direction === 'both') {
      const typeClause = type ? `AND type = '${escapeString(type)}'` : ''
      const rows = await this.executor.query<RelationshipRow>(
        `SELECT * FROM relationships FINAL WHERE to_url = '${escapeString(url)}' ${typeClause}`
      )
      results.push(...rows.map(row => this.rowToRelationship(row)))
    }

    return results
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    return this.related(url, relationshipType, 'to')
  }

  // ===========================================================================
  // Event Operations
  // ===========================================================================

  async track<T extends Record<string, unknown>>(
    options: CreateEventOptions<T>
  ): Promise<Event<T>> {
    const id = generateId()
    const now = new Date().toISOString()

    await this.executor.insert('events', [{
      id,
      type: options.type,
      timestamp: now,
      source: options.source,
      data: JSON.stringify(options.data),
      correlation_id: options.correlationId ?? null,
      causation_id: options.causationId ?? null,
    }])

    return {
      id,
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
      `SELECT * FROM events WHERE id = '${escapeString(id)}' LIMIT 1`
    )
    if (rows.length === 0) return null
    return this.rowToEvent(rows[0]!)
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    const conditions: string[] = []

    if (options.type) {
      conditions.push(`type = '${escapeString(options.type)}'`)
    }

    if (options.source) {
      conditions.push(`source = '${escapeString(options.source)}'`)
    }

    if (options.correlationId) {
      conditions.push(`correlation_id = '${escapeString(options.correlationId)}'`)
    }

    if (options.after) {
      conditions.push(`timestamp > '${options.after.toISOString()}'`)
    }

    if (options.before) {
      conditions.push(`timestamp < '${options.before.toISOString()}'`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const rows = await this.executor.query<EventRow>(
      `SELECT * FROM events ${whereClause} ORDER BY timestamp DESC ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToEvent(row))
  }

  // ===========================================================================
  // Action Operations ($.do, $.try, $.send patterns)
  // ===========================================================================

  async send<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const id = generateId()
    const now = new Date().toISOString()

    await this.executor.insert('actions', [{
      id,
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: options.status ?? 'pending',
      created_at: now,
      updated_at: now,
      started_at: null,
      completed_at: null,
      result: '',
      error: '',
      metadata: options.metadata ? JSON.stringify(options.metadata) : '',
    }])

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
  }

  async do<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const id = generateId()
    const now = new Date().toISOString()

    await this.executor.insert('actions', [{
      id,
      actor: options.actor,
      object: options.object,
      action: options.action,
      status: 'active',
      created_at: now,
      updated_at: now,
      started_at: now,
      completed_at: null,
      result: '',
      error: '',
      metadata: options.metadata ? JSON.stringify(options.metadata) : '',
    }])

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
      `SELECT * FROM actions FINAL WHERE id = '${escapeString(id)}' LIMIT 1`
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
      conditions.push(`action = '${escapeString(options.action)}'`)
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
      `SELECT * FROM actions FINAL ${whereClause} ORDER BY created_at DESC ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToAction(row))
  }

  async startAction(id: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date().toISOString()

    await this.executor.insert('actions', [{
      ...this.actionToRow(existing),
      status: 'active',
      started_at: now,
      updated_at: now,
    }])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date().toISOString()

    await this.executor.insert('actions', [{
      ...this.actionToRow(existing),
      status: 'completed',
      completed_at: now,
      updated_at: now,
      result: result !== undefined ? JSON.stringify(result) : '',
    }])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async failAction(id: string, error: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date().toISOString()

    await this.executor.insert('actions', [{
      ...this.actionToRow(existing),
      status: 'failed',
      completed_at: now,
      updated_at: now,
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

    await this.executor.insert('actions', [{
      ...this.actionToRow(existing),
      status: 'cancelled',
      completed_at: now,
      updated_at: now,
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
      : null

    await this.executor.insert('artifacts', [{
      key: options.key,
      type: options.type,
      source: options.source,
      source_hash: options.sourceHash,
      created_at: now,
      expires_at: expiresAt,
      content,
      size: content.length,
      metadata: options.metadata ? JSON.stringify(options.metadata) : '',
    }])

    return {
      key: options.key,
      type: options.type,
      source: options.source,
      sourceHash: options.sourceHash,
      createdAt: new Date(now),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      content: options.content,
      size: content.length,
      metadata: options.metadata,
    }
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    const rows = await this.executor.query<ArtifactRow>(
      `SELECT * FROM artifacts FINAL WHERE key = '${escapeString(key)}' LIMIT 1`
    )
    if (rows.length === 0) return null

    const row = rows[0]!

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.deleteArtifact(key)
      return null
    }

    return this.rowToArtifact<T>(row)
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    const rows = await this.executor.query<ArtifactRow>(
      `SELECT * FROM artifacts FINAL WHERE source = '${escapeString(source)}' AND type = '${escapeString(type)}' LIMIT 1`
    )
    if (rows.length === 0) return null

    const row = rows[0]!

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.deleteArtifact(row.key)
      return null
    }

    return this.rowToArtifact(row)
  }

  async deleteArtifact(key: string): Promise<boolean> {
    await this.executor.command(
      `ALTER TABLE artifacts DELETE WHERE key = '${escapeString(key)}'`
    )
    return true
  }

  async cleanExpiredArtifacts(): Promise<number> {
    const now = new Date().toISOString()

    // Count expired artifacts first
    const countRows = await this.executor.query<{ count: string }>(
      `SELECT count() as count FROM artifacts FINAL WHERE expires_at IS NOT NULL AND expires_at < '${now}'`
    )
    const count = parseInt(countRows[0]?.count ?? '0', 10)

    // Delete expired
    await this.executor.command(
      `ALTER TABLE artifacts DELETE WHERE expires_at IS NOT NULL AND expires_at < '${now}'`
    )

    return count
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
      data: JSON.parse(row.data || '{}') as TData,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      '@context': row.context ? JSON.parse(row.context) : undefined,
    }
  }

  private rowToRelationship(row: RelationshipRow): Relationship {
    return {
      id: row.id,
      type: row.type,
      from: row.from_url,
      to: row.to_url,
      createdAt: new Date(row.created_at),
      data: row.data ? JSON.parse(row.data) : undefined,
    }
  }

  private rowToEvent<T extends Record<string, unknown>>(row: EventRow): Event<T> {
    return {
      id: row.id,
      type: row.type,
      timestamp: new Date(row.timestamp),
      source: row.source,
      data: JSON.parse(row.data || '{}') as T,
      correlationId: row.correlation_id ?? undefined,
      causationId: row.causation_id ?? undefined,
    }
  }

  private rowToAction<T extends Record<string, unknown>>(row: ActionRow): Action<T> {
    return {
      id: row.id,
      actor: row.actor,
      object: row.object,
      action: row.action,
      status: row.status as ActionStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) as T : undefined,
    }
  }

  private actionToRow(action: Action): ActionRow {
    return {
      id: action.id,
      actor: action.actor,
      object: action.object,
      action: action.action,
      status: action.status,
      created_at: action.createdAt.toISOString(),
      updated_at: action.updatedAt.toISOString(),
      started_at: action.startedAt?.toISOString() ?? null,
      completed_at: action.completedAt?.toISOString() ?? null,
      result: action.result ? JSON.stringify(action.result) : '',
      error: action.error ?? '',
      metadata: action.metadata ? JSON.stringify(action.metadata) : '',
    }
  }

  private rowToArtifact<T>(row: ArtifactRow): Artifact<T> {
    return {
      key: row.key,
      type: row.type as ArtifactType,
      source: row.source,
      sourceHash: row.source_hash,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      content: JSON.parse(row.content) as T,
      size: row.size,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
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
// Row Types
// =============================================================================

interface ThingRow {
  url: string
  ns: string
  type: string
  id: string
  context: string
  data: string
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  version: number
}

interface RelationshipRow {
  id: string
  type: string
  from_url: string
  to_url: string
  data: string
  created_at: string
}

interface EventRow {
  id: string
  type: string
  timestamp: string
  source: string
  data: string
  correlation_id: string | null
  causation_id: string | null
}

interface ActionRow {
  id: string
  actor: string
  object: string
  action: string
  status: string
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  result: string
  error: string
  metadata: string
}

interface ArtifactRow {
  key: string
  type: string
  source: string
  source_hash: string
  created_at: string
  expires_at: string | null
  content: string
  size: number
  metadata: string
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
