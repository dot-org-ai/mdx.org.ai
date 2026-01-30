/**
 * MDXDatabase Durable Object
 *
 * Clean implementation with _data and _rels tables.
 * $id is derived from the DO name, not stored.
 *
 * @packageDocumentation
 */

import { DurableObject } from 'cloudflare:workers'
import type {
  Thing,
  Relationship,
  ListOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  RelationshipQueryOptions,
  DataRow,
  RelsRow,
  Env,
} from './types.js'
import { getAllSchemaStatements } from './schema/index.js'

// =============================================================================
// Utilities
// =============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function generateRelId(from: string, predicate: string, to: string): string {
  let hash = 0
  const str = `${from}:${predicate}:${to}`
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `rel_${Math.abs(hash).toString(36)}`
}

function buildUrl(baseId: string, type: string, id: string): string {
  // Remove trailing slash from baseId if present
  const base = baseId.endsWith('/') ? baseId.slice(0, -1) : baseId
  return `${base}/${type}/${id}`
}

// =============================================================================
// MDXDatabase Durable Object
// =============================================================================

/**
 * MDXDatabase Durable Object
 *
 * Clean graph database with _data (nodes) and _rels (edges).
 * $id is derived from the DO name.
 */
export class MDXDatabase extends DurableObject<Env> {
  private sql: SqlStorage
  private baseId: string
  private initialized = false
  private doCtx: DurableObjectState

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.doCtx = ctx
    this.sql = ctx.storage.sql

    // Derive $id from DO name
    // If name looks like a domain, prefix with https://
    const name = ctx.id.name ?? ctx.id.toString()
    this.baseId = name.includes('://') ? name : `https://${name}`
  }

  private ensureInitialized(): void {
    if (this.initialized) return

    this.doCtx.storage.transactionSync(() => {
      const statements = getAllSchemaStatements()
      for (const stmt of statements) {
        this.sql.exec(stmt)
      }
    })

    this.initialized = true
  }

  // ===========================================================================
  // Identity
  // ===========================================================================

  /**
   * Get the DO's canonical $id
   */
  $id(): string {
    return this.baseId
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  async list(options: ListOptions = {}): Promise<Thing[]> {
    this.ensureInitialized()

    let sql = 'SELECT * FROM _data WHERE 1=1'
    const bindings: unknown[] = []

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

    const orderDir = options.order === 'asc' ? 'ASC' : 'DESC'
    if (options.orderBy) {
      if (['url', 'type', 'id', 'at', 'version'].includes(options.orderBy)) {
        sql += ` ORDER BY ${options.orderBy} ${orderDir}`
      } else {
        sql += ` ORDER BY json_extract(data, '$.${options.orderBy}') ${orderDir}`
      }
    } else {
      sql += ` ORDER BY at DESC`
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`
    }

    const cursor = this.sql.exec<DataRow>(sql, ...bindings)
    return cursor.toArray().map((row) => this.rowToThing(row))
  }

  async get(url: string): Promise<Thing | null> {
    this.ensureInitialized()

    const cursor = this.sql.exec<DataRow>(
      'SELECT * FROM _data WHERE url = ?',
      url
    )
    const rows = cursor.toArray()
    if (rows.length === 0) return null
    return this.rowToThing(rows[0]!)
  }

  async getById(type: string, id: string): Promise<Thing | null> {
    return this.get(buildUrl(this.baseId, type, id))
  }

  async create<TData = Record<string, unknown>>(
    options: CreateOptions<TData>
  ): Promise<Thing<TData>> {
    this.ensureInitialized()

    const id = options.id ?? generateId()
    const url = buildUrl(this.baseId, options.type, id)
    const now = new Date().toISOString()

    // Check if exists
    const existing = await this.get(url)
    if (existing) {
      throw new Error(`Thing already exists: ${url}`)
    }

    this.sql.exec(
      `INSERT INTO _data (url, type, id, data, content, context, at, by, "in")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      url,
      options.type,
      id,
      JSON.stringify(options.data),
      options.content ?? null,
      options['@context'] ? JSON.stringify(options['@context']) : null,
      now,
      options.by ?? null,
      options.in ?? null
    )

    return {
      url,
      type: options.type,
      id,
      data: options.data,
      content: options.content,
      '@context': options['@context'],
      at: new Date(now),
      by: options.by,
      in: options.in,
      version: 1,
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

    // Optimistic locking
    if (options.version !== undefined && options.version !== existing.version) {
      throw new Error(`Version conflict: expected ${options.version}, got ${existing.version}`)
    }

    const merged = options.data
      ? { ...existing.data, ...options.data }
      : existing.data
    const now = new Date().toISOString()

    this.sql.exec(
      `UPDATE _data SET data = ?, content = COALESCE(?, content), at = ?, by = ?, "in" = ?, version = version + 1
       WHERE url = ?`,
      JSON.stringify(merged),
      options.content ?? null,
      now,
      options.by ?? null,
      options.in ?? null,
      url
    )

    return {
      ...existing,
      data: merged as TData,
      content: options.content ?? existing.content,
      at: new Date(now),
      by: options.by,
      in: options.in,
      version: existing.version + 1,
    }
  }

  async upsert<TData = Record<string, unknown>>(
    options: CreateOptions<TData>
  ): Promise<Thing<TData>> {
    const id = options.id ?? generateId()
    const url = buildUrl(this.baseId, options.type, id)

    const existing = await this.get(url)
    if (existing) {
      return this.update<TData>(url, {
        data: options.data,
        content: options.content,
        by: options.by,
        in: options.in,
      })
    }

    return this.create({ ...options, id })
  }

  async delete(url: string): Promise<boolean> {
    this.ensureInitialized()

    // Delete relationships
    this.sql.exec('DELETE FROM _rels WHERE "from" = ? OR "to" = ?', url, url)

    // Delete thing
    const cursor = this.sql.exec('DELETE FROM _data WHERE url = ?', url)
    return cursor.rowsWritten > 0
  }

  // ===========================================================================
  // Relationship Operations
  // ===========================================================================

  async relate<TData = Record<string, unknown>>(
    options: RelateOptions<TData>
  ): Promise<Relationship<TData>> {
    this.ensureInitialized()

    const id = generateRelId(options.from, options.predicate, options.to)
    const now = new Date().toISOString()

    this.sql.exec(
      `INSERT OR REPLACE INTO _rels (id, predicate, reverse, "from", "to", data, at, by, "in", do)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      options.predicate,
      options.reverse ?? null,
      options.from,
      options.to,
      options.data ? JSON.stringify(options.data) : null,
      now,
      options.by ?? null,
      options.in ?? null,
      options.do ?? null
    )

    return {
      id,
      predicate: options.predicate,
      reverse: options.reverse,
      from: options.from,
      to: options.to,
      data: options.data,
      at: new Date(now),
      by: options.by,
      in: options.in,
      do: options.do,
    }
  }

  async unrelate(from: string, predicate: string, to: string): Promise<boolean> {
    this.ensureInitialized()

    const id = generateRelId(from, predicate, to)
    const cursor = this.sql.exec('DELETE FROM _rels WHERE id = ?', id)
    return cursor.rowsWritten > 0
  }

  /**
   * Get related things via predicate (forward direction)
   * Example: post.related('author') returns the author
   */
  async related(url: string, predicate: string): Promise<Thing[]> {
    this.ensureInitialized()

    const cursor = this.sql.exec<{ to: string }>(
      'SELECT "to" FROM _rels WHERE "from" = ? AND predicate = ?',
      url,
      predicate
    )
    const urls = cursor.toArray().map((r) => r.to)

    if (urls.length === 0) return []

    const placeholders = urls.map(() => '?').join(', ')
    const thingCursor = this.sql.exec<DataRow>(
      `SELECT * FROM _data WHERE url IN (${placeholders})`,
      ...urls
    )
    return thingCursor.toArray().map((row) => this.rowToThing(row))
  }

  /**
   * Get related things via reverse (reverse direction)
   * Example: user.relatedBy('posts') returns posts where user is the author
   */
  async relatedBy(url: string, reverse: string): Promise<Thing[]> {
    this.ensureInitialized()

    const cursor = this.sql.exec<{ from: string }>(
      'SELECT "from" FROM _rels WHERE "to" = ? AND reverse = ?',
      url,
      reverse
    )
    const urls = cursor.toArray().map((r) => r.from)

    if (urls.length === 0) return []

    const placeholders = urls.map(() => '?').join(', ')
    const thingCursor = this.sql.exec<DataRow>(
      `SELECT * FROM _data WHERE url IN (${placeholders})`,
      ...urls
    )
    return thingCursor.toArray().map((row) => this.rowToThing(row))
  }

  /**
   * Get all relationships for a thing
   */
  async relationships(
    url: string,
    options: RelationshipQueryOptions = {}
  ): Promise<Relationship[]> {
    this.ensureInitialized()

    let sql = 'SELECT * FROM _rels WHERE ("from" = ? OR "to" = ?)'
    const bindings: unknown[] = [url, url]

    if (options.predicate) {
      sql += ' AND predicate = ?'
      bindings.push(options.predicate)
    }

    if (options.reverse) {
      sql += ' AND reverse = ?'
      bindings.push(options.reverse)
    }

    sql += ' ORDER BY at DESC'

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`
    }

    const cursor = this.sql.exec<RelsRow>(sql, ...bindings)
    return cursor.toArray().map((row) => this.rowToRelationship(row))
  }

  // ===========================================================================
  // Database Info
  // ===========================================================================

  getDatabaseSize(): number {
    return this.sql.databaseSize
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private rowToThing<TData = Record<string, unknown>>(row: DataRow): Thing<TData> {
    return {
      url: row.url,
      type: row.type,
      id: row.id,
      data: JSON.parse(row.data) as TData,
      content: row.content ?? undefined,
      '@context': row.context ? JSON.parse(row.context) : undefined,
      at: new Date(row.at),
      by: row.by ?? undefined,
      in: row.in ?? undefined,
      version: row.version,
    }
  }

  private rowToRelationship<TData = Record<string, unknown>>(row: RelsRow): Relationship<TData> {
    return {
      id: row.id,
      predicate: row.predicate,
      reverse: row.reverse ?? undefined,
      from: row.from,
      to: row.to,
      data: row.data ? (JSON.parse(row.data) as TData) : undefined,
      at: new Date(row.at),
      by: row.by ?? undefined,
      in: row.in ?? undefined,
      do: row.do ?? undefined,
    }
  }
}

/**
 * Default export for Workers
 */
export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    return new Response('MDXDatabase uses Workers RPC. Use the Durable Object binding directly.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  },
}
