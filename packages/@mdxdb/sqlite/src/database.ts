/**
 * @mdxdb/sqlite Database Implementation
 *
 * @packageDocumentation
 */

import Database from 'better-sqlite3'
import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type {
  Database as IDatabase,
  ListOptions,
  ListResult,
  SearchOptions,
  SearchResult,
  GetOptions,
  SetOptions,
  SetResult,
  DeleteOptions,
  DeleteResult,
} from 'mdxdb'
import type { SqliteDatabaseConfig, DocumentRow } from './types.js'

/**
 * SQL schema for the documents table
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    type TEXT,
    context TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
  CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
`

/**
 * SQLite-based MDX document database
 */
export class SqliteDatabase<TData extends MDXLDData = MDXLDData> implements IDatabase<TData> {
  private db: Database.Database

  constructor(config: SqliteDatabaseConfig) {
    const { filename, wal = true, readonly = false } = config

    this.db = new Database(filename, {
      readonly,
      fileMustExist: !config.create && config.create !== undefined ? true : false,
    })

    // Enable WAL mode for better concurrent access
    if (wal && !readonly) {
      this.db.pragma('journal_mode = WAL')
    }

    // Create schema
    if (!readonly) {
      this.db.exec(SCHEMA)
    }
  }

  /**
   * Convert database row to MDXLDDocument
   */
  private rowToDocument(row: DocumentRow): MDXLDDocument<TData> {
    const data = JSON.parse(row.data) as TData
    return {
      id: row.id,
      ...(row.type && { type: row.type }),
      ...(row.context && { context: JSON.parse(row.context) }),
      data,
      content: row.content,
    } as MDXLDDocument<TData>
  }

  /**
   * List documents with optional filtering and pagination
   */
  list(options: ListOptions = {}): Promise<ListResult<TData>> {
    const { limit = 100, offset = 0, sortBy, sortOrder = 'asc', type, prefix } = options

    const conditions: string[] = ['deleted_at IS NULL']
    const params: Record<string, unknown> = {}

    if (type) {
      if (Array.isArray(type)) {
        const placeholders = type.map((_, i) => `@type${i}`).join(', ')
        conditions.push(`type IN (${placeholders})`)
        type.forEach((t, i) => {
          params[`type${i}`] = t
        })
      } else {
        conditions.push('type = @type')
        params.type = type
      }
    }

    if (prefix) {
      conditions.push("id LIKE @prefix || '%'")
      params.prefix = prefix
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM documents ${whereClause}`)
    const countResult = countStmt.get(params) as { count: number }
    const total = countResult.count

    // Build ORDER BY clause
    let orderClause = 'ORDER BY updated_at DESC'
    if (sortBy) {
      // For sorting by data fields, we use JSON extraction
      const direction = sortOrder === 'desc' ? 'DESC' : 'ASC'
      if (['id', 'type', 'created_at', 'updated_at'].includes(sortBy)) {
        orderClause = `ORDER BY ${sortBy} ${direction}`
      } else {
        orderClause = `ORDER BY json_extract(data, '$.${sortBy}') ${direction}`
      }
    }

    // Get documents
    const selectStmt = this.db.prepare(`
      SELECT * FROM documents
      ${whereClause}
      ${orderClause}
      LIMIT @limit OFFSET @offset
    `)

    const rows = selectStmt.all({ ...params, limit, offset }) as DocumentRow[]
    const documents = rows.map((row) => this.rowToDocument(row))

    return Promise.resolve({
      documents,
      total,
      hasMore: offset + limit < total,
    })
  }

  /**
   * Search documents by query
   */
  search(options: SearchOptions): Promise<SearchResult<TData>> {
    const { query, limit = 100, offset = 0, fields, type } = options

    const queryLower = query.toLowerCase()
    const conditions: string[] = ['deleted_at IS NULL']
    const params: Record<string, unknown> = {}

    if (type) {
      if (Array.isArray(type)) {
        const placeholders = type.map((_, i) => `@type${i}`).join(', ')
        conditions.push(`type IN (${placeholders})`)
        type.forEach((t, i) => {
          params[`type${i}`] = t
        })
      } else {
        conditions.push('type = @type')
        params.type = type
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get all matching documents (we'll filter and score in memory for flexibility)
    const selectStmt = this.db.prepare(`SELECT * FROM documents ${whereClause}`)
    const rows = selectStmt.all(params) as DocumentRow[]

    // Score and filter documents
    const scoredDocs: Array<MDXLDDocument<TData> & { score: number }> = []

    for (const row of rows) {
      let score = 0
      const doc = this.rowToDocument(row)
      const data = doc.data as Record<string, unknown>
      const searchFields = fields ?? ['content', ...Object.keys(data)]

      for (const field of searchFields) {
        let text = ''

        if (field === 'content') {
          text = doc.content
        } else if (field === 'id') {
          text = doc.id ?? ''
        } else if (field === 'type') {
          text = typeof doc.type === 'string' ? doc.type : ''
        } else if (field in data) {
          const val = data[field]
          text = typeof val === 'string' ? val : JSON.stringify(val)
        }

        const textLower = text.toLowerCase()
        if (textLower.includes(queryLower)) {
          // Count occurrences for scoring
          const matches = textLower.split(queryLower).length - 1
          score += matches
        }
      }

      if (score > 0) {
        scoredDocs.push({ ...doc, score })
      }
    }

    // Sort by score descending
    scoredDocs.sort((a, b) => b.score - a.score)

    // Apply pagination
    const total = scoredDocs.length
    const paginatedDocs = scoredDocs.slice(offset, offset + limit)

    return Promise.resolve({
      documents: paginatedDocs,
      total,
      hasMore: offset + limit < total,
    })
  }

  /**
   * Get a document by ID
   */
  get(id: string, _options: GetOptions = {}): Promise<MDXLDDocument<TData> | null> {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE id = @id AND deleted_at IS NULL')
    const row = stmt.get({ id }) as DocumentRow | undefined

    if (!row) {
      return Promise.resolve(null)
    }

    return Promise.resolve(this.rowToDocument(row))
  }

  /**
   * Set/create a document
   */
  set(id: string, document: MDXLDDocument<TData>, options: SetOptions = {}): Promise<SetResult> {
    const { createOnly, updateOnly, version } = options

    // Check if document exists
    const existingStmt = this.db.prepare(
      'SELECT id, version FROM documents WHERE id = @id AND deleted_at IS NULL'
    )
    const existing = existingStmt.get({ id }) as { id: string; version: number } | undefined

    if (createOnly && existing) {
      return Promise.reject(new Error(`Document already exists: ${id}`))
    }

    if (updateOnly && !existing) {
      return Promise.reject(new Error(`Document does not exist: ${id}`))
    }

    if (version !== undefined && existing && existing.version !== parseInt(version, 10)) {
      return Promise.reject(new Error(`Version mismatch: expected ${version}, got ${existing.version}`))
    }

    const type = document.type ?? null
    const context = document.context ? JSON.stringify(document.context) : null
    const data = JSON.stringify(document.data)
    const content = document.content

    if (existing) {
      // Update existing document
      const updateStmt = this.db.prepare(`
        UPDATE documents
        SET type = @type, context = @context, data = @data, content = @content,
            updated_at = datetime('now'), version = version + 1
        WHERE id = @id
      `)
      updateStmt.run({ id, type, context, data, content })

      return Promise.resolve({
        id,
        created: false,
        version: String(existing.version + 1),
      })
    } else {
      // Insert new document
      const insertStmt = this.db.prepare(`
        INSERT INTO documents (id, type, context, data, content)
        VALUES (@id, @type, @context, @data, @content)
      `)
      insertStmt.run({ id, type, context, data, content })

      return Promise.resolve({
        id,
        created: true,
        version: '1',
      })
    }
  }

  /**
   * Delete a document
   */
  delete(id: string, options: DeleteOptions = {}): Promise<DeleteResult> {
    const { soft, version } = options

    // Check if document exists
    const existingStmt = this.db.prepare(
      'SELECT id, version FROM documents WHERE id = @id AND deleted_at IS NULL'
    )
    const existing = existingStmt.get({ id }) as { id: string; version: number } | undefined

    if (!existing) {
      return Promise.resolve({
        id,
        deleted: false,
      })
    }

    if (version !== undefined && existing.version !== parseInt(version, 10)) {
      return Promise.reject(new Error(`Version mismatch: expected ${version}, got ${existing.version}`))
    }

    if (soft) {
      // Soft delete: set deleted_at timestamp
      const softDeleteStmt = this.db.prepare(`
        UPDATE documents SET deleted_at = datetime('now') WHERE id = @id
      `)
      softDeleteStmt.run({ id })
    } else {
      // Hard delete: remove row
      const deleteStmt = this.db.prepare('DELETE FROM documents WHERE id = @id')
      deleteStmt.run({ id })
    }

    return Promise.resolve({
      id,
      deleted: true,
    })
  }

  /**
   * Close the database connection
   */
  close(): Promise<void> {
    this.db.close()
    return Promise.resolve()
  }

  /**
   * Get the underlying better-sqlite3 database instance for advanced operations
   */
  getDb(): Database.Database {
    return this.db
  }
}

/**
 * Create a SQLite database instance
 *
 * @example
 * ```ts
 * import { createSqliteDatabase } from '@mdxdb/sqlite'
 *
 * // File-based database
 * const db = createSqliteDatabase({ filename: './data.db' })
 *
 * // In-memory database (great for testing)
 * const memDb = createSqliteDatabase({ filename: ':memory:' })
 *
 * // List all documents
 * const { documents } = await db.list()
 *
 * // Search documents
 * const results = await db.search({ query: 'hello' })
 *
 * // Get a document
 * const doc = await db.get('posts/hello-world')
 *
 * // Create/update a document
 * await db.set('posts/new-post', {
 *   type: 'BlogPost',
 *   data: { title: 'New Post' },
 *   content: '# Hello!'
 * })
 *
 * // Delete a document
 * await db.delete('posts/old-post')
 *
 * // Close when done
 * await db.close()
 * ```
 */
export function createSqliteDatabase<TData extends MDXLDData = MDXLDData>(
  config: SqliteDatabaseConfig
): SqliteDatabase<TData> {
  return new SqliteDatabase<TData>(config)
}
