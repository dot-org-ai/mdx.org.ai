/**
 * @mdxdb/fs - Filesystem adapter for mdxdb
 *
 * A file system-based implementation of the mdxdb Database interface.
 * Stores MDX documents as files on disk with YAML frontmatter.
 *
 * @packageDocumentation
 */

export const name = '@mdxdb/fs'

// Main exports
export { FsDatabase, createFsDatabase } from './database.js'

// Types
export type { FsDatabaseConfig } from './types.js'

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
