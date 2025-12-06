/**
 * Search Table Schema (SQLite)
 *
 * Chunked content with optional vector embeddings for semantic search.
 * Each thing can have multiple search chunks for large content.
 *
 * Features:
 * - Content chunking for long documents
 * - Vector embeddings stored as JSON arrays
 * - Metadata for chunk position tracking
 * - Cascading deletes when things are removed
 *
 * Note: For production vector search, consider using:
 * - sqlite-vec extension
 * - Cloudflare Vectorize
 * - External vector database
 *
 * @example
 * ```sql
 * -- Get all chunks for a thing
 * SELECT content, chunk_index FROM search
 * WHERE thing_url = 'https://example.com/Post/hello'
 * ORDER BY chunk_index
 *
 * -- Full-text search (basic)
 * SELECT DISTINCT thing_url FROM search
 * WHERE content LIKE '%keyword%'
 * ```
 */

export const SEARCH_TABLE = 'search'

export const SEARCH_SCHEMA = `
CREATE TABLE IF NOT EXISTS search (
  id TEXT PRIMARY KEY,
  thing_url TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (thing_url) REFERENCES things(url) ON DELETE CASCADE
)`

export const SEARCH_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_search_thing ON search(thing_url);
CREATE INDEX IF NOT EXISTS idx_search_thing_chunk ON search(thing_url, chunk_index)
`

/**
 * Column definitions for documentation and validation
 */
export const SEARCH_COLUMNS = {
  id: 'TEXT PRIMARY KEY',
  thing_url: 'TEXT NOT NULL',
  chunk_index: 'INTEGER NOT NULL',
  content: 'TEXT NOT NULL',
  embedding: 'TEXT',  // JSON array of floats
  metadata: 'TEXT',   // JSON with start/end positions
  created_at: "TEXT NOT NULL DEFAULT (datetime('now'))",
} as const

/**
 * Default chunking configuration
 */
export const CHUNK_CONFIG = {
  /** Maximum characters per chunk */
  size: 1000,
  /** Overlap between chunks for context continuity */
  overlap: 200,
} as const
