/**
 * @mdxdb/api Integration Tests
 *
 * Tests the HTTP API client against a real server with ClickHouse backend.
 * Uses the ai-database compliance test suite.
 *
 * Prerequisites:
 * - ClickHouse running on localhost:8123
 * - Set CLICKHOUSE_URL env var if using a different host
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createExtendedTests } from 'ai-database/tests'
import { createDBClient } from '../src/db-client.js'
import { createDBServer } from '@mdxdb/server/db'
import { createClickHouseDatabase, type ClickHouseDatabase } from '@mdxdb/clickhouse'
import { serve, type ServerType } from '@hono/node-server'

// Test configuration
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123'
const TEST_DATABASE = `mdxdb_test_api_${Date.now()}`
const SERVER_PORT = 3456 + Math.floor(Math.random() * 1000)

// Skip integration tests if ClickHouse is not available
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

describe('@mdxdb/api Integration Tests', async () => {
  const available = await isClickHouseAvailable()

  if (!available) {
    it.skip('ClickHouse not available - skipping integration tests', () => {})
    return
  }

  let clickhouse: ClickHouseDatabase
  let server: ServerType

  beforeAll(async () => {
    // Create ClickHouse database
    clickhouse = await createClickHouseDatabase({
      url: CLICKHOUSE_URL,
      database: TEST_DATABASE,
    })

    // Create and start the server
    const app = createDBServer({
      client: clickhouse,
      basePath: '/api/db',
      cors: true,
    })

    server = serve({
      fetch: app.fetch,
      port: SERVER_PORT,
    })

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterAll(async () => {
    // Close server
    await new Promise<void>(resolve => server.close(() => resolve()))

    // Drop test database
    try {
      const executor = clickhouse.getExecutor()
      await executor.command(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`)
    } catch {
      // Ignore cleanup errors
    }

    // Close ClickHouse connection
    await clickhouse.close()
  })

  // Run the ai-database compliance test suite
  createExtendedTests('@mdxdb/api via HTTP', {
    factory: () => createDBClient({
      baseUrl: `http://localhost:${SERVER_PORT}/api/db`,
    }),
    cleanup: async () => {
      // Cleanup handled in afterAll
    },
    ns: 'test.example.com',
  })
})
