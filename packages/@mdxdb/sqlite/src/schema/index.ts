/**
 * SQLite Schema Module
 *
 * Clean schema with _data, _rels and _meta tables.
 * - _data: Things (graph nodes)
 * - _rels: Relationships (graph edges with bidirectional predicates)
 * - _meta: Per-object metadata (the persisted $id)
 *
 * @packageDocumentation
 */

/**
 * _data table name
 */
export const DATA_TABLE = '_data' as const

/**
 * _rels table name
 */
export const RELS_TABLE = '_rels' as const

/**
 * _meta table name
 */
export const META_TABLE = '_meta' as const

/**
 * _meta key under which the object's canonical $id (base URL) is persisted.
 *
 * A Durable Object cannot read its own name (`ctx.id.name` is undefined
 * inside the object in workerd), so the name-derived $id is written here on
 * `$init()` and re-read whenever the object is re-instantiated.
 */
export const META_ID_KEY = '$id' as const

/**
 * _data table schema - graph nodes with executable code
 */
export const DATA_SCHEMA = `
CREATE TABLE IF NOT EXISTS _data (
  url TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  content TEXT,
  context TEXT,
  code TEXT,
  hash TEXT,
  at TEXT NOT NULL,
  by TEXT,
  "in" TEXT,
  version INTEGER NOT NULL DEFAULT 1
)
`.trim()

/**
 * _data table indexes
 */
export const DATA_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_data_type ON _data(type);
CREATE INDEX IF NOT EXISTS idx_data_type_id ON _data(type, id);
CREATE INDEX IF NOT EXISTS idx_data_at ON _data(at);
CREATE INDEX IF NOT EXISTS idx_data_hash ON _data(hash)
`.trim()

/**
 * _rels table schema - graph edges with bidirectional predicates
 */
export const RELS_SCHEMA = `
CREATE TABLE IF NOT EXISTS _rels (
  id TEXT PRIMARY KEY,
  predicate TEXT NOT NULL,
  reverse TEXT,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  data TEXT,
  at TEXT NOT NULL,
  by TEXT,
  "in" TEXT,
  do TEXT,
  FOREIGN KEY ("from") REFERENCES _data(url) ON DELETE CASCADE
)
`.trim()

/**
 * _rels table indexes - indexed both directions for efficient lookups
 */
export const RELS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_rels_from ON _rels("from");
CREATE INDEX IF NOT EXISTS idx_rels_to ON _rels("to");
CREATE INDEX IF NOT EXISTS idx_rels_predicate ON _rels(predicate);
CREATE INDEX IF NOT EXISTS idx_rels_reverse ON _rels(reverse);
CREATE INDEX IF NOT EXISTS idx_rels_from_predicate ON _rels("from", predicate);
CREATE INDEX IF NOT EXISTS idx_rels_to_reverse ON _rels("to", reverse);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rels_unique ON _rels("from", predicate, "to")
`.trim()

/**
 * _meta table schema - key/value metadata about this object
 */
export const META_SCHEMA = `
CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
`.trim()

/**
 * All table names
 */
export const TABLES = [DATA_TABLE, RELS_TABLE, META_TABLE] as const

export type TableName = (typeof TABLES)[number]

/**
 * Get all schema statements for initialization
 */
export function getAllSchemaStatements(): string[] {
  return [
    DATA_SCHEMA,
    ...DATA_INDEXES.split(';').map(s => s.trim()).filter(Boolean),
    RELS_SCHEMA,
    ...RELS_INDEXES.split(';').map(s => s.trim()).filter(Boolean),
    META_SCHEMA,
  ]
}

/**
 * Schema version
 */
export const SCHEMA_VERSION = 3
