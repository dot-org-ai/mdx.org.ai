/**
 * Things Table Schema (SQLite)
 *
 * Graph nodes representing versioned resources.
 * Uses standard SQLite with soft deletes via deleted_at.
 *
 * Features:
 * - JSON data storage via TEXT columns
 * - Full-text indexing support
 * - Version tracking for optimistic locking
 * - Soft deletes via deleted_at timestamp
 *
 * @example
 * ```sql
 * -- Create a new thing
 * INSERT INTO things (url, ns, type, id, data, content)
 * VALUES ('https://example.com/Post/hello', 'example.com', 'Post', 'hello', '{"title": "Hello"}', '# Hello')
 *
 * -- Get non-deleted things
 * SELECT * FROM things WHERE deleted_at IS NULL
 * ```
 */

export const THINGS_TABLE = 'things'

export const THINGS_SCHEMA = `
CREATE TABLE IF NOT EXISTS things (
  url TEXT PRIMARY KEY,
  ns TEXT NOT NULL,
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  context TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1
)`

export const THINGS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_things_ns ON things(ns);
CREATE INDEX IF NOT EXISTS idx_things_type ON things(type);
CREATE INDEX IF NOT EXISTS idx_things_ns_type ON things(ns, type);
CREATE INDEX IF NOT EXISTS idx_things_deleted_at ON things(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_things_ns_type_id ON things(ns, type, id)
`

/**
 * Column definitions for documentation and validation
 */
export const THINGS_COLUMNS = {
  url: 'TEXT PRIMARY KEY',
  ns: 'TEXT NOT NULL',
  type: 'TEXT NOT NULL',
  id: 'TEXT NOT NULL',
  context: 'TEXT',
  data: "TEXT NOT NULL DEFAULT '{}'",
  content: "TEXT NOT NULL DEFAULT ''",
  created_at: "TEXT NOT NULL DEFAULT (datetime('now'))",
  updated_at: "TEXT NOT NULL DEFAULT (datetime('now'))",
  deleted_at: 'TEXT',
  version: 'INTEGER NOT NULL DEFAULT 1',
} as const

/**
 * Event types for thing lifecycle (stored in event column if added)
 */
export const THING_EVENTS = [
  'created',
  'updated',
  'deleted',
] as const

export type ThingEvent = (typeof THING_EVENTS)[number]
