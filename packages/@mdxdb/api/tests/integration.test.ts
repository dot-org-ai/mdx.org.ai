/**
 * @mdxdb/api Integration Tests
 *
 * Tests the HTTP API client against a real server.
 * Uses ai-database compliance test suite.
 *
 * Backends (in order of preference):
 * 1. ClickHouse (if available via CLICKHOUSE_URL)
 * 2. In-memory SQLite (always available)
 *
 * @packageDocumentation
 */

import { describe, it, beforeAll, afterAll } from 'vitest'
import { createExtendedTests, fixtures } from 'ai-database/tests'
import { createDBClient } from '../src/db-client.js'
import { createDBServer } from '@mdxdb/server/db'
import { serve, type ServerType } from '@hono/node-server'
import type { DBClientExtended } from 'ai-database'

// Test configuration
const SERVER_PORT = 3456 + Math.floor(Math.random() * 1000)
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123'

// Check if ClickHouse is available
const isClickHouseAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(CLICKHOUSE_URL, {
      method: 'POST',
      body: 'SELECT 1',
    })
    return response.ok
  } catch {
    return false
  }
}

// Dynamic import for backends
async function createBackend(): Promise<{ client: DBClientExtended; cleanup: () => Promise<void> }> {
  const clickhouseAvailable = await isClickHouseAvailable()

  if (clickhouseAvailable) {
    console.log('Using ClickHouse backend')
    const { createClickHouseDatabase } = await import('@mdxdb/clickhouse')
    const TEST_DATABASE = `mdxdb_test_api_${Date.now()}`

    const clickhouse = await createClickHouseDatabase({
      url: CLICKHOUSE_URL,
      database: TEST_DATABASE,
    })

    return {
      client: clickhouse,
      cleanup: async () => {
        try {
          const executor = clickhouse.getExecutor()
          await executor.command(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`)
        } catch {
          // Ignore cleanup errors
        }
        await clickhouse.close()
      },
    }
  }

  // Fall back to SQLite in-memory
  console.log('Using SQLite in-memory backend')
  // Import from specific submodules to avoid loading durable-object.js which requires cloudflare:workers
  const { createInMemoryBinding } = await import('@mdxdb/sqlite/miniflare')
  const { MDXClientAdapter } = await import('./sqlite-adapter.js')

  const binding = createInMemoryBinding()
  const id = binding.idFromName(fixtures.ns)
  const stub = binding.get(id)

  return {
    // Pass the stub directly - it implements MDXDatabaseRPC
    client: new MDXClientAdapter(stub, fixtures.ns),
    cleanup: async () => {
      // No cleanup needed for in-memory
    },
  }
}

describe('@mdxdb/api Integration Tests', async () => {
  let backend: { client: DBClientExtended; cleanup: () => Promise<void> }
  let server: ServerType

  beforeAll(async () => {
    // Create backend
    backend = await createBackend()

    // Create and start the server with JSON:API endpoints
    const app = createDBServer({
      client: backend.client,
      basePath: '/api/db',
      cors: true,
    })

    server = serve({
      fetch: app.fetch,
      port: SERVER_PORT,
    })

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  afterAll(async () => {
    // Close server
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }

    // Cleanup backend
    if (backend) {
      await backend.cleanup()
    }
  })

  // Run the ai-database compliance test suite
  createExtendedTests('@mdxdb/api via JSON:API HTTP', {
    factory: () =>
      createDBClient({
        baseUrl: `http://localhost:${SERVER_PORT}/api/db`,
      }),
    cleanup: async () => {
      // Cleanup handled in afterAll
    },
    ns: fixtures.ns,
  })
})
