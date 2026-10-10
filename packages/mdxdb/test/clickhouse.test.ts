/**
 * The shared provider contract on @mdxdb/clickhouse.
 *
 * Needs a live ClickHouse; gated on CLICKHOUSE_URL (e.g.
 * `CLICKHOUSE_URL=http://localhost:8123 pnpm --filter mdxdb test:unit`).
 * Without it the suite is registered as skipped, so the gap is visible in the
 * run rather than silently absent.
 *
 * One throwaway database per run; each test gets a fresh namespace inside it,
 * which is what scopes every entity for the provider.
 */
import { describe, it, afterAll } from 'vitest'
import { createProviderContractTests } from '../src/tests.js'

const CLICKHOUSE_URL = process.env['CLICKHOUSE_URL']

if (!CLICKHOUSE_URL) {
  describe.skip('mdxdb provider contract: clickhouse (@mdxdb/clickhouse) — set CLICKHOUSE_URL to run', () => {
    it('needs a live ClickHouse', () => {})
  })
} else {
  type ClickHouseModule = typeof import('@mdxdb/clickhouse')
  type ClickHouseDatabase = Awaited<ReturnType<ClickHouseModule['createClickHouseDatabase']>>

  const database = `mdxdb_contract_${Date.now().toString(36)}`
  let mod: ClickHouseModule | undefined
  let db: ClickHouseDatabase | undefined
  let n = 0

  const open = async () => {
    mod ??= await import('@mdxdb/clickhouse')
    db ??= await mod.createClickHouseDatabase({ url: CLICKHOUSE_URL, database })
    return { mod, db }
  }

  afterAll(async () => {
    if (!db) return
    try {
      await db.getExecutor().command(`DROP DATABASE IF EXISTS ${database}`)
    } finally {
      await db.close()
    }
  })

  createProviderContractTests('clickhouse (@mdxdb/clickhouse, live)', {
    create: async () => {
      const { mod, db } = await open()
      return new mod.ClickHouseProvider(db, `contract-${++n}.local`)
    },
  })
}
