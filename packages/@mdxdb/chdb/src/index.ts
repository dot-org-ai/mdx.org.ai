/**
 * @mdxdb/chdb - Embedded ClickHouse with Vector Search
 *
 * This module wraps the native chdb library built with:
 * - USE_USEARCH=1 for vector_similarity indexes
 * - Full ULID support
 */

// Re-export native bindings
// In production, this will load from prebuilds
// During development, falls back to standard chdb

let nativeModule: ChdbModule

interface ChdbModule {
  query: (sql: string, format?: string) => string
  Session: new (path?: string) => ChdbSession
}

interface ChdbSession {
  path: string
  isTemp: boolean
  query: (sql: string, format?: string) => string
  cleanup: () => void
}

// Try to load our custom build, fall back to standard chdb
try {
  // First try our prebuilt binaries
  nativeModule = require('../prebuilds') as ChdbModule
} catch {
  try {
    // Fall back to standard chdb (for development)
    nativeModule = require('chdb') as ChdbModule
    console.warn(
      '[@mdxdb/chdb] Using standard chdb - vector_similarity and generateULID may not be available'
    )
  } catch {
    throw new Error(
      '[@mdxdb/chdb] No native bindings found. Install with: pnpm add @mdxdb/chdb'
    )
  }
}

/**
 * Execute a stateless query
 *
 * @param sql - SQL query to execute
 * @param format - Output format (CSV, JSON, TSV, etc.)
 * @returns Query result as string
 *
 * @example
 * ```ts
 * const result = query('SELECT generateULID()', 'JSON')
 * ```
 */
export function query(sql: string, format?: string): string {
  return nativeModule.query(sql, format)
}

/**
 * Session for stateful queries with persistent or temporary storage
 *
 * @example
 * ```ts
 * // Temporary session (auto-cleanup)
 * const session = new Session()
 *
 * // Persistent session
 * const session = new Session('/path/to/data')
 *
 * session.query('CREATE TABLE test (id UInt64) ENGINE = MergeTree() ORDER BY id')
 * session.query('INSERT INTO test VALUES (1), (2), (3)')
 * const result = session.query('SELECT * FROM test', 'JSON')
 *
 * session.cleanup()
 * ```
 */
export class Session {
  private native: ChdbSession

  /**
   * Path to the session data directory
   */
  get path(): string {
    return this.native.path
  }

  /**
   * Whether this is a temporary session (will be cleaned up automatically)
   */
  get isTemp(): boolean {
    return this.native.isTemp
  }

  /**
   * Create a new session
   *
   * @param path - Optional path for persistent storage. If not provided, uses temp directory.
   */
  constructor(path?: string) {
    this.native = new nativeModule.Session(path)
  }

  /**
   * Execute a query in this session
   *
   * @param sql - SQL query to execute
   * @param format - Output format (CSV, JSON, TSV, etc.)
   * @returns Query result as string
   */
  query(sql: string, format?: string): string {
    return this.native.query(sql, format)
  }

  /**
   * Clean up the session and release resources
   * For temporary sessions, this deletes the temp directory
   */
  cleanup(): void {
    this.native.cleanup()
  }
}

// Type exports for consumers
export type { ChdbSession, ChdbModule }

/**
 * Supported output formats for queries
 */
export type OutputFormat =
  | 'CSV'
  | 'CSVWithNames'
  | 'JSON'
  | 'JSONCompact'
  | 'JSONEachRow'
  | 'TSV'
  | 'TSVWithNames'
  | 'Pretty'
  | 'PrettyCompact'
  | 'Vertical'
  | 'Markdown'
  | 'XML'
  | 'Arrow'
  | 'Parquet'

/**
 * Check if vector similarity indexes are available
 */
export function hasVectorSearch(): boolean {
  try {
    const session = new Session()
    session.query('SET allow_experimental_vector_similarity_index = 1')
    session.query(`
      CREATE TABLE IF NOT EXISTS __chdb_vector_test (
        id UInt64,
        v Array(Float32),
        INDEX idx v TYPE vector_similarity('hnsw', 'cosineDistance', 3) GRANULARITY 1
      ) ENGINE = MergeTree() ORDER BY id
    `)
    session.query('DROP TABLE IF EXISTS __chdb_vector_test')
    session.cleanup()
    return true
  } catch {
    return false
  }
}

/**
 * Check if ULID functions are available
 */
export function hasULID(): boolean {
  try {
    const session = new Session()
    const result = session.query('SELECT generateULID()', 'JSON')
    session.cleanup()
    return result.includes('data')
  } catch {
    return false
  }
}
