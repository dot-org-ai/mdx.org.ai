/**
 * Events Table Schema (SQLite)
 *
 * Immutable event log for tracking activity.
 * Events are stored locally and streamed to ClickHouse for analytics.
 *
 * Features:
 * - Immutable append-only log
 * - Correlation/causation IDs for tracing
 * - JSON data payload
 * - Designed for streaming to ClickHouse
 *
 * Note: For production analytics, events should be:
 * 1. Written to local SQLite for durability
 * 2. Streamed to ClickHouse via SyncManager
 * 3. Optionally pruned from SQLite after confirmation
 *
 * @example
 * ```sql
 * -- Track an event
 * INSERT INTO events (id, type, source, data)
 * VALUES ('evt_123', 'user.login', 'auth', '{"userId": "alice"}')
 *
 * -- Query recent events
 * SELECT * FROM events WHERE source = 'auth' ORDER BY timestamp DESC LIMIT 100
 * ```
 */

export const EVENTS_TABLE = 'events'

export const EVENTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  correlation_id TEXT,
  causation_id TEXT,
  synced_at TEXT
)`

export const EVENTS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_events_synced ON events(synced_at)
`

/**
 * Column definitions for documentation and validation
 */
export const EVENTS_COLUMNS = {
  id: 'TEXT PRIMARY KEY',
  type: 'TEXT NOT NULL',
  timestamp: "TEXT NOT NULL DEFAULT (datetime('now'))",
  source: 'TEXT NOT NULL',
  data: "TEXT NOT NULL DEFAULT '{}'",
  correlation_id: 'TEXT',
  causation_id: 'TEXT',
  synced_at: 'TEXT',  // When streamed to ClickHouse
} as const

/**
 * Common event type patterns
 */
export const EVENT_PATTERNS = {
  /** Resource lifecycle: {resource}.{action} */
  lifecycle: ['created', 'updated', 'deleted', 'published', 'archived'],
  /** User actions: user.{action} */
  user: ['login', 'logout', 'signup', 'verified'],
  /** System events: system.{action} */
  system: ['sync.started', 'sync.completed', 'sync.failed'],
} as const
