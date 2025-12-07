/**
 * @mdxdb/fs - Filesystem adapter for mdxdb
 *
 * A file system-based implementation of the Database interface.
 * Stores MDX documents as files on disk with YAML frontmatter.
 *
 * This package also serves as the canonical source for the core Database
 * interface types that all database adapters implement.
 *
 * @packageDocumentation
 */

export const name = '@mdxdb/fs'

// Main exports
export { FsDatabase, createFsDatabase } from './database.js'

// Provider (schema-first interface)
export { FsProvider, createFsProvider } from './provider.js'

// Core Database interface types (now defined locally, not from mdxdb)
export type {
  // Database interface
  Database,
  DatabaseConfig,
  CreateDatabase,
  // Query types
  ListOptions,
  ListResult,
  SearchOptions,
  SearchResult,
  GetOptions,
  SetOptions,
  SetResult,
  DeleteOptions,
  DeleteResult,
  // View types
  ViewManager,
  ViewDocument,
  ViewComponent,
  ViewContext,
  ViewRenderResult,
  ViewSyncResult,
  ViewEntityItem,
  ViewRelationshipMutation,
  DatabaseWithViews,
  // Filesystem-specific
  FsDatabaseConfig,
  ExtractUpdateOptions,
  ExtractUpdateResult,
} from './types.js'

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

// View manager for bi-directional relationship rendering/extraction
export { FsViewManager, createFsViewManager } from './views.js'

// Re-export entity component utilities
export {
  createEntityComponent,
  getEntityComponent,
  createEntityExtractors,
  renderMarkdownTable,
  renderMarkdownList,
  diffEntities,
  type EntityItem,
  type EntityComponentProps,
  type ExtractedEntities,
  type RelationshipChange,
} from '@mdxld/extract'
