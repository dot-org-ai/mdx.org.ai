/**
 * @mdxdb/clickhouse Worker
 *
 * Cloudflare Worker exposing ClickHouse RPC functions.
 * Uses GET method for read queries (cacheable) and POST for writes.
 *
 * ClickHouse HTTP Interface:
 * - GET: Read-only queries (can be cached)
 * - POST: Write operations
 *
 * @packageDocumentation
 */

// =============================================================================
// Cloudflare Worker Types
// =============================================================================

interface ScheduledEvent {
  scheduledTime: number
  cron: string
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

// =============================================================================
// Types
// =============================================================================

export interface ClickHouseWorkerEnv {
  /** ClickHouse HTTP URL */
  CLICKHOUSE_URL: string
  /** ClickHouse username (optional for anonymous) */
  CLICKHOUSE_USERNAME?: string
  /** ClickHouse password */
  CLICKHOUSE_PASSWORD?: string
  /** ClickHouse database */
  CLICKHOUSE_DATABASE?: string
  /** Cache TTL in seconds */
  CACHE_TTL?: string
  /** Password for readonly user (for setup) */
  CLICKHOUSE_READONLY_PASSWORD?: string
  /** Password for tenant user (for setup) */
  CLICKHOUSE_TENANT_PASSWORD?: string
}

export interface QueryOptions {
  /** SQL query */
  query: string
  /** Query parameters for parameterized queries */
  params?: Record<string, unknown>
  /** Output format */
  format?: string
  /** Custom cache TTL (seconds) */
  cacheTtl?: number
  /** Force cache bypass */
  noCache?: boolean
}

/**
 * Document to publish
 */
export interface PublishDocument {
  /** Document ID/path */
  id: string
  /** Document type (e.g., 'Post', 'Page') */
  type?: string
  /** JSON-LD context */
  context?: string | Record<string, unknown>
  /** Document data/frontmatter */
  data: Record<string, unknown>
  /** Markdown/MDX content */
  content?: string
}

/**
 * Publish request body
 */
export interface PublishRequest {
  /** Namespace (e.g., 'example.com') */
  ns: string
  /** Actor performing the publish (user URL or 'system') */
  actor?: string
  /** Documents to publish */
  documents: PublishDocument[]
  /** Git repo URL */
  repo?: string
  /** Git branch */
  branch?: string
  /** Git commit hash */
  commit?: string
  /** Git commit message */
  commitMessage?: string
  /** Git commit author name */
  commitAuthor?: string
  /** Git commit author email */
  commitEmail?: string
}

/**
 * Action row from ClickHouse
 */
export interface ActionRow {
  ns: string
  id: string
  act: string
  action: string
  activity: string
  actor: string
  objects: unknown[]
  objectsCount: number
  repo: string
  branch: string
  commit: string
  status: string
  progress: number
  total: number
  result?: unknown
  error?: string
  createdAt: string
  updatedAt: string
}

export interface QueryResult<T = unknown> {
  data: T[]
  rows: number
  statistics?: {
    elapsed: number
    rows_read: number
    bytes_read: number
  }
  meta?: Array<{ name: string; type: string }>
}

// =============================================================================
// ClickHouse HTTP Client
// =============================================================================

/**
 * Build ClickHouse URL with query parameters
 */
function buildClickHouseUrl(
  baseUrl: string,
  database: string,
  query: string,
  format: string,
  params?: Record<string, unknown>
): URL {
  const url = new URL(baseUrl)

  // Add query parameters
  url.searchParams.set('database', database)
  url.searchParams.set('default_format', format)
  url.searchParams.set('query', query)

  // Add statistics for debugging
  url.searchParams.set('send_progress_in_http_headers', '1')
  url.searchParams.set('wait_end_of_query', '1')

  // Add parameterized query params
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(`param_${key}`, String(value))
    }
  }

  return url
}

/**
 * Execute a read query using GET (cacheable)
 */
async function executeReadQuery<T = unknown>(
  env: ClickHouseWorkerEnv,
  query: string,
  params?: Record<string, unknown>,
  format = 'JSONEachRow',
  cacheTtl?: number
): Promise<QueryResult<T>> {
  const baseUrl = env.CLICKHOUSE_URL
  const database = env.CLICKHOUSE_DATABASE ?? 'mdxdb'

  const url = buildClickHouseUrl(baseUrl, database, query, format, params)

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  }

  // Add auth if configured
  if (env.CLICKHOUSE_USERNAME) {
    headers['Authorization'] = `Basic ${btoa(`${env.CLICKHOUSE_USERNAME}:${env.CLICKHOUSE_PASSWORD ?? ''}`)}`
  }

  // Use GET for read queries (enables caching)
  const fetchOptions: RequestInit & { cf?: { cacheTtl: number; cacheEverything: boolean } } = {
    method: 'GET',
    headers,
  }

  // Add Cloudflare cache options
  if (cacheTtl) {
    fetchOptions.cf = {
      cacheTtl,
      cacheEverything: true,
    }
  }

  const response = await fetch(url.toString(), fetchOptions as RequestInit)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ClickHouse error: ${error}`)
  }

  const text = await response.text()

  // Parse JSONEachRow format
  const data: T[] = text
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T)

  // Extract statistics from headers
  const statistics = {
    elapsed: parseFloat(response.headers.get('X-ClickHouse-Summary')?.match(/"elapsed":([\d.]+)/)?.[1] ?? '0'),
    rows_read: parseInt(response.headers.get('X-ClickHouse-Summary')?.match(/"read_rows":([\d]+)/)?.[1] ?? '0', 10),
    bytes_read: parseInt(response.headers.get('X-ClickHouse-Summary')?.match(/"read_bytes":([\d]+)/)?.[1] ?? '0', 10),
  }

  return {
    data,
    rows: data.length,
    statistics,
  }
}

/**
 * Execute a write query using POST
 */
async function executeWriteQuery(
  env: ClickHouseWorkerEnv,
  query: string,
  params?: Record<string, unknown>
): Promise<void> {
  const baseUrl = env.CLICKHOUSE_URL
  const database = env.CLICKHOUSE_DATABASE ?? 'mdxdb'

  const url = new URL(baseUrl)
  url.searchParams.set('database', database)

  // Add parameterized query params
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(`param_${key}`, String(value))
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
  }

  // Add auth if configured
  if (env.CLICKHOUSE_USERNAME) {
    headers['Authorization'] = `Basic ${btoa(`${env.CLICKHOUSE_USERNAME}:${env.CLICKHOUSE_PASSWORD ?? ''}`)}`
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: query,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ClickHouse error: ${error}`)
  }
}

/**
 * Execute a batch insert using POST with JSONEachRow format
 */
async function executeInsert<T extends Record<string, unknown>>(
  env: ClickHouseWorkerEnv,
  table: string,
  rows: T[]
): Promise<void> {
  if (rows.length === 0) return

  const baseUrl = env.CLICKHOUSE_URL
  const database = env.CLICKHOUSE_DATABASE ?? 'mdxdb'

  const url = new URL(baseUrl)
  url.searchParams.set('database', database)
  url.searchParams.set('query', `INSERT INTO ${table} FORMAT JSONEachRow`)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add auth if configured
  if (env.CLICKHOUSE_USERNAME) {
    headers['Authorization'] = `Basic ${btoa(`${env.CLICKHOUSE_USERNAME}:${env.CLICKHOUSE_PASSWORD ?? ''}`)}`
  }

  const body = rows.map((row) => JSON.stringify(row)).join('\n')

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ClickHouse error: ${error}`)
  }
}

// =============================================================================
// RPC Interface
// =============================================================================

export interface ClickHouseRPC {
  /** Execute a read query (cacheable via GET) */
  query<T = unknown>(options: QueryOptions): Promise<QueryResult<T>>

  /** Execute a write command */
  command(query: string, params?: Record<string, unknown>): Promise<void>

  /** Insert rows into a table */
  insert<T extends Record<string, unknown>>(table: string, rows: T[]): Promise<void>

  /** Get database info */
  describe(): Promise<{ database: string; tables: string[] }>
}

/**
 * ClickHouseDatabase Worker
 *
 * Exposes RPC methods for ClickHouse operations.
 * Uses GET for reads (cacheable) and POST for writes.
 */
export class ClickHouseWorkerDB implements ClickHouseRPC {
  private env: ClickHouseWorkerEnv
  private defaultCacheTtl: number

  constructor(env: ClickHouseWorkerEnv) {
    this.env = env
    this.defaultCacheTtl = parseInt(env.CACHE_TTL ?? '60', 10)
  }

  /**
   * Execute a read query (cacheable)
   */
  async query<T = unknown>(options: QueryOptions): Promise<QueryResult<T>> {
    const cacheTtl = options.noCache ? 0 : (options.cacheTtl ?? this.defaultCacheTtl)
    return executeReadQuery<T>(
      this.env,
      options.query,
      options.params,
      options.format ?? 'JSONEachRow',
      cacheTtl
    )
  }

  /**
   * Execute a write command
   */
  async command(query: string, params?: Record<string, unknown>): Promise<void> {
    return executeWriteQuery(this.env, query, params)
  }

  /**
   * Insert rows into a table
   */
  async insert<T extends Record<string, unknown>>(table: string, rows: T[]): Promise<void> {
    return executeInsert(this.env, table, rows)
  }

  /**
   * Get database info
   */
  async describe(): Promise<{ database: string; tables: string[] }> {
    const database = this.env.CLICKHOUSE_DATABASE ?? 'mdxdb'
    const result = await this.query<{ name: string }>({
      query: `SELECT name FROM system.tables WHERE database = '${database}'`,
      cacheTtl: 300, // Cache for 5 minutes
    })

    return {
      database,
      tables: result.data.map((row) => row.name),
    }
  }
}

// =============================================================================
// Action Processing
// =============================================================================

/**
 * Thing row to insert into Things table
 */
interface ThingRow extends Record<string, unknown> {
  ns: string
  type: string
  id: string
  branch?: string
  variant?: string
  version?: number
  repo?: string
  commit?: string
  data: Record<string, unknown>
  content?: string
  code?: string
  meta?: Record<string, unknown>
  event?: string
}

/**
 * Result of processing actions
 */
interface ProcessResult {
  processed: number
  succeeded: number
  failed: number
  things: number
  errors: string[]
}

/**
 * Process pending publish actions
 * Transforms staged objects into Things table entries
 */
async function processActions(db: ClickHouseWorkerDB, limit = 10): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    things: 0,
    errors: [],
  }

  // Get pending actions
  const pendingResult = await db.query<ActionRow>({
    query: `SELECT * FROM Actions FINAL WHERE status = 'pending' AND action = 'publish' ORDER BY createdAt LIMIT {limit:UInt32}`,
    params: { limit },
    cacheTtl: 0,
  })

  if (pendingResult.data.length === 0) {
    return result
  }

  for (const action of pendingResult.data) {
    result.processed++
    const now = new Date().toISOString()

    try {
      // Mark action as active
      await db.insert('Actions', [{
        ...action,
        status: 'active',
        startedAt: now,
        updatedAt: now,
      }])

      // Parse objects from action (stored as JSON)
      const objects = Array.isArray(action.objects) ? action.objects : []
      const things: ThingRow[] = []

      for (const obj of objects as PublishDocument[]) {
        // Determine type from document
        const docType = obj.type ?? inferTypeFromId(obj.id)

        things.push({
          ns: action.ns,
          type: docType,
          id: obj.id,
          branch: action.branch || 'main',
          repo: action.repo || '',
          commit: action.commit || '',
          data: obj.data ?? {},
          content: obj.content ?? '',
          meta: {
            actionId: action.id,
            context: obj.context,
          },
          event: 'created',
        })
      }

      // Insert things
      if (things.length > 0) {
        await db.insert('Things', things)
        result.things += things.length
      }

      // Mark action as completed
      await db.insert('Actions', [{
        ...action,
        status: 'completed',
        progress: action.total,
        completedAt: now,
        updatedAt: now,
        result: {
          things: things.length,
          processedAt: now,
        },
      }])

      result.succeeded++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(`Action ${action.id}: ${errorMsg}`)
      result.failed++

      // Mark action as failed
      try {
        await db.insert('Actions', [{
          ...action,
          status: 'failed',
          error: errorMsg,
          updatedAt: now,
        }])
      } catch {
        // Ignore error updating status
      }
    }
  }

  return result
}

/**
 * Infer type from document ID/path
 * e.g., "posts/hello-world" -> "Post"
 */
function inferTypeFromId(id: string): string {
  const parts = id.split('/')
  if (parts.length >= 2) {
    // Take first part and singularize
    const plural = parts[0] ?? 'Document'
    return plural.charAt(0).toUpperCase() + plural.slice(1, -1)
  }
  return 'Document'
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async fetch(request: Request, env: ClickHouseWorkerEnv): Promise<Response> {
    const db = new ClickHouseWorkerDB(env)
    const url = new URL(request.url)

    // Handle JSON-RPC style requests
    if (request.method === 'POST' && url.pathname === '/rpc') {
      try {
        const body = await request.json() as { method: string; params: unknown[] }
        const { method, params } = body

        let result: unknown
        switch (method) {
          case 'query':
            result = await db.query(params[0] as QueryOptions)
            break
          case 'command':
            await db.command(params[0] as string, params[1] as Record<string, unknown> | undefined)
            result = { success: true }
            break
          case 'insert':
            await db.insert(params[0] as string, params[1] as Record<string, unknown>[])
            result = { success: true }
            break
          case 'describe':
            result = await db.describe()
            break
          default:
            return new Response(JSON.stringify({ error: `Unknown method: ${method}` }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({ result }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        })
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Direct query endpoint (GET - cacheable)
    if (request.method === 'GET' && url.pathname === '/query') {
      const query = url.searchParams.get('q') ?? url.searchParams.get('query')
      if (!query) {
        return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      try {
        const cacheTtl = parseInt(url.searchParams.get('cache') ?? String(db['defaultCacheTtl']), 10)
        const result = await db.query({
          query,
          cacheTtl: url.searchParams.has('nocache') ? 0 : cacheTtl,
        })

        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': cacheTtl > 0 ? `public, max-age=${cacheTtl}` : 'no-store',
          },
        })
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Health check
    if (request.method === 'GET' && url.pathname === '/health') {
      try {
        const info = await db.describe()
        return new Response(JSON.stringify({ status: 'ok', ...info }), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(
          JSON.stringify({ status: 'error', error: error instanceof Error ? error.message : String(error) }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Publish endpoint - creates an Action with staged objects
    if (request.method === 'POST' && url.pathname === '/publish') {
      try {
        const body = await request.json() as PublishRequest
        const { ns, actor, documents, repo, branch, commit, commitMessage, commitAuthor, commitEmail } = body

        if (!ns) {
          return new Response(JSON.stringify({ error: 'Missing required field: ns' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        if (!documents || !Array.isArray(documents) || documents.length === 0) {
          return new Response(JSON.stringify({ error: 'Missing or empty documents array' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Generate action ID (ULID-like)
        const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`
        const now = new Date().toISOString()

        // Insert action with staged objects
        await db.insert('Actions', [{
          ns,
          id,
          act: 'publish',
          action: 'publishes',
          activity: 'publishing',
          actor: actor ?? 'system',
          objects: documents,
          objectsCount: documents.length,
          repo: repo ?? '',
          branch: branch ?? 'main',
          commit: commit ?? '',
          commitMessage: commitMessage ?? '',
          commitAuthor: commitAuthor ?? '',
          commitEmail: commitEmail ?? '',
          status: 'pending',
          progress: 0,
          total: documents.length,
          createdAt: now,
          updatedAt: now,
        }])

        return new Response(JSON.stringify({
          success: true,
          actionId: id,
          ns,
          documentsCount: documents.length,
          status: 'pending',
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Get action status
    if (request.method === 'GET' && url.pathname.startsWith('/actions/')) {
      const actionId = url.pathname.replace('/actions/', '')
      if (!actionId) {
        return new Response(JSON.stringify({ error: 'Missing action ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      try {
        const result = await db.query<ActionRow>({
          query: `SELECT * FROM Actions FINAL WHERE id = {id:String} LIMIT 1`,
          params: { id: actionId },
          cacheTtl: 0, // Don't cache action status
        })

        if (result.data.length === 0) {
          return new Response(JSON.stringify({ error: 'Action not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify(result.data[0]), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Process pending actions endpoint
    if (request.method === 'POST' && url.pathname === '/process') {
      try {
        const result = await processActions(db)
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // List pending actions
    if (request.method === 'GET' && url.pathname === '/actions') {
      try {
        const ns = url.searchParams.get('ns')
        const limit = parseInt(url.searchParams.get('limit') ?? '100', 10)

        let query = `SELECT * FROM Actions FINAL WHERE status = 'pending' ORDER BY createdAt LIMIT {limit:UInt32}`
        const params: Record<string, unknown> = { limit }

        if (ns) {
          query = `SELECT * FROM Actions FINAL WHERE status = 'pending' AND ns = {ns:String} ORDER BY createdAt LIMIT {limit:UInt32}`
          params.ns = ns
        }

        const result = await db.query<ActionRow>({ query, params, cacheTtl: 0 })
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    return new Response('Not found', { status: 404 })
  },

  /**
   * Scheduled handler for processing pending actions
   * Triggered by cron in wrangler.toml
   */
  async scheduled(_event: ScheduledEvent, env: ClickHouseWorkerEnv, _ctx: ExecutionContext): Promise<void> {
    const db = new ClickHouseWorkerDB(env)
    await processActions(db)
  },
}
