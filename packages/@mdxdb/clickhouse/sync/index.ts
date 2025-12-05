/**
 * MDXDB Git Sync
 *
 * Bi-directional synchronization between git repositories and ClickHouse.
 * Works with both local ClickHouse binary and remote ClickHouse servers.
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
 * ## Usage with Local ClickHouse
 *
 * ```typescript
 * import { createSyncEngine, createClickHouseProvider } from '@mdxdb/clickhouse/sync'
 *
 * // Connect to local ClickHouse binary on localhost:8123
 * const provider = createClickHouseProvider({
 *   executor: createHttpExecutor({ url: 'http://localhost:8123' }),
 *   database: 'mdxdb',
 * })
 *
 * const engine = createSyncEngine({ provider })
 *
 * const result = await engine.sync({
 *   repo: './my-content',
 *   mode: 'incremental',
 * })
 * ```
 *
 * ## Usage with Remote ClickHouse
 *
 * ```typescript
 * import { createSyncEngine, createClickHouseProvider } from '@mdxdb/clickhouse/sync'
 *
 * const provider = createClickHouseProvider({
 *   executor: createHttpExecutor({
 *     url: process.env.CLICKHOUSE_URL,
 *     username: process.env.CLICKHOUSE_USER,
 *     password: process.env.CLICKHOUSE_PASSWORD,
 *   }),
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
  SYNC_STATE_SCHEMA,
} from './provider'
export type { ClickHouseExecutor, ClickHouseProviderConfig } from './provider'

// =============================================================================
// Convenience Functions
// =============================================================================

import { createSyncEngine } from './engine'
import { createClickHouseProvider } from './provider'
import type { SyncOptions, SyncResult } from './types'

/**
 * Create a default HTTP executor for local ClickHouse
 */
function createDefaultExecutor() {
  const url = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123'
  const database = process.env.CLICKHOUSE_DATABASE ?? 'mdxdb'

  return {
    async query<T>(sql: string): Promise<T[]> {
      const params = new URLSearchParams({ database, default_format: 'JSON' })
      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        body: sql,
        headers: {
          'Content-Type': 'text/plain',
          ...(process.env.CLICKHOUSE_USER && {
            'X-ClickHouse-User': process.env.CLICKHOUSE_USER,
          }),
          ...(process.env.CLICKHOUSE_PASSWORD && {
            'X-ClickHouse-Key': process.env.CLICKHOUSE_PASSWORD,
          }),
        },
      })
      if (!response.ok) {
        throw new Error(`ClickHouse query failed: ${await response.text()}`)
      }
      const result = await response.json() as { data: T[] }
      return result.data
    },
    async command(sql: string): Promise<void> {
      const params = new URLSearchParams({ database })
      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        body: sql,
        headers: {
          'Content-Type': 'text/plain',
          ...(process.env.CLICKHOUSE_USER && {
            'X-ClickHouse-User': process.env.CLICKHOUSE_USER,
          }),
          ...(process.env.CLICKHOUSE_PASSWORD && {
            'X-ClickHouse-Key': process.env.CLICKHOUSE_PASSWORD,
          }),
        },
      })
      if (!response.ok) {
        throw new Error(`ClickHouse command failed: ${await response.text()}`)
      }
    },
    async insert<T>(table: string, rows: T[]): Promise<void> {
      if (rows.length === 0) return
      const columns = Object.keys(rows[0] as object)
      const params = new URLSearchParams({
        database,
        query: `INSERT INTO ${table} (${columns.join(', ')}) FORMAT JSONEachRow`,
      })
      const body = rows.map((row) => JSON.stringify(row)).join('\n')
      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CLICKHOUSE_USER && {
            'X-ClickHouse-User': process.env.CLICKHOUSE_USER,
          }),
          ...(process.env.CLICKHOUSE_PASSWORD && {
            'X-ClickHouse-Key': process.env.CLICKHOUSE_PASSWORD,
          }),
        },
      })
      if (!response.ok) {
        throw new Error(`ClickHouse insert failed: ${await response.text()}`)
      }
    },
  }
}

/**
 * Sync a git repository with ClickHouse database
 *
 * This is a convenience function that:
 * 1. Creates an HTTP provider connecting to localhost:8123
 * 2. Creates a sync engine
 * 3. Runs the sync
 *
 * Configure via environment variables:
 * - CLICKHOUSE_URL: ClickHouse HTTP URL (default: http://localhost:8123)
 * - CLICKHOUSE_DATABASE: Database name (default: mdxdb)
 * - CLICKHOUSE_USER: Username for authentication
 * - CLICKHOUSE_PASSWORD: Password for authentication
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
  const database = process.env.CLICKHOUSE_DATABASE ?? 'mdxdb'
  const provider = createClickHouseProvider({
    executor: createDefaultExecutor(),
    database,
  })
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
  const database = process.env.CLICKHOUSE_DATABASE ?? 'mdxdb'
  const provider = createClickHouseProvider({
    executor: createDefaultExecutor(),
    database,
  })
  const engine = createSyncEngine({ provider })
  return engine.checkConflicts(options)
}
