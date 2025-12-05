/**
 * Things Table Schema
 *
 * Versioned resources with git integration.
 * Uses ReplacingMergeTree for upsert semantics based on version.
 *
 * Features:
 * - Branching and variants for content versioning
 * - Git integration (repo, commit, patch)
 * - Soft deletes via event = 'deleted'
 * - Visibility controls (tenant, public, private)
 *
 * @example
 * ```sql
 * -- Create a new thing
 * INSERT INTO Things (ns, type, id, data, content)
 * VALUES ('example.com', 'Post', 'hello-world', '{"title": "Hello"}', '# Hello World')
 *
 * -- Get latest version (FINAL deduplicates)
 * SELECT * FROM Things FINAL
 * WHERE ns = 'example.com' AND type = 'Post' AND id = 'hello-world'
 * AND event != 'deleted'
 * ```
 */

export const THINGS_TABLE = 'Things'

export const THINGS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Things (
  url String DEFAULT concat('https://', ns, '/', type, '/', id),
  ns LowCardinality(String),
  type LowCardinality(String),
  id String,
  branch LowCardinality(String) DEFAULT 'main',
  variant LowCardinality(String) DEFAULT '',
  version UInt64 DEFAULT 1,
  repo String DEFAULT '',
  patch String DEFAULT '',
  commit String DEFAULT '',
  data JSON,
  content String DEFAULT '',
  code String DEFAULT '',
  meta JSON,
  visibility LowCardinality(String) DEFAULT 'tenant',
  event LowCardinality(String) DEFAULT 'created',
  ts DateTime64(3) DEFAULT now64(3),

  -- Indexes
  INDEX idx_data data TYPE bloom_filter GRANULARITY 1,
  INDEX idx_repo repo TYPE bloom_filter GRANULARITY 1,
  INDEX idx_commit commit TYPE bloom_filter GRANULARITY 1
) ENGINE = ReplacingMergeTree(version)
ORDER BY (ns, type, id, branch, variant)
PRIMARY KEY (ns, type, id, branch, variant)
`

/**
 * Event types for thing lifecycle
 */
export const THING_EVENTS = [
  'created',
  'updated',
  'deleted',
  'published',
  'archived',
] as const

export type ThingEvent = (typeof THING_EVENTS)[number]

/**
 * Visibility levels
 */
export const VISIBILITY_LEVELS = [
  'tenant',   // Visible within tenant/namespace
  'public',   // Publicly accessible
  'private',  // Only owner/creator
] as const

export type Visibility = (typeof VISIBILITY_LEVELS)[number]

/**
 * Column definitions for documentation and migration
 */
export const THINGS_COLUMNS = {
  url: "String DEFAULT concat('https://', ns, '/', type, '/', id)",
  ns: 'LowCardinality(String)',
  type: 'LowCardinality(String)',
  id: 'String',
  branch: "LowCardinality(String) DEFAULT 'main'",
  variant: "LowCardinality(String) DEFAULT ''",
  version: 'UInt64 DEFAULT 1',
  repo: "String DEFAULT ''",
  patch: "String DEFAULT ''",
  commit: "String DEFAULT ''",
  data: 'JSON',
  content: "String DEFAULT ''",
  code: "String DEFAULT ''",
  meta: 'JSON',
  visibility: "LowCardinality(String) DEFAULT 'tenant'",
  event: "LowCardinality(String) DEFAULT 'created'",
  ts: 'DateTime64(3) DEFAULT now64(3)',
} as const
