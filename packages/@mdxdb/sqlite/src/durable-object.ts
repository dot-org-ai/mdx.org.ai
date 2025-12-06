/**
 * MDXDatabase Durable Object
 *
 * A Durable Object that provides SQLite storage for a namespace.
 * Methods are exposed via Workers RPC - call them directly on the stub.
 *
 * @example
 * ```ts
 * // In a Worker
 * const id = env.MDXDB.idFromName('example.com')
 * const db = env.MDXDB.get(id)
 *
 * // Call methods directly via RPC
 * const thing = await db.create({
 *   ns: 'example.com',
 *   type: 'Post',
 *   data: { title: 'Hello' }
 * })
 *
 * const posts = await db.list({ type: 'Post' })
 * ```
 *
 * @packageDocumentation
 */

import type {
  DurableObjectState,
  SqlStorage,
  Thing,
  Relationship,
  Event,
  Action,
  Artifact,
  QueryOptions,
  SearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  VectorSearchOptions,
  VectorSearchResult,
  ThingRow,
  RelationshipRow,
  SearchRow,
  EventRow,
  ActionRow,
  ArtifactRow,
  Chunk,
  ArtifactType,
  Env,
} from './types.js'

import { getAllSchemaStatements } from '../schema/index.js'

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

function chunkContent(content: string, size = 1000, overlap = 200): Chunk[] {
  if (!content || content.length === 0) return []

  const chunks: Chunk[] = []
  let start = 0
  let index = 0

  while (start < content.length) {
    let end = Math.min(start + size, content.length)

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

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// =============================================================================
// MDXDatabase Durable Object
// =============================================================================

/**
 * MDXDatabase Durable Object
 *
 * Each instance represents a namespace with its own SQLite database.
 * All public methods are exposed via Workers RPC.
 */
export class MDXDatabase {
  private sql: SqlStorage
  private namespace: string
  private initialized = false

  constructor(private ctx: DurableObjectState, private env: Env) {
    this.sql = ctx.storage.sql
    this.namespace = ctx.id.name ?? ctx.id.toString()
  }

  private ensureInitialized(): void {
    if (this.initialized) return

    // Run schema in a transaction
    this.ctx.storage.transactionSync(() => {
      // Execute each schema statement from the schema module
      const statements = getAllSchemaStatements()
      for (const stmt of statements) {
        this.sql.exec(stmt)
      }
    })

    this.initialized = true
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: QueryOptions = {}): Promise<Thing[]> {
    this.ensureInitialized()

    let sql = 'SELECT * FROM things WHERE deleted_at IS NULL'
    const bindings: unknown[] = []

    if (options.ns) {
      sql += ' AND ns = ?'
      bindings.push(options.ns)
    }

    if (options.type) {
      sql += ' AND type = ?'
      bindings.push(options.type)
    }

    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        sql += ` AND json_extract(data, '$.${key}') = ?`
        bindings.push(typeof value === 'string' ? value : JSON.stringify(value))
      }
    }

    // Order
    const orderDir = options.order === 'desc' ? 'DESC' : 'ASC'
    if (options.orderBy) {
      if (['url', 'ns', 'type', 'id', 'created_at', 'updated_at'].includes(options.orderBy)) {
        sql += ` ORDER BY ${options.orderBy} ${orderDir}`
      } else {
        sql += ` ORDER BY json_extract(data, '$.${options.orderBy}') ${orderDir}`
      }
    } else {
      sql += ` ORDER BY updated_at DESC`
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`
    }

    const cursor = this.sql.exec<ThingRow>(sql, ...bindings)
    return cursor.toArray().map(row => this.rowToThing(row))
  }

  async get(url: string): Promise<Thing | null> {
    this.ensureInitialized()

    const cursor = this.sql.exec<ThingRow>(
      'SELECT * FROM things WHERE url = ? AND deleted_at IS NULL',
      url
    )
    const rows = cursor.toArray()
    if (rows.length === 0) return null
    return this.rowToThing(rows[0]!)
  }

  async getById(type: string, id: string): Promise<Thing | null> {
    return this.get(buildUrl(this.namespace, type, id))
  }

  async create<TData = Record<string, unknown>>(options: CreateOptions<TData>): Promise<Thing<TData>> {
    this.ensureInitialized()

    const id = options.id ?? generateId()
    const url = options.url ?? buildUrl(options.ns, options.type, id)
    const now = new Date().toISOString()

    // Check if exists
    const existing = await this.get(url)
    if (existing) {
      throw new Error(`Thing already exists: ${url}`)
    }

    this.sql.exec(
      `INSERT INTO things (url, ns, type, id, context, data, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      url,
      options.ns,
      options.type,
      id,
      options['@context'] ? JSON.stringify(options['@context']) : null,
      JSON.stringify(options.data),
      options.content ?? '',
      now,
      now
    )

    // Index for search
    await this.indexThing(url, options.data as Record<string, unknown>, options.content)

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

  async update<TData = Record<string, unknown>>(
    url: string,
    options: UpdateOptions<TData>
  ): Promise<Thing<TData>> {
    this.ensureInitialized()

    const existing = await this.get(url)
    if (!existing) {
      throw new Error(`Thing not found: ${url}`)
    }

    const merged = { ...existing.data, ...options.data } as TData
    const now = new Date().toISOString()

    this.sql.exec(
      `UPDATE things SET data = ?, content = COALESCE(?, content), updated_at = ?, version = version + 1
       WHERE url = ?`,
      JSON.stringify(merged),
      options.content ?? null,
      now,
      url
    )

    // Re-index for search
    await this.indexThing(url, merged as Record<string, unknown>, options.content ?? existing.content)

    return {
      ...existing,
      data: merged,
      content: options.content ?? existing.content,
      updatedAt: new Date(now),
    } as Thing<TData>
  }

  async upsert<TData = Record<string, unknown>>(options: CreateOptions<TData>): Promise<Thing<TData>> {
    const id = options.id ?? generateId()
    const url = options.url ?? buildUrl(options.ns, options.type, id)

    const existing = await this.get(url)
    if (existing) {
      return this.update<TData>(url, { data: options.data, content: options.content })
    }

    return this.create({ ...options, id, url })
  }

  async delete(url: string): Promise<boolean> {
    this.ensureInitialized()

    // Delete search chunks
    this.sql.exec('DELETE FROM search WHERE thing_url = ?', url)

    // Delete relationships
    this.sql.exec('DELETE FROM relationships WHERE from_url = ? OR to_url = ?', url, url)

    // Delete thing
    const cursor = this.sql.exec('DELETE FROM things WHERE url = ?', url)
    return cursor.rowsWritten > 0
  }

  async search(options: SearchOptions): Promise<Thing[]> {
    this.ensureInitialized()

    // Simple text search fallback
    const queryLower = options.query.toLowerCase()
    const things = await this.list({
      type: options.type,
      limit: options.limit,
      offset: options.offset,
    })

    return things.filter(thing => {
      const searchText = [
        thing.id,
        thing.type,
        (thing.data as Record<string, unknown>).title,
        (thing.data as Record<string, unknown>).name,
        (thing.data as Record<string, unknown>).content,
        thing.content,
        JSON.stringify(thing.data),
      ].filter(Boolean).join(' ').toLowerCase()

      return searchText.includes(queryLower)
    })
  }

  // ===========================================================================
  // Relationship Operations
  // ===========================================================================

  async relate<TData = Record<string, unknown>>(options: RelateOptions<TData>): Promise<Relationship<TData>> {
    this.ensureInitialized()

    const id = generateRelationshipId(options.from, options.type, options.to)
    const now = new Date().toISOString()

    this.sql.exec(
      `INSERT OR REPLACE INTO relationships (id, type, from_url, to_url, data, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      options.type,
      options.from,
      options.to,
      options.data ? JSON.stringify(options.data) : null,
      now
    )

    return {
      id,
      type: options.type,
      from: options.from,
      to: options.to,
      data: options.data,
      createdAt: new Date(now),
    }
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    this.ensureInitialized()

    const id = generateRelationshipId(from, type, to)
    const cursor = this.sql.exec('DELETE FROM relationships WHERE id = ?', id)
    return cursor.rowsWritten > 0
  }

  async related(url: string, type?: string, direction: 'from' | 'to' | 'both' = 'from'): Promise<Thing[]> {
    this.ensureInitialized()

    const urls: string[] = []

    // direction='to': Return things this URL points TO (outbound, where from_url = url)
    if (direction === 'to' || direction === 'both') {
      let sql = 'SELECT to_url FROM relationships WHERE from_url = ?'
      const bindings: unknown[] = [url]
      if (type) {
        sql += ' AND type = ?'
        bindings.push(type)
      }
      const cursor = this.sql.exec<{ to_url: string }>(sql, ...bindings)
      urls.push(...cursor.toArray().map(r => r.to_url))
    }

    // direction='from': Return things that point TO this URL (inbound, where to_url = url)
    if (direction === 'from' || direction === 'both') {
      let sql = 'SELECT from_url FROM relationships WHERE to_url = ?'
      const bindings: unknown[] = [url]
      if (type) {
        sql += ' AND type = ?'
        bindings.push(type)
      }
      const cursor = this.sql.exec<{ from_url: string }>(sql, ...bindings)
      urls.push(...cursor.toArray().map(r => r.from_url))
    }

    const uniqueUrls = [...new Set(urls)]
    if (uniqueUrls.length === 0) return []

    const placeholders = uniqueUrls.map(() => '?').join(', ')
    const cursor = this.sql.exec<ThingRow>(
      `SELECT * FROM things WHERE url IN (${placeholders}) AND deleted_at IS NULL`,
      ...uniqueUrls
    )
    return cursor.toArray().map(row => this.rowToThing(row))
  }

  async relationships(url: string, type?: string, direction: 'from' | 'to' | 'both' = 'both'): Promise<Relationship[]> {
    this.ensureInitialized()

    const results: Relationship[] = []

    if (direction === 'from' || direction === 'both') {
      let sql = 'SELECT * FROM relationships WHERE from_url = ?'
      const bindings: unknown[] = [url]
      if (type) {
        sql += ' AND type = ?'
        bindings.push(type)
      }
      const cursor = this.sql.exec<RelationshipRow>(sql, ...bindings)
      results.push(...cursor.toArray().map(row => this.rowToRelationship(row)))
    }

    if (direction === 'to' || direction === 'both') {
      let sql = 'SELECT * FROM relationships WHERE to_url = ?'
      const bindings: unknown[] = [url]
      if (type) {
        sql += ' AND type = ?'
        bindings.push(type)
      }
      const cursor = this.sql.exec<RelationshipRow>(sql, ...bindings)
      results.push(...cursor.toArray().map(row => this.rowToRelationship(row)))
    }

    return results
  }

  // ===========================================================================
  // Vector Search Operations
  // ===========================================================================

  async vectorSearch(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    this.ensureInitialized()

    // Get all search chunks with embeddings
    let sql = `
      SELECT s.*, t.type, t.ns
      FROM search s
      JOIN things t ON s.thing_url = t.url
      WHERE s.embedding IS NOT NULL AND t.deleted_at IS NULL
    `
    const bindings: unknown[] = []

    if (options.type) {
      sql += ' AND t.type = ?'
      bindings.push(options.type)
    }

    if (options.thingUrls && options.thingUrls.length > 0) {
      const placeholders = options.thingUrls.map(() => '?').join(', ')
      sql += ` AND s.thing_url IN (${placeholders})`
      bindings.push(...options.thingUrls)
    }

    const cursor = this.sql.exec<SearchRow & { type: string; ns: string }>(sql, ...bindings)
    const rows = cursor.toArray()

    // Parse query embedding from options (should be provided by client)
    // For now, just return empty - client should use setEmbedding + vectorSearch
    // This is a placeholder for when embeddings are passed in
    return []
  }

  async setEmbedding(thingUrl: string, chunkIndex: number, embedding: number[]): Promise<void> {
    this.ensureInitialized()

    this.sql.exec(
      `UPDATE search SET embedding = ? WHERE thing_url = ? AND chunk_index = ?`,
      JSON.stringify(embedding),
      thingUrl,
      chunkIndex
    )
  }

  // ===========================================================================
  // Event Operations
  // ===========================================================================

  async track<TData = Record<string, unknown>>(options: CreateEventOptions<TData>): Promise<Event<TData>> {
    this.ensureInitialized()

    const id = generateId()
    const now = new Date().toISOString()

    this.sql.exec(
      `INSERT INTO events (id, type, timestamp, source, data, correlation_id, causation_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      options.type,
      now,
      options.source,
      JSON.stringify(options.data),
      options.correlationId ?? null,
      options.causationId ?? null
    )

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
    this.ensureInitialized()

    const cursor = this.sql.exec<EventRow>('SELECT * FROM events WHERE id = ?', id)
    const rows = cursor.toArray()
    if (rows.length === 0) return null
    return this.rowToEvent(rows[0]!)
  }

  async queryEvents(options: EventQueryOptions = {}): Promise<Event[]> {
    this.ensureInitialized()

    let sql = 'SELECT * FROM events WHERE 1=1'
    const bindings: unknown[] = []

    if (options.type) {
      sql += ' AND type = ?'
      bindings.push(options.type)
    }

    if (options.source) {
      sql += ' AND source = ?'
      bindings.push(options.source)
    }

    if (options.correlationId) {
      sql += ' AND correlation_id = ?'
      bindings.push(options.correlationId)
    }

    if (options.after) {
      sql += ' AND timestamp > ?'
      bindings.push(options.after.toISOString())
    }

    if (options.before) {
      sql += ' AND timestamp < ?'
      bindings.push(options.before.toISOString())
    }

    sql += ' ORDER BY timestamp DESC'

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`
    }

    const cursor = this.sql.exec<EventRow>(sql, ...bindings)
    return cursor.toArray().map(row => this.rowToEvent(row))
  }

  // ===========================================================================
  // Action Operations
  // ===========================================================================

  async send<TData = Record<string, unknown>>(options: CreateActionOptions<TData>): Promise<Action<TData>> {
    this.ensureInitialized()

    const id = generateId()
    const now = new Date().toISOString()

    this.sql.exec(
      `INSERT INTO actions (id, actor, object, action, status, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      options.actor,
      options.object,
      options.action,
      options.status ?? 'pending',
      now,
      now,
      options.metadata ? JSON.stringify(options.metadata) : null
    )

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

  async do<TData = Record<string, unknown>>(options: CreateActionOptions<TData>): Promise<Action<TData>> {
    this.ensureInitialized()

    const id = generateId()
    const now = new Date().toISOString()

    this.sql.exec(
      `INSERT INTO actions (id, actor, object, action, status, created_at, updated_at, started_at, metadata)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      id,
      options.actor,
      options.object,
      options.action,
      now,
      now,
      now,
      options.metadata ? JSON.stringify(options.metadata) : null
    )

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

  async getAction(id: string): Promise<Action | null> {
    this.ensureInitialized()

    const cursor = this.sql.exec<ActionRow>('SELECT * FROM actions WHERE id = ?', id)
    const rows = cursor.toArray()
    if (rows.length === 0) return null
    return this.rowToAction(rows[0]!)
  }

  async queryActions(options: ActionQueryOptions = {}): Promise<Action[]> {
    this.ensureInitialized()

    let sql = 'SELECT * FROM actions WHERE 1=1'
    const bindings: unknown[] = []

    if (options.actor) {
      sql += ' AND actor = ?'
      bindings.push(options.actor)
    }

    if (options.object) {
      sql += ' AND object = ?'
      bindings.push(options.object)
    }

    if (options.action) {
      sql += ' AND action = ?'
      bindings.push(options.action)
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        const placeholders = options.status.map(() => '?').join(', ')
        sql += ` AND status IN (${placeholders})`
        bindings.push(...options.status)
      } else {
        sql += ' AND status = ?'
        bindings.push(options.status)
      }
    }

    sql += ' ORDER BY created_at DESC'

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`
    }

    const cursor = this.sql.exec<ActionRow>(sql, ...bindings)
    return cursor.toArray().map(row => this.rowToAction(row))
  }

  async startAction(id: string): Promise<Action> {
    this.ensureInitialized()

    const now = new Date().toISOString()
    this.sql.exec(
      `UPDATE actions SET status = 'active', started_at = ?, updated_at = ? WHERE id = ?`,
      now,
      now,
      id
    )

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    this.ensureInitialized()

    const now = new Date().toISOString()
    this.sql.exec(
      `UPDATE actions SET status = 'completed', completed_at = ?, updated_at = ?, result = ? WHERE id = ?`,
      now,
      now,
      result !== undefined ? JSON.stringify(result) : null,
      id
    )

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async failAction(id: string, error: string): Promise<Action> {
    this.ensureInitialized()

    const now = new Date().toISOString()
    this.sql.exec(
      `UPDATE actions SET status = 'failed', completed_at = ?, updated_at = ?, error = ? WHERE id = ?`,
      now,
      now,
      error,
      id
    )

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  async cancelAction(id: string): Promise<Action> {
    this.ensureInitialized()

    const now = new Date().toISOString()
    this.sql.exec(
      `UPDATE actions SET status = 'cancelled', completed_at = ?, updated_at = ? WHERE id = ?`,
      now,
      now,
      id
    )

    const action = await this.getAction(id)
    if (!action) throw new Error(`Action not found: ${id}`)
    return action
  }

  // ===========================================================================
  // Artifact Operations
  // ===========================================================================

  async storeArtifact<TContent = unknown>(options: StoreArtifactOptions<TContent>): Promise<Artifact<TContent>> {
    this.ensureInitialized()

    const now = new Date().toISOString()
    const content = JSON.stringify(options.content)
    const expiresAt = options.ttl
      ? new Date(Date.now() + options.ttl).toISOString()
      : null

    this.sql.exec(
      `INSERT OR REPLACE INTO artifacts (key, type, source, source_hash, created_at, expires_at, content, size, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      options.key,
      options.type,
      options.source,
      options.sourceHash,
      now,
      expiresAt,
      content,
      content.length,
      options.metadata ? JSON.stringify(options.metadata) : null
    )

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

  async getArtifact<TContent = unknown>(key: string): Promise<Artifact<TContent> | null> {
    this.ensureInitialized()

    const cursor = this.sql.exec<ArtifactRow>('SELECT * FROM artifacts WHERE key = ?', key)
    const rows = cursor.toArray()
    if (rows.length === 0) return null

    const row = rows[0]!

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.deleteArtifact(key)
      return null
    }

    return this.rowToArtifact<TContent>(row)
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    this.ensureInitialized()

    const cursor = this.sql.exec<ArtifactRow>(
      'SELECT * FROM artifacts WHERE source = ? AND type = ?',
      source,
      type
    )
    const rows = cursor.toArray()
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
    this.ensureInitialized()

    const cursor = this.sql.exec('DELETE FROM artifacts WHERE key = ?', key)
    return cursor.rowsWritten > 0
  }

  async cleanExpiredArtifacts(): Promise<number> {
    this.ensureInitialized()

    const now = new Date().toISOString()
    const cursor = this.sql.exec(
      'DELETE FROM artifacts WHERE expires_at IS NOT NULL AND expires_at < ?',
      now
    )
    return cursor.rowsWritten
  }

  // ===========================================================================
  // Database Info
  // ===========================================================================

  getDatabaseSize(): number {
    return this.sql.databaseSize
  }

  getNamespace(): string {
    return this.namespace
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async indexThing(url: string, data: Record<string, unknown>, content?: string): Promise<void> {
    // Delete existing chunks
    this.sql.exec('DELETE FROM search WHERE thing_url = ?', url)

    // Get content to index
    const textContent = [
      data.title,
      data.name,
      data.description,
      data.content,
      data.text,
      content,
    ].filter(v => typeof v === 'string').join('\n\n')

    if (!textContent) return

    // Chunk content
    const chunks = chunkContent(textContent)

    // Insert chunks (embeddings will be set separately by client)
    for (const chunk of chunks) {
      const chunkId = `${url}_chunk_${chunk.index}`
      this.sql.exec(
        `INSERT INTO search (id, thing_url, chunk_index, content, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        chunkId,
        url,
        chunk.index,
        chunk.content,
        JSON.stringify({ start: chunk.start, end: chunk.end })
      )
    }
  }

  private rowToThing<TData = Record<string, unknown>>(row: ThingRow): Thing<TData> {
    return {
      ns: row.ns,
      type: row.type,
      id: row.id,
      url: row.url,
      data: JSON.parse(row.data) as TData,
      content: row.content || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      '@context': row.context ? JSON.parse(row.context) : undefined,
    }
  }

  private rowToRelationship<TData = Record<string, unknown>>(row: RelationshipRow): Relationship<TData> {
    return {
      id: row.id,
      type: row.type,
      from: row.from_url,
      to: row.to_url,
      data: row.data ? JSON.parse(row.data) : undefined,
      createdAt: new Date(row.created_at),
    }
  }

  private rowToEvent<TData = Record<string, unknown>>(row: EventRow): Event<TData> {
    return {
      id: row.id,
      type: row.type,
      timestamp: new Date(row.timestamp),
      source: row.source,
      data: JSON.parse(row.data) as TData,
      correlationId: row.correlation_id ?? undefined,
      causationId: row.causation_id ?? undefined,
    }
  }

  private rowToAction<TData = Record<string, unknown>>(row: ActionRow): Action<TData> {
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
      metadata: row.metadata ? JSON.parse(row.metadata) as TData : undefined,
    }
  }

  private rowToArtifact<TContent = unknown>(row: ArtifactRow): Artifact<TContent> {
    return {
      key: row.key,
      type: row.type as ArtifactType,
      source: row.source,
      sourceHash: row.source_hash,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      content: JSON.parse(row.content) as TContent,
      size: row.size ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }
  }
}
