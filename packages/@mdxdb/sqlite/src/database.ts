/**
 * @mdxdb/sqlite Database Implementation
 *
 * libSQL-based implementation with:
 * - Things: Graph nodes following ai-database conventions
 * - Relationships: Graph edges between things
 * - Search: Chunked content with vector embeddings
 *
 * @packageDocumentation
 */

import { createClient, type Client, type InStatement, type InArgs, type InValue } from '@libsql/client'
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
} from 'mdxdb'
import type {
  SqliteDatabaseConfig,
  ThingRow,
  RelationshipRow,
  SearchRow,
  VectorSearchOptions,
  VectorSearchResult,
  Chunk,
  EventRow,
  ActionRow,
  ArtifactRow,
  ActionStatus,
} from './types.js'

// =============================================================================
// Schema
// =============================================================================

const SCHEMA = `
  -- Things table (graph nodes)
  CREATE TABLE IF NOT EXISTS things (
    url TEXT PRIMARY KEY,
    ns TEXT NOT NULL,
    type TEXT NOT NULL,
    id TEXT NOT NULL,
    context TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_things_ns ON things(ns);
  CREATE INDEX IF NOT EXISTS idx_things_type ON things(type);
  CREATE INDEX IF NOT EXISTS idx_things_ns_type ON things(ns, type);
  CREATE INDEX IF NOT EXISTS idx_things_deleted_at ON things(deleted_at);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_things_ns_type_id ON things(ns, type, id);

  -- Relationships table (graph edges)
  CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    from_url TEXT NOT NULL,
    to_url TEXT NOT NULL,
    data TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (from_url) REFERENCES things(url) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships(type);
  CREATE INDEX IF NOT EXISTS idx_rel_from ON relationships(from_url);
  CREATE INDEX IF NOT EXISTS idx_rel_to ON relationships(to_url);
  CREATE INDEX IF NOT EXISTS idx_rel_from_type ON relationships(from_url, type);
  CREATE INDEX IF NOT EXISTS idx_rel_to_type ON relationships(to_url, type);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_rel_unique ON relationships(from_url, type, to_url);

  -- Search table (chunked content with embeddings)
  CREATE TABLE IF NOT EXISTS search (
    id TEXT PRIMARY KEY,
    thing_url TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding F32_BLOB(1536),
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (thing_url) REFERENCES things(url) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_search_thing ON search(thing_url);
  CREATE INDEX IF NOT EXISTS idx_search_thing_chunk ON search(thing_url, chunk_index);

  -- Events table (immutable event log)
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    source TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    correlation_id TEXT,
    causation_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id);

  -- Actions table (pending/active work)
  CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    object TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    result TEXT,
    error TEXT,
    metadata TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_actions_actor ON actions(actor);
  CREATE INDEX IF NOT EXISTS idx_actions_object ON actions(object);
  CREATE INDEX IF NOT EXISTS idx_actions_action ON actions(action);
  CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
  CREATE INDEX IF NOT EXISTS idx_actions_actor_status ON actions(actor, status);

  -- Artifacts table (cached compiled content)
  CREATE TABLE IF NOT EXISTS artifacts (
    key TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    content TEXT NOT NULL,
    size INTEGER,
    metadata TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
  CREATE INDEX IF NOT EXISTS idx_artifacts_source ON artifacts(source);
  CREATE INDEX IF NOT EXISTS idx_artifacts_source_type ON artifacts(source, type);
  CREATE INDEX IF NOT EXISTS idx_artifacts_expires ON artifacts(expires_at);
`

// Vector index creation (separate as it may fail on non-vector-enabled SQLite)
const VECTOR_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_search_embedding ON search(libsql_vector_idx(embedding));
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

/**
 * Split content into chunks for embedding
 */
function chunkContent(content: string, size = 1000, overlap = 200): Chunk[] {
  if (!content || content.length === 0) return []

  const chunks: Chunk[] = []
  let start = 0
  let index = 0

  while (start < content.length) {
    let end = Math.min(start + size, content.length)

    // Try to break at paragraph or sentence boundary
    if (end < content.length) {
      const slice = content.slice(start, end)
      const lastPara = slice.lastIndexOf('\n\n')
      const lastSentence = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? ')
      )

      if (lastPara > size * 0.5) {
        end = start + lastPara + 2
      } else if (lastSentence > size * 0.5) {
        end = start + lastSentence + 2
      }
    }

    chunks.push({
      content: content.slice(start, end).trim(),
      index,
      start,
      end,
    })

    start = end - overlap
    if (start >= content.length - overlap) break
    index++
  }

  return chunks
}

/**
 * Convert float array to F32 blob for libSQL vector storage
 */
function floatsToBlob(floats: number[]): Uint8Array {
  const buffer = new ArrayBuffer(floats.length * 4)
  const view = new DataView(buffer)
  floats.forEach((f, i) => view.setFloat32(i * 4, f, true))
  return new Uint8Array(buffer)
}

/**
 * Convert F32 blob back to float array
 */
function blobToFloats(blob: Uint8Array): number[] {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
  const floats: number[] = []
  for (let i = 0; i < blob.byteLength; i += 4) {
    floats.push(view.getFloat32(i, true))
  }
  return floats
}

// =============================================================================
// Database Implementation
// =============================================================================

/**
 * SQLite/libSQL database with graph and vector search support
 * Implements DBClientExtended for Events, Actions, and Artifacts
 */
export class SqliteDatabase<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClientExtended<TData>
{
  private client: Client
  private embedFn?: (text: string) => Promise<number[]>
  private chunkSize: number
  private chunkOverlap: number
  private embeddingDimension: number
  private vectorEnabled = false

  constructor(private config: SqliteDatabaseConfig) {
    this.embedFn = config.embedFn
    this.chunkSize = config.chunkSize ?? 1000
    this.chunkOverlap = config.chunkOverlap ?? 200
    this.embeddingDimension = config.embeddingDimension ?? 1536

    // Create libSQL client
    const url = config.url.startsWith('file:') || config.url === ':memory:'
      ? config.url
      : config.url.includes('://')
        ? config.url
        : `file:${config.url}`

    this.client = createClient({
      url,
      authToken: config.authToken,
    })
  }

  /**
   * Initialize database schema
   */
  async init(): Promise<void> {
    // Create base schema
    await this.client.executeMultiple(SCHEMA)

    // Try to create vector index (may fail on non-vector SQLite)
    if (this.embedFn) {
      try {
        await this.client.execute(VECTOR_INDEX)
        this.vectorEnabled = true
      } catch {
        console.warn('Vector index not available - semantic search will use fallback')
      }
    }
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing<TData>[]> {
    const conditions: string[] = ['deleted_at IS NULL']
    const params: Record<string, InValue> = {}

    if (options.ns) {
      conditions.push('ns = :ns')
      params.ns = options.ns
    }

    if (options.type) {
      conditions.push('type = :type')
      params.type = options.type
    }

    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`json_extract(data, '$.${key}') = :where_${key}`)
        params[`where_${key}`] = typeof value === 'string' ? value : JSON.stringify(value)
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    let orderClause = 'ORDER BY updated_at DESC'
    if (options.orderBy) {
      const dir = options.order === 'desc' ? 'DESC' : 'ASC'
      if (['url', 'ns', 'type', 'id', 'created_at', 'updated_at'].includes(options.orderBy)) {
        orderClause = `ORDER BY ${options.orderBy} ${dir}`
      } else {
        orderClause = `ORDER BY json_extract(data, '$.${options.orderBy}') ${dir}`
      }
    }

    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const result = await this.client.execute({
      sql: `SELECT * FROM things ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`,
      args: params,
    })

    return result.rows.map(row => this.rowToThing(row as unknown as ThingRow))
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    return this.list(options)
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    // If we have embeddings, try vector search first
    if (this.embedFn && this.vectorEnabled) {
      const vectorResults = await this.vectorSearch({
        query: options.query,
        limit: options.limit,
        minScore: options.minScore,
        type: options.type,
        ns: options.ns,
      })

      // Get unique thing URLs
      const thingUrls = [...new Set(vectorResults.map(r => r.thingUrl))]
      if (thingUrls.length > 0) {
        const placeholders = thingUrls.map((_, i) => `:url${i}`).join(', ')
        const params: Record<string, string> = {}
        thingUrls.forEach((url, i) => params[`url${i}`] = url)

        const result = await this.client.execute({
          sql: `SELECT * FROM things WHERE url IN (${placeholders}) AND deleted_at IS NULL`,
          args: params,
        })

        return result.rows.map(row => this.rowToThing(row as unknown as ThingRow))
      }
    }

    // Fallback to text search
    const queryLower = options.query.toLowerCase()
    const things = await this.list({
      ns: options.ns,
      type: options.type,
      limit: options.limit,
      offset: options.offset,
    })

    return things.filter(thing => {
      const searchText = [
        thing.id,
        thing.type,
        thing.data.title,
        thing.data.name,
        thing.data.content,
        JSON.stringify(thing.data),
      ].filter(Boolean).join(' ').toLowerCase()

      return searchText.includes(queryLower)
    })
  }

  async get(url: string): Promise<Thing<TData> | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM things WHERE url = :url AND deleted_at IS NULL',
      args: { url },
    })

    if (result.rows.length === 0) return null
    return this.rowToThing(result.rows[0] as unknown as ThingRow)
  }

  async getById(ns: string, type: string, id: string): Promise<Thing<TData> | null> {
    return this.get(buildUrl(ns, type, id))
  }

  async set(url: string, data: TData): Promise<Thing<TData>> {
    const { ns, type, id } = parseThingUrl(url)
    const now = new Date().toISOString()

    const existing = await this.get(url)

    if (existing) {
      await this.client.execute({
        sql: `UPDATE things
              SET data = :data, updated_at = :updated_at, version = version + 1
              WHERE url = :url`,
        args: {
          url,
          data: JSON.stringify(data),
          updated_at: now,
        },
      })

      // Re-index for search
      await this.indexThing(url, data)

      return {
        ...existing,
        data,
        updatedAt: new Date(now),
      }
    }

    await this.client.execute({
      sql: `INSERT INTO things (url, ns, type, id, data, created_at, updated_at)
            VALUES (:url, :ns, :type, :id, :data, :created_at, :updated_at)`,
      args: {
        url,
        ns,
        type,
        id,
        data: JSON.stringify(data),
        created_at: now,
        updated_at: now,
      },
    })

    // Index for search
    await this.indexThing(url, data)

    return {
      ns,
      type,
      id,
      url,
      data,
      createdAt: new Date(now),
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

    await this.client.execute({
      sql: `INSERT INTO things (url, ns, type, id, context, data, created_at, updated_at)
            VALUES (:url, :ns, :type, :id, :context, :data, :created_at, :updated_at)`,
      args: {
        url,
        ns: options.ns,
        type: options.type,
        id,
        context: options['@context'] ? JSON.stringify(options['@context']) : null,
        data: JSON.stringify(options.data),
        created_at: now,
        updated_at: now,
      },
    })

    // Index for search
    await this.indexThing(url, options.data)

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
    // Delete search chunks first
    await this.client.execute({
      sql: 'DELETE FROM search WHERE thing_url = :url',
      args: { url },
    })

    // Delete relationships
    await this.client.execute({
      sql: 'DELETE FROM relationships WHERE from_url = :url OR to_url = :url',
      args: { url },
    })

    // Delete thing
    const result = await this.client.execute({
      sql: 'DELETE FROM things WHERE url = :url',
      args: { url },
    })

    return result.rowsAffected > 0
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

    await this.client.execute({
      sql: `INSERT OR REPLACE INTO relationships (id, type, from_url, to_url, data, created_at)
            VALUES (:id, :type, :from_url, :to_url, :data, :created_at)`,
      args: {
        id,
        type: options.type,
        from_url: options.from,
        to_url: options.to,
        data: options.data ? JSON.stringify(options.data) : null,
        created_at: now,
      },
    })

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
    const id = generateRelationshipId(from, type, to)
    const result = await this.client.execute({
      sql: 'DELETE FROM relationships WHERE id = :id',
      args: { id },
    })
    return result.rowsAffected > 0
  }

  async related(
    url: string,
    relationshipType?: string,
    direction: 'from' | 'to' | 'both' = 'from'
  ): Promise<Thing<TData>[]> {
    const urls: string[] = []

    if (direction === 'from' || direction === 'both') {
      const typeClause = relationshipType ? 'AND type = :type' : ''
      const args: Record<string, InValue> = { url }
      if (relationshipType) args.type = relationshipType
      const result = await this.client.execute({
        sql: `SELECT to_url FROM relationships WHERE from_url = :url ${typeClause}`,
        args,
      })
      urls.push(...result.rows.map((r) => r.to_url as string))
    }

    if (direction === 'to' || direction === 'both') {
      const typeClause = relationshipType ? 'AND type = :type' : ''
      const args: Record<string, InValue> = { url }
      if (relationshipType) args.type = relationshipType
      const result = await this.client.execute({
        sql: `SELECT from_url FROM relationships WHERE to_url = :url ${typeClause}`,
        args,
      })
      urls.push(...result.rows.map((r) => r.from_url as string))
    }

    const uniqueUrls = [...new Set(urls)]
    if (uniqueUrls.length === 0) return []

    const placeholders = uniqueUrls.map((_, i) => `:url${i}`).join(', ')
    const params: Record<string, string> = {}
    uniqueUrls.forEach((u, i) => params[`url${i}`] = u)

    const result = await this.client.execute({
      sql: `SELECT * FROM things WHERE url IN (${placeholders}) AND deleted_at IS NULL`,
      args: params,
    })

    return result.rows.map(row => this.rowToThing(row as unknown as ThingRow))
  }

  async relationships(
    url: string,
    type?: string,
    direction: 'from' | 'to' | 'both' = 'both'
  ): Promise<Relationship[]> {
    const results: Relationship[] = []

    if (direction === 'from' || direction === 'both') {
      const typeClause = type ? 'AND type = :type' : ''
      const args: Record<string, InValue> = { url }
      if (type) args.type = type
      const result = await this.client.execute({
        sql: `SELECT * FROM relationships WHERE from_url = :url ${typeClause}`,
        args,
      })
      results.push(...result.rows.map((row) => this.rowToRelationship(row as unknown as RelationshipRow)))
    }

    if (direction === 'to' || direction === 'both') {
      const typeClause = type ? 'AND type = :type' : ''
      const args: Record<string, InValue> = { url }
      if (type) args.type = type
      const result = await this.client.execute({
        sql: `SELECT * FROM relationships WHERE to_url = :url ${typeClause}`,
        args,
      })
      results.push(...result.rows.map((row) => this.rowToRelationship(row as unknown as RelationshipRow)))
    }

    return results
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    return this.related(url, relationshipType, 'to')
  }

  // ===========================================================================
  // Vector Search Operations
  // ===========================================================================

  /**
   * Perform semantic vector search
   */
  async vectorSearch(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    if (!this.embedFn) {
      throw new Error('No embedding function configured')
    }

    const queryEmbedding = await this.embedFn(options.query)
    const queryBlob = floatsToBlob(queryEmbedding)

    let sql = `
      SELECT
        s.*,
        vector_distance_cos(s.embedding, :query_embedding) as distance
      FROM search s
      JOIN things t ON s.thing_url = t.url
      WHERE t.deleted_at IS NULL
    `

    const args: Record<string, InValue> = {
      query_embedding: queryBlob,
    }

    if (options.type) {
      sql += ' AND t.type = :type'
      args.type = options.type
    }

    if (options.ns) {
      sql += ' AND t.ns = :ns'
      args.ns = options.ns
    }

    if (options.thingUrls && options.thingUrls.length > 0) {
      const placeholders = options.thingUrls.map((_, i) => `:thing_url${i}`).join(', ')
      sql += ` AND s.thing_url IN (${placeholders})`
      options.thingUrls.forEach((url, i) => args[`thing_url${i}`] = url)
    }

    sql += ' ORDER BY distance ASC'

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`
    }

    const result = await this.client.execute({ sql, args })

    return result.rows
      .map(row => {
        const score = 1 - (row.distance as number) // Convert distance to similarity
        return {
          content: row.content as string,
          score,
          thingUrl: row.thing_url as string,
          chunkIndex: row.chunk_index as number,
          metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
        }
      })
      .filter(r => !options.minScore || r.score >= options.minScore)
  }

  /**
   * Index a thing's content for search
   */
  private async indexThing(url: string, data: TData): Promise<void> {
    // Delete existing chunks
    await this.client.execute({
      sql: 'DELETE FROM search WHERE thing_url = :url',
      args: { url },
    })

    // Get content to index
    const content = [
      data.title,
      data.name,
      data.description,
      data.content,
      data.text,
    ].filter(v => typeof v === 'string').join('\n\n')

    if (!content) return

    // Chunk content
    const chunks = chunkContent(content, this.chunkSize, this.chunkOverlap)

    // Insert chunks
    for (const chunk of chunks) {
      const chunkId = `${url}_chunk_${chunk.index}`

      let embedding: Uint8Array | null = null
      if (this.embedFn) {
        try {
          const floats = await this.embedFn(chunk.content)
          embedding = floatsToBlob(floats)
        } catch (e) {
          console.warn(`Failed to embed chunk ${chunkId}:`, e)
        }
      }

      await this.client.execute({
        sql: `INSERT INTO search (id, thing_url, chunk_index, content, embedding, metadata)
              VALUES (:id, :thing_url, :chunk_index, :content, :embedding, :metadata)`,
        args: {
          id: chunkId,
          thing_url: url,
          chunk_index: chunk.index,
          content: chunk.content,
          embedding,
          metadata: JSON.stringify({ start: chunk.start, end: chunk.end }),
        },
      })
    }
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
      data: JSON.parse(row.data) as TData,
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
      data: JSON.parse(row.data) as T,
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
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) as T : undefined,
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
      size: row.size ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }
  }

  // ===========================================================================
  // Event Operations
  // ===========================================================================

  /**
   * Track an event (analytics-style, append-only)
   */
  async track<T extends Record<string, unknown>>(
    options: CreateEventOptions<T>
  ): Promise<Event<T>> {
    const id = generateId()
    const now = new Date().toISOString()

    await this.client.execute({
      sql: `INSERT INTO events (id, type, timestamp, source, data, correlation_id, causation_id)
            VALUES (:id, :type, :timestamp, :source, :data, :correlation_id, :causation_id)`,
      args: {
        id,
        type: options.type,
        timestamp: now,
        source: options.source,
        data: JSON.stringify(options.data),
        correlation_id: options.correlationId ?? null,
        causation_id: options.causationId ?? null,
      },
    })

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

  /**
   * Get an event by ID
   */
  async getEvent(id: string): Promise<Event | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM events WHERE id = :id',
      args: { id },
    })

    if (result.rows.length === 0) return null
    return this.rowToEvent(result.rows[0] as unknown as EventRow)
  }

  /**
   * Query events
   */
  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    const conditions: string[] = []
    const params: Record<string, InValue> = {}

    if (options.type) {
      conditions.push('type = :type')
      params.type = options.type
    }

    if (options.source) {
      conditions.push('source = :source')
      params.source = options.source
    }

    if (options.correlationId) {
      conditions.push('correlation_id = :correlation_id')
      params.correlation_id = options.correlationId
    }

    if (options.after) {
      conditions.push('timestamp > :after')
      params.after = options.after.toISOString()
    }

    if (options.before) {
      conditions.push('timestamp < :before')
      params.before = options.before.toISOString()
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const result = await this.client.execute({
      sql: `SELECT * FROM events ${whereClause} ORDER BY timestamp DESC ${limitClause} ${offsetClause}`,
      args: params,
    })

    return result.rows.map(row => this.rowToEvent(row as unknown as EventRow))
  }

  // ===========================================================================
  // Action Operations ($.do, $.try, $.send patterns)
  // ===========================================================================

  /**
   * Send an action (fire-and-forget, creates in pending state)
   */
  async send<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const id = generateId()
    const now = new Date().toISOString()

    await this.client.execute({
      sql: `INSERT INTO actions (id, actor, object, action, status, created_at, updated_at, metadata)
            VALUES (:id, :actor, :object, :action, :status, :created_at, :updated_at, :metadata)`,
      args: {
        id,
        actor: options.actor,
        object: options.object,
        action: options.action,
        status: options.status ?? 'pending',
        created_at: now,
        updated_at: now,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      },
    })

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

  /**
   * Do an action (create and immediately start, returns in active state)
   */
  async do<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>
  ): Promise<Action<T>> {
    const id = generateId()
    const now = new Date().toISOString()

    await this.client.execute({
      sql: `INSERT INTO actions (id, actor, object, action, status, created_at, updated_at, started_at, metadata)
            VALUES (:id, :actor, :object, :action, 'active', :created_at, :updated_at, :started_at, :metadata)`,
      args: {
        id,
        actor: options.actor,
        object: options.object,
        action: options.action,
        created_at: now,
        updated_at: now,
        started_at: now,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      },
    })

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

  /**
   * Try an action (with built-in error handling)
   * Executes the provided function and automatically completes or fails the action
   */
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

  /**
   * Get an action by ID
   */
  async getAction(id: string): Promise<Action | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM actions WHERE id = :id',
      args: { id },
    })

    if (result.rows.length === 0) return null
    return this.rowToAction(result.rows[0] as unknown as ActionRow)
  }

  /**
   * Query actions
   */
  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    const conditions: string[] = []
    const params: Record<string, InValue> = {}

    if (options.actor) {
      conditions.push('actor = :actor')
      params.actor = options.actor
    }

    if (options.object) {
      conditions.push('object = :object')
      params.object = options.object
    }

    if (options.action) {
      conditions.push('action = :action')
      params.action = options.action
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        const placeholders = options.status.map((_, i) => `:status${i}`).join(', ')
        conditions.push(`status IN (${placeholders})`)
        options.status.forEach((s, i) => params[`status${i}`] = s)
      } else {
        conditions.push('status = :status')
        params.status = options.status
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const result = await this.client.execute({
      sql: `SELECT * FROM actions ${whereClause} ORDER BY created_at DESC ${limitClause} ${offsetClause}`,
      args: params,
    })

    return result.rows.map(row => this.rowToAction(row as unknown as ActionRow))
  }

  /**
   * Start an action (set status to 'active')
   */
  async startAction(id: string): Promise<Action> {
    const now = new Date().toISOString()

    await this.client.execute({
      sql: `UPDATE actions SET status = 'active', started_at = :started_at, updated_at = :updated_at WHERE id = :id`,
      args: { id, started_at: now, updated_at: now },
    })

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  /**
   * Complete an action
   */
  async completeAction(id: string, result?: unknown): Promise<Action> {
    const now = new Date().toISOString()

    await this.client.execute({
      sql: `UPDATE actions SET status = 'completed', completed_at = :completed_at, updated_at = :updated_at, result = :result WHERE id = :id`,
      args: {
        id,
        completed_at: now,
        updated_at: now,
        result: result !== undefined ? JSON.stringify(result) : null,
      },
    })

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  /**
   * Fail an action
   */
  async failAction(id: string, error: string): Promise<Action> {
    const now = new Date().toISOString()

    await this.client.execute({
      sql: `UPDATE actions SET status = 'failed', completed_at = :completed_at, updated_at = :updated_at, error = :error WHERE id = :id`,
      args: { id, completed_at: now, updated_at: now, error },
    })

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  /**
   * Cancel an action
   */
  async cancelAction(id: string): Promise<Action> {
    const now = new Date().toISOString()

    await this.client.execute({
      sql: `UPDATE actions SET status = 'cancelled', completed_at = :completed_at, updated_at = :updated_at WHERE id = :id`,
      args: { id, completed_at: now, updated_at: now },
    })

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  // ===========================================================================
  // Artifact Operations
  // ===========================================================================

  /**
   * Store an artifact
   */
  async storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>> {
    const now = new Date().toISOString()
    const content = JSON.stringify(options.content)
    const expiresAt = options.ttl
      ? new Date(Date.now() + options.ttl).toISOString()
      : null

    await this.client.execute({
      sql: `INSERT OR REPLACE INTO artifacts (key, type, source, source_hash, created_at, expires_at, content, size, metadata)
            VALUES (:key, :type, :source, :source_hash, :created_at, :expires_at, :content, :size, :metadata)`,
      args: {
        key: options.key,
        type: options.type,
        source: options.source,
        source_hash: options.sourceHash,
        created_at: now,
        expires_at: expiresAt,
        content,
        size: content.length,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      },
    })

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

  /**
   * Get an artifact by key
   */
  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM artifacts WHERE key = :key',
      args: { key },
    })

    if (result.rows.length === 0) return null

    const row = result.rows[0] as unknown as ArtifactRow

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.deleteArtifact(key)
      return null
    }

    return this.rowToArtifact<T>(row)
  }

  /**
   * Get artifact by source and type
   */
  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM artifacts WHERE source = :source AND type = :type',
      args: { source, type },
    })

    if (result.rows.length === 0) return null

    const row = result.rows[0] as unknown as ArtifactRow

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.deleteArtifact(row.key)
      return null
    }

    return this.rowToArtifact(row)
  }

  /**
   * Delete an artifact
   */
  async deleteArtifact(key: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: 'DELETE FROM artifacts WHERE key = :key',
      args: { key },
    })

    return result.rowsAffected > 0
  }

  /**
   * Clean expired artifacts
   */
  async cleanExpiredArtifacts(): Promise<number> {
    const now = new Date().toISOString()

    const result = await this.client.execute({
      sql: 'DELETE FROM artifacts WHERE expires_at IS NOT NULL AND expires_at < :now',
      args: { now },
    })

    return result.rowsAffected
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    this.client.close()
  }

  /**
   * Get the underlying libSQL client for advanced operations
   */
  getClient(): Client {
    return this.client
  }
}

/**
 * Create a SQLite/libSQL database instance
 *
 * @example
 * ```ts
 * import { createSqliteDatabase } from '@mdxdb/sqlite'
 *
 * // Local file database
 * const db = await createSqliteDatabase({ url: './data.db' })
 *
 * // In-memory database (great for testing)
 * const memDb = await createSqliteDatabase({ url: ':memory:' })
 *
 * // Remote Turso database
 * const tursoDb = await createSqliteDatabase({
 *   url: 'libsql://your-db.turso.io',
 *   authToken: process.env.TURSO_AUTH_TOKEN,
 * })
 *
 * // With vector search
 * const vectorDb = await createSqliteDatabase({
 *   url: './data.db',
 *   embedFn: async (text) => {
 *     // Your embedding function (e.g., OpenAI, Cloudflare)
 *     return await embed(text)
 *   },
 * })
 *
 * // Create a thing
 * const user = await db.create({
 *   ns: 'example.com',
 *   type: 'User',
 *   data: { name: 'Alice' },
 * })
 *
 * // Create relationships
 * await db.relate({
 *   type: 'follows',
 *   from: user.url,
 *   to: 'https://example.com/User/bob',
 * })
 *
 * // Vector search
 * const results = await db.vectorSearch({
 *   query: 'machine learning tutorials',
 *   limit: 10,
 * })
 * ```
 */
export async function createSqliteDatabase<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: SqliteDatabaseConfig
): Promise<SqliteDatabase<TData>> {
  const db = new SqliteDatabase<TData>(config)
  await db.init()
  return db
}
