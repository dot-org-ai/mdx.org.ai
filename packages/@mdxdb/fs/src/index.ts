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

// Provider (schema-first interface)
export { FsProvider, createFsProvider } from './provider.js'

// Types
export type { FsDatabaseConfig, ExtractUpdateOptions, ExtractUpdateResult } from './types.js'

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

// Re-export extraction types for convenience
export type {
  ExtractResult,
  ExtractDiff,
  ExtractOptions,
  ComponentExtractor,
} from '@mdxld/extract'

// Re-export extraction functions
export { extract, diff, applyExtract, validateTemplate, roundTripComponent } from '@mdxld/extract'
