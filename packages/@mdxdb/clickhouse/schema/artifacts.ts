/**
 * Artifacts Table Schema
 *
 * Build artifacts with storage references and caching.
 * Supports compiled content, embeddings, and generated assets.
 *
 * Features:
 * - Source tracking for cache invalidation
 * - Content hash for deduplication
 * - TTL-based expiration
 * - Build status tracking
 * - External storage references (S3, R2, etc.)
 *
 * @example
 * ```sql
 * -- Store a compiled artifact
 * INSERT INTO Artifacts (ns, id, type, source, content, hash)
 * VALUES ('example.com', 'abc123', 'compiled', 'Post/hello', '...compiled...', 'sha256:...')
 *
 * -- Get artifact by source and type
 * SELECT * FROM Artifacts
 * WHERE source = 'Post/hello' AND type = 'compiled'
 * ORDER BY ts DESC LIMIT 1
 * ```
 */

export const ARTIFACTS_TABLE = 'Artifacts'

export const ARTIFACTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Artifacts (
  ns LowCardinality(String),
  id String,
  type LowCardinality(String),
  thing String DEFAULT '',
  source String DEFAULT '',
  name String DEFAULT '',
  description String DEFAULT '',
  path String DEFAULT '',
  storage String DEFAULT '',
  content String DEFAULT '',
  code String DEFAULT '',
  data JSON,
  meta JSON,
  contentType LowCardinality(String) DEFAULT '',
  encoding LowCardinality(String) DEFAULT 'utf-8',
  size UInt64 DEFAULT 0,
  hash String DEFAULT '',
  build String DEFAULT '',
  status LowCardinality(String) DEFAULT 'success',
  log String DEFAULT '',
  expires DateTime64(3) DEFAULT toDateTime64('2999-12-31 23:59:59', 3),
  event LowCardinality(String) DEFAULT 'created',
  ts DateTime64(3) DEFAULT now64(3),

  -- Indexes
  INDEX idx_thing thing TYPE bloom_filter GRANULARITY 1,
  INDEX idx_source source TYPE bloom_filter GRANULARITY 1,
  INDEX idx_hash hash TYPE bloom_filter GRANULARITY 1,
  INDEX idx_expires expires TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY (ns, type, id, ts)
`

/**
 * Artifact types - all output formats that can be built from content
 *
 * These align with BUILD_ARTIFACT_TYPES in actions.ts and represent
 * every format that the pipeline's "artifacts" stage can produce.
 */
export const ARTIFACT_TYPES = [
  // Compiled code
  'esm',          // ES Module (compiled JS)
  'cjs',          // CommonJS module
  'ast',          // MDX AST (for manipulation)

  // Rendered content
  'html',         // Rendered HTML
  'markdown',     // Plain markdown (JSX stripped)
  'text',         // Plain text (for search)

  // Structured data
  'json',         // JSON representation
  'jsonld',       // JSON-LD with context
  'yaml',         // YAML frontmatter only

  // Search/RAG
  'chunks',       // Chunked content for RAG
  'embedding',    // Vector embedding

  // Media
  'thumbnail',    // Generated thumbnail
  'preview',      // Preview render
  'og-image',     // Open Graph image

  // Export formats
  'pdf',          // PDF export
  'docx',         // Word export
  'epub',         // ePub export

  // Legacy/generic
  'compiled',     // Generic compiled (deprecated, use esm/cjs)
  'export',       // Generic export (deprecated, use specific type)
  'cache',        // Generic cache entry
] as const

export type ArtifactType = (typeof ARTIFACT_TYPES)[number]

/**
 * Build status values
 */
export const BUILD_STATUSES = [
  'pending',
  'building',
  'success',
  'failed',
] as const

export type BuildStatus = (typeof BUILD_STATUSES)[number]

/**
 * Column definitions for documentation and migration
 */
export const ARTIFACTS_COLUMNS = {
  ns: 'LowCardinality(String)',
  id: 'String',
  type: 'LowCardinality(String)',
  thing: "String DEFAULT ''",
  source: "String DEFAULT ''",
  name: "String DEFAULT ''",
  description: "String DEFAULT ''",
  path: "String DEFAULT ''",
  storage: "String DEFAULT ''",
  content: "String DEFAULT ''",
  code: "String DEFAULT ''",
  data: 'JSON',
  meta: 'JSON',
  contentType: "LowCardinality(String) DEFAULT ''",
  encoding: "LowCardinality(String) DEFAULT 'utf-8'",
  size: 'UInt64 DEFAULT 0',
  hash: "String DEFAULT ''",
  build: "String DEFAULT ''",
  status: "LowCardinality(String) DEFAULT 'success'",
  log: "String DEFAULT ''",
  expires: "DateTime64(3) DEFAULT toDateTime64('2999-12-31 23:59:59', 3)",
  event: "LowCardinality(String) DEFAULT 'created'",
  ts: 'DateTime64(3) DEFAULT now64(3)',
} as const
