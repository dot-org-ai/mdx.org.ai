/**
 * @mdxdb/fs Types
 *
 * Includes the core Database interface types that were previously in mdxdb.
 * All database adapters (fs, sqlite, postgres, api, etc.) implement these interfaces.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type { ExtractResult, ExtractDiff, ComponentExtractor } from '@mdxld/extract'

// =============================================================================
// Database Interface Types (moved from mdxdb)
// =============================================================================

/**
 * Query options for listing documents
 */
export interface ListOptions {
  /** Maximum number of documents to return */
  limit?: number
  /** Number of documents to skip */
  offset?: number
  /** Field to sort by */
  sortBy?: string
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
  /** Filter by type */
  type?: string | string[]
  /** Filter by path prefix */
  prefix?: string
}

/**
 * Query result with pagination info
 */
export interface ListResult<TData extends MDXLDData = MDXLDData> {
  /** List of documents */
  documents: MDXLDDocument<TData>[]
  /** Total count of matching documents */
  total: number
  /** Whether there are more results */
  hasMore: boolean
}

/**
 * Search options for querying documents
 */
export interface SearchOptions extends ListOptions {
  /** Search query string */
  query: string
  /** Fields to search in */
  fields?: string[]
  /** Enable semantic/vector search */
  semantic?: boolean
}

/**
 * Search result with relevance info
 */
export interface SearchResult<TData extends MDXLDData = MDXLDData> extends ListResult<TData> {
  /** Documents with relevance scores */
  documents: Array<MDXLDDocument<TData> & { score?: number }>
}

/**
 * Get options for retrieving a document
 */
export interface GetOptions {
  /** Include AST in response */
  includeAst?: boolean
  /** Include compiled code in response */
  includeCode?: boolean
}

/**
 * Set options for storing a document
 */
export interface SetOptions {
  /** Create only if document doesn't exist */
  createOnly?: boolean
  /** Update only if document exists */
  updateOnly?: boolean
  /** Expected version for optimistic locking */
  version?: string
}

/**
 * Set result with metadata
 */
export interface SetResult {
  /** Document ID/path */
  id: string
  /** New version after update */
  version?: string
  /** Whether document was created (vs updated) */
  created: boolean
}

/**
 * Delete options
 */
export interface DeleteOptions {
  /** Soft delete (mark as deleted) */
  soft?: boolean
  /** Expected version for optimistic locking */
  version?: string
}

/**
 * Delete result
 */
export interface DeleteResult {
  /** Document ID/path that was deleted */
  id: string
  /** Whether document was found and deleted */
  deleted: boolean
}

/**
 * Database interface for MDX document storage
 *
 * All backend adapters (fs, sqlite, postgres, api, etc.) implement this interface
 *
 * @example
 * ```ts
 * // Using filesystem adapter
 * import { createFsDatabase } from '@mdxdb/fs'
 * const db = createFsDatabase({ root: './content' })
 *
 * // Using API adapter
 * import { createApiDatabase } from '@mdxdb/api'
 * const db = createApiDatabase({ baseUrl: 'https://api.example.com' })
 *
 * // Same interface regardless of backend
 * const doc = await db.get('posts/hello-world')
 * ```
 */
export interface Database<TData extends MDXLDData = MDXLDData> {
  /**
   * List documents with optional filtering and pagination
   */
  list(options?: ListOptions): Promise<ListResult<TData>>

  /**
   * Search documents by query
   */
  search(options: SearchOptions): Promise<SearchResult<TData>>

  /**
   * Get a document by ID/path
   */
  get(id: string, options?: GetOptions): Promise<MDXLDDocument<TData> | null>

  /**
   * Set/create a document
   */
  set(id: string, document: MDXLDDocument<TData>, options?: SetOptions): Promise<SetResult>

  /**
   * Delete a document
   */
  delete(id: string, options?: DeleteOptions): Promise<DeleteResult>

  /**
   * Close database connection (for cleanup)
   */
  close?(): Promise<void>
}

/**
 * Database configuration base
 */
export interface DatabaseConfig {
  /** Optional namespace/prefix for all operations */
  namespace?: string
}

/**
 * Factory function type for creating database instances
 */
export type CreateDatabase<TConfig extends DatabaseConfig = DatabaseConfig, TData extends MDXLDData = MDXLDData> = (
  config: TConfig
) => Database<TData>

// =============================================================================
// View Types - For bi-directional relationship rendering/extraction
// =============================================================================

/**
 * Entity item with standard fields
 */
export interface ViewEntityItem {
  /** Entity ID (URL or slug) */
  $id: string
  /** Entity type */
  $type?: string
  /** Entity data fields */
  [key: string]: unknown
}

/**
 * View component definition
 */
export interface ViewComponent {
  /** Component name (e.g., 'Tags', 'Posts') */
  name: string
  /** Entity type this component renders */
  entityType?: string
  /** Relationship predicate */
  relationship?: string
  /** Default columns to render */
  columns?: string[]
  /** Render format */
  format?: 'table' | 'list' | 'cards'
}

/**
 * A View document is a template that renders related entities
 */
export interface ViewDocument {
  /** View template ID */
  id: string
  /** Entity type this view is for */
  entityType: string
  /** The template content */
  template: string
  /** Components discovered in the template */
  components: ViewComponent[]
}

/**
 * Context for rendering a view
 */
export interface ViewContext {
  /** The entity URL this view is being rendered for */
  entityUrl: string
  /** Optional filters to apply */
  filters?: Record<string, unknown>
}

/**
 * Result of rendering a view
 */
export interface ViewRenderResult {
  /** The rendered markdown */
  markdown: string
  /** Entities that were rendered */
  entities: Record<string, ViewEntityItem[]>
}

/**
 * Relationship mutation from view extraction
 */
export interface ViewRelationshipMutation {
  /** Mutation type */
  type: 'add' | 'remove' | 'update'
  /** Relationship predicate */
  predicate: string
  /** Source entity URL */
  from: string
  /** Target entity URL */
  to: string
  /** Entity data */
  data?: Record<string, unknown>
  /** Previous entity data */
  previousData?: Record<string, unknown>
}

/**
 * Result of syncing changes from an edited view
 */
export interface ViewSyncResult {
  /** Relationship mutations to apply */
  mutations: ViewRelationshipMutation[]
  /** Entities that were created */
  created: ViewEntityItem[]
  /** Entities that were updated */
  updated: ViewEntityItem[]
}

/**
 * View manager interface
 */
export interface ViewManager {
  discoverViews(): Promise<ViewDocument[]>
  getView(viewId: string): Promise<ViewDocument | null>
  render(viewId: string, context: ViewContext): Promise<ViewRenderResult>
  sync(viewId: string, context: ViewContext, editedMarkdown: string): Promise<ViewSyncResult>
  inferRelationship(
    contextType: string,
    componentName: string
  ): Promise<{ predicate: string; direction: 'forward' | 'reverse' } | null>
}

/**
 * Extended Database interface with view support
 */
export interface DatabaseWithViews<TData extends MDXLDData = MDXLDData> extends Database<TData> {
  views: ViewManager
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
