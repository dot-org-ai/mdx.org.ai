/**
 * Relationships Table Schema
 *
 * Semantic graph edges with predicates and reverse relationships.
 * Ordered by `to` for efficient incoming edge queries.
 *
 * Features:
 * - Semantic predicates (author, mentions, replyTo)
 * - Reverse relationship names for bidirectional traversal
 * - Soft deletes via event = 'deleted'
 *
 * @example
 * ```sql
 * -- Create a relationship
 * INSERT INTO Relationships (ns, \`from\`, \`to\`, predicate, reverse)
 * VALUES ('example.com', 'Post/hello', 'Author/john', 'author', 'posts')
 *
 * -- Query outgoing edges
 * SELECT * FROM Relationships WHERE \`from\` = 'Post/hello'
 *
 * -- Query incoming edges (uses the ORDER BY index)
 * SELECT * FROM Relationships WHERE \`to\` = 'Author/john'
 * ```
 */

export const RELATIONSHIPS_TABLE = 'Relationships'

export const RELATIONSHIPS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Relationships (
  ns LowCardinality(String),
  \`from\` String,
  \`to\` String,
  predicate LowCardinality(String),
  reverse LowCardinality(String) DEFAULT '',
  data JSON,
  meta JSON,
  visibility LowCardinality(String) DEFAULT '',
  event LowCardinality(String) DEFAULT 'created',
  ts DateTime64(3) DEFAULT now64(3),

  -- Index for reverse lookups
  INDEX idx_to \`to\` TYPE bloom_filter GRANULARITY 1,
  INDEX idx_predicate predicate TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY (\`to\`, predicate, \`from\`, ts)
`

/**
 * Common relationship predicates
 */
export const RELATIONSHIP_PREDICATES = {
  // Authorship
  author: 'posts',
  creator: 'creations',
  owner: 'owned',

  // References
  mentions: 'mentionedIn',
  references: 'referencedIn',
  cites: 'citedIn',

  // Hierarchy
  parent: 'children',
  contains: 'containedIn',
  partOf: 'hasParts',

  // Social
  follows: 'followers',
  likes: 'likedBy',
  replyTo: 'replies',
} as const

/**
 * Column definitions for documentation and migration
 */
export const RELATIONSHIPS_COLUMNS = {
  ns: 'LowCardinality(String)',
  from: 'String',
  to: 'String',
  predicate: 'LowCardinality(String)',
  reverse: "LowCardinality(String) DEFAULT ''",
  data: 'JSON',
  meta: 'JSON',
  visibility: "LowCardinality(String) DEFAULT ''",
  event: "LowCardinality(String) DEFAULT 'created'",
  ts: 'DateTime64(3) DEFAULT now64(3)',
} as const
