/**
 * Search Table Schema
 *
 * Hybrid full-text + vector search with HNSW index.
 * Supports semantic search via embeddings and keyword search via tokenbf.
 *
 * Features:
 * - Full-text search on title, description, content
 * - Vector similarity search with HNSW (cosine distance)
 * - Keyword arrays for tag-based filtering
 * - Language and locale support
 *
 * @example
 * ```sql
 * -- Index a document for search
 * INSERT INTO Search (url, ns, type, title, content, embedding, model)
 * VALUES ('Post/hello', 'example.com', 'Post', 'Hello World', 'Content...', [0.1, 0.2, ...], 'text-embedding-3-small')
 *
 * -- Full-text search
 * SELECT * FROM Search
 * WHERE multiSearchAllPositionsCaseInsensitive(content, ['hello']) > 0
 *
 * -- Vector similarity search
 * SELECT url, cosineDistance(embedding, [0.1, 0.2, ...]) as distance
 * FROM Search
 * WHERE length(embedding) > 0
 * ORDER BY distance ASC
 * LIMIT 10
 * ```
 */

export const SEARCH_TABLE = 'Search'

export const SEARCH_SCHEMA = `
CREATE TABLE IF NOT EXISTS Search (
  url String DEFAULT '',
  ns LowCardinality(String) DEFAULT '',
  type LowCardinality(String) DEFAULT '',
  id String DEFAULT '',
  title String DEFAULT '',
  description String DEFAULT '',
  content String DEFAULT '',
  keywords Array(String) DEFAULT [],
  embedding Array(Float32) DEFAULT [],
  model LowCardinality(String) DEFAULT '',
  data JSON,
  meta JSON,
  language LowCardinality(String) DEFAULT 'en',
  locale LowCardinality(String) DEFAULT 'en-US',
  event LowCardinality(String) DEFAULT 'created',
  ts DateTime64(3) DEFAULT now64(3),

  -- Note: Vector similarity index requires specific ClickHouse version config
  -- INDEX idx_embedding embedding TYPE vector_similarity('hnsw', 'cosineDistance', 'f32', 1536) GRANULARITY 1,
  -- Full-text indexes
  INDEX idx_title title TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1,
  INDEX idx_description description TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1,
  INDEX idx_content content TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY (ns, type, url, ts)
`

/**
 * Supported embedding models
 */
export const EMBEDDING_MODELS = [
  'text-embedding-3-small',
  'text-embedding-3-large',
  'text-embedding-ada-002',
  'voyage-large-2',
  'voyage-code-2',
] as const

export type EmbeddingModel = (typeof EMBEDDING_MODELS)[number]

/**
 * Column definitions for documentation and migration
 */
export const SEARCH_COLUMNS = {
  url: "String DEFAULT ''",
  ns: "LowCardinality(String) DEFAULT ''",
  type: "LowCardinality(String) DEFAULT ''",
  id: "String DEFAULT ''",
  title: "String DEFAULT ''",
  description: "String DEFAULT ''",
  content: "String DEFAULT ''",
  keywords: 'Array(String) DEFAULT []',
  embedding: 'Array(Float32) DEFAULT []',
  model: "LowCardinality(String) DEFAULT ''",
  data: 'JSON',
  meta: 'JSON',
  language: "LowCardinality(String) DEFAULT 'en'",
  locale: "LowCardinality(String) DEFAULT 'en-US'",
  event: "LowCardinality(String) DEFAULT 'created'",
  ts: 'DateTime64(3) DEFAULT now64(3)',
} as const

/**
 * Search index configurations
 */
export const SEARCH_INDEXES = {
  embedding: "TYPE vector_similarity('hnsw', 'cosineDistance') GRANULARITY 1",
  title: 'TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1',
  description: 'TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1',
  content: 'TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1',
} as const
