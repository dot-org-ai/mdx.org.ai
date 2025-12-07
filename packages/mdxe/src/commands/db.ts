/**
 * Database Commands for mdxe CLI
 *
 * Provides local development environment with ClickHouse, content sync, and publishing.
 * Previously in mdxdb package, now part of mdxe.
 *
 * @packageDocumentation
 */

import { ensureLoggedIn } from 'oauth.do'
import { resolve, dirname } from 'node:path'
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, watch } from 'node:fs'
import { join, relative } from 'node:path'
import { spawn, execSync, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { parse, stringify } from 'mdxld'
import { homedir } from 'node:os'

export interface DbCliOptions {
  command: 'dev' | 'publish' | 'server' | 'client' | 'studio'
  path: string
  name?: string
  baseUrl: string
  clickhouseUrl?: string
  port: number
  httpPort: number
  studioPort: number
  dryRun: boolean
  verbose: boolean
  useClickhouse: boolean
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

  mkdirSync(dir, { recursive: true })

  try {
    execSync('curl -fsSL https://clickhouse.com/ | sh', {
      cwd: dir,
      stdio: 'inherit',
    })

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
async function startServer(options: DbCliOptions): Promise<ChildProcess> {
  const binary = await ensureClickHouse()
  const dataDir = getDataDir()

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
    '--logger.level=warning',
    '--logger.console=1',
  ]

  serverProcess = spawn(binary, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  await waitForServer(options.httpPort)
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
async function initializeSchema(options: DbCliOptions): Promise<void> {
  const url = `http://localhost:${options.httpPort}`

  await executeQuery(url, 'CREATE DATABASE IF NOT EXISTS mdxdb')

  try {
    const { TABLE_SCHEMAS, TABLES } = await import('@mdxdb/clickhouse/schema')

    for (const table of TABLES) {
      const schema = TABLE_SCHEMAS[table]
      if (schema) {
        await executeQuery(url, schema, 'mdxdb')
      }
    }
    console.log('✅ Database schema initialized')
  } catch {
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

// =============================================================================
// File Operations
// =============================================================================

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
      if (!entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...findMdxFiles(fullPath, relativePath))
      }
    } else if (entry.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }

  return files
}

function parseDocument(filePath: string, basePath: string): { id: string; document: ReturnType<typeof parse> } | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const document = parse(content)

    const relativePath = relative(basePath, filePath)
    const id = relativePath
      .replace(/\.(mdx|md)$/, '')
      .replace(/\\/g, '/')
      .replace(/\/index$/, '')
      .replace(/^\//, '')

    return { id, document }
  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error)
    return null
  }
}

// =============================================================================
// Publish Command
// =============================================================================

export async function runPublish(options: DbCliOptions): Promise<void> {
  console.log('📤 mdxe db:publish\n')

  const resolvedPath = resolve(options.path)
  console.log(`📁 Path: ${resolvedPath}`)

  if (!existsSync(resolvedPath)) {
    console.error(`❌ Path does not exist: ${resolvedPath}`)
    process.exit(1)
  }

  const files = findMdxFiles(resolvedPath)

  if (files.length === 0) {
    console.log('⚠️  No MDX files found')
    return
  }

  console.log(`📋 Found ${files.length} file(s)`)

  if (options.dryRun) {
    console.log('\n🔬 Dry run mode - no changes will be made\n')
  }

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

  const docsPayload = documents.map(({ id, document }) => ({
    id,
    type: document.type ?? undefined,
    context: document.context ?? undefined,
    data: document.data,
    content: document.content,
  }))

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
// Dev Mode
// =============================================================================

let editorProcess: ChildProcess | null = null

function inferNamespace(): string {
  const cwd = process.cwd()
  const parts = cwd.split('/')
  return parts[parts.length - 1] || 'local'
}

function findEditorPackage(): string | null {
  const locations = [
    join(process.cwd(), 'packages', '@mdxui', 'editor'),
    join(process.cwd(), '..', '@mdxui', 'editor'),
    join(process.cwd(), '..', '..', 'packages', '@mdxui', 'editor'),
    join(process.cwd(), 'node_modules', '@mdxui', 'editor'),
  ]

  for (const loc of locations) {
    if (existsSync(join(loc, 'package.json'))) {
      return loc
    }
  }

  try {
    const resolved = require.resolve('@mdxui/editor/package.json')
    return dirname(resolved)
  } catch {
    return null
  }
}

async function startWebUI(options: DbCliOptions): Promise<Server | ChildProcess> {
  const editorPath = findEditorPackage()
  const ns = options.name || inferNamespace()

  if (editorPath) {
    console.log(`📝 Starting @mdxui/editor...`)

    const env = {
      ...process.env,
      CLICKHOUSE_URL: `http://localhost:${options.httpPort}`,
      CLICKHOUSE_DATABASE: 'mdxdb',
      MDXDB_NAMESPACE: ns,
      MDXDB_NAME: ns,
      PORT: String(options.port),
    }

    editorProcess = spawn('npm', ['run', 'dev', '--', '--port', String(options.port)], {
      cwd: editorPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    await waitForEditor(options.port)

    editorProcess.stdout?.on('data', (data) => {
      if (options.verbose) {
        process.stdout.write(`[editor] ${data}`)
      }
    })

    editorProcess.stderr?.on('data', (data) => {
      const msg = data.toString()
      if (options.verbose && !msg.includes('Compiling') && !msg.includes('compiled')) {
        process.stderr.write(`[editor] ${data}`)
      }
    })

    return editorProcess
  }

  console.log(`📝 Using embedded UI (install @mdxui/editor for full editor)`)

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${options.port}`)

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

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>mdxe db</title>
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
  <h1>mdxe db</h1>
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

async function waitForEditor(port: number, timeout = 60000): Promise<void> {
  const start = Date.now()
  const url = `http://localhost:${port}`

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 404) {
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

// Type definitions support
const typeDefinitions = new Map<string, TypeDefinition>()
const mdToMdxMap = new Map<string, string>()
const typeDependencies = new Map<string, Set<string>>()
const mdFilesBeingWritten = new Set<string>()
const mdDebounceTimers = new Map<string, NodeJS.Timeout>()
let mdWatcher: ReturnType<typeof watch> | null = null

interface TypeDefinition {
  name: string
  schema: Record<string, unknown>
  relationships: Array<{
    field: string
    target: string
    type: 'one' | 'many'
    reverse?: string
  }>
  template: string
  generateMarkdown: boolean
  pathPattern?: string
}

function isTypeDefinition(filename: string): boolean {
  return /^\[.+\]\.mdx?$/.test(filename)
}

function extractTypeName(filename: string): string | null {
  const match = filename.match(/^\[(.+)\]\.mdx?$/)
  return match ? match[1] ?? null : null
}

function inferTypeFromPath(id: string): string {
  const parts = id.split('/')
  if (parts.length >= 2) {
    const folder = parts[0] ?? 'Document'
    const singular = folder.endsWith('s') ? folder.slice(0, -1) : folder
    return singular.charAt(0).toUpperCase() + singular.slice(1)
  }
  return 'Document'
}

function getTypeDefinition(typeName: string): TypeDefinition | undefined {
  return typeDefinitions.get(typeName)
}

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

async function syncFile(filePath: string, basePath: string, options: DbCliOptions): Promise<void> {
  const parsed = parseDocument(filePath, basePath)
  if (!parsed) return

  const { id, document } = parsed
  const url = `http://localhost:${options.httpPort}`

  const docType = document.type
  const type = (Array.isArray(docType) ? docType[0] : docType) || inferTypeFromPath(id)
  const ns = options.name || inferNamespace()

  const typedef = getTypeDefinition(type)
  const mergedData = typedef
    ? { ...typedef.schema, ...document.data }
    : document.data || {}
  const data = Object.fromEntries(
    Object.entries(mergedData).filter(([key]) => !key.startsWith('$'))
  )

  const thing = { ns, type, id, data, content: document.content || '' }
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
  } catch (err) {
    console.error(`   ❌ ${id}: ${err}`)
  }
}

async function syncAllFiles(options: DbCliOptions): Promise<void> {
  const contentPath = resolve(options.path)
  const files = findMdxFiles(contentPath)

  if (files.length === 0) {
    console.log('   No MDX files found yet')
    return
  }

  console.log('   Loading type definitions...')
  await loadTypeDefinitions(contentPath)

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

async function startWatcher(options: DbCliOptions): Promise<void> {
  const contentPath = resolve(options.path)

  if (!existsSync(contentPath)) {
    console.log(`⚠️  Content path does not exist: ${contentPath}`)
    console.log(`   Create it with: mkdir -p ${contentPath}`)
    return
  }

  console.log(`👀 Watching ${contentPath} for changes...`)
  await syncAllFiles(options)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const pendingFiles = new Set<string>()

  const watchDir = (dir: string) => {
    try {
      watch(dir, { recursive: true }, async (eventType, filename) => {
        if (!filename) return
        if (!filename.endsWith('.mdx')) return
        if (filename.startsWith('.') || filename.includes('node_modules')) return

        const fullPath = join(dir, filename)
        const justFilename = filename.split('/').pop() || filename

        if (isTypeDefinition(justFilename)) {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(async () => {
            console.log(`   🔄 Type definition changed: ${justFilename}`)
            typeDefinitions.clear()
            await loadTypeDefinitions(contentPath)
          }, 100)
          return
        }

        pendingFiles.add(fullPath)

        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
          const files = Array.from(pendingFiles)
          pendingFiles.clear()

          for (const file of files) {
            if (existsSync(file)) {
              await syncFile(file, contentPath, options)
            }
          }
        }, 100)
      })
    } catch (err) {
      console.error(`⚠️  Failed to watch ${dir}:`, err)
    }
  }

  watchDir(contentPath)
  console.log(`   📝 File watcher active`)
}

export async function runDev(options: DbCliOptions): Promise<void> {
  console.log('🗄️  mdxe db\n')

  const resolvedPath = resolve(options.path)
  console.log(`📁 Content: ${resolvedPath}`)
  console.log(`🌐 Web UI:  http://localhost:${options.port}`)
  console.log(`📊 DB:      http://localhost:${options.httpPort}\n`)

  const server = await startServer(options)

  server.stdout?.on('data', (data) => {
    if (options.verbose) {
      process.stdout.write(`[clickhouse] ${data}`)
    }
  })

  server.stderr?.on('data', (data) => {
    const msg = data.toString()
    if (!msg.includes('Ready for connections') && options.verbose) {
      process.stderr.write(`[clickhouse] ${data}`)
    }
  })

  await startWebUI(options)
  await startWatcher(options)

  console.log('\n✨ Dev environment ready! Press Ctrl+C to stop.\n')

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

  await new Promise(() => {})
}

export async function runServer(options: DbCliOptions): Promise<void> {
  console.log('🗄️  mdxe db:server\n')

  const binary = await ensureClickHouse()
  console.log(`📦 ClickHouse: ${getClickHouseVersion(binary)}`)

  const server = await startServer(options)

  server.stdout?.pipe(process.stdout)
  server.stderr?.pipe(process.stderr)

  console.log(`\n✅ ClickHouse running at http://localhost:${options.httpPort}`)
  console.log('   Press Ctrl+C to stop.\n')

  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...')
    server.kill()
    process.exit(0)
  })

  await new Promise(() => {})
}

export async function runClient(_options: DbCliOptions): Promise<void> {
  const binary = await ensureClickHouse()

  const client = spawn(binary, ['client', '--database=mdxdb'], {
    stdio: 'inherit',
  })

  client.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

interface StudioServer {
  stop: () => Promise<void>
}

interface StudioModule {
  startStudio: (opts: { contentDir: string; port: number; host: string }) => Promise<StudioServer>
}

export async function runStudio(options: DbCliOptions): Promise<void> {
  console.log('🎨 mdxe studio\n')

  const resolvedPath = resolve(options.path)
  console.log(`📁 Content: ${resolvedPath}`)
  console.log(`🌐 Studio:  http://localhost:${options.studioPort}\n`)

  try {
    // Use string variable to prevent static module resolution during type checking
    const moduleName = '@mdxdb/studio/server'
    const studioModule: StudioModule = await import(moduleName)

    const server = await studioModule.startStudio({
      contentDir: resolvedPath,
      port: options.studioPort,
      host: 'localhost',
    })

    console.log('\n✨ Studio ready! Press Ctrl+C to stop.\n')

    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...')
      await server.stop()
      process.exit(0)
    })

    await new Promise(() => {})
  } catch (error) {
    console.error('❌ Failed to start studio:', error)
    console.log('\n💡 Make sure @mdxdb/studio is installed and built:')
    console.log('   pnpm add @mdxdb/studio')
    process.exit(1)
  }
}
