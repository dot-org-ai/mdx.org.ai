/**
 * Relationships Table Schema (SQLite)
 *
 * Graph edges connecting things with typed predicates.
 * Supports bidirectional traversal via from_url and to_url.
 *
 * Features:
 * - Typed relationships (author, parent, references, etc.)
 * - JSON metadata on edges
 * - Cascading deletes when things are removed
 * - Unique constraint prevents duplicate edges
 *
 * @example
 * ```sql
 * -- Create a relationship
 * INSERT INTO relationships (id, type, from_url, to_url)
 * VALUES ('rel_123', 'author', 'https://example.com/Post/hello', 'https://example.com/User/alice')
 *
 * -- Find all things an author wrote (outbound)
 * SELECT to_url FROM relationships WHERE from_url = ? AND type = 'author'
 *
 * -- Find all things that reference a thing (inbound)
 * SELECT from_url FROM relationships WHERE to_url = ? AND type = 'references'
 * ```
 */

export const RELATIONSHIPS_TABLE = 'relationships'

export const RELATIONSHIPS_SCHEMA = `
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  from_url TEXT NOT NULL,
  to_url TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_url) REFERENCES things(url) ON DELETE CASCADE
)`

export const RELATIONSHIPS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships(type);
CREATE INDEX IF NOT EXISTS idx_rel_from ON relationships(from_url);
CREATE INDEX IF NOT EXISTS idx_rel_to ON relationships(to_url);
CREATE INDEX IF NOT EXISTS idx_rel_from_type ON relationships(from_url, type);
CREATE INDEX IF NOT EXISTS idx_rel_to_type ON relationships(to_url, type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rel_unique ON relationships(from_url, type, to_url)
`

/**
 * Column definitions for documentation and validation
 */
export const RELATIONSHIPS_COLUMNS = {
  id: 'TEXT PRIMARY KEY',
  type: 'TEXT NOT NULL',
  from_url: 'TEXT NOT NULL',
  to_url: 'TEXT NOT NULL',
  data: 'TEXT',
  created_at: "TEXT NOT NULL DEFAULT (datetime('now'))",
} as const

/**
 * Common relationship types
 */
export const RELATIONSHIP_TYPES = [
  'author',      // thing was authored by
  'parent',      // thing is parent of
  'child',       // thing is child of
  'references',  // thing references
  'related',     // thing is related to
  'tagged',      // thing is tagged with
  'category',    // thing belongs to category
] as const

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number] | string
