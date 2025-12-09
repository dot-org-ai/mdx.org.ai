/**
 * @mdxdb/postgres - PostgreSQL adapter for mdxdb
 *
 * Uses pg client for PostgreSQL with pgvector extension:
 * - Things: Graph nodes following ai-database conventions
 * - Relationships: Graph edges between things
 * - Search: Content with vector embeddings for semantic search (pgvector)
 * - Events: Immutable event log
 * - Actions: Durable action tracking
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
} from 'ai-database'

export const name = '@mdxdb/postgres'

// =============================================================================
// Client Abstraction
// =============================================================================

/**
 * Abstract interface for PostgreSQL operations
 */
export interface PostgresExecutor {
  /** Execute a query and return results */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  /** Execute a command (no results expected) */
  command(sql: string, params?: unknown[]): Promise<void>
  /** Close connection/cleanup */
  close(): Promise<void>
}

// =============================================================================
// PostgreSQL Client
// =============================================================================

/**
 * Configuration for PostgreSQL client
 */
export interface PostgresClientConfig {
  /** Connection string or config */
  connectionString?: string
  /** Host */
  host?: string
  /** Port */
  port?: number
  /** Database name */
  database?: string
  /** Username */
  user?: string
  /** Password */
  password?: string
  /** SSL configuration */
  ssl?: boolean | { rejectUnauthorized?: boolean }
}

/**
 * Create a PostgreSQL executor using pg client
 */
export function createPostgresExecutor(config: PostgresClientConfig): PostgresExecutor {
  // Dynamic import to support both Node.js and edge environments
  let client: any
  let connected = false

  const getClient = async () => {
    if (!client) {
      const { Client } = await import('pg')
      client = new Client(config.connectionString || {
        host: config.host ?? 'localhost',
        port: config.port ?? 5432,
        database: config.database ?? 'mdxdb',
        user: config.user ?? 'postgres',
        password: config.password,
        ssl: config.ssl,
      })
    }
    if (!connected) {
      await client.connect()
      connected = true
    }
    return client
  }

  return {
    async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
      const pg = await getClient()
      const result = await pg.query(sql, params)
      return result.rows as T[]
    },

    async command(sql: string, params: unknown[] = []): Promise<void> {
      const pg = await getClient()
      await pg.query(sql, params)
    },

    async close(): Promise<void> {
      if (client && connected) {
        await client.end()
        connected = false
      }
    },
  }
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for PostgreSQL database
 */
export interface PostgresConfig {
  /** Connection string (e.g., postgresql://user:pass@host:port/db) */
  connectionString?: string
  /** Host (default: localhost) */
  host?: string
  /** Port (default: 5432) */
  port?: number
  /** Database name (default: mdxdb) */
  database?: string
  /** Username (default: postgres) */
  user?: string
  /** Password */
  password?: string
  /** SSL configuration */
  ssl?: boolean | { rejectUnauthorized?: boolean }
  /** Schema name (default: public) */
  schema?: string
  /** Custom executor (for testing or advanced use) */
  executor?: PostgresExecutor
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
// Schema
// =============================================================================

const SCHEMA_SQL = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Things table
CREATE TABLE IF NOT EXISTS things (
  url TEXT PRIMARY KEY,
  ns TEXT NOT NULL,
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  variant TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  repo TEXT NOT NULL DEFAULT '',
  patch TEXT NOT NULL DEFAULT '',
  commit TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  content TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  meta JSONB NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'tenant',
  event TEXT NOT NULL DEFAULT 'created',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT things_ns_type_id_unique UNIQUE (ns, type, id)
);

CREATE INDEX IF NOT EXISTS things_ns_idx ON things(ns);
CREATE INDEX IF NOT EXISTS things_type_idx ON things(type);
CREATE INDEX IF NOT EXISTS things_ns_type_idx ON things(ns, type);
CREATE INDEX IF NOT EXISTS things_event_idx ON things(event);
CREATE INDEX IF NOT EXISTS things_ts_idx ON things(ts);
CREATE INDEX IF NOT EXISTS things_data_idx ON things USING gin(data);

-- Relationships table
CREATE TABLE IF NOT EXISTS relationships (
  ns TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  predicate TEXT NOT NULL,
  reverse TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  meta JSONB NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT '',
  event TEXT NOT NULL DEFAULT 'created',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ns, "from", predicate, "to", ts)
);

CREATE INDEX IF NOT EXISTS relationships_from_idx ON relationships("from");
CREATE INDEX IF NOT EXISTS relationships_to_idx ON relationships("to");
CREATE INDEX IF NOT EXISTS relationships_predicate_idx ON relationships(predicate);
CREATE INDEX IF NOT EXISTS relationships_event_idx ON relationships(event);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  ulid TEXT PRIMARY KEY,
  ns TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_data JSONB NOT NULL DEFAULT '{}',
  event TEXT NOT NULL,
  object TEXT NOT NULL DEFAULT '',
  object_data JSONB NOT NULL DEFAULT '{}',
  result TEXT NOT NULL DEFAULT '',
  result_data JSONB NOT NULL DEFAULT '{}',
  meta JSONB NOT NULL DEFAULT '{}',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_ns_idx ON events(ns);
CREATE INDEX IF NOT EXISTS events_actor_idx ON events(actor);
CREATE INDEX IF NOT EXISTS events_event_idx ON events(event);
CREATE INDEX IF NOT EXISTS events_ts_idx ON events(ts);

-- Actions table
CREATE TABLE IF NOT EXISTS actions (
  ns TEXT NOT NULL,
  id TEXT NOT NULL,
  act TEXT NOT NULL,
  action TEXT NOT NULL,
  activity TEXT NOT NULL,
  event TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL,
  actor_data JSONB NOT NULL DEFAULT '{}',
  object TEXT NOT NULL,
  object_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  result JSONB NOT NULL DEFAULT '{}',
  error TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  meta JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  timeout INTEGER NOT NULL DEFAULT 0,
  ttl INTEGER NOT NULL DEFAULT 0,
  batch TEXT NOT NULL DEFAULT '',
  batch_index INTEGER NOT NULL DEFAULT 0,
  batch_total INTEGER NOT NULL DEFAULT 0,
  parent TEXT NOT NULL DEFAULT '',
  children TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  dependencies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ns, id, updated_at)
);

CREATE INDEX IF NOT EXISTS actions_id_idx ON actions(id);
CREATE INDEX IF NOT EXISTS actions_actor_idx ON actions(actor);
CREATE INDEX IF NOT EXISTS actions_object_idx ON actions(object);
CREATE INDEX IF NOT EXISTS actions_status_idx ON actions(status);
CREATE INDEX IF NOT EXISTS actions_created_at_idx ON actions(created_at);

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
  ns TEXT NOT NULL,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  thing TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '',
  storage TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  meta JSONB NOT NULL DEFAULT '{}',
  content_type TEXT NOT NULL DEFAULT '',
  encoding TEXT NOT NULL DEFAULT 'utf-8',
  size INTEGER NOT NULL DEFAULT 0,
  hash TEXT NOT NULL DEFAULT '',
  build TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'success',
  log TEXT NOT NULL DEFAULT '',
  expires TIMESTAMPTZ NOT NULL DEFAULT '2999-12-31 23:59:59',
  event TEXT NOT NULL DEFAULT 'created',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ns, id, ts)
);

CREATE INDEX IF NOT EXISTS artifacts_id_idx ON artifacts(id);
CREATE INDEX IF NOT EXISTS artifacts_source_type_idx ON artifacts(source, type);
CREATE INDEX IF NOT EXISTS artifacts_expires_idx ON artifacts(expires);

-- Search table with pgvector
CREATE TABLE IF NOT EXISTS search (
  url TEXT NOT NULL,
  ns TEXT NOT NULL,
  type TEXT NOT NULL,
  id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  embedding vector(1536),
  model TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  meta JSONB NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'en',
  locale TEXT NOT NULL DEFAULT 'en-US',
  event TEXT NOT NULL DEFAULT 'created',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (url, ts)
);

CREATE INDEX IF NOT EXISTS search_ns_idx ON search(ns);
CREATE INDEX IF NOT EXISTS search_type_idx ON search(type);
CREATE INDEX IF NOT EXISTS search_content_idx ON search USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS search_embedding_idx ON search USING ivfflat (embedding vector_cosine_ops);
`

// =============================================================================
// Database Implementation
// =============================================================================

/**
 * PostgreSQL database with graph and event sourcing support
 * Implements DBClientExtended for Events, Actions, and Artifacts
 *
 * @example
 * ```ts
 * // Connect to local PostgreSQL
 * const db = await createPostgresDatabase()
 *
 * // Connect to remote PostgreSQL
 * const remoteDb = await createPostgresDatabase({
 *   connectionString: 'postgresql://user:pass@host:5432/db'
 * })
 * ```
 */
export class PostgresDatabase<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClientExtended<TData>
{
  private executor: PostgresExecutor
  private schema: string

  constructor(executor: PostgresExecutor, schema = 'public') {
    this.executor = executor
    this.schema = schema
  }

  /**
   * Initialize database schema
   */
  async init(): Promise<void> {
    // Set schema
    if (this.schema !== 'public') {
      await this.executor.command(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`)
      await this.executor.command(`SET search_path TO ${this.schema}`)
    }

    // Execute schema creation
    const statements = SCHEMA_SQL.split(';').filter(s => s.trim())
    for (const statement of statements) {
      if (statement.trim()) {
        await this.executor.command(statement)
      }
    }
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    const conditions: string[] = ["event != 'deleted'"]
    const params: unknown[] = []
    let paramCount = 1

    if (options.ns) {
      params.push(options.ns)
      conditions.push(`ns = $${paramCount++}`)
    }

    if (options.type) {
      params.push(options.type)
      conditions.push(`type = $${paramCount++}`)
    }

    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        params.push(JSON.stringify(value))
        conditions.push(`data->>'${key}' = $${paramCount++}`)
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    let orderClause = 'ORDER BY ts DESC'
    if (options.orderBy) {
      const dir = options.order === 'desc' ? 'DESC' : 'ASC'
      if (['url', 'ns', 'type', 'id', 'ts', 'version'].includes(options.orderBy)) {
        orderClause = `ORDER BY ${options.orderBy} ${dir}`
      } else {
        orderClause = `ORDER BY data->>'${options.orderBy}' ${dir}`
      }
    }

    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const sql = `
      SELECT DISTINCT ON (url) *
      FROM things
      ${whereClause}
      ORDER BY url, ts DESC
      ${limitClause} ${offsetClause}
    `

    const rows = await this.executor.query<ThingRow>(sql, params)
    return rows.map(row => this.rowToThing(row))
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    return this.list(options)
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    const query = options.query.toLowerCase()
    const conditions: string[] = [
      "event != 'deleted'",
      `(id ILIKE $1 OR data::text ILIKE $1 OR content ILIKE $1)`,
    ]
    const params: unknown[] = [`%${query}%`]
    let paramCount = 2

    if (options.ns) {
      params.push(options.ns)
      conditions.push(`ns = $${paramCount++}`)
    }

    if (options.type) {
      params.push(options.type)
      conditions.push(`type = $${paramCount++}`)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const sql = `
      SELECT DISTINCT ON (url) *
      FROM things
      ${whereClause}
      ORDER BY url, ts DESC
      ${limitClause} ${offsetClause}
    `

    const rows = await this.executor.query<ThingRow>(sql, params)
    return rows.map(row => this.rowToThing(row))
  }

  async get(url: string): Promise<Thing<TData> | null> {
    const sql = `
      SELECT * FROM things
      WHERE url = $1 AND event != 'deleted'
      ORDER BY ts DESC
      LIMIT 1
    `
    const rows = await this.executor.query<ThingRow>(sql, [url])
    if (rows.length === 0) return null
    return this.rowToThing(rows[0]!)
  }

  async getById(ns: string, type: string, id: string): Promise<Thing<TData> | null> {
    return this.get(buildUrl(ns, type, id))
  }

  async set(url: string, data: TData): Promise<Thing<TData>> {
    const { ns, type, id } = parseThingUrl(url)
    const now = new Date()

    const existing = await this.get(url)
    const version = existing ? ((existing as any).version ?? 1) + 1 : 1

    const sql = `
      INSERT INTO things (url, ns, type, id, version, data, event, ts)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `

    await this.executor.command(sql, [
      url,
      ns,
      type,
      id,
      version,
      JSON.stringify(data),
      existing ? 'updated' : 'created',
      now,
    ])

    return {
      ns,
      type,
      id,
      url,
      data,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
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

    const sql = `
      INSERT INTO things (url, ns, type, id, version, data, meta, event, ts)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `

    await this.executor.command(sql, [
      url,
      options.ns,
      options.type,
      id,
      1,
      JSON.stringify(options.data),
      JSON.stringify(options['@context'] ? { '@context': options['@context'] } : {}),
      'created',
      now,
    ])

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
    const existing = await this.get(url)
    if (!existing) return false

    const { ns, type, id } = parseThingUrl(url)
    const now = new Date()

    const sql = `
      INSERT INTO things (url, ns, type, id, version, data, event, ts)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `

    await this.executor.command(sql, [
      url,
      ns,
      type,
      id,
      ((existing as any).version ?? 1) + 1,
      JSON.stringify(existing.data),
      'deleted',
      now,
    ])

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
    const now = new Date()
    const { ns } = parseThingUrl(options.from)

    const sql = `
      INSERT INTO relationships (ns, "from", "to", predicate, data, event, ts)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `

    await this.executor.command(sql, [
      ns,
      options.from,
      options.to,
      options.type,
      JSON.stringify(options.data ?? {}),
      'created',
      now,
    ])

    return {
      id: generateRelationshipId(options.from, options.type, options.to),
      type: options.type,
      from: options.from,
      to: options.to,
      createdAt: now,
      data: options.data,
    }
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    const now = new Date()
    const { ns } = parseThingUrl(from)

    const sql = `
      INSERT INTO relationships (ns, "from", "to", predicate, data, event, ts)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `

    await this.executor.command(sql, [
      ns,
      from,
      to,
      type,
      JSON.stringify({}),
      'deleted',
      now,
    ])
    return true
  }

  async related(
    url: string,
    relationshipType?: string,
    direction: 'from' | 'to' | 'both' = 'from'
  ): Promise<Thing<TData>[]> {
    const urls: string[] = []

    if (direction === 'to' || direction === 'both') {
      const predicateClause = relationshipType ? 'AND predicate = $2' : ''
      const params = relationshipType ? [url, relationshipType] : [url]

      const sql = `
        SELECT DISTINCT ON ("from", predicate, "to") "to"
        FROM relationships
        WHERE "from" = $1 ${predicateClause}
        ORDER BY "from", predicate, "to", ts DESC
      `
      const rows = await this.executor.query<{ to: string }>(sql, params)

      // Filter out deleted relationships
      for (const row of rows) {
        const checkSql = `
          SELECT event FROM relationships
          WHERE "from" = $1 AND "to" = $2 ${predicateClause}
          ORDER BY ts DESC LIMIT 1
        `
        const checkParams = relationshipType ? [url, row.to, relationshipType] : [url, row.to]
        const checkRows = await this.executor.query<{ event: string }>(checkSql, checkParams)
        if (checkRows[0]?.event !== 'deleted') {
          urls.push(row.to)
        }
      }
    }

    if (direction === 'from' || direction === 'both') {
      const predicateClause = relationshipType ? 'AND predicate = $2' : ''
      const params = relationshipType ? [url, relationshipType] : [url]

      const sql = `
        SELECT DISTINCT ON ("from", predicate, "to") "from"
        FROM relationships
        WHERE "to" = $1 ${predicateClause}
        ORDER BY "from", predicate, "to", ts DESC
      `
      const rows = await this.executor.query<{ from: string }>(sql, params)

      // Filter out deleted relationships
      for (const row of rows) {
        const checkSql = `
          SELECT event FROM relationships
          WHERE "from" = $1 AND "to" = $2 ${predicateClause}
          ORDER BY ts DESC LIMIT 1
        `
        const checkParams = relationshipType ? [row.from, url, relationshipType] : [row.from, url]
        const checkRows = await this.executor.query<{ event: string }>(checkSql, checkParams)
        if (checkRows[0]?.event !== 'deleted') {
          urls.push(row.from)
        }
      }
    }

    const uniqueUrls = [...new Set(urls)]
    if (uniqueUrls.length === 0) return []

    const placeholders = uniqueUrls.map((_, i) => `$${i + 1}`).join(', ')
    const sql = `
      SELECT DISTINCT ON (url) *
      FROM things
      WHERE url IN (${placeholders}) AND event != 'deleted'
      ORDER BY url, ts DESC
    `
    const rows = await this.executor.query<ThingRow>(sql, uniqueUrls)
    return rows.map(row => this.rowToThing(row))
  }

  async relationships(
    url: string,
    type?: string,
    direction: 'from' | 'to' | 'both' = 'both'
  ): Promise<Relationship[]> {
    const results: Relationship[] = []

    if (direction === 'to' || direction === 'both') {
      const predicateClause = type ? 'AND predicate = $2' : ''
      const params = type ? [url, type] : [url]

      const sql = `
        SELECT DISTINCT ON ("from", predicate, "to") *
        FROM relationships
        WHERE "from" = $1 ${predicateClause}
        ORDER BY "from", predicate, "to", ts DESC
      `
      const rows = await this.executor.query<RelationshipRow>(sql, params)

      // Filter out deleted
      for (const row of rows) {
        if (row.event !== 'deleted') {
          results.push(this.rowToRelationship(row))
        }
      }
    }

    if (direction === 'from' || direction === 'both') {
      const predicateClause = type ? 'AND predicate = $2' : ''
      const params = type ? [url, type] : [url]

      const sql = `
        SELECT DISTINCT ON ("from", predicate, "to") *
        FROM relationships
        WHERE "to" = $1 ${predicateClause}
        ORDER BY "from", predicate, "to", ts DESC
      `
      const rows = await this.executor.query<RelationshipRow>(sql, params)

      // Filter out deleted
      for (const row of rows) {
        if (row.event !== 'deleted') {
          results.push(this.rowToRelationship(row))
        }
      }
    }

    return results
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    return this.related(url, relationshipType, 'from')
  }

  // ===========================================================================
  // Event Operations
  // ===========================================================================

  async track<T extends Record<string, unknown>>(
    options: CreateEventOptions<T>
  ): Promise<Event<T>> {
    const now = new Date()
    const ulid = generateId()

    let ns = 'default'
    try {
      const { ns: sourceNs } = parseThingUrl(options.source)
      ns = sourceNs
    } catch {
      // Use default ns
    }

    const sql = `
      INSERT INTO events (ulid, ns, actor, event, object_data, meta, ts)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `

    await this.executor.command(sql, [
      ulid,
      ns,
      options.source,
      options.type,
      JSON.stringify(options.data ?? {}),
      JSON.stringify({
        correlationId: options.correlationId,
        causationId: options.causationId,
      }),
      now,
    ])

    return {
      id: ulid,
      type: options.type,
      timestamp: now,
      source: options.source,
      data: options.data,
      correlationId: options.correlationId,
      causationId: options.causationId,
    }
  }

  async getEvent(id: string): Promise<Event | null> {
    const sql = `SELECT * FROM events WHERE ulid = $1 LIMIT 1`
    const rows = await this.executor.query<EventRow>(sql, [id])
    if (rows.length === 0) return null
    return this.rowToEvent(rows[0]!)
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    const conditions: string[] = []
    const params: unknown[] = []
    let paramCount = 1

    if (options.type) {
      params.push(options.type)
      conditions.push(`event = $${paramCount++}`)
    }

    if (options.source) {
      params.push(options.source)
      conditions.push(`actor = $${paramCount++}`)
    }

    if (options.correlationId) {
      params.push(options.correlationId)
      conditions.push(`meta->>'correlationId' = $${paramCount++}`)
    }

    if (options.after) {
      params.push(options.after)
      conditions.push(`ts > $${paramCount++}`)
    }

    if (options.before) {
      params.push(options.before)
      conditions.push(`ts < $${paramCount++}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const sql = `
      SELECT * FROM events
      ${whereClause}
      ORDER BY ts DESC
      ${limitClause} ${offsetClause}
    `

    const rows = await this.executor.query<EventRow>(sql, params)
    return rows.map(row => this.rowToEvent(row))
  }

  // ===========================================================================
  // Action Operations
  // ===========================================================================

  async send<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const now = new Date()
    const id = generateId()

    let ns = 'default'
    try {
      const { ns: actorNs } = parseThingUrl(options.actor)
      ns = actorNs
    } catch {
      // Use default ns
    }

    const act = options.action
    const action = `${act}s`
    const activity = `${act}ing`

    const sql = `
      INSERT INTO actions (
        ns, id, act, action, activity, actor, object, status,
        data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `

    await this.executor.command(sql, [
      ns,
      id,
      act,
      action,
      activity,
      options.actor,
      options.object,
      options.status ?? 'pending',
      JSON.stringify(options.metadata ?? {}),
      now,
      now,
    ])

    return {
      id,
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
    const id = generateId()

    let ns = 'default'
    try {
      const { ns: actorNs } = parseThingUrl(options.actor)
      ns = actorNs
    } catch {
      // Use default ns
    }

    const act = options.action
    const action = `${act}s`
    const activity = `${act}ing`

    const sql = `
      INSERT INTO actions (
        ns, id, act, action, activity, actor, object, status,
        data, started_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `

    await this.executor.command(sql, [
      ns,
      id,
      act,
      action,
      activity,
      options.actor,
      options.object,
      'active',
      JSON.stringify(options.metadata ?? {}),
      now,
      now,
      now,
    ])

    return {
      id,
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
    const action = await this.do<T>(options)

    try {
      const result = await fn()
      return await this.completeAction(action.id, result) as Action<T>
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return await this.failAction(action.id, errorMessage) as Action<T>
    }
  }

  async getAction(id: string): Promise<Action | null> {
    const sql = `
      SELECT * FROM actions
      WHERE id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `
    const rows = await this.executor.query<ActionRow>(sql, [id])
    if (rows.length === 0) return null
    return this.rowToAction(rows[0]!)
  }

  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    const conditions: string[] = []
    const params: unknown[] = []
    let paramCount = 1

    if (options.actor) {
      params.push(options.actor)
      conditions.push(`actor = $${paramCount++}`)
    }

    if (options.object) {
      params.push(options.object)
      conditions.push(`object = $${paramCount++}`)
    }

    if (options.action) {
      params.push(options.action)
      conditions.push(`act = $${paramCount++}`)
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        const placeholders = options.status.map((s, i) => {
          params.push(s)
          return `$${paramCount++}`
        })
        conditions.push(`status IN (${placeholders.join(', ')})`)
      } else {
        params.push(options.status)
        conditions.push(`status = $${paramCount++}`)
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const sql = `
      SELECT DISTINCT ON (id) *
      FROM actions
      ${whereClause}
      ORDER BY id, updated_at DESC
      ${limitClause} ${offsetClause}
    `

    const rows = await this.executor.query<ActionRow>(sql, params)
    return rows.map(row => this.rowToAction(row))
  }

  async startAction(id: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date()

    const sql = `
      INSERT INTO actions (
        ns, id, act, action, activity, actor, object, status,
        data, started_at, created_at, updated_at
      ) SELECT ns, id, act, action, activity, actor, object, 'active',
        data, $1, created_at, $2
      FROM actions
      WHERE id = $3
      ORDER BY updated_at DESC
      LIMIT 1
    `

    await this.executor.command(sql, [now, now, id])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date()

    const sql = `
      INSERT INTO actions (
        ns, id, act, action, activity, actor, object, status,
        result, data, started_at, completed_at, created_at, updated_at
      ) SELECT ns, id, act, action, activity, actor, object, 'completed',
        $1, data, started_at, $2, created_at, $3
      FROM actions
      WHERE id = $4
      ORDER BY updated_at DESC
      LIMIT 1
    `

    await this.executor.command(sql, [
      JSON.stringify(result ?? {}),
      now,
      now,
      id,
    ])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async failAction(id: string, error: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date()

    const sql = `
      INSERT INTO actions (
        ns, id, act, action, activity, actor, object, status,
        error, data, started_at, completed_at, created_at, updated_at
      ) SELECT ns, id, act, action, activity, actor, object, 'failed',
        $1, data, started_at, $2, created_at, $3
      FROM actions
      WHERE id = $4
      ORDER BY updated_at DESC
      LIMIT 1
    `

    await this.executor.command(sql, [error, now, now, id])

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async cancelAction(id: string): Promise<Action> {
    const existing = await this.getAction(id)
    if (!existing) throw new Error(`Action not found: ${id}`)

    const now = new Date()

    const sql = `
      INSERT INTO actions (
        ns, id, act, action, activity, actor, object, status,
        data, started_at, completed_at, created_at, updated_at
      ) SELECT ns, id, act, action, activity, actor, object, 'cancelled',
        data, started_at, $1, created_at, $2
      FROM actions
      WHERE id = $3
      ORDER BY updated_at DESC
      LIMIT 1
    `

    await this.executor.command(sql, [now, now, id])

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
    const expiresAt = options.ttl
      ? new Date(Date.now() + options.ttl)
      : new Date('2999-12-31T23:59:59.000Z')

    let ns = 'default'
    try {
      const { ns: sourceNs } = parseThingUrl(options.source)
      ns = sourceNs
    } catch {
      // Use default ns
    }

    const id = options.key ?? generateId()

    const sql = `
      INSERT INTO artifacts (
        ns, id, type, source, content, hash, size, expires, meta, event, ts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `

    await this.executor.command(sql, [
      ns,
      id,
      options.type,
      options.source,
      content,
      options.sourceHash,
      content.length,
      expiresAt,
      JSON.stringify(options.metadata ?? {}),
      'created',
      now,
    ])

    return {
      key: options.key,
      type: options.type,
      source: options.source,
      sourceHash: options.sourceHash,
      createdAt: now,
      expiresAt: expiresAt.getTime() < new Date('2999-01-01').getTime() ? expiresAt : undefined,
      content: options.content,
      size: content.length,
      metadata: options.metadata,
    }
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    const parts = key.split(':')

    if (parts.length === 1) {
      const sql = `
        SELECT * FROM artifacts
        WHERE id = $1 AND event != 'deleted'
        ORDER BY ts DESC
        LIMIT 1
      `
      const rows = await this.executor.query<ArtifactRow>(sql, [key])
      if (rows.length === 0) return null
      return this.rowToArtifact(rows[0]!)
    }

    if (parts.length === 3) {
      const [ns, type, id] = parts
      const sql = `
        SELECT * FROM artifacts
        WHERE ns = $1 AND type = $2 AND id = $3 AND event != 'deleted'
        ORDER BY ts DESC
        LIMIT 1
      `
      const rows = await this.executor.query<ArtifactRow>(sql, [ns, type, id])
      if (rows.length === 0) return null
      return this.rowToArtifact(rows[0]!)
    }

    const lastColon = key.lastIndexOf(':')
    const url = key.substring(0, lastColon)
    const type = key.substring(lastColon + 1)
    return this.getArtifactBySource(url, type as ArtifactType) as Promise<Artifact<T> | null>
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    const sql = `
      SELECT * FROM artifacts
      WHERE source = $1 AND type = $2 AND event != 'deleted'
      ORDER BY ts DESC
      LIMIT 1
    `
    const rows = await this.executor.query<ArtifactRow>(sql, [source, type])
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
    const now = new Date()
    const parts = key.split(':')

    if (parts.length === 1) {
      const existing = await this.getArtifact(key)
      if (!existing) return false

      let ns = 'default'
      try {
        const parsed = parseThingUrl(existing.source)
        ns = parsed.ns
      } catch {
        // Use default ns
      }

      const sql = `
        INSERT INTO artifacts (ns, id, type, source, event, ts)
        VALUES ($1, $2, $3, $4, $5, $6)
      `
      await this.executor.command(sql, [ns, key, existing.type, existing.source, 'deleted', now])
      return true
    }

    if (parts.length === 3) {
      const [ns, type, id] = parts
      const sql = `
        INSERT INTO artifacts (ns, id, type, source, event, ts)
        SELECT ns, id, type, source, 'deleted', $1
        FROM artifacts
        WHERE ns = $2 AND type = $3 AND id = $4
        ORDER BY ts DESC
        LIMIT 1
      `
      await this.executor.command(sql, [now, ns, type, id])
      return true
    }

    const lastColon = key.lastIndexOf(':')
    const url = key.substring(0, lastColon)
    const type = key.substring(lastColon + 1)
    return this.deleteArtifactBySource(url, type as ArtifactType)
  }

  async deleteArtifactBySource(source: string, type: ArtifactType): Promise<boolean> {
    const sql = `DELETE FROM artifacts WHERE source = $1 AND type = $2`
    await this.executor.command(sql, [source, type])
    return true
  }

  async cleanExpiredArtifacts(): Promise<number> {
    const now = new Date()

    const countSql = `SELECT COUNT(*) as count FROM artifacts WHERE expires < $1`
    const countRows = await this.executor.query<{ count: string }>(countSql, [now])
    const count = parseInt(countRows[0]?.count ?? '0', 10)

    const deleteSql = `DELETE FROM artifacts WHERE expires < $1`
    await this.executor.command(deleteSql, [now])

    return count
  }

  // ===========================================================================
  // Search Operations (pgvector)
  // ===========================================================================

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
    const now = new Date()

    const sql = `
      INSERT INTO search (
        url, ns, type, id, title, description, content, keywords,
        embedding, model, meta, language, locale, event, ts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `

    await this.executor.command(sql, [
      options.url,
      options.ns,
      options.type,
      options.id ?? '',
      options.title ?? '',
      options.description ?? '',
      options.content,
      options.keywords ?? [],
      options.embedding ? `[${options.embedding.join(',')}]` : null,
      options.model ?? '',
      JSON.stringify(options.metadata ?? {}),
      options.language ?? 'en',
      options.locale ?? 'en-US',
      'created',
      now,
    ])
  }

  async fullTextSearch(
    query: string,
    options: {
      ns?: string
      type?: string
      limit?: number
    } = {}
  ): Promise<Array<{ url: string; title: string; content: string; score: number }>> {
    const { limit = 10 } = options
    const conditions: string[] = []
    const params: unknown[] = [query]
    let paramCount = 2

    if (options.ns) {
      params.push(options.ns)
      conditions.push(`ns = $${paramCount++}`)
    }
    if (options.type) {
      params.push(options.type)
      conditions.push(`type = $${paramCount++}`)
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

    const sql = `
      SELECT url, title, content,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as score
      FROM (
        SELECT DISTINCT ON (url) *
        FROM search
        WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
        ${whereClause}
        ORDER BY url, ts DESC
      ) s
      ORDER BY score DESC
      LIMIT ${limit}
    `

    const rows = await this.executor.query<{
      url: string
      title: string
      content: string
      score: number
    }>(sql, params)

    return rows
  }

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

    const conditions: string[] = ['embedding IS NOT NULL']
    const params: unknown[] = [`[${queryEmbedding.join(',')}]`]
    let paramCount = 2

    if (options.model) {
      params.push(options.model)
      conditions.push(`model = $${paramCount++}`)
    }
    if (options.ns) {
      params.push(options.ns)
      conditions.push(`ns = $${paramCount++}`)
    }
    if (options.type) {
      params.push(options.type)
      conditions.push(`type = $${paramCount++}`)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const sql = `
      SELECT url, title, content,
        1 - (embedding <=> $1::vector) as score
      FROM (
        SELECT DISTINCT ON (url) *
        FROM search
        ${whereClause}
        ORDER BY url, ts DESC
      ) s
      ORDER BY embedding <=> $1::vector
      LIMIT ${limit}
    `

    const rows = await this.executor.query<{
      url: string
      title: string
      content: string
      score: number
    }>(sql, params)

    return rows.filter(r => r.score >= minScore)
  }

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

    const textResults = await this.fullTextSearch(query, { ...options, limit: limit * 2 })

    let vectorResults: Array<{ url: string; title: string; content: string; score: number }> = []
    if (queryEmbedding && queryEmbedding.length > 0) {
      vectorResults = await this.vectorSearch(queryEmbedding, { ...options, limit: limit * 2 })
    }

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

    const combined = Array.from(scoreMap.values())
      .map(r => ({
        url: r.url,
        title: r.title,
        content: r.content,
        score: r.textScore * textWeight + r.vectorScore * vectorWeight,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    if (combined.length > 0) {
      const uniqueUrls = [...new Set(combined.map(r => r.url))]
      const placeholders = uniqueUrls.map((_, i) => `$${i + 1}`).join(', ')

      const sql = `
        SELECT DISTINCT ON (url) *
        FROM things
        WHERE url IN (${placeholders}) AND event != 'deleted'
        ORDER BY url, ts DESC
      `

      const things = await this.executor.query<ThingRow>(sql, uniqueUrls)
      const thingMap = new Map(things.map(t => [t.url, this.rowToThing(t)]))

      return combined.map(r => ({
        ...r,
        thing: thingMap.get(r.url),
      }))
    }

    return combined
  }

  async removeFromSearch(url: string): Promise<boolean> {
    const sql = `DELETE FROM search WHERE url = $1`
    await this.executor.command(sql, [url])
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
      data: (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) as TData,
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
      data: (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) || undefined,
    }
  }

  private rowToEvent<T extends Record<string, unknown>>(row: EventRow): Event<T> {
    return {
      id: row.ulid,
      type: row.event,
      timestamp: new Date(row.ts),
      source: row.actor,
      data: (typeof row.object_data === 'string' ? JSON.parse(row.object_data) : row.object_data) as T,
      correlationId: row.meta?.correlationId as string | undefined,
      causationId: row.meta?.causationId as string | undefined,
    }
  }

  private rowToAction<T extends Record<string, unknown>>(row: ActionRow): Action<T> {
    return {
      id: row.id,
      actor: row.actor,
      object: row.object,
      action: row.act,
      status: row.status as ActionStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      result: (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) || undefined,
      error: row.error || undefined,
      metadata: (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) as T | undefined,
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
      key: row.id,
      type: row.type as ArtifactType,
      source: row.source,
      sourceHash: row.hash,
      createdAt: new Date(row.ts),
      expiresAt: row.expires ? new Date(row.expires) : undefined,
      content,
      size: row.size,
      metadata: (typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta) || undefined,
    }
  }

  async close(): Promise<void> {
    await this.executor.close()
  }

  getExecutor(): PostgresExecutor {
    return this.executor
  }
}

// =============================================================================
// Row Types (internal)
// =============================================================================

interface ThingRow {
  url: string
  ns: string
  type: string
  id: string
  data: string | Record<string, unknown>
  meta: Record<string, unknown>
  ts: string
}

interface RelationshipRow {
  from: string
  to: string
  predicate: string
  data: string | Record<string, unknown>
  ts: string
  event: string
}

interface EventRow {
  ulid: string
  actor: string
  event: string
  object_data: string | Record<string, unknown>
  meta: Record<string, unknown>
  ts: string
}

interface ActionRow {
  id: string
  act: string
  actor: string
  object: string
  status: string
  result: string | Record<string, unknown>
  error: string
  data: string | Record<string, unknown>
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

interface ArtifactRow {
  id: string
  type: string
  source: string
  hash: string
  content: string
  size: number
  meta: string | Record<string, unknown>
  expires: string | null
  ts: string
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a PostgreSQL database instance
 *
 * @example
 * ```ts
 * // Connect to local PostgreSQL (default)
 * const db = await createPostgresDatabase()
 *
 * // Connect to remote PostgreSQL
 * const remoteDb = await createPostgresDatabase({
 *   connectionString: 'postgresql://user:pass@host:5432/db'
 * })
 *
 * // Create things
 * await db.create({
 *   ns: 'example.com',
 *   type: 'Post',
 *   data: { title: 'Hello World' }
 * })
 * ```
 */
export async function createPostgresDatabase<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: PostgresConfig = {}
): Promise<PostgresDatabase<TData>> {
  const executor = config.executor ?? createPostgresExecutor({
    connectionString: config.connectionString,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl,
  })

  const db = new PostgresDatabase<TData>(executor, config.schema ?? 'public')
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
