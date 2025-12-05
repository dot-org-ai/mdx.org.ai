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
  -- Uses ReplacingMergeTree for upsert semantics with version tracking
  CREATE TABLE IF NOT EXISTS Things (
    url String,
    ns LowCardinality(String),
    type LowCardinality(String),
    id String,
    context String DEFAULT '',
    data String DEFAULT '{}',
    content String DEFAULT '',
    createdAt DateTime64(3) DEFAULT now64(3),
    updatedAt DateTime64(3) DEFAULT now64(3),
    deletedAt Nullable(DateTime64(3)),
    version UInt32 DEFAULT 1,

    -- Bloom filter index for faster JSON queries on data
    INDEX idx_data_bloom data TYPE bloom_filter GRANULARITY 1
  ) ENGINE = ReplacingMergeTree(version)
  ORDER BY (ns, type, id)
  PRIMARY KEY (ns, type, id);

  -- Relationships table (graph edges)
  -- Stores bi-directional relationships between things
  CREATE TABLE IF NOT EXISTS Relationships (
    id String,
    type LowCardinality(String),
    fromUrl String,
    toUrl String,
    data String DEFAULT '{}',
    createdAt DateTime64(3) DEFAULT now64(3),

    -- Index for reverse lookups (find things that point TO a url)
    INDEX idx_toUrl toUrl TYPE bloom_filter GRANULARITY 1
  ) ENGINE = ReplacingMergeTree(createdAt)
  ORDER BY (fromUrl, type, toUrl)
  PRIMARY KEY (fromUrl, type, toUrl);

  -- Events table (immutable event log - append-only)
  -- Partitioned by month for efficient time-based queries and retention
  CREATE TABLE IF NOT EXISTS Events (
    id String,
    type LowCardinality(String),
    url Nullable(String),
    timestamp DateTime64(3) DEFAULT now64(3),
    source String,
    data String DEFAULT '{}',
    correlationId Nullable(String),
    causationId Nullable(String),

    -- Index for correlation chain lookups
    INDEX idx_correlation correlationId TYPE bloom_filter GRANULARITY 1,
    INDEX idx_causation causationId TYPE bloom_filter GRANULARITY 1
  ) ENGINE = MergeTree()
  ORDER BY (type, timestamp, id)
  PARTITION BY toYYYYMM(timestamp);

  -- Actions table (pending/active work with progress tracking)
  -- Following Activity Streams pattern: actor performs action on object
  CREATE TABLE IF NOT EXISTS Actions (
    id String,
    type LowCardinality(String),
    actor String,
    object String,
    status LowCardinality(String) DEFAULT 'pending',
    progress UInt32 DEFAULT 0,
    total UInt32 DEFAULT 0,
    data String DEFAULT '{}',
    result String DEFAULT '',
    error String DEFAULT '',
    createdAt DateTime64(3) DEFAULT now64(3),
    updatedAt DateTime64(3) DEFAULT now64(3),
    startedAt Nullable(DateTime64(3)),
    completedAt Nullable(DateTime64(3)),

    -- Index for finding actions by status
    INDEX idx_status status TYPE set(10) GRANULARITY 1
  ) ENGINE = ReplacingMergeTree(updatedAt)
  ORDER BY (status, type, createdAt, id)
  PRIMARY KEY (status, type, createdAt);

  -- Artifacts table (cached compiled content, embeddings, etc.)
  -- Used for: AST, ESM bundles, HTML, embeddings, computed content
  CREATE TABLE IF NOT EXISTS Artifacts (
    url String,
    type LowCardinality(String),
    sourceHash String,
    content String,
    size UInt64 DEFAULT 0,
    metadata String DEFAULT '{}',
    createdAt DateTime64(3) DEFAULT now64(3),
    expiresAt Nullable(DateTime64(3)),

    -- Index for finding expired artifacts
    INDEX idx_expires expiresAt TYPE minmax GRANULARITY 1
  ) ENGINE = ReplacingMergeTree(createdAt)
  ORDER BY (url, type)
  PRIMARY KEY (url, type);

  -- Search table (hybrid full-text + vector search with chunking)
  -- Stores searchable content chunks with embeddings for semantic search
  CREATE TABLE IF NOT EXISTS Search (
    url String,
    chunk UInt16 DEFAULT 0,
    ns LowCardinality(String),
    type LowCardinality(String),
    title String DEFAULT '',
    content String DEFAULT '',
    embedding Array(Float32),
    model LowCardinality(String) DEFAULT 'default',
    dimensions UInt16 DEFAULT 0,
    sourceHash String,
    metadata String DEFAULT '{}',
    createdAt DateTime64(3) DEFAULT now64(3),

    -- Full-text index on content and title
    INDEX idx_content content TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1,
    INDEX idx_title title TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1
  ) ENGINE = ReplacingMergeTree(createdAt)
  ORDER BY (ns, type, url, chunk)
  PRIMARY KEY (ns, type, url, chunk);
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
    const conditions: string[] = ['deletedAt IS NULL']

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

    let orderClause = 'ORDER BY updatedAt DESC'
    if (options.orderBy) {
      const dir = options.order === 'desc' ? 'DESC' : 'ASC'
      if (['url', 'ns', 'type', 'id', 'createdAt', 'updatedAt'].includes(options.orderBy)) {
        orderClause = `ORDER BY ${options.orderBy} ${dir}`
      } else {
        orderClause = `ORDER BY JSONExtractString(data, '${options.orderBy}') ${dir}`
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
      'deletedAt IS NULL',
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
      `SELECT * FROM Things FINAL ${whereClause} ORDER BY updatedAt DESC ${limitClause} ${offsetClause}`
    )
    return rows.map(row => this.rowToThing(row))
  }

  async get(url: string): Promise<Thing<TData> | null> {
    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM Things FINAL WHERE url = '${escapeString(url)}' AND deletedAt IS NULL LIMIT 1`
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
      context: '',
      data: JSON.stringify(data),
      content: '',
      createdAt: existing?.createdAt?.toISOString() ?? now,
      updatedAt: now,
      deletedAt: null,
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

    await this.executor.insert('Things', [{
      url,
      ns: options.ns,
      type: options.type,
      id,
      context: options['@context'] ? JSON.stringify(options['@context']) : '',
      data: JSON.stringify(options.data),
      content: '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
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
    await this.executor.insert('Things', [{
      url,
      ns,
      type,
      id,
      context: '',
      data: JSON.stringify(existing.data),
      content: '',
      createdAt: existing.createdAt.toISOString(),
      updatedAt: now,
      deletedAt: now,
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

    await this.executor.insert('Relationships', [{
      id,
      type: options.type,
      fromUrl: options.from,
      toUrl: options.to,
      data: options.data ? JSON.stringify(options.data) : '',
      createdAt: now,
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
      `ALTER TABLE Relationships DELETE WHERE fromUrl = '${escapeString(from)}' AND type = '${escapeString(type)}' AND toUrl = '${escapeString(to)}'`
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
      const rows = await this.executor.query<{ toUrl: string }>(
        `SELECT toUrl FROM Relationships FINAL WHERE fromUrl = '${escapeString(url)}' ${typeClause}`
      )
      urls.push(...rows.map(r => r.to_url))
    }

    if (direction === 'to' || direction === 'both') {
      const typeClause = relationshipType ? `AND type = '${escapeString(relationshipType)}'` : ''
      const rows = await this.executor.query<{ fromUrl: string }>(
        `SELECT fromUrl FROM Relationships FINAL WHERE toUrl = '${escapeString(url)}' ${typeClause}`
      )
      urls.push(...rows.map(r => r.from_url))
    }

    const uniqueUrls = [...new Set(urls)]
    if (uniqueUrls.length === 0) return []

    const urlList = uniqueUrls.map(u => `'${escapeString(u)}'`).join(', ')
    const rows = await this.executor.query<ThingRow>(
      `SELECT * FROM Things FINAL WHERE url IN (${urlList}) AND deletedAt IS NULL`
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
        `SELECT * FROM Relationships FINAL WHERE fromUrl = '${escapeString(url)}' ${typeClause}`
      )
      results.push(...rows.map(row => this.rowToRelationship(row)))
    }

    if (direction === 'to' || direction === 'both') {
      const typeClause = type ? `AND type = '${escapeString(type)}'` : ''
      const rows = await this.executor.query<RelationshipRow>(
        `SELECT * FROM Relationships FINAL WHERE toUrl = '${escapeString(url)}' ${typeClause}`
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

    await this.executor.insert('Events', [{
      id,
      type: options.type,
      timestamp: now,
      source: options.source,
      data: JSON.stringify(options.data),
      correlationId: options.correlationId ?? null,
      causationId: options.causationId ?? null,
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
      `SELECT * FROM Events WHERE id = '${escapeString(id)}' LIMIT 1`
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
      conditions.push(`correlationId = '${escapeString(options.correlationId)}'`)
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
      `SELECT * FROM Events ${whereClause} ORDER BY timestamp DESC ${limitClause} ${offsetClause}`
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

    await this.executor.insert('Actions', [{
      id,
      type: options.action,
      actor: options.actor,
      object: options.object,
      status: options.status ?? 'pending',
      progress: 0,
      total: 0,
      data: options.metadata ? JSON.stringify(options.metadata) : '{}',
      result: '',
      error: '',
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
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

    await this.executor.insert('Actions', [{
      id,
      type: options.action,
      actor: options.actor,
      object: options.object,
      status: 'active',
      progress: 0,
      total: 0,
      data: options.metadata ? JSON.stringify(options.metadata) : '{}',
      result: '',
      error: '',
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      completedAt: null,
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
      : null

    await this.executor.insert('Artifacts', [{
      url: options.source,
      type: options.type,
      sourceHash: options.sourceHash,
      content,
      size: content.length,
      metadata: options.metadata ? JSON.stringify(options.metadata) : '{}',
      createdAt: now,
      expiresAt: expiresAt,
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
    // Parse key format: "url:type"
    const lastColon = key.lastIndexOf(':')
    if (lastColon === -1) return null
    const url = key.substring(0, lastColon)
    const type = key.substring(lastColon + 1)

    return this.getArtifactBySource(url, type as ArtifactType) as Promise<Artifact<T> | null>
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    const rows = await this.executor.query<ArtifactRow>(
      `SELECT * FROM Artifacts FINAL WHERE url = '${escapeString(source)}' AND type = '${escapeString(type)}' LIMIT 1`
    )
    if (rows.length === 0) return null

    const row = rows[0]!

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.deleteArtifactBySource(source, type)
      return null
    }

    return this.rowToArtifact(row)
  }

  async deleteArtifact(key: string): Promise<boolean> {
    // Parse key format: "url:type"
    const lastColon = key.lastIndexOf(':')
    if (lastColon === -1) return false
    const url = key.substring(0, lastColon)
    const type = key.substring(lastColon + 1)

    return this.deleteArtifactBySource(url, type as ArtifactType)
  }

  async deleteArtifactBySource(url: string, type: ArtifactType): Promise<boolean> {
    await this.executor.command(
      `ALTER TABLE Artifacts DELETE WHERE url = '${escapeString(url)}' AND type = '${escapeString(type)}'`
    )
    return true
  }

  async cleanExpiredArtifacts(): Promise<number> {
    const now = new Date().toISOString()

    // Count expired artifacts first
    const countRows = await this.executor.query<{ count: string }>(
      `SELECT count() as count FROM Artifacts FINAL WHERE expiresAt IS NOT NULL AND expiresAt < '${now}'`
    )
    const count = parseInt(countRows[0]?.count ?? '0', 10)

    // Delete expired
    await this.executor.command(
      `ALTER TABLE Artifacts DELETE WHERE expiresAt IS NOT NULL AND expiresAt < '${now}'`
    )

    return count
  }

  // ===========================================================================
  // Embedding Operations (Vector Search)
  // ===========================================================================

  /**
   * Store an embedding for a URL
   */
  async storeEmbedding(
    url: string,
    model: string,
    embedding: number[],
    sourceHash: string
  ): Promise<void> {
    const now = new Date().toISOString()

    await this.executor.insert('Search', [{
      url,
      model,
      embedding,
      dimensions: embedding.length,
      sourceHash: sourceHash,
      createdAt: now,
    }])
  }

  /**
   * Get embedding for a URL and model
   */
  async getEmbedding(url: string, model: string): Promise<number[] | null> {
    const rows = await this.executor.query<EmbeddingRow>(
      `SELECT * FROM Search FINAL WHERE url = '${escapeString(url)}' AND model = '${escapeString(model)}' LIMIT 1`
    )
    if (rows.length === 0) return null
    return rows[0]!.embedding
  }

  /**
   * Search for similar items using vector similarity
   * Uses L2 distance (Euclidean distance)
   */
  async searchByEmbedding(
    queryEmbedding: number[],
    options: {
      model?: string
      limit?: number
      minScore?: number
      ns?: string
      type?: string
    } = {}
  ): Promise<Array<{ url: string; score: number; thing?: Thing<TData> }>> {
    const { model = 'default', limit = 10, minScore = 0 } = options

    // Build embedding array literal
    const embeddingLiteral = `[${queryEmbedding.join(', ')}]`

    // Build conditions
    const conditions: string[] = [`model = '${escapeString(model)}'`]

    let sql = `
      SELECT
        url,
        L2Distance(embedding, ${embeddingLiteral}) as distance
      FROM Search FINAL
      WHERE ${conditions.join(' AND ')}
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    const rows = await this.executor.query<{ url: string; distance: number }>(sql)

    // Convert distance to score (1 / (1 + distance)) and filter by minScore
    const results = rows
      .map(row => ({
        url: row.url,
        score: 1 / (1 + row.distance),
      }))
      .filter(r => r.score >= minScore)

    // Optionally fetch the things
    if (results.length > 0) {
      const urlList = results.map(r => `'${escapeString(r.url)}'`).join(', ')
      const thingConditions: string[] = [
        `url IN (${urlList})`,
        'deletedAt IS NULL',
      ]

      if (options.ns) {
        thingConditions.push(`ns = '${escapeString(options.ns)}'`)
      }
      if (options.type) {
        thingConditions.push(`type = '${escapeString(options.type)}'`)
      }

      const things = await this.executor.query<ThingRow>(
        `SELECT * FROM Things FINAL WHERE ${thingConditions.join(' AND ')}`
      )

      const thingMap = new Map(things.map(t => [t.url, this.rowToThing(t)]))

      return results.map(r => ({
        ...r,
        thing: thingMap.get(r.url),
      }))
    }

    return results
  }

  /**
   * Delete embedding for a URL and model
   */
  async deleteEmbedding(url: string, model: string): Promise<boolean> {
    await this.executor.command(
      `ALTER TABLE Search DELETE WHERE url = '${escapeString(url)}' AND model = '${escapeString(model)}'`
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
      data: JSON.parse(row.data || '{}') as TData,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      '@context': row.context ? JSON.parse(row.context) : undefined,
    }
  }

  private rowToRelationship(row: RelationshipRow): Relationship {
    return {
      id: row.id,
      type: row.type,
      from: row.fromUrl,
      to: row.toUrl,
      createdAt: new Date(row.createdAt),
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
      correlationId: row.correlationId ?? undefined,
      causationId: row.causationId ?? undefined,
    }
  }

  private rowToAction<T extends Record<string, unknown>>(row: ActionRow): Action<T> {
    return {
      id: row.id,
      actor: row.actor,
      object: row.object,
      action: row.type, // map type column to action field
      status: row.status as ActionStatus,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      metadata: row.data ? JSON.parse(row.data) as T : undefined,
    }
  }

  private actionToRow(action: Action): ActionRow {
    return {
      id: action.id,
      type: action.action, // map action field to type column
      actor: action.actor,
      object: action.object,
      status: action.status,
      progress: 0, // Default to 0, could be extended
      total: 0,
      data: action.metadata ? JSON.stringify(action.metadata) : '{}',
      result: action.result ? JSON.stringify(action.result) : '',
      error: action.error ?? '',
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
      startedAt: action.startedAt?.toISOString() ?? null,
      completedAt: action.completedAt?.toISOString() ?? null,
    }
  }

  private rowToArtifact<T>(row: ArtifactRow): Artifact<T> {
    return {
      key: `${row.url}:${row.type}`, // compose key from url and type
      type: row.type as ArtifactType,
      source: row.url, // url is the source
      sourceHash: row.sourceHash,
      createdAt: new Date(row.createdAt),
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
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
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  version: number
}

interface RelationshipRow {
  id: string
  type: string
  fromUrl: string
  toUrl: string
  data: string
  createdAt: string
}

interface EventRow {
  id: string
  type: string
  url: string | null
  timestamp: string
  source: string
  data: string
  correlationId: string | null
  causationId: string | null
}

interface ActionRow {
  id: string
  type: string
  actor: string
  object: string
  status: string
  progress: number
  total: number
  data: string
  result: string
  error: string
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

interface ArtifactRow {
  url: string
  type: string
  sourceHash: string
  content: string
  size: number
  metadata: string
  createdAt: string
  expiresAt: string | null
}

interface SearchRow {
  url: string
  chunk: number
  ns: string
  type: string
  title: string
  content: string
  embedding: number[]
  model: string
  dimensions: number
  sourceHash: string
  metadata: string
  createdAt: string
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
