/**
 * @mdxdb/sqlite Types
 *
 * Provides type definitions for the libSQL-based database with:
 * - Things: Graph nodes (documents/entities)
 * - Relationships: Graph edges between things
 * - Search: Chunked content with vector embeddings
 *
 * @packageDocumentation
 */

import type { DatabaseConfig } from 'mdxdb'

/**
 * Configuration for the SQLite/libSQL database
 */
export interface SqliteDatabaseConfig extends DatabaseConfig {
  /**
   * Database URL - can be:
   * - Local file: 'file:./data.db' or just './data.db'
   * - In-memory: ':memory:'
   * - Remote Turso: 'libsql://your-db.turso.io'
   */
  url: string

  /**
   * Auth token for remote Turso databases
   */
  authToken?: string

  /**
   * Whether to enable WAL mode for better concurrent access (default: true)
   * Only applies to local file databases
   */
  wal?: boolean

  /**
   * Embedding dimension for vector search (default: 1536 for OpenAI)
   */
  embeddingDimension?: number

  /**
   * Function to generate embeddings from text
   * If not provided, vector search will be disabled
   */
  embedFn?: (text: string) => Promise<number[]>

  /**
   * Chunk size for splitting content (default: 1000 characters)
   */
  chunkSize?: number

  /**
   * Chunk overlap for context continuity (default: 200 characters)
   */
  chunkOverlap?: number
}

// =============================================================================
// Database Row Types
// =============================================================================

/**
 * Thing row in the database (graph node)
 * Follows ai-database EntityId conventions
 */
export interface ThingRow {
  /** Full URL identifier (primary key) */
  url: string
  /** Namespace (e.g., 'example.com') */
  ns: string
  /** Entity type (e.g., 'User', 'Post') */
  type: string
  /** Short ID within ns/type */
  id: string
  /** JSON-LD context */
  context: string | null
  /** JSON data object */
  data: string
  /** Raw MDX content */
  content: string
  /** Creation timestamp */
  created_at: string
  /** Last update timestamp */
  updated_at: string
  /** Soft delete timestamp */
  deleted_at: string | null
  /** Optimistic locking version */
  version: number
}

/**
 * Relationship row in the database (graph edge)
 */
export interface RelationshipRow {
  /** Unique relationship ID */
  id: string
  /** Relationship type (e.g., 'follows', 'references', 'link') */
  type: string
  /** Source thing URL */
  from_url: string
  /** Target thing URL */
  to_url: string
  /** Optional JSON data on the edge */
  data: string | null
  /** Creation timestamp */
  created_at: string
}

/**
 * Search chunk row in the database
 * Stores chunked content with vector embeddings for semantic search
 */
export interface SearchRow {
  /** Unique chunk ID */
  id: string
  /** Parent thing URL */
  thing_url: string
  /** Chunk index within the thing */
  chunk_index: number
  /** Chunk text content */
  content: string
  /** Vector embedding (stored as BLOB/F32_BLOB) */
  embedding: Uint8Array | null
  /** Metadata JSON (position, context, etc.) */
  metadata: string | null
  /** Creation timestamp */
  created_at: string
}

/**
 * Search result with score
 */
export interface SearchResultRow extends SearchRow {
  /** Similarity score (0-1, higher is more similar) */
  score: number
}

// =============================================================================
// API Types
// =============================================================================

/**
 * Options for semantic search
 */
export interface VectorSearchOptions {
  /** Search query text (will be embedded) */
  query: string
  /** Maximum results to return */
  limit?: number
  /** Minimum similarity score (0-1) */
  minScore?: number
  /** Filter by thing type */
  type?: string
  /** Filter by namespace */
  ns?: string
  /** Filter by specific thing URLs */
  thingUrls?: string[]
}

/**
 * Result from vector search
 */
export interface VectorSearchResult {
  /** The chunk content */
  content: string
  /** Similarity score */
  score: number
  /** Parent thing URL */
  thingUrl: string
  /** Chunk index */
  chunkIndex: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Options for chunking content
 */
export interface ChunkOptions {
  /** Maximum chunk size in characters */
  size?: number
  /** Overlap between chunks */
  overlap?: number
  /** Separator to split on (default: paragraph boundaries) */
  separator?: string | RegExp
}

/**
 * A content chunk with metadata
 */
export interface Chunk {
  /** Chunk text */
  content: string
  /** Chunk index */
  index: number
  /** Start position in original content */
  start: number
  /** End position in original content */
  end: number
}

// =============================================================================
// Event, Action, and Artifact Row Types
// =============================================================================

/**
 * Event row in the database (immutable event log)
 */
export interface EventRow {
  /** Unique identifier */
  id: string
  /** Event type (e.g., 'Customer.created') */
  type: string
  /** Event timestamp */
  timestamp: string
  /** Event source (workflow, user, system) */
  source: string
  /** JSON event data payload */
  data: string
  /** Optional correlation ID for tracing */
  correlation_id: string | null
  /** Optional causation ID */
  causation_id: string | null
}

/**
 * Action status
 */
export type ActionStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'

/**
 * Action row in the database (pending/active work)
 */
export interface ActionRow {
  /** Unique identifier */
  id: string
  /** Actor performing the action */
  actor: string
  /** Object being acted upon (thing URL) */
  object: string
  /** Action type */
  action: string
  /** Current status */
  status: ActionStatus
  /** Creation timestamp */
  created_at: string
  /** Last update timestamp */
  updated_at: string
  /** When started (status became 'active') */
  started_at: string | null
  /** When completed/failed */
  completed_at: string | null
  /** Result JSON (when completed) */
  result: string | null
  /** Error message (when failed) */
  error: string | null
  /** Additional metadata JSON */
  metadata: string | null
}

/**
 * Artifact type
 */
export type ArtifactType = 'ast' | 'types' | 'esm' | 'cjs' | 'worker' | 'html' | 'markdown' | 'bundle' | 'sourcemap' | string

/**
 * Artifact row in the database (cached compiled content)
 */
export interface ArtifactRow {
  /** Unique key */
  key: string
  /** Artifact type */
  type: string
  /** Source URL or identifier */
  source: string
  /** Hash of source content */
  source_hash: string
  /** Creation timestamp */
  created_at: string
  /** Expiration timestamp */
  expires_at: string | null
  /** Content (stored as TEXT/BLOB) */
  content: string
  /** Content size in bytes */
  size: number | null
  /** Additional metadata JSON */
  metadata: string | null
}

