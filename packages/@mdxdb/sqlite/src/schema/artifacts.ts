/**
 * Artifacts Table Schema (SQLite)
 *
 * Cached compiled content with TTL support.
 * Artifacts are stored locally and can be streamed to ClickHouse/R2.
 *
 * Features:
 * - Content-addressed by source + type
 * - Hash-based cache invalidation
 * - TTL expiration support
 * - Size tracking for cache management
 *
 * Note: For production:
 * - Large artifacts should be stored in R2
 * - Metadata can be streamed to ClickHouse for analytics
 * - SQLite stores small/hot artifacts for edge caching
 *
 * @example
 * ```sql
 * -- Store a compiled artifact
 * INSERT INTO artifacts (key, type, source, source_hash, content)
 * VALUES ('art_123', 'esm', 'https://example.com/Post/hello', 'sha256:abc', '...')
 *
 * -- Get artifact if not expired
 * SELECT * FROM artifacts
 * WHERE key = 'art_123' AND (expires_at IS NULL OR expires_at > datetime('now'))
 * ```
 */

export const ARTIFACTS_TABLE = 'artifacts'

export const ARTIFACTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS artifacts (
  key TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  content TEXT NOT NULL,
  size INTEGER,
  metadata TEXT,
  synced_at TEXT
)`

export const ARTIFACTS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_source ON artifacts(source);
CREATE INDEX IF NOT EXISTS idx_artifacts_source_type ON artifacts(source, type);
CREATE INDEX IF NOT EXISTS idx_artifacts_expires ON artifacts(expires_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_synced ON artifacts(synced_at)
`

/**
 * Column definitions for documentation and validation
 */
export const ARTIFACTS_COLUMNS = {
  key: 'TEXT PRIMARY KEY',
  type: 'TEXT NOT NULL',
  source: 'TEXT NOT NULL',
  source_hash: 'TEXT NOT NULL',
  created_at: "TEXT NOT NULL DEFAULT (datetime('now'))",
  expires_at: 'TEXT',
  content: 'TEXT NOT NULL',
  size: 'INTEGER',
  metadata: 'TEXT',
  synced_at: 'TEXT',  // When streamed to ClickHouse/R2
} as const

/**
 * Artifact types matching ClickHouse schema
 */
export const ARTIFACT_TYPES = [
  // Compiled code
  'esm',
  'cjs',
  'ast',
  // Rendered content
  'html',
  'markdown',
  'text',
  // Structured data
  'json',
  'jsonld',
  'yaml',
  // Search/RAG
  'chunks',
  'embedding',
  // Media
  'thumbnail',
  'preview',
  'og-image',
  // Export formats
  'pdf',
  'docx',
  'epub',
] as const

export type ArtifactType = (typeof ARTIFACT_TYPES)[number]
