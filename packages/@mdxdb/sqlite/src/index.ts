/**
 * @mdxdb/sqlite - SQLite adapter for mdxdb
 *
 * A SQLite-based implementation of the mdxdb Database interface.
 * Stores MDX documents in a SQLite database with full-text search support.
 *
 * @packageDocumentation
 */

export const name = '@mdxdb/sqlite'

// Main exports
export { SqliteDatabase, createSqliteDatabase } from './database.js'

// Types
export type { SqliteDatabaseConfig, DocumentRow } from './types.js'

// Re-export mdxdb types for convenience
export type {
  Database,
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

export type { MDXLDDocument, MDXLDData } from 'mdxld'
