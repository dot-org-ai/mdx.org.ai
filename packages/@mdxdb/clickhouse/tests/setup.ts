/**
 * Vitest Global Setup for ClickHouse Tests
 *
 * Starts a local ClickHouse server before tests run and stops it after.
 * The server is shared across all test files for efficiency.
 */

import type { GlobalSetupContext } from 'vitest/node'
import {
  startServerWithSchema,
  isClickHouseInstalled,
  downloadClickHouse,
  type ServerInstance,
} from '../src/server.js'

let server: ServerInstance | null = null

export async function setup(ctx: GlobalSetupContext): Promise<void> {
  // Ensure ClickHouse is installed
  if (!isClickHouseInstalled()) {
    console.log('\n[ClickHouse] Downloading binary...')
    await downloadClickHouse()
  }

  // Use a unique port to avoid conflicts with other instances
  const httpPort = 18123

  console.log(`\n[ClickHouse] Starting server on port ${httpPort}...`)

  try {
    server = await startServerWithSchema({
      httpPort,
      tcpPort: 19000,
      mysqlPort: 19004,
      dataDir: '.mdx/test-db',
      verbose: false,
      startupTimeout: 60000,
    })

    console.log(`[ClickHouse] Server ready at ${server.url}`)

    // Make the URL available to tests via environment variable
    process.env.CLICKHOUSE_URL = server.url
    process.env.CLICKHOUSE_TEST_PORT = String(httpPort)

    // Also provide to child processes
    ctx.provide('clickhouseUrl', server.url)
    ctx.provide('clickhousePort', httpPort)
  } catch (error) {
    console.error('[ClickHouse] Failed to start server:', error)
    throw error
  }
}

export async function teardown(): Promise<void> {
  if (server) {
    console.log('\n[ClickHouse] Stopping server...')
    await server.stop()
    server = null
  }
}
