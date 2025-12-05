/**
 * ClickHouse Sync Provider
 *
 * Implements SyncProvider for both local chdb and remote ClickHouse.
 * Uses the existing ClickHouseDatabase interface.
 */

import type {
  SyncProvider,
  SyncState,
  SyncEvent,
  CreateSyncActionOptions,
  ThingSnapshot,
} from './types'
import type { ActionObject } from '../schema/actions'

// =============================================================================
// Types
// =============================================================================

/**
 * ClickHouse executor interface (from main adapter)
 */
export interface ClickHouseExecutor {
  query<T = unknown>(sql: string): Promise<T[]>
  command(sql: string): Promise<void>
  insert<T>(table: string, rows: T[]): Promise<void>
}

/**
 * Provider configuration
 */
export interface ClickHouseProviderConfig {
  /** ClickHouse executor */
  executor: ClickHouseExecutor
  /** Database name */
  database: string
  /** Default namespace */
  defaultNs?: string
}

// =============================================================================
// ClickHouse Provider Implementation
// =============================================================================

/**
 * ClickHouse sync provider
 *
 * Works with both chdb (local) and clickhouse-client (remote).
 */
export class ClickHouseProvider implements SyncProvider {
  readonly name = 'clickhouse'

  private executor: ClickHouseExecutor
  private database: string
  private defaultNs: string

  constructor(config: ClickHouseProviderConfig) {
    this.executor = config.executor
    this.database = config.database
    this.defaultNs = config.defaultNs ?? 'default'
  }

  /**
   * Check if provider is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.executor.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  /**
   * Get sync state for a repository
   */
  async getSyncState(repo: string, branch: string): Promise<SyncState | null> {
    const sql = `
      SELECT
        repo,
        ns,
        branch,
        lastCommit,
        lastSyncAt,
        totalFiles,
        totalCommits
      FROM ${this.database}.SyncState FINAL
      WHERE repo = '${escape(repo)}' AND branch = '${escape(branch)}'
      LIMIT 1
    `

    const rows = await this.executor.query<SyncStateRow>(sql)
    const row = rows[0]
    if (!row) return null

    return {
      repo: row.repo,
      ns: row.ns,
      branch: row.branch,
      lastCommit: row.lastCommit,
      lastSyncAt: row.lastSyncAt,
      totalFiles: row.totalFiles,
      totalCommits: row.totalCommits,
    }
  }

  /**
   * Save sync state
   */
  async saveSyncState(state: SyncState): Promise<void> {
    const row: SyncStateRow = {
      repo: state.repo,
      ns: state.ns,
      branch: state.branch,
      lastCommit: state.lastCommit,
      lastSyncAt: state.lastSyncAt,
      totalFiles: state.totalFiles,
      totalCommits: state.totalCommits,
      updatedAt: new Date().toISOString(),
    }

    await this.executor.insert(`${this.database}.SyncState`, [row])
  }

  /**
   * Create a sync action
   */
  async createSyncAction(options: CreateSyncActionOptions): Promise<string> {
    const id = generateULID()

    const row = {
      ns: options.ns,
      id,
      act: 'syncs',
      action: 'sync',
      activity: 'syncing',
      event: 'sync',
      actor: options.actor,
      actorData: {},
      object: options.repo,
      objectData: { branch: options.branch },
      objects: JSON.stringify(options.objects),
      objectsCount: options.objects.length,
      repo: options.repo,
      branch: options.branch,
      commit: options.toCommit,
      commitMessage: options.commitMessage,
      commitAuthor: options.commitAuthor,
      commitEmail: options.commitEmail,
      commitTs: options.commitTs,
      diff: options.diff,
      status: 'active',
      progress: 0,
      total: options.objects.length,
      result: {},
      error: '',
      data: { fromCommit: options.fromCommit },
      meta: {},
      priority: 5,
      attempts: 1,
      maxAttempts: 3,
      timeout: 0,
      ttl: 0,
      batch: '',
      batchIndex: 0,
      batchTotal: 0,
      parent: '',
      children: [],
      dependencies: [],
      scheduledAt: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.executor.insert(`${this.database}.Actions`, [row])
    return id
  }

  /**
   * Update action progress
   */
  async updateActionProgress(
    actionId: string,
    progress: number,
    total: number
  ): Promise<void> {
    const sql = `
      ALTER TABLE ${this.database}.Actions
      UPDATE progress = ${progress}, total = ${total}, updatedAt = now64(3)
      WHERE id = '${escape(actionId)}'
    `
    await this.executor.command(sql)
  }

  /**
   * Complete action
   */
  async completeAction(
    actionId: string,
    result: Record<string, unknown>
  ): Promise<void> {
    const sql = `
      ALTER TABLE ${this.database}.Actions
      UPDATE
        status = 'completed',
        result = '${escape(JSON.stringify(result))}',
        completedAt = now64(3),
        updatedAt = now64(3)
      WHERE id = '${escape(actionId)}'
    `
    await this.executor.command(sql)
  }

  /**
   * Fail action
   */
  async failAction(actionId: string, error: string): Promise<void> {
    const sql = `
      ALTER TABLE ${this.database}.Actions
      UPDATE
        status = 'failed',
        error = '${escape(error)}',
        completedAt = now64(3),
        updatedAt = now64(3)
      WHERE id = '${escape(actionId)}'
    `
    await this.executor.command(sql)
  }

  /**
   * Upsert thing from ActionObject
   */
  async upsertThing(ns: string, object: ActionObject): Promise<void> {
    const url = `${ns}/${object.type}/${object.id}`

    // Get current version
    const existing = await this.getThing(url)
    const version = (existing?.version ?? 0) + 1

    const row = {
      url,
      ns,
      type: object.type,
      id: object.id ?? '',
      branch: 'main',
      variant: 'default',
      version,
      repo: '',
      patch: '',
      commit: '',
      data: object.data ?? {},
      content: object.content ?? '',
      code: object.code ?? '',
      meta: object.meta ?? {},
      visibility: 'public',
      event: object.operation === 'create' ? 'created' : 'updated',
      ts: new Date().toISOString(),
    }

    await this.executor.insert(`${this.database}.Things`, [row])
  }

  /**
   * Delete thing
   */
  async deleteThing(ns: string, type: string, id: string): Promise<void> {
    const url = `${ns}/${type}/${id}`

    // Insert a "deleted" version
    const existing = await this.getThing(url)
    const version = (existing?.version ?? 0) + 1

    const row = {
      url,
      ns,
      type,
      id,
      branch: 'main',
      variant: 'default',
      version,
      repo: '',
      patch: '',
      commit: '',
      data: {},
      content: '',
      code: '',
      meta: {},
      visibility: 'deleted',
      event: 'deleted',
      ts: new Date().toISOString(),
    }

    await this.executor.insert(`${this.database}.Things`, [row])
  }

  /**
   * Get thing by URL
   */
  async getThing(url: string): Promise<ThingSnapshot | null> {
    const sql = `
      SELECT url, version, ts AS updatedAt
      FROM ${this.database}.Things FINAL
      WHERE url = '${escape(url)}'
      LIMIT 1
    `

    const rows = await this.executor.query<{ url: string; version: number; updatedAt: string }>(sql)
    const row = rows[0]
    if (!row) return null

    return {
      url: row.url,
      version: row.version,
      hash: '', // Would need to add hash column
      updatedAt: row.updatedAt,
    }
  }

  /**
   * Emit event
   */
  async emitEvent(event: SyncEvent): Promise<void> {
    const row = {
      ulid: generateULID(),
      ns: event.ns,
      actor: event.actor,
      actorData: {},
      event: event.type,
      object: '',
      objectData: event.data,
      result: '',
      resultData: {},
      meta: event.correlationId ? { correlationId: event.correlationId } : {},
      ts: new Date().toISOString(),
    }

    await this.executor.insert(`${this.database}.Events`, [row])
  }
}

// =============================================================================
// SyncState Table Schema
// =============================================================================

/**
 * SyncState table schema (add to migrate.ts)
 */
export const SYNC_STATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS SyncState (
  repo String,
  ns LowCardinality(String),
  branch LowCardinality(String),
  lastCommit String,
  lastSyncAt DateTime64(3),
  totalFiles UInt64 DEFAULT 0,
  totalCommits UInt64 DEFAULT 0,
  updatedAt DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (repo, branch)
PRIMARY KEY (repo, branch)
`

interface SyncStateRow {
  repo: string
  ns: string
  branch: string
  lastCommit: string
  lastSyncAt: string
  totalFiles: number
  totalCommits: number
  updatedAt?: string
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Escape string for SQL
 */
function escape(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\')
}

/**
 * Generate ULID
 */
function generateULID(): string {
  const timestamp = Date.now().toString(36).padStart(10, '0')
  const randomPart = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('')
  return (timestamp + randomPart).toUpperCase()
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a ClickHouse provider
 */
export function createClickHouseProvider(
  config: ClickHouseProviderConfig
): SyncProvider {
  return new ClickHouseProvider(config)
}

/**
 * Create a chdb (local) provider
 *
 * Uses the chdb module for local ClickHouse operations.
 */
export async function createChdbProvider(
  dbPath: string,
  options: { database?: string } = {}
): Promise<SyncProvider> {
  // Dynamic import to avoid requiring chdb at module load
  const { query } = await import('chdb')

  const database = options.database ?? 'mdxdb'

  // Create database and tables
  query(`CREATE DATABASE IF NOT EXISTS ${database}`)
  query(SYNC_STATE_SCHEMA.replace('SyncState', `${database}.SyncState`))

  // Create executor
  const executor: ClickHouseExecutor = {
    async query<T>(sql: string): Promise<T[]> {
      const result = query(sql, 'JSON')
      return JSON.parse(result).data as T[]
    },
    async command(sql: string): Promise<void> {
      query(sql)
    },
    async insert<T>(table: string, rows: T[]): Promise<void> {
      for (const row of rows) {
        const columns = Object.keys(row as object)
        const values = columns.map((col) => {
          const val = (row as Record<string, unknown>)[col]
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'string') return `'${escape(val)}'`
          if (typeof val === 'object') return `'${escape(JSON.stringify(val))}'`
          return String(val)
        })
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`
        query(sql)
      }
    },
  }

  return new ClickHouseProvider({
    executor,
    database,
  })
}
