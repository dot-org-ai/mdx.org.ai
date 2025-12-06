/**
 * ClickHouse Server Management
 *
 * Provides utilities for downloading, starting, and managing a local ClickHouse server.
 * Used by both the CLI and test suite.
 *
 * @packageDocumentation
 */

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { spawn, execSync, type ChildProcess } from 'node:child_process'

// =============================================================================
// Types
// =============================================================================

export interface ServerOptions {
  /** HTTP port for ClickHouse (default: 8123) */
  httpPort?: number
  /** TCP port for ClickHouse (default: 9000) */
  tcpPort?: number
  /** MySQL port for ClickHouse (default: 9004) */
  mysqlPort?: number
  /** Data directory for ClickHouse (default: .mdx/db in cwd) */
  dataDir?: string
  /** Whether to log verbose output */
  verbose?: boolean
  /** Timeout for server startup in ms (default: 30000) */
  startupTimeout?: number
}

export interface ServerInstance {
  /** The ClickHouse server process */
  process: ChildProcess
  /** HTTP URL for the server */
  url: string
  /** HTTP port */
  httpPort: number
  /** Stop the server */
  stop: () => Promise<void>
}

// =============================================================================
// Binary Management
// =============================================================================

/** Get the directory where ClickHouse binary is stored */
export function getClickHouseDir(): string {
  return join(homedir(), '.mdx', 'bin')
}

/** Get the path to the ClickHouse binary */
export function getClickHouseBinary(): string {
  return join(getClickHouseDir(), 'clickhouse')
}

/** Check if ClickHouse binary exists */
export function isClickHouseInstalled(): boolean {
  return existsSync(getClickHouseBinary())
}

/** Get ClickHouse version */
export function getClickHouseVersion(): string {
  const binary = getClickHouseBinary()
  if (!isClickHouseInstalled()) {
    return 'not installed'
  }
  try {
    const output = execSync(`${binary} --version`, { encoding: 'utf-8' })
    return output.trim().split('\n')[0] ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** Download ClickHouse binary */
export async function downloadClickHouse(): Promise<string> {
  const dir = getClickHouseDir()
  const binary = getClickHouseBinary()

  if (isClickHouseInstalled()) {
    return binary
  }

  console.log('Downloading ClickHouse...')

  // Create directory
  mkdirSync(dir, { recursive: true })

  // Use curl to download (works on macOS/Linux)
  try {
    execSync('curl -fsSL https://clickhouse.com/ | sh', {
      cwd: dir,
      stdio: 'inherit',
    })

    // Verify binary exists
    if (!existsSync(binary)) {
      throw new Error('Binary not found after download')
    }

    console.log(`ClickHouse installed to ${binary}`)
    return binary
  } catch (error) {
    throw new Error(`Failed to download ClickHouse: ${error}`)
  }
}

/** Ensure ClickHouse is installed, download if needed */
export async function ensureClickHouse(): Promise<string> {
  if (!isClickHouseInstalled()) {
    await downloadClickHouse()
  }
  return getClickHouseBinary()
}

// =============================================================================
// Server Management
// =============================================================================

/** Wait for ClickHouse server to be ready */
async function waitForServer(port: number, timeout: number): Promise<void> {
  const start = Date.now()
  const url = `http://localhost:${port}/ping`

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Server did not start within ${timeout}ms`)
}

/** Execute a ClickHouse query */
export async function executeQuery(
  url: string,
  query: string,
  database = 'default'
): Promise<string> {
  const response = await fetch(`${url}/?database=${database}`, {
    method: 'POST',
    body: query,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Query failed: ${error}`)
  }

  return response.text()
}

/** Start a ClickHouse server */
export async function startServer(options: ServerOptions = {}): Promise<ServerInstance> {
  const binary = await ensureClickHouse()

  const httpPort = options.httpPort ?? 8123
  const tcpPort = options.tcpPort ?? 9000
  const mysqlPort = options.mysqlPort ?? 9004
  const dataDir = options.dataDir ?? join(process.cwd(), '.mdx', 'db')
  const startupTimeout = options.startupTimeout ?? 30000

  // Create data directory
  mkdirSync(dataDir, { recursive: true })

  if (options.verbose) {
    console.log(`Starting ClickHouse server on port ${httpPort}...`)
    console.log(`Data directory: ${dataDir}`)
  }

  const args = [
    'server',
    '--',
    `--path=${dataDir}`,
    `--http_port=${httpPort}`,
    `--tcp_port=${tcpPort}`,
    `--mysql_port=${mysqlPort}`,
    '--listen_host=127.0.0.1',
    // Reduce logging noise
    '--logger.level=warning',
    '--logger.console=1',
  ]

  const serverProcess = spawn(binary, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  // Handle server output
  if (options.verbose) {
    serverProcess.stdout?.on('data', (data) => {
      process.stdout.write(`[clickhouse] ${data}`)
    })
    serverProcess.stderr?.on('data', (data) => {
      process.stderr.write(`[clickhouse] ${data}`)
    })
  }

  const url = `http://localhost:${httpPort}`

  // Wait for server to be ready
  await waitForServer(httpPort, startupTimeout)

  if (options.verbose) {
    console.log('ClickHouse server ready')
  }

  return {
    process: serverProcess,
    url,
    httpPort,
    stop: async () => {
      serverProcess.kill('SIGTERM')
      // Wait for process to exit
      await new Promise<void>((resolve) => {
        serverProcess.on('exit', () => resolve())
        // Force kill after 5 seconds
        setTimeout(() => {
          serverProcess.kill('SIGKILL')
          resolve()
        }, 5000)
      })
    },
  }
}

/** Initialize the mdxdb schema on a running server */
export async function initializeSchema(url: string): Promise<void> {
  // Create database
  await executeQuery(url, 'CREATE DATABASE IF NOT EXISTS mdxdb')

  // Import schema from the schema module
  try {
    const { TABLE_SCHEMAS, TABLES, ACCESS_CONTROL_TABLE } = await import('../schema/index.js')

    for (const table of TABLES) {
      // Skip access control - it requires admin privileges and has multi-statement SQL
      if (table === ACCESS_CONTROL_TABLE) continue

      const schema = TABLE_SCHEMAS[table]
      if (schema) {
        await executeQuery(url, schema, 'mdxdb')
      }
    }
  } catch (error) {
    // Fall back to minimal schema if module import fails
    console.warn('Using minimal schema:', error)
    await executeQuery(
      url,
      `
      CREATE TABLE IF NOT EXISTS Things (
        ns String,
        type String,
        id String,
        data JSON,
        content String DEFAULT '',
        ts DateTime64(3) DEFAULT now64(3)
      ) ENGINE = MergeTree() ORDER BY (ns, type, id)
    `,
      'mdxdb'
    )
  }
}

/** Start server and initialize schema */
export async function startServerWithSchema(
  options: ServerOptions = {}
): Promise<ServerInstance> {
  const server = await startServer(options)
  await initializeSchema(server.url)
  return server
}
