/**
 * @mdxdb/sqlite Types
 *
 * @packageDocumentation
 */

import type { DatabaseConfig } from 'mdxdb'

/**
 * Configuration for the SQLite database
 */
export interface SqliteDatabaseConfig extends DatabaseConfig {
  /** Path to SQLite database file, or ':memory:' for in-memory database */
  filename: string
  /** Whether to enable WAL mode for better concurrent access (default: true) */
  wal?: boolean
  /** Whether to create the database file if it doesn't exist (default: true) */
  create?: boolean
  /** Whether to open database in readonly mode (default: false) */
  readonly?: boolean
}

/**
 * Internal document row structure in SQLite
 */
export interface DocumentRow {
  id: string
  type: string | null
  context: string | null
  data: string
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  version: number
}
