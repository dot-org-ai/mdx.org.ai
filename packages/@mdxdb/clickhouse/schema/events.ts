/**
 * Events Table Schema
 *
 * Immutable event log following ActivityStreams semantics.
 * Actor-Event-Object-Result pattern for rich event context.
 *
 * @example
 * ```sql
 * -- User publishes a post
 * INSERT INTO Events (ns, actor, event, object, objectData)
 * VALUES ('example.com', 'user:john', 'Post.published', 'Post/hello', '{"title": "Hello"}')
 *
 * -- Query events by actor
 * SELECT * FROM Events WHERE actor = 'user:john' ORDER BY ts DESC
 * ```
 */

export const EVENTS_TABLE = 'Events'

export const EVENTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Events (
  ulid String DEFAULT generateULID(),
  ns LowCardinality(String),
  actor String DEFAULT '',
  actorData JSON,
  event LowCardinality(String),
  object String DEFAULT '',
  objectData JSON,
  result String DEFAULT '',
  resultData JSON,
  meta JSON,
  ts DateTime64(3) DEFAULT now64(3),

  -- Indexes
  INDEX idx_actor actor TYPE bloom_filter GRANULARITY 1,
  INDEX idx_object object TYPE bloom_filter GRANULARITY 1,
  INDEX idx_result result TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY (ns, event, ts, ulid)
PARTITION BY toYYYYMM(ts)
`

/**
 * Column definitions for documentation and migration
 */
export const EVENTS_COLUMNS = {
  ulid: 'String DEFAULT generateULID()',
  ns: 'LowCardinality(String)',
  actor: "String DEFAULT ''",
  actorData: 'JSON',
  event: 'LowCardinality(String)',
  object: "String DEFAULT ''",
  objectData: 'JSON',
  result: "String DEFAULT ''",
  resultData: 'JSON',
  meta: 'JSON',
  ts: 'DateTime64(3) DEFAULT now64(3)',
} as const

/**
 * Indexes for the Events table
 */
export const EVENTS_INDEXES = [
  'INDEX idx_actor actor TYPE bloom_filter GRANULARITY 1',
  'INDEX idx_object object TYPE bloom_filter GRANULARITY 1',
  'INDEX idx_result result TYPE bloom_filter GRANULARITY 1',
] as const
