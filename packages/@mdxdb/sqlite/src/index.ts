/**
 * @mdxdb/sqlite - libSQL adapter for mdxdb
 *
 * A libSQL-based implementation with:
 * - Things: Graph nodes following ai-database conventions
 * - Relationships: Graph edges between things
 * - Search: Chunked content with vector embeddings for semantic search
 *
 * Supports:
 * - Local SQLite files
 * - In-memory databases
 * - Remote Turso databases
 * - Vector embeddings and similarity search
 *
 * @packageDocumentation
 */

export const name = '@mdxdb/sqlite'

// Main exports
export { SqliteDatabase, createSqliteDatabase } from './database.js'

// Types
export type {
  SqliteDatabaseConfig,
  ThingRow,
  RelationshipRow,
  SearchRow,
  SearchResultRow,
  VectorSearchOptions,
  VectorSearchResult,
  ChunkOptions,
  Chunk,
  EventRow,
  ActionRow,
  ArtifactRow,
  ActionStatus,
  ArtifactType,
} from './types.js'

// Re-export mdxdb types for convenience
export type {
  DBClient,
  DBClientExtended,
  Thing,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  Relationship,
  Event,
  Action,
  Artifact,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
} from 'mdxdb'
