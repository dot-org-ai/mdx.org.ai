/**
 * MDXDB Git Sync
 *
 * Bi-directional synchronization between git repositories and ClickHouse.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { sync } from '@mdxdb/clickhouse/sync'
 *
 * // Sync a GitHub repository
 * const result = await sync({
 *   repo: 'nathanclevenger/example-repo',
 *   branch: 'main',
 * })
 *
 * console.log(`Synced ${result.stats.filesSynced} files`)
 * ```
 *
 * ## Usage with chdb (local)
 *
 * ```typescript
 * import { createSyncEngine, createChdbProvider } from '@mdxdb/clickhouse/sync'
 *
 * const provider = await createChdbProvider('./.mdx/db')
 * const engine = createSyncEngine({ provider })
 *
 * const result = await engine.sync({
 *   repo: './my-content',
 *   mode: 'incremental',
 * })
 * ```
 *
 * ## Usage with ClickHouse (remote)
 *
 * ```typescript
 * import { createClient } from '@clickhouse/client'
 * import { createSyncEngine, createClickHouseProvider } from '@mdxdb/clickhouse/sync'
 *
 * const client = createClient({ url: process.env.CLICKHOUSE_URL })
 *
 * const provider = createClickHouseProvider({
 *   executor: {
 *     query: (sql) => client.query({ query: sql }).then(r => r.json()),
 *     command: (sql) => client.command({ query: sql }),
 *     insert: (table, rows) => client.insert({ table, values: rows }),
 *   },
 *   database: 'mdxdb',
 * })
 *
 * const engine = createSyncEngine({ provider })
 *
 * const result = await engine.sync({
 *   repo: 'https://github.com/org/repo.git',
 *   token: process.env.GITHUB_TOKEN,
 * })
 * ```
 *
 * @module @mdxdb/clickhouse/sync
 */

// Types
export type {
  // Git types
  GitCommit,
  GitFileChange,
  GitDiff,
  RepoInfo,
  CloneOptions,
  GitExecutor,
  // Sync types
  SyncOptions,
  SyncResult,
  SyncState,
  SyncStats,
  SyncedFile,
  SyncError,
  SyncDirection,
  SyncMode,
  // Conflict types
  SyncConflict,
  ConflictType,
  ConflictResolution,
  // Provider types
  SyncProvider,
  CreateSyncActionOptions,
  ThingSnapshot,
  SyncEvent,
} from './types'

// Git executor
export { DefaultGitExecutor, GitError, createGitExecutor } from './executor'

// Parser
export {
  parseFrontmatter,
  parseFileChange,
  parseCommitChanges,
  inferTypeFromPath,
  inferIdFromPath,
  hashContent,
  extractRelationships,
  extractSearchMetadata,
  isMdxFile,
  shouldIncludeFile,
} from './parser'
export type { ParserOptions } from './parser'

// Sync engine
export { SyncEngine, createSyncEngine, parseSyncArgs } from './engine'
export type { SyncEngineConfig } from './engine'

// Providers
export {
  ClickHouseProvider,
  createClickHouseProvider,
  createChdbProvider,
  SYNC_STATE_SCHEMA,
} from './provider'
export type { ClickHouseExecutor, ClickHouseProviderConfig } from './provider'

// =============================================================================
// Convenience Functions
// =============================================================================

import { createSyncEngine } from './engine'
import { createChdbProvider } from './provider'
import type { SyncOptions, SyncResult } from './types'

/**
 * Sync a git repository with the local database
 *
 * This is a convenience function that:
 * 1. Creates a chdb provider at ./.mdx/db
 * 2. Creates a sync engine
 * 3. Runs the sync
 *
 * @example
 * ```typescript
 * // Sync from GitHub
 * const result = await sync({ repo: 'user/repo' })
 *
 * // Sync from local git repo
 * const result = await sync({ repo: './content' })
 *
 * // Dry run
 * const result = await sync({ repo: 'user/repo', dryRun: true })
 * ```
 */
export async function sync(options: SyncOptions): Promise<SyncResult> {
  const dbPath = process.env.MDXDB_PATH ?? './.mdx/db'
  const provider = await createChdbProvider(dbPath)
  const engine = createSyncEngine({ provider })
  return engine.sync(options)
}

/**
 * Check for conflicts before syncing
 *
 * @example
 * ```typescript
 * const conflicts = await checkConflicts({ repo: 'user/repo' })
 *
 * if (conflicts.length > 0) {
 *   console.log('Conflicts detected:', conflicts)
 * }
 * ```
 */
export async function checkConflicts(options: SyncOptions): Promise<import('./types').SyncConflict[]> {
  const dbPath = process.env.MDXDB_PATH ?? './.mdx/db'
  const provider = await createChdbProvider(dbPath)
  const engine = createSyncEngine({ provider })
  return engine.checkConflicts(options)
}
