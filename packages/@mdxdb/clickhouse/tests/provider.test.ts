/**
 * Provider Integration Tests
 *
 * Tests for ClickHouse sync provider.
 * Requires a running ClickHouse instance - skipped if not available.
 *
 * To run tests:
 * 1. Start ClickHouse: docker run -d -p 8123:8123 clickhouse/clickhouse-server
 * 2. Run: pnpm test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  ClickHouseProvider,
  createClickHouseProvider,
  SYNC_STATE_SCHEMA,
  type ClickHouseExecutor,
} from '../sync/provider'
import { createHttpExecutor } from '../src/index'
import { TABLE_SCHEMAS, TABLES } from '../schema'
import type { SyncState, SyncEvent } from '../sync/types'
import type { ActionObject } from '../schema/actions'

// =============================================================================
// Test Database Setup
// =============================================================================

const TEST_DB = `test_provider_${Date.now()}`
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123'

// Create HTTP executor for tests
let executor: ClickHouseExecutor
let provider: ClickHouseProvider
let isConnected = false

/**
 * Clean schema by replacing generateULID() with generateUUIDv7()
 * (not all ClickHouse versions have ULID)
 */
function cleanSchema(sql: string): string {
  return sql.replace(/generateULID\(\)/g, 'generateUUIDv7()')
}

// =============================================================================
// Test Setup
// =============================================================================

beforeAll(async () => {
  // Create HTTP executor
  executor = createHttpExecutor({
    url: CLICKHOUSE_URL,
    database: 'default',
  })

  // Test connection
  try {
    await executor.query('SELECT 1')
    isConnected = true
  } catch (error) {
    console.warn('ClickHouse not available, skipping integration tests')
    console.warn('Start ClickHouse with: docker run -d -p 8123:8123 clickhouse/clickhouse-server')
    return
  }

  // Create test database
  await executor.command(`CREATE DATABASE IF NOT EXISTS ${TEST_DB}`)

  // Create executor for test database
  executor = createHttpExecutor({
    url: CLICKHOUSE_URL,
    database: TEST_DB,
  })

  // Create all schema tables (skip access_control - it has multi-statement SQL)
  for (const table of TABLES) {
    if (table === 'access_control') continue
    const schema = TABLE_SCHEMAS[table]
    const cleanedSchema = cleanSchema(schema)
    await executor.command(cleanedSchema)
  }

  // Create SyncState table
  const cleanedSyncState = cleanSchema(SYNC_STATE_SCHEMA)
  await executor.command(cleanedSyncState)

  provider = new ClickHouseProvider({
    executor,
    database: TEST_DB,
  })
})

afterAll(async () => {
  if (isConnected) {
    try {
      await executor.command(`DROP DATABASE IF EXISTS ${TEST_DB}`)
    } catch {
      // Ignore cleanup errors
    }
    await executor.close()
  }
})

// Helper to skip tests if not connected
const testIf = (condition: boolean) => (condition ? it : it.skip)
const describeIf = (condition: boolean) => (condition ? describe : describe.skip)

// =============================================================================
// Factory Function Tests
// =============================================================================

describeIf(isConnected)('createClickHouseProvider', () => {
  testIf(isConnected)('creates a ClickHouseProvider instance', () => {
    const testProvider = createClickHouseProvider({
      executor,
      database: TEST_DB,
    })

    expect(testProvider).toBeInstanceOf(ClickHouseProvider)
  })

  testIf(isConnected)('has name "clickhouse"', () => {
    expect(provider.name).toBe('clickhouse')
  })

  testIf(isConnected)('implements SyncProvider interface', () => {
    expect(typeof provider.isConnected).toBe('function')
    expect(typeof provider.getSyncState).toBe('function')
    expect(typeof provider.saveSyncState).toBe('function')
    expect(typeof provider.createSyncAction).toBe('function')
    expect(typeof provider.upsertThing).toBe('function')
    expect(typeof provider.deleteThing).toBe('function')
    expect(typeof provider.getThing).toBe('function')
    expect(typeof provider.emitEvent).toBe('function')
  })
})

// =============================================================================
// Connection Tests
// =============================================================================

describeIf(isConnected)('isConnected', () => {
  testIf(isConnected)('returns true when connected', async () => {
    const result = await provider.isConnected()
    expect(result).toBe(true)
  })
})

// =============================================================================
// SyncState Tests
// =============================================================================

describeIf(isConnected)('SyncState', () => {
  const testRepo = 'github.com/test/repo-' + Date.now()

  testIf(isConnected)('returns null for non-existent state', async () => {
    const result = await provider.getSyncState('nonexistent/repo', 'main')
    expect(result).toBeNull()
  })

  testIf(isConnected)('saves and retrieves sync state', async () => {
    const state: SyncState = {
      repo: testRepo,
      ns: 'repo.test.github.com',
      branch: 'main',
      lastCommit: 'abc123def456',
      lastSyncAt: new Date().toISOString(),
      totalFiles: 42,
      totalCommits: 100,
    }

    await provider.saveSyncState(state)

    const retrieved = await provider.getSyncState(testRepo, 'main')

    expect(retrieved).not.toBeNull()
    expect(retrieved!.repo).toBe(testRepo)
    expect(retrieved!.ns).toBe('repo.test.github.com')
    expect(retrieved!.branch).toBe('main')
    expect(retrieved!.lastCommit).toBe('abc123def456')
    expect(retrieved!.totalFiles).toBe(42)
    expect(retrieved!.totalCommits).toBe(100)
  })

  testIf(isConnected)('updates existing sync state', async () => {
    const updatedState: SyncState = {
      repo: testRepo,
      ns: 'repo.test.github.com',
      branch: 'main',
      lastCommit: 'newcommit789',
      lastSyncAt: new Date().toISOString(),
      totalFiles: 50,
      totalCommits: 110,
    }

    await provider.saveSyncState(updatedState)

    const retrieved = await provider.getSyncState(testRepo, 'main')

    expect(retrieved!.lastCommit).toBe('newcommit789')
    expect(retrieved!.totalFiles).toBe(50)
  })

  testIf(isConnected)('handles different branches independently', async () => {
    const devState: SyncState = {
      repo: testRepo,
      ns: 'repo.test.github.com',
      branch: 'develop',
      lastCommit: 'devcommit',
      lastSyncAt: new Date().toISOString(),
      totalFiles: 30,
      totalCommits: 50,
    }

    await provider.saveSyncState(devState)

    const mainState = await provider.getSyncState(testRepo, 'main')
    const developState = await provider.getSyncState(testRepo, 'develop')

    expect(mainState!.branch).toBe('main')
    expect(developState!.branch).toBe('develop')
    expect(mainState!.lastCommit).not.toBe(developState!.lastCommit)
  })
})

// =============================================================================
// Action Tests
// =============================================================================

describeIf(isConnected)('Actions', () => {
  testIf(isConnected)('creates sync action with verb conjugations', async () => {
    const actionId = await provider.createSyncAction({
      ns: 'example.com',
      repo: 'github.com/org/repo',
      branch: 'main',
      fromCommit: 'abc123',
      toCommit: 'def456',
      objects: [],
      commitMessage: 'feat: add feature',
      commitAuthor: 'John Doe',
      commitEmail: 'john@example.com',
      commitTs: new Date().toISOString(),
      diff: 'diff content here',
      actor: 'user:john',
    })

    expect(actionId).toBeDefined()
    expect(actionId.length).toBeGreaterThan(10)

    // Verify action was created
    const result = await executor.query<{ id: string; act: string; action: string; activity: string; status: string }>(
      `SELECT id, act, action, activity, status FROM Actions FINAL WHERE id = '${actionId}'`
    )

    expect(result.length).toBe(1)
    expect(result[0]!.act).toBe('syncs')
    expect(result[0]!.action).toBe('sync')
    expect(result[0]!.activity).toBe('syncing')
    expect(result[0]!.status).toBe('active')
  })

  testIf(isConnected)('stores objects in action', async () => {
    const objects: ActionObject[] = [
      { path: 'posts/hello.mdx', type: 'Post', id: 'hello', operation: 'create' },
      { path: 'posts/world.mdx', type: 'Post', id: 'world', operation: 'update' },
    ]

    const actionId = await provider.createSyncAction({
      ns: 'example.com',
      repo: 'github.com/org/repo',
      branch: 'main',
      fromCommit: '',
      toCommit: 'commit123',
      objects,
      commitMessage: 'Add posts',
      commitAuthor: 'Jane',
      commitEmail: 'jane@example.com',
      commitTs: new Date().toISOString(),
      diff: '',
      actor: 'user:jane',
    })

    const result = await executor.query<{ objectsCount: number }>(
      `SELECT objectsCount FROM Actions FINAL WHERE id = '${actionId}'`
    )

    expect(result[0]!.objectsCount).toBe(2)
  })

  testIf(isConnected)('tracks action progress via initial creation', async () => {
    const actionId = await provider.createSyncAction({
      ns: 'test.com',
      repo: 'repo',
      branch: 'main',
      fromCommit: '',
      toCommit: 'abc',
      objects: Array(10).fill({ path: 'test.mdx', type: 'Test', operation: 'create' }),
      commitMessage: '',
      commitAuthor: '',
      commitEmail: '',
      commitTs: '',
      diff: '',
      actor: '',
    })

    // Verify initial progress values
    const result = await executor.query<{ progress: number; total: number; status: string }>(
      `SELECT progress, total, status FROM Actions FINAL WHERE id = '${actionId}'`
    )

    expect(result[0]!.progress).toBe(0) // Initial progress
    expect(result[0]!.total).toBe(10)   // Total from objects count
    expect(result[0]!.status).toBe('active')
  })
})

// =============================================================================
// Thing Tests
// =============================================================================

describeIf(isConnected)('Things', () => {
  const testNs = 'test.things.' + Date.now()

  testIf(isConnected)('creates new thing with version 1', async () => {
    const obj: ActionObject = {
      path: 'posts/hello.mdx',
      type: 'Post',
      id: 'hello-' + Date.now(),
      operation: 'create',
      data: { title: 'Hello World' },
      content: '# Hello World',
    }

    await provider.upsertThing(testNs, obj)

    const thing = await provider.getThing(`${testNs}/${obj.type}/${obj.id}`)

    expect(thing).not.toBeNull()
    expect(thing!.version).toBe(1)
  })

  testIf(isConnected)('increments version on update', async () => {
    const id = 'versioned-' + Date.now()
    const obj: ActionObject = {
      path: 'posts/versioned.mdx',
      type: 'Post',
      id,
      operation: 'create',
      data: { title: 'Version 1' },
      content: '# Version 1',
    }

    await provider.upsertThing(testNs, obj)

    const v1 = await provider.getThing(`${testNs}/Post/${id}`)
    expect(v1!.version).toBe(1)

    // Update
    obj.operation = 'update'
    obj.data = { title: 'Version 2' }
    await provider.upsertThing(testNs, obj)

    const v2 = await provider.getThing(`${testNs}/Post/${id}`)
    expect(v2!.version).toBe(2)

    // Update again
    obj.data = { title: 'Version 3' }
    await provider.upsertThing(testNs, obj)

    const v3 = await provider.getThing(`${testNs}/Post/${id}`)
    expect(v3!.version).toBe(3)
  })

  testIf(isConnected)('deletes thing with soft delete', async () => {
    const id = 'deletable-' + Date.now()
    const obj: ActionObject = {
      path: 'posts/deletable.mdx',
      type: 'Post',
      id,
      operation: 'create',
      data: { title: 'To Delete' },
      content: '# Delete Me',
    }

    await provider.upsertThing(testNs, obj)
    await provider.deleteThing(testNs, 'Post', id)

    // The thing still exists but with deleted event
    const result = await executor.query<{ event: string; version: number }>(
      `SELECT event, version FROM Things FINAL WHERE url = '${testNs}/Post/${id}'`
    )

    expect(result[0]!.event).toBe('deleted')
    expect(result[0]!.version).toBe(2) // Version incremented on delete
  })

  testIf(isConnected)('returns null for non-existent thing', async () => {
    const thing = await provider.getThing('nonexistent/Type/id')
    expect(thing).toBeNull()
  })
})

// =============================================================================
// Event Tests
// =============================================================================

describeIf(isConnected)('Events', () => {
  testIf(isConnected)('emits event with ULID', async () => {
    const event: SyncEvent = {
      type: 'sync.completed',
      ns: 'test.events.' + Date.now(),
      actor: 'user:tester',
      data: { files: 10, duration: 1500 },
    }

    await provider.emitEvent(event)

    const result = await executor.query<{ ulid: string; event: string; actor: string }>(
      `SELECT ulid, event, actor FROM Events WHERE ns = '${event.ns}' ORDER BY ts DESC LIMIT 1`
    )

    expect(result.length).toBe(1)
    expect(result[0]!.ulid.length).toBeGreaterThan(10)
    expect(result[0]!.event).toBe('sync.completed')
    expect(result[0]!.actor).toBe('user:tester')
  })

  testIf(isConnected)('stores correlation ID in meta', async () => {
    const correlationId = 'corr-' + Date.now()
    const event: SyncEvent = {
      type: 'sync.started',
      ns: 'test.corr.' + Date.now(),
      actor: 'system',
      data: {},
      correlationId,
    }

    await provider.emitEvent(event)

    const result = await executor.query<{ metaStr: string }>(
      `SELECT toString(meta) as metaStr FROM Events WHERE ns = '${event.ns}' ORDER BY ts DESC LIMIT 1`
    )

    expect(result[0]!.metaStr).toContain(correlationId)
  })
})

// =============================================================================
// SyncState Schema Tests
// =============================================================================

describe('SYNC_STATE_SCHEMA', () => {
  it('creates valid SyncState table', () => {
    expect(SYNC_STATE_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS SyncState')
    expect(SYNC_STATE_SCHEMA).toContain('ReplacingMergeTree')
    expect(SYNC_STATE_SCHEMA).toContain('repo String')
    expect(SYNC_STATE_SCHEMA).toContain('ns LowCardinality')
    expect(SYNC_STATE_SCHEMA).toContain('branch LowCardinality')
    expect(SYNC_STATE_SCHEMA).toContain('lastCommit String')
    expect(SYNC_STATE_SCHEMA).toContain('ORDER BY (repo, branch)')
    expect(SYNC_STATE_SCHEMA).toContain('PRIMARY KEY (repo, branch)')
  })
})

// =============================================================================
// SQL Escaping Tests
// =============================================================================

describeIf(isConnected)('SQL Escaping', () => {
  testIf(isConnected)('handles single quotes in repo names', async () => {
    const result = await provider.getSyncState("repo'with'quotes", 'main')
    expect(result).toBeNull() // Just verify it doesn't throw
  })

  testIf(isConnected)('handles special characters in data', async () => {
    const obj: ActionObject = {
      path: 'test.mdx',
      type: 'Test',
      id: 'special-' + Date.now(),
      operation: 'create',
      data: { title: "Title with 'quotes' and \"double quotes\"" },
      content: "Content with `backticks` and \\backslashes\\",
    }

    const ns = 'test.special.' + Date.now()
    await provider.upsertThing(ns, obj)

    const thing = await provider.getThing(`${ns}/Test/${obj.id}`)
    expect(thing).not.toBeNull()
  })
})
