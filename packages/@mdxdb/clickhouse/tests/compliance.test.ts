/**
 * @mdxdb/clickhouse Compliance Tests
 *
 * Uses the unified test suite from ai-database to verify
 * ClickHouse adapter implements DBClientExtended correctly.
 */

import { createExtendedTests, fixtures } from 'ai-database/tests'
import { createClickHouseDatabase, type ClickHouseConfig } from '../src/index.js'

// Skip tests if CLICKHOUSE_URL is not configured
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost:8123'
const SKIP_COMPLIANCE = process.env.SKIP_CLICKHOUSE_COMPLIANCE === 'true'

if (!SKIP_COMPLIANCE) {
  const config: ClickHouseConfig = {
    url: CLICKHOUSE_URL,
    database: 'compliance_test',
  }

  createExtendedTests('ClickHouse', {
    factory: async () => {
      const db = await createClickHouseDatabase(config)
      return db
    },
    cleanup: async () => {
      // Optional: drop test database or clean up test data
    },
    ns: fixtures.ns,
    // Skip tests that aren't implemented yet
    skip: {
      // Uncomment if certain features aren't supported
      // search: true,
    },
  })
}
