#!/usr/bin/env node
/**
 * MDXDB CLI
 *
 * Command line interface for MDX databases.
 * Run `mdxdb` with no args to start a full local dev environment:
 * - ClickHouse server (auto-downloaded)
 * - File watcher for content sync
 * - Web UI for database exploration
 *
 * @packageDocumentation
 */

import { ensureLoggedIn } from 'oauth.do'
import { resolve, dirname } from 'node:path'
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, chmodSync, writeFileSync, watch } from 'node:fs'
import { join, relative } from 'node:path'
import { spawn, execSync, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { parse, stringify } from 'mdxld'
import { homedir, platform, arch } from 'node:os'
import { extract, type ExtractResult } from '@mdxld/extract'

export interface CliOptions {
  command: 'dev' | 'publish' | 'server' | 'client' | 'studio' | 'help' | 'version'
  path: string
  name?: string
  baseUrl: string
  clickhouseUrl?: string
  port: number
  httpPort: number
  studioPort: number
  dryRun: boolean
  verbose: boolean
  help: boolean
  /** Use ClickHouse worker directly instead of API */
  useClickhouse: boolean
}

export const VERSION = '0.0.0'

const HELP_TEXT = `
mdxdb - Create, Manage, & Publish MDX Databases

Usage:
  mdxdb [command] [options]

Commands:
  (default)           Start local dev environment (ClickHouse + sync + UI)
  dev                 Same as default - start local dev environment
  studio              Start MDXDB Studio editor (lightweight, no ClickHouse)
  server              Start only the ClickHouse server
  client              Open ClickHouse client shell
  publish             Publish MDX files to remote database
  help                Show this help message
  version             Show version

Options:
  --path, -p <path>      Path to MDX files or directory (default: ./content)
  --name, -n <name>      Database name/namespace
  --port <port>          Web UI port (default: 4000)
  --studio-port <port>   Studio port (default: 4321)
  --http-port <port>     ClickHouse HTTP port (default: 8123)
  --base-url <url>       API base URL (default: https://apis.do)
  --clickhouse <url>     ClickHouse URL for publish (default: http://localhost:8123)
  --dry-run              Show what would be published without publishing
  --verbose, -v          Show detailed output
  --help, -h             Show this help message

Examples:
  # Start local dev environment
  mdxdb

  # Start just the Studio editor (no database)
  mdxdb studio

  # Start with custom content path
  mdxdb --path ./docs

  # Start Studio on a different port
  mdxdb studio --studio-port 3000

  # Start ClickHouse server only
  mdxdb server

  # Open ClickHouse client
  mdxdb client

  # Publish to local ClickHouse
  mdxdb publish --name my-project

  # Publish to remote ClickHouse
  mdxdb publish --clickhouse https://ch.example.com --name my-project

Environment Variables:
  CLICKHOUSE_URL         ClickHouse HTTP URL (default: http://localhost:8123)
  MDXDB_PATH             Content directory (default: ./content)
  MDXDB_PORT             Web UI port (default: 4000)
  MDXDB_STUDIO_PORT      Studio port (default: 4321)
`

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: 'dev', // Default to dev mode
    path: process.env.MDXDB_PATH || './content',
    baseUrl: process.env.MDXDB_API_URL || 'https://apis.do',
    clickhouseUrl: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    port: parseInt(process.env.MDXDB_PORT || '4000', 10),
    httpPort: parseInt(process.env.CLICKHOUSE_HTTP_PORT || '8123', 10),
    studioPort: parseInt(process.env.MDXDB_STUDIO_PORT || '4321', 10),
    dryRun: false,
    verbose: false,
    help: false,
    useClickhouse: true,
  }

  // Parse command
  const firstArg = args[0]
  if (args.length > 0 && firstArg && !firstArg.startsWith('-')) {
    const cmd = firstArg.toLowerCase()
    if (cmd === 'dev') {
      options.command = 'dev'
    } else if (cmd === 'studio') {
      options.command = 'studio'
    } else if (cmd === 'server') {
      options.command = 'server'
    } else if (cmd === 'client') {
      options.command = 'client'
    } else if (cmd === 'publish') {
      options.command = 'publish'
    } else if (cmd === 'version' || cmd === '-v' || cmd === '--version') {
      options.command = 'version'
    } else if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
      options.command = 'help'
    }
    args = args.slice(1)
  }

  // Parse options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--path':
      case '-p':
        options.path = next || './content'
        i++
        break
      case '--name':
      case '-n':
        options.name = next
        i++
        break
      case '--port':
        options.port = parseInt(next || '4000', 10)
        i++
        break
      case '--studio-port':
        options.studioPort = parseInt(next || '4321', 10)
        i++
        break
      case '--http-port':
        options.httpPort = parseInt(next || '8123', 10)
        i++
        break
      case '--base-url':
        options.baseUrl = next || 'https://apis.do'
        i++
        break
      case '--clickhouse':
        options.clickhouseUrl = next
        i++
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--help':
      case '-h':
        options.help = true
        options.command = 'help'
        break
      case '--version':
        options.command = 'version'
        break
    }
  }

  return options
}

// =============================================================================
// ClickHouse Binary Management
// =============================================================================

/** Get the directory where ClickHouse binary is stored */
function getClickHouseDir(): string {
  return join(homedir(), '.mdx', 'bin')
}

/** Get the path to the ClickHouse binary */
function getClickHouseBinary(): string {
  return join(getClickHouseDir(), 'clickhouse')
}

/** Get the data directory for ClickHouse (project-local) */
function getDataDir(): string {
  return join(process.cwd(), '.mdx', 'db')
}

/** Check if ClickHouse binary exists */
function isClickHouseInstalled(): boolean {
  return existsSync(getClickHouseBinary())
}

/** Download ClickHouse binary */
async function downloadClickHouse(): Promise<void> {
  const dir = getClickHouseDir()
  const binary = getClickHouseBinary()

  console.log('📦 Downloading ClickHouse...')

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

    console.log(`✅ ClickHouse installed to ${binary}`)
  } catch (error) {
    throw new Error(`Failed to download ClickHouse: ${error}`)
  }
}

/** Ensure ClickHouse is installed, download if needed */
async function ensureClickHouse(): Promise<string> {
  const binary = getClickHouseBinary()

  if (!isClickHouseInstalled()) {
    await downloadClickHouse()
  }

  return binary
}

/** Get ClickHouse version */
function getClickHouseVersion(binary: string): string {
  try {
    const output = execSync(`${binary} --version`, { encoding: 'utf-8' })
    return output.trim().split('\n')[0] ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

// =============================================================================
// ClickHouse Server Management
// =============================================================================

let serverProcess: ChildProcess | null = null

/** Start ClickHouse server */
async function startServer(options: CliOptions): Promise<ChildProcess> {
  const binary = await ensureClickHouse()
  const dataDir = getDataDir()

  // Create data directory
  mkdirSync(dataDir, { recursive: true })

  console.log(`🚀 Starting ClickHouse server on port ${options.httpPort}...`)
  console.log(`📁 Data directory: ${dataDir}`)

  const args = [
    'server',
    '--',
    `--path=${dataDir}`,
    `--http_port=${options.httpPort}`,
    '--tcp_port=9000',
    '--mysql_port=9004',
    '--listen_host=127.0.0.1',
    // Reduce logging noise
    '--logger.level=warning',
    '--logger.console=1',
  ]

  serverProcess = spawn(binary, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  // Wait for server to be ready
  await waitForServer(options.httpPort)

  // Initialize database schema
  await initializeSchema(options)

  return serverProcess
}

/** Wait for ClickHouse server to be ready */
async function waitForServer(port: number, timeout = 30000): Promise<void> {
  const start = Date.now()
  const url = `http://localhost:${port}/ping`

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        console.log('✅ ClickHouse server ready')
        return
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Server did not start within ${timeout}ms`)
}

/** Initialize database schema */
async function initializeSchema(options: CliOptions): Promise<void> {
  const url = `http://localhost:${options.httpPort}`

  // Create database
  await executeQuery(url, 'CREATE DATABASE IF NOT EXISTS mdxdb')

  // Import schema from @mdxdb/clickhouse if available
  try {
    // Try to dynamically import individual table schemas
    const { TABLE_SCHEMAS, TABLES } = await import('@mdxdb/clickhouse/schema')

    for (const table of TABLES) {
      const schema = TABLE_SCHEMAS[table]
      if (schema) {
        await executeQuery(url, schema, 'mdxdb')
      }
    }
    console.log('✅ Database schema initialized')
  } catch {
    // Schema module not available, use inline minimal schema
    console.log('⚠️  Using minimal schema (install @mdxdb/clickhouse for full schema)')
    await executeQuery(url, `
      CREATE TABLE IF NOT EXISTS Things (
        ns String,
        type String,
        id String,
        data JSON,
        content String DEFAULT '',
        ts DateTime64(3) DEFAULT now64(3)
      ) ENGINE = MergeTree() ORDER BY (ns, type, id)
    `, 'mdxdb')
  }
}

/** Execute a ClickHouse query */
async function executeQuery(url: string, query: string, database = 'default'): Promise<string> {
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

/**
 * Recursively find all MDX files in a directory
 */
function findMdxFiles(dir: string, basePath: string = ''): string[] {
  const files: string[] = []

  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const relativePath = basePath ? `${basePath}/${entry}` : entry
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...findMdxFiles(fullPath, relativePath))
      }
    } else if (entry.endsWith('.mdx')) {
      // Only include .mdx files (skip .md - they may be generated output)
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Parse an MDX file and return document data
 */
function parseDocument(filePath: string, basePath: string): { id: string; document: ReturnType<typeof parse> } | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const document = parse(content)

    // Generate ID from file path (relative to base)
    const relativePath = relative(basePath, filePath)
    const id = relativePath
      .replace(/\.(mdx|md)$/, '')
      .replace(/\\/g, '/') // Normalize Windows paths
      .replace(/\/index$/, '') // Remove trailing /index
      .replace(/^\//, '') // Remove leading slash

    return { id, document }
  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error)
    return null
  }
}

/**
 * Publish documents to remote database
 */
export async function runPublish(options: CliOptions): Promise<void> {
  console.log('📤 mdxdb publish\n')

  const resolvedPath = resolve(options.path)
  console.log(`📁 Path: ${resolvedPath}`)

  if (!existsSync(resolvedPath)) {
    console.error(`❌ Path does not exist: ${resolvedPath}`)
    process.exit(1)
  }

  // Find all MDX files
  const files = findMdxFiles(resolvedPath)

  if (files.length === 0) {
    console.log('⚠️  No MDX files found')
    return
  }

  console.log(`📋 Found ${files.length} file(s)`)

  if (options.dryRun) {
    console.log('\n🔬 Dry run mode - no changes will be made\n')
  }

  // Get authentication token
  let token: string
  if (options.dryRun) {
    token = 'dry-run-token'
    console.log('🔑 Skipping authentication (dry run)')
  } else {
    console.log('🔐 Authenticating...')
    try {
      const auth = await ensureLoggedIn()
      token = auth.token
      if (auth.isNewLogin) {
        console.log('✅ Logged in successfully')
      } else {
        console.log('✅ Using existing session')
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      process.exit(1)
    }
  }

  // Parse and prepare documents
  const documents: Array<{ id: string; document: ReturnType<typeof parse> }> = []
  for (const filePath of files) {
    const parsed = parseDocument(filePath, resolvedPath)
    if (parsed) {
      documents.push(parsed)
      if (options.verbose) {
        console.log(`  📄 ${parsed.id}`)
      }
    }
  }

  if (options.dryRun) {
    console.log('\n📋 Documents to publish:')
    for (const { id, document } of documents) {
      const type = document.type || 'Document'
      console.log(`  • ${id} (${type})`)
    }
    console.log('\n✅ Dry run complete')
    return
  }

  // Prepare documents payload
  const docsPayload = documents.map(({ id, document }) => ({
    id,
    type: document.type ?? undefined,
    context: document.context ?? undefined,
    data: document.data,
    content: document.content,
  }))

  // Use ClickHouse worker directly if configured
  if (options.useClickhouse && options.clickhouseUrl) {
    console.log(`\n📦 Publishing ${documents.length} document(s) to ${options.clickhouseUrl}/publish`)

    if (!options.name) {
      console.error('❌ --name (namespace) is required when using --clickhouse')
      process.exit(1)
    }

    try {
      const response = await fetch(`${options.clickhouseUrl}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ns: options.name,
          actor: `user:${process.env.USER || 'cli'}`,
          documents: docsPayload,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      const result = await response.json() as {
        success: boolean
        actionId: string
        ns: string
        documentsCount: number
        status: string
        error?: string
      }

      if (result.success) {
        console.log(`\n✅ Created publish action: ${result.actionId}`)
        console.log(`📊 Documents: ${result.documentsCount}`)
        console.log(`📁 Namespace: ${result.ns}`)
        console.log(`⏳ Status: ${result.status}`)
        console.log(`\n🔗 Check status: GET ${options.clickhouseUrl}/actions/${result.actionId}`)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('\n❌ Publish failed:', error)
      process.exit(1)
    }
    return
  }

  // Default: POST to API /db endpoint
  console.log(`\n📦 Publishing ${documents.length} document(s) to ${options.baseUrl}/db`)

  try {
    const response = await fetch(`${options.baseUrl}/db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: options.name,
        documents: docsPayload,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    const result = await response.json() as { success: boolean; published: number; url?: string; error?: string }

    if (result.success) {
      console.log(`\n✅ Published ${result.published} document(s)`)
      if (result.url) {
        console.log(`🌐 URL: ${result.url}`)
      }
    } else {
      throw new Error(result.error || 'Unknown error')
    }
  } catch (error) {
    console.error('\n❌ Publish failed:', error)
    process.exit(1)
  }
}

// =============================================================================
// Dev Mode - Full Local Environment
// =============================================================================

/** Run dev mode: ClickHouse + sync + web UI */
async function runDev(options: CliOptions): Promise<void> {
  console.log('🗄️  mdxdb dev\n')

  const resolvedPath = resolve(options.path)
  console.log(`📁 Content: ${resolvedPath}`)
  console.log(`🌐 Web UI:  http://localhost:${options.port}`)
  console.log(`📊 DB:      http://localhost:${options.httpPort}\n`)

  // Start ClickHouse server
  const server = await startServer(options)

  // Handle server output
  server.stdout?.on('data', (data) => {
    if (options.verbose) {
      process.stdout.write(`[clickhouse] ${data}`)
    }
  })

  server.stderr?.on('data', (data) => {
    const msg = data.toString()
    // Filter out noisy messages
    if (!msg.includes('Ready for connections') && options.verbose) {
      process.stderr.write(`[clickhouse] ${data}`)
    }
  })

  // Start web UI server
  await startWebUI(options)

  // Start file watcher for content sync
  await startWatcher(options)

  // Keep process running
  console.log('\n✨ Dev environment ready! Press Ctrl+C to stop.\n')

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...')
    if (serverProcess) {
      serverProcess.kill()
    }
    if (editorProcess) {
      editorProcess.kill()
    }
    process.exit(0)
  })

  // Keep alive
  await new Promise(() => {})
}

/** Run server only mode */
async function runServer(options: CliOptions): Promise<void> {
  console.log('🗄️  mdxdb server\n')

  const binary = await ensureClickHouse()
  console.log(`📦 ClickHouse: ${getClickHouseVersion(binary)}`)

  const server = await startServer(options)

  // Forward all output
  server.stdout?.pipe(process.stdout)
  server.stderr?.pipe(process.stderr)

  console.log(`\n✅ ClickHouse running at http://localhost:${options.httpPort}`)
  console.log('   Press Ctrl+C to stop.\n')

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...')
    server.kill()
    process.exit(0)
  })

  await new Promise(() => {})
}

/** Run ClickHouse client */
async function runClient(_options: CliOptions): Promise<void> {
  const binary = await ensureClickHouse()

  // Spawn client interactively
  const client = spawn(binary, ['client', '--database=mdxdb'], {
    stdio: 'inherit',
  })

  client.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

/** Reference to the editor process */
let editorProcess: ChildProcess | null = null

/** Try to find the @mdxui/editor package */
function findEditorPackage(): string | null {
  // Check common locations
  const locations = [
    // In monorepo: packages/@mdxui/editor
    join(process.cwd(), 'packages', '@mdxui', 'editor'),
    join(process.cwd(), '..', '@mdxui', 'editor'),
    join(process.cwd(), '..', '..', 'packages', '@mdxui', 'editor'),
    // In node_modules
    join(process.cwd(), 'node_modules', '@mdxui', 'editor'),
  ]

  for (const loc of locations) {
    if (existsSync(join(loc, 'package.json'))) {
      return loc
    }
  }

  // Try to resolve via require.resolve
  try {
    const resolved = require.resolve('@mdxui/editor/package.json')
    return dirname(resolved)
  } catch {
    return null
  }
}

/** Start web UI server - uses @mdxui/editor if available, otherwise embedded UI */
async function startWebUI(options: CliOptions): Promise<Server | ChildProcess> {
  const editorPath = findEditorPackage()
  const ns = options.name || inferNamespace()

  if (editorPath) {
    console.log(`📝 Starting @mdxui/editor...`)

    // Set environment variables for the editor
    const env = {
      ...process.env,
      CLICKHOUSE_URL: `http://localhost:${options.httpPort}`,
      CLICKHOUSE_DATABASE: 'mdxdb',
      MDXDB_NAMESPACE: ns,
      MDXDB_NAME: ns,
      PORT: String(options.port),
    }

    // Spawn Next.js dev server from the editor package
    editorProcess = spawn('npm', ['run', 'dev', '--', '--port', String(options.port)], {
      cwd: editorPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    // Wait for the editor to start
    await waitForEditor(options.port)

    editorProcess.stdout?.on('data', (data) => {
      if (options.verbose) {
        process.stdout.write(`[editor] ${data}`)
      }
    })

    editorProcess.stderr?.on('data', (data) => {
      const msg = data.toString()
      // Filter out noisy Next.js messages
      if (options.verbose && !msg.includes('Compiling') && !msg.includes('compiled')) {
        process.stderr.write(`[editor] ${data}`)
      }
    })

    return editorProcess
  }

  // Fallback: Simple embedded web UI
  console.log(`📝 Using embedded UI (install @mdxui/editor for full editor)`)

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${options.port}`)

    // API proxy to ClickHouse
    if (url.pathname.startsWith('/api/query')) {
      const query = url.searchParams.get('q')
      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing query parameter' }))
        return
      }

      try {
        const result = await executeQuery(`http://localhost:${options.httpPort}`, query, 'mdxdb')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(result)
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(error) }))
      }
      return
    }

    // Serve simple UI
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>mdxdb</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    textarea { width: 100%; height: 100px; font-family: monospace; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
    pre { background: #f5f5f5; padding: 15px; overflow: auto; }
    .status { color: green; }
  </style>
</head>
<body>
  <h1>🗄️ mdxdb</h1>
  <p class="status">Connected to ClickHouse on port ${options.httpPort}</p>
  <h2>Query</h2>
  <textarea id="query">SELECT * FROM Things LIMIT 10</textarea>
  <br><br>
  <button onclick="runQuery()">Run Query</button>
  <h2>Results</h2>
  <pre id="results">Click "Run Query" to execute</pre>
  <script>
    async function runQuery() {
      const query = document.getElementById('query').value;
      const results = document.getElementById('results');
      results.textContent = 'Loading...';
      try {
        const res = await fetch('/api/query?q=' + encodeURIComponent(query + ' FORMAT JSON'));
        const text = await res.text();
        results.textContent = JSON.stringify(JSON.parse(text), null, 2);
      } catch (e) {
        results.textContent = 'Error: ' + e.message;
      }
    }
  </script>
</body>
</html>`)
  })

  return new Promise((resolve) => {
    server.listen(options.port, () => {
      resolve(server)
    })
  })
}

/** Wait for editor to be ready */
async function waitForEditor(port: number, timeout = 60000): Promise<void> {
  const start = Date.now()
  const url = `http://localhost:${port}`

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 404) {
        // Editor is responding (404 is OK - Next.js may return 404 for initial page)
        console.log('✅ Editor ready')
        return
      }
    } catch {
      // Editor not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log('⚠️  Editor may not have started correctly, continuing anyway...')
}

/** Start file watcher for content sync */
async function startWatcher(options: CliOptions): Promise<void> {
  const contentPath = resolve(options.path)

  if (!existsSync(contentPath)) {
    console.log(`⚠️  Content path does not exist: ${contentPath}`)
    console.log(`   Create it with: mkdir -p ${contentPath}`)
    return
  }

  // Initial sync
  console.log(`👀 Watching ${contentPath} for changes...`)
  await syncAllFiles(options)

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const pendingFiles = new Set<string>()

  // Watch for changes recursively
  const { watch } = await import('node:fs')

  const watchDir = (dir: string) => {
    try {
      watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename) return

        const fullPath = join(dir, filename)
        const justFilename = filename.split('/').pop() || filename

        // Only watch .mdx files (skip .md - they may be generated output)
        if (!filename.endsWith('.mdx')) return

        // Skip hidden files and node_modules
        if (filename.startsWith('.') || filename.includes('node_modules')) return

        // Handle type definition files separately
        if (isTypeDefinition(justFilename)) {
          // Debounce type definition changes
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(async () => {
            console.log(`   🔄 Type definition changed: ${justFilename}`)
            // Reload all type definitions
            typeDefinitions.clear()
            await loadTypeDefinitions(contentPath)

            // Re-sync all instance files to apply new type template
            const typeName = extractTypeName(justFilename)
            if (typeName) {
              const files = findMdxFiles(contentPath)
              const instanceFiles = files.filter(f => {
                const fname = f.split('/').pop() || ''
                if (isTypeDefinition(fname)) return false
                // Check if this file uses the changed type
                const parsed = parseDocument(f, contentPath)
                if (!parsed) return false
                const type = parsed.document.type || inferTypeFromPath(parsed.id)
                return type === typeName
              })

              if (instanceFiles.length > 0) {
                console.log(`   🔄 Re-syncing ${instanceFiles.length} ${typeName} instance(s)...`)
                for (const file of instanceFiles) {
                  await syncFile(file, contentPath, options)
                }
              }
            }
          }, 100)
          return
        }

        pendingFiles.add(fullPath)

        // Debounce: wait 100ms after last change before syncing
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
          const files = Array.from(pendingFiles)
          pendingFiles.clear()

          for (const file of files) {
            if (existsSync(file)) {
              await syncFile(file, contentPath, options)
            } else {
              await deleteFile(file, contentPath, options)
            }
          }
        }, 100)
      })
    } catch (err) {
      console.error(`⚠️  Failed to watch ${dir}:`, err)
    }
  }

  watchDir(contentPath)

  // Also watch .md files for bi-directional sync
  const namespace = options.name || inferNamespace()
  watchMdFiles(contentPath, options, namespace)
  console.log(`   📝 Bi-directional sync enabled: edit .md files to update .mdx sources`)
}

/** Sync all files in content directory */
async function syncAllFiles(options: CliOptions): Promise<void> {
  const contentPath = resolve(options.path)
  const files = findMdxFiles(contentPath)

  if (files.length === 0) {
    console.log('   No MDX files found yet')
    return
  }

  // First, load type definitions from [TypeName].mdx files
  console.log('   Loading type definitions...')
  await loadTypeDefinitions(contentPath)

  // Filter out type definition files from regular sync
  const instanceFiles = files.filter(file => {
    const filename = file.split('/').pop() || ''
    return !isTypeDefinition(filename)
  })

  if (instanceFiles.length === 0) {
    console.log('   No instance files to sync (only type definitions)')
    return
  }

  console.log(`   Syncing ${instanceFiles.length} file(s)...`)

  let synced = 0
  for (const file of instanceFiles) {
    try {
      await syncFile(file, contentPath, options)
      synced++
    } catch (err) {
      console.error(`   ❌ Failed to sync ${file}:`, err)
    }
  }

  console.log(`   ✅ Synced ${synced} file(s)`)
}

/** Sync a single file to ClickHouse */
async function syncFile(filePath: string, basePath: string, options: CliOptions): Promise<void> {
  const parsed = parseDocument(filePath, basePath)
  if (!parsed) return

  const { id, document } = parsed
  const url = `http://localhost:${options.httpPort}`

  // Infer type from path or frontmatter (type can be string or array)
  const docType = document.type
  const type = (Array.isArray(docType) ? docType[0] : docType) || inferTypeFromPath(id)

  // Infer namespace from current directory name or use default
  const ns = options.name || inferNamespace()

  // Get type definition if available
  const typedef = getTypeDefinition(type)

  // Merge schema defaults from type definition, remove $ fields
  const mergedData = typedef
    ? { ...typedef.schema, ...document.data }
    : document.data || {}
  const data = Object.fromEntries(
    Object.entries(mergedData).filter(([key]) => !key.startsWith('$'))
  )

  const thing = { ns, type, id, data, content: document.content || '' }

  // Insert into Things table
  const query = `INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow`

  try {
    const response = await fetch(`${url}/?database=mdxdb&query=${encodeURIComponent(query)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thing),
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    if (options.verbose) {
      console.log(`   📄 ${id} (${type})`)
    }

    // Generate .md file if type definition enables it
    if (typedef && typedef.generateMarkdown) {
      await generateMarkdownFile(filePath, document, typedef, options, ns)
    }

    // Re-render any files that depend on this type (reactive updates)
    // e.g., if a Post changes, re-render Topic pages that have <List type="Post" />
    await reRenderDependentFiles(type, basePath, options, ns)
  } catch (err) {
    console.error(`   ❌ ${id}: ${err}`)
  }
}

/** Delete a file from ClickHouse */
async function deleteFile(filePath: string, basePath: string, options: CliOptions): Promise<void> {
  const relativePath = relative(basePath, filePath)
  const id = relativePath
    .replace(/\.(mdx|md)$/, '')
    .replace(/\\/g, '/')
    .replace(/\/index$/, '')
    .replace(/^\//, '')

  const ns = options.name || inferNamespace()
  const url = `http://localhost:${options.httpPort}`

  // Mark as deleted (soft delete via event field)
  const query = `ALTER TABLE Things UPDATE event = 'deleted' WHERE ns = '${ns}' AND id = '${id}'`

  try {
    await executeQuery(url, query, 'mdxdb')
    if (options.verbose) {
      console.log(`   🗑️  ${id}`)
    }
  } catch {
    // Ignore errors for delete
  }
}

/** Infer type from file path */
function inferTypeFromPath(id: string): string {
  const parts = id.split('/')
  if (parts.length >= 2) {
    // posts/hello -> Post
    const folder = parts[0] ?? 'Document'
    // Capitalize and singularize (simple: remove trailing 's')
    const singular = folder.endsWith('s') ? folder.slice(0, -1) : folder
    return singular.charAt(0).toUpperCase() + singular.slice(1)
  }
  return 'Document'
}

/** Infer namespace from current directory */
function inferNamespace(): string {
  const cwd = process.cwd()
  const parts = cwd.split('/')
  return parts[parts.length - 1] || 'local'
}

// =============================================================================
// Type Definition Files - [TypeName].mdx Convention
// =============================================================================

/**
 * Check if a file is a type definition file (e.g., [Post].mdx, [Author].mdx)
 */
function isTypeDefinition(filename: string): boolean {
  return /^\[.+\]\.mdx?$/.test(filename)
}

/**
 * Extract type name from a type definition filename
 * e.g., "[Post].mdx" -> "Post"
 */
function extractTypeName(filename: string): string | null {
  const match = filename.match(/^\[(.+)\]\.mdx?$/)
  return match ? match[1] ?? null : null
}

/**
 * Type definition structure parsed from [TypeName].mdx files
 */
interface TypeDefinition {
  /** Type name (e.g., "Post", "Author") */
  name: string
  /** Schema/fields from frontmatter */
  schema: Record<string, unknown>
  /** Relationships to other types */
  relationships: Array<{
    field: string
    target: string
    type: 'one' | 'many'
    reverse?: string
  }>
  /** Template content for rendering instances */
  template: string
  /** Whether to generate .md files for instances */
  generateMarkdown: boolean
  /** File path patterns for instances */
  pathPattern?: string
}

/** Registry of loaded type definitions */
const typeDefinitions = new Map<string, TypeDefinition>()

/** Registry mapping .md files to their source .mdx files for bi-directional sync */
const mdToMdxMap = new Map<string, string>()

/**
 * Dependency tracking for reactive re-rendering
 * Maps type names to the .mdx files that reference them via components
 */
const typeDependencies = new Map<string, Set<string>>()

/**
 * Register a dependency: mdxFile depends on typeName
 * Used to know which files to re-render when a type's data changes
 */
function registerDependency(mdxFile: string, typeName: string): void {
  if (!typeDependencies.has(typeName)) {
    typeDependencies.set(typeName, new Set())
  }
  typeDependencies.get(typeName)!.add(mdxFile)
}

/**
 * Get all .mdx files that depend on a given type
 */
function getDependentFiles(typeName: string): string[] {
  return Array.from(typeDependencies.get(typeName) || [])
}

/**
 * Convert component name to type name
 * e.g., "Posts" -> "Post", "Categories" -> "Category", "People" -> "Person"
 */
function componentNameToType(name: string): string {
  // Handle common irregular plurals
  const irregulars: Record<string, string> = {
    'People': 'Person',
    'Children': 'Child',
    'Men': 'Man',
    'Women': 'Woman',
    'Mice': 'Mouse',
    'Geese': 'Goose',
    'Teeth': 'Tooth',
    'Feet': 'Foot',
    'Categories': 'Category',
    'Stories': 'Story',
    'Replies': 'Reply',
    'Entries': 'Entry',
  }

  if (irregulars[name]) {
    return irregulars[name]
  }

  // Regular plurals: remove trailing 's' or 'es'
  if (name.endsWith('ies')) {
    return name.slice(0, -3) + 'y'
  }
  if (name.endsWith('es')) {
    return name.slice(0, -2)
  }
  if (name.endsWith('s')) {
    return name.slice(0, -1)
  }

  return name
}

/**
 * Extract type dependencies from a template (find <List type="X">, <Table type="X">, <Posts />, etc.)
 */
function extractTypeDependencies(template: string): string[] {
  const types: string[] = []
  const components = parseComponents(template)

  for (const comp of components) {
    if (comp.props.type) {
      // Explicit type prop: <List type="Post" />
      types.push(comp.props.type)
    } else if (comp.name !== 'Table' && comp.name !== 'List' && comp.name !== 'Related') {
      // Relationship component: <Posts /> -> depends on "Post" type
      const typeName = componentNameToType(comp.name)
      types.push(typeName)
    }
  }

  return [...new Set(types)]
}

// =============================================================================
// Component Rendering System
// =============================================================================

/**
 * Parse JSX component tags from template
 * Supports: <ComponentName prop="value" /> and <ComponentName prop={expr}>content</ComponentName>
 */
function parseComponents(template: string): Array<{
  raw: string
  name: string
  props: Record<string, string>
  start: number
  end: number
}> {
  const components: Array<{
    raw: string
    name: string
    props: Record<string, string>
    start: number
    end: number
  }> = []

  // Self-closing components: <ComponentName prop="value" />
  const selfClosingRegex = /<([A-Z]\w*)\s*([^>]*)\/>/g
  let match

  while ((match = selfClosingRegex.exec(template)) !== null) {
    const name = match[1]!
    const propsStr = match[2] || ''
    const props: Record<string, string> = {}

    // Parse props: prop="value" or prop={expr}
    const propRegex = /(\w+)=(?:"([^"]*)"|{([^}]+)})/g
    let propMatch
    while ((propMatch = propRegex.exec(propsStr)) !== null) {
      props[propMatch[1]!] = propMatch[2] || propMatch[3] || ''
    }

    components.push({
      raw: match[0],
      name,
      props,
      start: match.index,
      end: match.index + match[0].length
    })
  }

  return components
}

/**
 * Get the display name field for a row (title, name, or id)
 */
function getDisplayName(row: Record<string, unknown>, data?: Record<string, unknown>): string {
  const d = data || (row.data as Record<string, unknown>) || {}
  return String(d.title || d.name || row.title || row.name || row.id || '')
}

/**
 * Format a field value for display, with special handling for links
 */
function formatFieldValue(
  field: string,
  value: unknown,
  row: Record<string, unknown>,
  isFirstColumn: boolean
): string {
  const strValue = String(value ?? '')

  // First column (name/title) should be a relative link to the item
  if (isFirstColumn && row.id) {
    const id = String(row.id)
    // Create relative markdown link
    return `[${strValue}](${id}.md)`
  }

  // Arrays render as comma-separated
  if (Array.isArray(value)) {
    return value.map(v => String(v)).join(', ')
  }

  return strValue
}

/**
 * Smart field ordering: name/title first, id last, others in between
 */
function orderFields(fields: string[]): string[] {
  const priority = ['title', 'name', 'date', 'author', 'description', 'tags', 'category']
  const lowPriority = ['id', 'type', 'ns', 'content']

  return [...fields].sort((a, b) => {
    const aIdx = priority.indexOf(a)
    const bIdx = priority.indexOf(b)
    const aLow = lowPriority.indexOf(a)
    const bLow = lowPriority.indexOf(b)

    // Priority fields come first
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1

    // Low priority fields come last
    if (aLow !== -1 && bLow !== -1) return aLow - bLow
    if (aLow !== -1) return 1
    if (bLow !== -1) return -1

    return 0
  })
}

/**
 * Built-in component: Render a table of items from the database
 * - Single result: vertical name/value table
 * - Multiple results: horizontal table with fields as columns
 * Usage: <Table type="Post" fields="title,date,author" where="type='Post'" limit="10" />
 */
async function renderTableComponent(
  props: Record<string, string>,
  clickhouseUrl: string,
  namespace: string
): Promise<string> {
  const type = props.type || ''
  const fieldsStr = props.fields || 'title,name,date,author,tags'
  const requestedFields = fieldsStr.split(',').map(f => f.trim())
  const where = props.where || (type ? `type = '${type}'` : '1=1')
  const limit = props.limit || '100'
  const orderBy = props.orderBy || 'ts DESC'

  // Always fetch id for linking
  const fields = ['id', ...requestedFields.filter(f => f !== 'id')]

  // Build query
  const selectFields = fields.map(f => {
    if (f === 'id' || f === 'type' || f === 'ns' || f === 'content') {
      return f
    }
    // For data fields, extract from JSON
    return `data.${f} as ${f}`
  }).join(', ')

  const query = `SELECT ${selectFields} FROM Things WHERE ns = '${namespace}' AND ${where} ORDER BY ${orderBy} LIMIT ${limit} FORMAT JSON`

  try {
    const result = await executeQuery(clickhouseUrl, query, 'mdxdb')
    const json = JSON.parse(result)
    const rows = json.data || []

    if (rows.length === 0) {
      return `*No ${type || 'items'} found.*\n`
    }

    // Single result: render as vertical name/value table
    if (rows.length === 1) {
      const row = rows[0] as Record<string, unknown>
      const displayFields = orderFields(requestedFields)

      const lines = ['| Property | Value |', '| --- | --- |']
      for (const field of displayFields) {
        const value = row[field]
        if (value !== undefined && value !== null && value !== '') {
          const formatted = formatFieldValue(field, value, row, field === displayFields[0])
          lines.push(`| **${field}** | ${formatted} |`)
        }
      }

      return lines.join('\n') + '\n'
    }

    // Multiple results: render as horizontal table
    const displayFields = orderFields(requestedFields)
    const header = `| ${displayFields.join(' | ')} |`
    const separator = `| ${displayFields.map(() => '---').join(' | ')} |`

    const dataRows = rows.map((row: Record<string, unknown>) => {
      const cells = displayFields.map((f, i) => {
        const value = row[f]
        return formatFieldValue(f, value, row, i === 0)
      })
      return `| ${cells.join(' | ')} |`
    }).join('\n')

    return `${header}\n${separator}\n${dataRows}\n`
  } catch (err) {
    return `*Error loading ${type || 'items'}: ${err}*\n`
  }
}

/**
 * Built-in component: Render a list of items from the database
 * Usage: <List type="Post" format="- [{title}]({id})" />
 */
async function renderListComponent(
  props: Record<string, string>,
  clickhouseUrl: string,
  namespace: string
): Promise<string> {
  const type = props.type || ''
  const format = props.format || '- {id}'
  const where = props.where || (type ? `type = '${type}'` : '1=1')
  const limit = props.limit || '100'
  const orderBy = props.orderBy || 'id'

  const query = `SELECT id, type, data FROM Things WHERE ns = '${namespace}' AND ${where} ORDER BY ${orderBy} LIMIT ${limit} FORMAT JSON`

  try {
    const result = await executeQuery(clickhouseUrl, query, 'mdxdb')
    const json = JSON.parse(result)
    const rows = json.data || []

    if (rows.length === 0) {
      return `*No ${type || 'items'} found.*\n`
    }

    // Render each item using the format string
    const items = rows.map((row: Record<string, unknown>) => {
      let line = format
      // Replace {field} placeholders with values
      line = line.replace(/\{(\w+)\}/g, (_, field) => {
        if (field === 'id' || field === 'type') {
          return String(row[field] ?? '')
        }
        // Look in data object
        const data = (row.data || {}) as Record<string, unknown>
        return String(data[field] ?? row[field] ?? '')
      })
      return line
    }).join('\n')

    return `${items}\n`
  } catch (err) {
    return `*Error loading ${type || 'items'}: ${err}*\n`
  }
}

/**
 * Built-in component: Render related items via relationship
 * Usage: <Related field="posts" format="table" />
 */
async function renderRelatedComponent(
  props: Record<string, string>,
  data: Record<string, unknown>,
  clickhouseUrl: string,
  namespace: string,
  typedef: TypeDefinition
): Promise<string> {
  const field = props.field || ''
  const format = props.format || 'list'

  // Find the relationship definition
  const rel = typedef.relationships.find(r => r.field === field)
  if (!rel) {
    return `*Unknown relationship: ${field}*\n`
  }

  // Build query based on relationship type
  const currentId = data.id || ''
  let where: string

  if (rel.type === 'many') {
    // One-to-many: find items where the reverse field references this item
    where = `type = '${rel.target}' AND data.${rel.reverse || field} = '${currentId}'`
  } else {
    // Many-to-one: find the single related item
    const relatedId = data[field]
    where = `type = '${rel.target}' AND id = '${relatedId}'`
  }

  if (format === 'table') {
    return renderTableComponent({ ...props, type: rel.target, where }, clickhouseUrl, namespace)
  } else {
    return renderListComponent({ ...props, type: rel.target, where }, clickhouseUrl, namespace)
  }
}

/**
 * Render a relationship-based component
 * e.g., <Posts /> in a [Topic].mdx template renders all Posts tagged with this Topic
 */
async function renderRelationshipComponent(
  componentName: string,
  props: Record<string, string>,
  doc: ReturnType<typeof parse>,
  typedef: TypeDefinition,
  clickhouseUrl: string,
  namespace: string
): Promise<string> {
  const data = doc.data || {}
  const currentId = data.id || doc.id || ''
  const currentType = typedef.name

  // Convert component name to field name and type
  // <Posts /> -> field: "posts", type: "Post"
  const fieldName = componentName.charAt(0).toLowerCase() + componentName.slice(1)
  const targetType = componentNameToType(componentName)

  // Check if there's an explicit relationship defined
  const rel = typedef.relationships.find(r => r.field === fieldName)

  // Determine the fields to show (from props or auto-detect from target type)
  const targetTypeDef = typeDefinitions.get(targetType)
  const defaultFields = targetTypeDef
    ? Object.keys(targetTypeDef.schema).filter(k => !k.startsWith('$')).slice(0, 5)
    : ['id', 'title', 'name']
  const fields = props.fields?.split(',').map(f => f.trim()) || ['id', ...defaultFields.filter(f => f !== 'id')]

  // Build the query based on relationship type
  let where: string

  if (rel) {
    // Use explicit relationship definition
    if (rel.type === 'many') {
      // Posts have a reference back to this item (e.g., post.topic = this topic's id)
      // Or posts have this item in an array field (e.g., post.tags contains this topic's id)
      const reverseField = rel.reverse || currentType.toLowerCase()
      where = `type = '${targetType}' AND (data.${reverseField} = '${currentId}' OR arrayExists(x -> x = '${currentId}', JSONExtract(data, '${reverseField}', 'Array(String)')))`
    } else {
      // Single related item
      const relatedId = data[fieldName]
      where = `type = '${targetType}' AND id = '${relatedId}'`
    }
  } else {
    // Infer relationship: look for items of targetType that reference this item
    // Check common patterns: tags, categories, topics, author, etc.
    const possibleReverseFields = [
      currentType.toLowerCase(),                    // e.g., topic
      currentType.toLowerCase() + 's',              // e.g., topics (array)
      'tags',                                       // common for posts
      'categories',                                 // common for posts
      fieldName.slice(0, -1),                       // e.g., posts -> post
    ]

    const conditions = possibleReverseFields.map(field =>
      `data.${field} = '${currentId}' OR arrayExists(x -> x = '${currentId}', JSONExtract(data, '${field}', 'Array(String)'))`
    ).join(' OR ')

    where = `type = '${targetType}' AND (${conditions})`
  }

  // Render as table by default (cleaner for markdown)
  const format = props.format || 'table'

  if (format === 'list') {
    const listFormat = props.listFormat || `- [{title}]({id})`
    return renderListComponent({ type: targetType, where, format: listFormat, ...props }, clickhouseUrl, namespace)
  }

  return renderTableComponent({ type: targetType, where, fields: fields.join(','), ...props }, clickhouseUrl, namespace)
}

/**
 * Render all components in a template
 */
async function renderComponents(
  template: string,
  doc: ReturnType<typeof parse>,
  typedef: TypeDefinition,
  clickhouseUrl: string,
  namespace: string
): Promise<string> {
  const components = parseComponents(template)

  // Sort by position descending so we can replace from end to start
  components.sort((a, b) => b.start - a.start)

  let result = template
  const data = doc.data || {}

  for (const comp of components) {
    let rendered = ''

    switch (comp.name) {
      case 'Table':
        rendered = await renderTableComponent(comp.props, clickhouseUrl, namespace)
        break
      case 'List':
        rendered = await renderListComponent(comp.props, clickhouseUrl, namespace)
        break
      case 'Related':
        rendered = await renderRelatedComponent(comp.props, data, clickhouseUrl, namespace, typedef)
        break
      default:
        // Try to render as a relationship-based component
        // e.g., <Posts /> renders all posts related to this document
        rendered = await renderRelationshipComponent(comp.name, comp.props, doc, typedef, clickhouseUrl, namespace)
    }

    result = result.slice(0, comp.start) + rendered + result.slice(comp.end)
  }

  return result
}

/**
 * Load type definitions from [TypeName].mdx files
 */
async function loadTypeDefinitions(contentPath: string): Promise<void> {
  const files = findMdxFiles(contentPath)

  for (const file of files) {
    const filename = file.split('/').pop() || ''

    if (isTypeDefinition(filename)) {
      const typeName = extractTypeName(filename)
      if (!typeName) continue

      try {
        const content = readFileSync(file, 'utf-8')
        const doc = parse(content)

        const typedef: TypeDefinition = {
          name: typeName,
          schema: doc.data || {},
          relationships: parseRelationships(doc.data || {}),
          template: doc.content || '',
          generateMarkdown: doc.data?.$generateMarkdown !== false,
          pathPattern: doc.data?.$path as string | undefined,
        }

        typeDefinitions.set(typeName, typedef)
        console.log(`   📐 Loaded type: ${typeName}`)
      } catch (err) {
        console.error(`   ❌ Failed to load type ${typeName}:`, err)
      }
    }
  }
}

/**
 * Parse relationship definitions from frontmatter
 * Relationships are fields ending with a type reference like "Author.posts"
 */
function parseRelationships(data: Record<string, unknown>): TypeDefinition['relationships'] {
  const relationships: TypeDefinition['relationships'] = []

  for (const [field, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.includes('.')) {
      const [target, reverse] = value.split('.')
      if (target) {
        relationships.push({
          field,
          target,
          type: field.endsWith('s') ? 'many' : 'one',
          reverse,
        })
      }
    }
  }

  return relationships
}

/**
 * Get the type definition for a document
 */
function getTypeDefinition(typeName: string): TypeDefinition | undefined {
  return typeDefinitions.get(typeName)
}

/**
 * Render a document instance using its type template
 * Now async to support component rendering that queries the database
 */
async function renderInstance(
  doc: ReturnType<typeof parse>,
  typedef: TypeDefinition,
  clickhouseUrl: string,
  namespace: string
): Promise<string> {
  let rendered = typedef.template

  // Replace {data.field} placeholders with actual values
  const data = doc.data || {}
  rendered = rendered.replace(/\{data\.(\w+)\}/g, (_, field) => {
    return String(data[field] ?? '')
  })

  // Replace {content} with the document content
  rendered = rendered.replace(/\{content\}/g, doc.content || '')

  // Render any components (Table, List, Related, etc.)
  rendered = await renderComponents(rendered, doc, typedef, clickhouseUrl, namespace)

  return rendered
}

/**
 * Generate a markdown file from an MDX instance
 */
async function generateMarkdownFile(
  filePath: string,
  doc: ReturnType<typeof parse>,
  typedef: TypeDefinition,
  options: CliOptions,
  namespace: string
): Promise<void> {
  if (!typedef.generateMarkdown) return

  const mdPath = filePath.replace(/\.mdx$/, '.md')
  const clickhouseUrl = `http://localhost:${options.httpPort}`
  const rendered = await renderInstance(doc, typedef, clickhouseUrl, namespace)

  // Register type dependencies for reactive re-rendering
  const dependencies = extractTypeDependencies(typedef.template)
  for (const typeName of dependencies) {
    registerDependency(filePath, typeName)
  }

  try {
    // Mark file as being written to prevent infinite loop with .md watcher
    mdFilesBeingWritten.add(mdPath)

    writeFileSync(mdPath, rendered, 'utf-8')
    // Track the mapping for bi-directional sync
    mdToMdxMap.set(mdPath, filePath)
    if (options.verbose) {
      console.log(`   📝 Generated: ${mdPath}`)
    }

    // Remove from "being written" set after a delay to allow fs events to settle
    setTimeout(() => {
      mdFilesBeingWritten.delete(mdPath)
    }, 1000)
  } catch (err) {
    mdFilesBeingWritten.delete(mdPath)
    console.error(`   ❌ Failed to generate ${mdPath}:`, err)
  }
}

/**
 * Re-render all .md files that depend on a given type
 * Called when a document of that type is created/updated
 */
async function reRenderDependentFiles(
  typeName: string,
  basePath: string,
  options: CliOptions,
  namespace: string
): Promise<void> {
  const dependentFiles = getDependentFiles(typeName)

  if (dependentFiles.length === 0) return

  if (options.verbose) {
    console.log(`   🔄 Re-rendering ${dependentFiles.length} file(s) that depend on ${typeName}`)
  }

  for (const mdxFile of dependentFiles) {
    try {
      // Re-read and re-render the file
      const content = readFileSync(mdxFile, 'utf-8')
      const doc = parse(content)

      // Get type from document
      const docType = doc.type
      const type = Array.isArray(docType) ? docType[0] : docType
      if (!type) continue

      const typedef = getTypeDefinition(type)
      if (!typedef || !typedef.generateMarkdown) continue

      await generateMarkdownFile(mdxFile, doc, typedef, options, namespace)
    } catch (err) {
      if (options.verbose) {
        console.error(`   ⚠️  Failed to re-render ${mdxFile}:`, err)
      }
    }
  }
}

// =============================================================================
// Bi-directional Sync: .md → .mdx
// =============================================================================

/**
 * Extract changes from an edited .md file and sync back to the .mdx source
 */
async function syncMdToMdx(
  mdPath: string,
  options: CliOptions,
  namespace: string
): Promise<void> {
  const mdxPath = mdToMdxMap.get(mdPath)
  if (!mdxPath) {
    if (options.verbose) {
      console.log(`   ⚠️ No source .mdx found for: ${mdPath}`)
    }
    return
  }

  try {
    // Read both files
    const mdContent = readFileSync(mdPath, 'utf-8')
    const mdxContent = readFileSync(mdxPath, 'utf-8')
    const doc = parse(mdxContent)

    // Get the type definition for this document
    const docType = doc.type
    const typeName = Array.isArray(docType) ? docType[0] : docType
    const typedef = typeName ? getTypeDefinition(typeName) : undefined

    if (!typedef) {
      if (options.verbose) {
        console.log(`   ⚠️ No type definition for: ${mdxPath}`)
      }
      return
    }

    // Use @mdxld/extract to extract changes from the edited .md
    const extractResult: ExtractResult = extract({
      template: typedef.template,
      rendered: mdContent
    })

    if (extractResult.confidence < 0.5) {
      console.log(`   ⚠️ Low extraction confidence (${extractResult.confidence.toFixed(2)}) for: ${mdPath}`)
      return
    }

    // Merge extracted data back into the document
    const updatedData = { ...doc.data }
    for (const [key, value] of Object.entries(extractResult.data as Record<string, unknown>)) {
      // Handle nested paths like 'data.title'
      if (key === 'data' && typeof value === 'object' && value !== null) {
        Object.assign(updatedData, value)
      } else if (key === 'content') {
        doc.content = String(value)
      } else if (!key.startsWith('$')) {
        updatedData[key] = value
      }
    }

    // Stringify back to MDX format
    const updatedMdx = stringify({
      ...doc,
      data: updatedData
    })

    // Write the updated .mdx file
    writeFileSync(mdxPath, updatedMdx, 'utf-8')
    console.log(`   🔄 Synced changes from ${mdPath} → ${mdxPath}`)

    // Re-sync to ClickHouse (get the content base path from the mdx path)
    const contentPath = dirname(mdxPath).replace(/\/[^/]+$/, '') || dirname(mdxPath)
    await syncFile(mdxPath, contentPath, options)

  } catch (err) {
    console.error(`   ❌ Failed to sync ${mdPath}:`, err)
  }
}

/**
 * Watch .md files for changes and sync back to .mdx
 */
function watchMdFiles(
  contentPath: string,
  options: CliOptions,
  namespace: string
): void {
  // Use recursive watch on the content directory
  const watcher = watch(contentPath, { recursive: true }, async (eventType, filename) => {
    if (!filename) return
    if (!filename.endsWith('.md')) return
    if (filename.endsWith('.mdx')) return // Skip .mdx files

    const fullPath = join(contentPath, filename)
    if (!existsSync(fullPath)) return // File was deleted

    // Skip files we're currently writing (prevents infinite loop)
    if (mdFilesBeingWritten.has(fullPath)) {
      if (options.verbose) {
        console.log(`   ⏭️  Skipping .md (system-generated): ${filename}`)
      }
      return
    }

    // Debounce to avoid processing the same file multiple times
    const debounceKey = `md:${fullPath}`
    if (mdDebounceTimers.has(debounceKey)) {
      clearTimeout(mdDebounceTimers.get(debounceKey))
    }

    mdDebounceTimers.set(debounceKey, setTimeout(async () => {
      mdDebounceTimers.delete(debounceKey)
      // Double-check the file isn't being written (in case it was added during debounce)
      if (mdFilesBeingWritten.has(fullPath)) {
        return
      }
      if (options.verbose) {
        console.log(`   📄 .md changed (user edit): ${filename}`)
      }
      await syncMdToMdx(fullPath, options, namespace)
    }, 500))
  })

  // Store the watcher for cleanup
  mdWatcher = watcher
}

/** Debounce timers for .md file changes */
const mdDebounceTimers = new Map<string, NodeJS.Timeout>()

/** Reference to the .md file watcher */
let mdWatcher: ReturnType<typeof watch> | null = null

/**
 * Set of .md file paths that we're currently writing
 * Used to prevent infinite loops: when we write a .md file, the watcher sees it,
 * but we should skip syncing because we just wrote it ourselves
 */
const mdFilesBeingWritten = new Set<string>()

/** Run Studio mode - lightweight editor without ClickHouse */
async function runStudio(options: CliOptions): Promise<void> {
  console.log('🎨 mdxdb studio\n')

  const resolvedPath = resolve(options.path)
  console.log(`📁 Content: ${resolvedPath}`)
  console.log(`🌐 Studio:  http://localhost:${options.studioPort}\n`)

  try {
    // Dynamic import to avoid bundling issues
    const { startStudio } = await import('@mdxdb/studio/server')

    const server = await startStudio({
      contentDir: resolvedPath,
      port: options.studioPort,
      host: 'localhost',
    })

    console.log('\n✨ Studio ready! Press Ctrl+C to stop.\n')

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...')
      await server.stop()
      process.exit(0)
    })

    // Keep alive
    await new Promise(() => {})
  } catch (error) {
    console.error('❌ Failed to start studio:', error)
    console.log('\n💡 Make sure @mdxdb/studio is installed:')
    console.log('   pnpm add @mdxdb/studio')
    process.exit(1)
  }
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  switch (options.command) {
    case 'dev':
      await runDev(options)
      break
    case 'studio':
      await runStudio(options)
      break
    case 'server':
      await runServer(options)
      break
    case 'client':
      await runClient(options)
      break
    case 'publish':
      await runPublish(options)
      break
    case 'version':
      console.log(`mdxdb version ${VERSION}`)
      break
    case 'help':
    default:
      console.log(HELP_TEXT)
      break
  }
}

// Only run CLI when executed directly (not when imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('/cli.js') ||
  process.argv[1]?.endsWith('/mdxdb')

if (isMainModule) {
  main().catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
}
