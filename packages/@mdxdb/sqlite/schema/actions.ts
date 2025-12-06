/**
 * Actions Table Schema (SQLite)
 *
 * Pending and active work items with status tracking.
 * Used for background jobs, workflows, and async operations.
 *
 * Features:
 * - Actor-Object-Action pattern
 * - Status lifecycle (pending -> active -> completed/failed/cancelled)
 * - Result and error storage
 * - Metadata for custom job data
 *
 * @example
 * ```sql
 * -- Create a pending action
 * INSERT INTO actions (id, actor, object, action)
 * VALUES ('act_123', 'user:alice', 'post:hello', 'publish')
 *
 * -- Start an action
 * UPDATE actions SET status = 'active', started_at = datetime('now')
 * WHERE id = 'act_123'
 *
 * -- Complete an action
 * UPDATE actions SET status = 'completed', completed_at = datetime('now'), result = '{"published": true}'
 * WHERE id = 'act_123'
 * ```
 */

export const ACTIONS_TABLE = 'actions'

export const ACTIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  object TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  result TEXT,
  error TEXT,
  metadata TEXT
)`

export const ACTIONS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_actions_actor ON actions(actor);
CREATE INDEX IF NOT EXISTS idx_actions_object ON actions(object);
CREATE INDEX IF NOT EXISTS idx_actions_action ON actions(action);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_actor_status ON actions(actor, status)
`

/**
 * Column definitions for documentation and validation
 */
export const ACTIONS_COLUMNS = {
  id: 'TEXT PRIMARY KEY',
  actor: 'TEXT NOT NULL',
  object: 'TEXT NOT NULL',
  action: 'TEXT NOT NULL',
  status: "TEXT NOT NULL DEFAULT 'pending'",
  created_at: "TEXT NOT NULL DEFAULT (datetime('now'))",
  updated_at: "TEXT NOT NULL DEFAULT (datetime('now'))",
  started_at: 'TEXT',
  completed_at: 'TEXT',
  result: 'TEXT',
  error: 'TEXT',
  metadata: 'TEXT',
} as const

/**
 * Action status lifecycle
 */
export const ACTION_STATUSES = [
  'pending',    // Waiting to start
  'active',     // Currently running
  'completed',  // Finished successfully
  'failed',     // Finished with error
  'cancelled',  // Cancelled by user/system
] as const

export type ActionStatus = (typeof ACTION_STATUSES)[number]
