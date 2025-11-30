/**
 * MDXDB - Create, Manage, & Publish MDX & URL-centric File System & Database
 *
 * @packageDocumentation
 */

export const name = 'mdxdb'

// API Client for connecting to remote mdxdb servers
export { ApiClient, createApiClient } from './client.js'
export type { ApiClientConfig } from './client.js'

// Export all types
export type {
  ListOptions,
  ListResult,
  SearchOptions,
  SearchResult,
  GetOptions,
  SetOptions,
  SetResult,
  DeleteOptions,
  DeleteResult,
  Database,
  DatabaseConfig,
  CreateDatabase,
} from './types.js'

// Re-export mdxld types for convenience
export type { MDXLDDocument, MDXLDData, LDProperties } from 'mdxld'
