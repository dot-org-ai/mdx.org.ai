/**
 * MDXDB Types - Database interface for MDX document storage
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'

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
