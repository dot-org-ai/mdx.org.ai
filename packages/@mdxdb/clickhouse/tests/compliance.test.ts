/**
 * @mdxdb/clickhouse Compliance Tests
 *
 * Uses the unified test suite from ai-database to verify
 * ClickHouse adapter implements DBClientExtended correctly.
 *
 * The ClickHouse server is started automatically by the vitest globalSetup.
 */

import { createExtendedTests, fixtures } from 'ai-database/tests'
import { createClickHouseDatabase, type ClickHouseConfig } from '../src/index.js'
import { executeQuery } from '../src/server.js'

// Get the URL from environment (set by globalSetup)
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost:18123'

const config: ClickHouseConfig = {
  url: CLICKHOUSE_URL,
  database: 'mdxdb',
}

// Create a unique test namespace to avoid conflicts with other test runs
const testNs = `${fixtures.ns}-${Date.now()}`

createExtendedTests('ClickHouse', {
  factory: async () => {
    const db = await createClickHouseDatabase(config)
    return db
  },
  cleanup: async () => {
    // Clean up test data after each test suite
    try {
      await executeQuery(
        CLICKHOUSE_URL,
        `ALTER TABLE Things DELETE WHERE ns = '${testNs}'`,
        'mdxdb'
      )
      await executeQuery(
        CLICKHOUSE_URL,
        `ALTER TABLE Relationships DELETE WHERE ns = '${testNs}'`,
        'mdxdb'
      )
      await executeQuery(
        CLICKHOUSE_URL,
        `ALTER TABLE Events DELETE WHERE ns = '${testNs}'`,
        'mdxdb'
      )
      await executeQuery(
        CLICKHOUSE_URL,
        `ALTER TABLE Actions DELETE WHERE ns = '${testNs}'`,
        'mdxdb'
      )
      await executeQuery(
        CLICKHOUSE_URL,
        `ALTER TABLE Artifacts DELETE WHERE ns = '${testNs}'`,
        'mdxdb'
      )
    } catch {
      // Ignore cleanup errors (tables might not exist yet)
    }
  },
  ns: testNs,
})
