/**
 * MDXDB - Create, Manage, & Publish MDX & URL-centric File System & Database
 *
 * Provides two interfaces:
 * 1. Database - Simple document-based interface (original)
 * 2. DBClient - Graph database interface following ai-database conventions
 *
 * @packageDocumentation
 */

export const name = 'mdxdb'

// API Client for connecting to remote mdxdb servers
export { ApiClient, createApiClient } from './client.js'
export type { ApiClientConfig } from './client.js'

// DBClient adapter
export { createDBClient, MemoryDBClient } from './db-client.js'

// Export all types
export type {
  // Original Database interface
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
  // ai-database compatible types
  EntityId,
  Thing,
  Relationship,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  DBClient,
  // Event, Action, Artifact types (ai-workflows integration)
  Event,
  Action,
  ActionStatus,
  Artifact,
  ArtifactType,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  DBClientExtended,
} from './types.js'

// URL utilities
export { resolveUrl, resolveShortUrl, parseUrl } from './types.js'

// Re-export mdxld types for convenience
export type { MDXLDDocument, MDXLDData, LDProperties } from 'mdxld'

// Re-export ai-database types and functions
export {
  DB,
  parseSchema,
  setProvider,
  MemoryProvider,
  createMemoryProvider,
} from 'ai-database'
export type {
  DatabaseSchema,
  EntitySchema,
  FieldDefinition,
  PrimitiveType,
  ParsedSchema,
  ParsedEntity,
  ParsedField,
  TypedDB,
  EntityOperations,
  DBProvider,
  ListOptions as DBListOptions,
  SearchOptions as DBSearchOptions,
  InferEntity,
} from 'ai-database'
