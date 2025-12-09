/**
 * @mdxdb/fs Types
 *
 * Re-exports the core Database interface types from ai-database.
 * All database adapters (fs, sqlite, postgres, api, etc.) implement these interfaces.
 *
 * Also includes filesystem-specific types for the @mdxdb/fs adapter.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type { ExtractResult, ExtractDiff, ComponentExtractor } from '@mdxld/extract'

// =============================================================================
// Re-export Document Database types from ai-database
// =============================================================================
// These types are environment-agnostic and work in any runtime

export type {
  // Document types
  Document,
  DocWithScore,
  // List/Search options and results
  DocListOptions,
  DocListResult,
  DocSearchOptions,
  DocSearchResult,
  // CRUD options and results
  DocGetOptions,
  DocSetOptions,
  DocSetResult,
  DocDeleteOptions,
  DocDeleteResult,
  // Database interfaces
  DocumentDatabase,
  DocumentDatabaseConfig,
  CreateDocumentDatabase,
  DocumentDatabaseWithViews,
  // View types
  ViewEntityItem,
  ViewComponent,
  ViewDocument,
  ViewContext,
  ViewRenderResult,
  ViewRelationshipMutation,
  ViewSyncResult,
  ViewManager,
} from 'ai-database'

// =============================================================================
// Backward Compatibility Aliases
// =============================================================================
// These type aliases maintain backward compatibility with existing code
// that imports from @mdxdb/fs using the old names.

import type {
  DocListOptions,
  DocListResult,
  DocSearchOptions,
  DocSearchResult,
  DocGetOptions,
  DocSetOptions,
  DocSetResult,
  DocDeleteOptions,
  DocDeleteResult,
  DocumentDatabase,
  DocumentDatabaseConfig,
  CreateDocumentDatabase,
  DocumentDatabaseWithViews,
} from 'ai-database'

/** @deprecated Use DocListOptions from ai-database */
export type ListOptions = DocListOptions

/** @deprecated Use DocListResult from ai-database */
export type ListResult<TData extends MDXLDData = MDXLDData> = {
  documents: MDXLDDocument<TData>[]
  total: number
  hasMore: boolean
}

/** @deprecated Use DocSearchOptions from ai-database */
export type SearchOptions = DocSearchOptions

/** @deprecated Use DocSearchResult from ai-database */
export type SearchResult<TData extends MDXLDData = MDXLDData> = ListResult<TData> & {
  documents: Array<MDXLDDocument<TData> & { score?: number }>
}

/** @deprecated Use DocGetOptions from ai-database */
export type GetOptions = DocGetOptions

/** @deprecated Use DocSetOptions from ai-database */
export type SetOptions = DocSetOptions

/** @deprecated Use DocSetResult from ai-database */
export type SetResult = DocSetResult

/** @deprecated Use DocDeleteOptions from ai-database */
export type DeleteOptions = DocDeleteOptions

/** @deprecated Use DocDeleteResult from ai-database */
export type DeleteResult = DocDeleteResult

/**
 * Database interface for MDX document storage
 *
 * @deprecated Use DocumentDatabase from ai-database for new code.
 * This alias is maintained for backward compatibility with existing @mdxdb adapters.
 */
export type Database<TData extends MDXLDData = MDXLDData> = {
  list(options?: ListOptions): Promise<ListResult<TData>>
  search(options: SearchOptions): Promise<SearchResult<TData>>
  get(id: string, options?: GetOptions): Promise<MDXLDDocument<TData> | null>
  set(id: string, document: MDXLDDocument<TData>, options?: SetOptions): Promise<SetResult>
  delete(id: string, options?: DeleteOptions): Promise<DeleteResult>
  close?(): Promise<void>
}

/** @deprecated Use DocumentDatabaseConfig from ai-database */
export type DatabaseConfig = DocumentDatabaseConfig

/** @deprecated Use CreateDocumentDatabase from ai-database */
export type CreateDatabase<
  TConfig extends DatabaseConfig = DatabaseConfig,
  TData extends MDXLDData = MDXLDData
> = (config: TConfig) => Database<TData>

/** @deprecated Use DocumentDatabaseWithViews from ai-database */
export type DatabaseWithViews<TData extends MDXLDData = MDXLDData> = Database<TData> & {
  views: import('ai-database').ViewManager
}

// =============================================================================
// Filesystem-specific Types
// =============================================================================

/**
 * Configuration for the filesystem database
 */
export interface FsDatabaseConfig extends DatabaseConfig {
  /** Root directory for MDX files */
  root: string
  /** File extensions to consider as MDX files (default: ['.mdx', '.md']) */
  extensions?: string[]
  /** Whether to create directories automatically (default: true) */
  autoCreateDirs?: boolean
  /** Encoding for reading/writing files (default: 'utf-8') */
  encoding?: BufferEncoding
}

/**
 * Options for updating a document from rendered markdown
 */
export interface ExtractUpdateOptions {
  /** Custom component extractors */
  components?: Record<string, ComponentExtractor>
  /** Throw on unmatched slots (default: false) */
  strict?: boolean
  /** Only apply changes to these paths (e.g., ['data.title', 'data.content']) */
  paths?: string[]
  /** How to merge arrays (default: 'replace') */
  arrayMerge?: 'replace' | 'append' | 'prepend'
}

/**
 * Result of updating a document from rendered markdown
 */
export interface ExtractUpdateResult<TData extends MDXLDData = MDXLDData> {
  /** The updated document */
  doc: MDXLDDocument<TData>
  /** Changes that were applied */
  changes: ExtractDiff
  /** Raw extraction result */
  extracted: ExtractResult
}
