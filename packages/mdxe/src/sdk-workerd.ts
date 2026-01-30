/**
 * Workerd SDK Provider
 *
 * Simplified SDK provider that assumes workerd execution context.
 * Uses @mdxe/workers for remote execution and @mdxe/workers/local for local development.
 *
 * This replaces the multi-runtime SDK provider with a unified workerd-based approach:
 * - Local context: Uses Miniflare (via @mdxe/workers/local) for development
 * - Remote context: Uses Worker Loader bindings for production
 *
 * @packageDocumentation
 */

// Types are defined locally to avoid dependency on @mdxe/workers during compilation
// The runtime will use @mdxe/workers when available

/**
 * Worker Loader interface (from Cloudflare Workers)
 */
interface WorkerLoader {
  get(id: string, callback: () => Promise<WorkerLoaderConfig>): WorkerLoaderInstance
}

interface WorkerLoaderConfig {
  mainModule: string
  modules: Record<string, string>
  compatibilityDate?: string
}

interface WorkerLoaderInstance {
  getEntrypoint(name?: string): WorkerLoaderEntrypoint
}

interface WorkerLoaderEntrypoint {
  fetch(request: Request | string): Promise<Response>
}

/**
 * Workerd SDK Configuration
 */
export interface WorkerdSDKConfig {
  /** Execution context */
  context: 'local' | 'remote'
  /** Namespace for the application */
  ns: string
  /** Worker environment (for remote context) */
  env?: WorkerEnv
  /** Database bindings */
  bindings?: DatabaseBindings
  /** RPC URL for remote AI/workflow calls */
  rpcUrl?: string
  /** Authentication token */
  token?: string
}

/**
 * Database binding types from Cloudflare Workers
 */
export interface DatabaseBindings {
  /** D1 database binding */
  D1?: D1Database
  /** KV namespace binding */
  KV?: KVNamespace
  /** R2 bucket binding */
  R2?: R2Bucket
  /** Additional custom bindings */
  [key: string]: unknown
}

/**
 * D1 Database interface (from Cloudflare Workers types)
 */
export interface D1Database {
  prepare(query: string): D1PreparedStatement
  exec(query: string): Promise<D1ExecResult>
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  dump(): Promise<ArrayBuffer>
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  run(): Promise<D1Result>
  all<T = unknown>(): Promise<D1Result<T>>
  raw<T = unknown>(): Promise<T[]>
}

interface D1Result<T = unknown> {
  results?: T[]
  success: boolean
  meta?: Record<string, unknown>
  error?: string
}

interface D1ExecResult {
  count: number
  duration: number
}

/**
 * KV Namespace interface
 */
export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<unknown>
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expiration?: number; expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; cursor?: string; list_complete: boolean }>
}

/**
 * R2 Bucket interface
 */
export interface R2Bucket {
  get(key: string): Promise<R2Object | null>
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: Record<string, unknown>): Promise<R2Object>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<R2Objects>
}

interface R2Object {
  key: string
  size: number
  etag: string
  httpMetadata?: Record<string, string>
  body: ReadableStream
  arrayBuffer(): Promise<ArrayBuffer>
  text(): Promise<string>
  json<T = unknown>(): Promise<T>
}

interface R2Objects {
  objects: R2Object[]
  truncated: boolean
  cursor?: string
}

/**
 * Worker environment with optional bindings
 */
export interface WorkerEnv {
  /** Worker Loader binding from [[worker_loaders]] config */
  LOADER?: WorkerLoader
  /** Local development indicator */
  MDX_LOCAL_DEV?: string
  /** Allow additional bindings */
  [key: string]: unknown
}

/**
 * Context object available as $ in MDX documents
 */
export interface WorkerdContext {
  /** Namespace */
  ns: string
  /** User information */
  user: {
    id: string
    name?: string
    role?: string
    [key: string]: unknown
  }
  /** Request information */
  request: {
    method: string
    url: string
    headers: Record<string, string>
    body?: unknown
  }
  /** Environment variables */
  env: Record<string, string | undefined>
  /** Application configuration */
  config: Record<string, unknown>
  /** Metadata */
  meta: Record<string, unknown>
  /** Logger functions */
  log: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  /** Scope function for temporary context changes */
  scope: <T>(overrides: Partial<WorkerdContext>, fn: () => T | Promise<T>) => Promise<T>
}

/**
 * Database client interface
 */
export interface WorkerdDBClient {
  list(options?: Record<string, unknown>): Promise<unknown[]>
  get(id: string): Promise<unknown>
  create(options: { type: string; id?: string; data: Record<string, unknown>; ns?: string }): Promise<unknown>
  update(id: string, options: { data: Record<string, unknown> }): Promise<unknown>
  delete(id: string): Promise<boolean>
  search(options: Record<string, unknown>): Promise<unknown[]>
  /** Collection accessors (db.Posts, db.Users, etc.) */
  [key: string]: unknown
}

/**
 * AI provider interface
 */
export interface WorkerdAIProvider {
  generate(prompt: string, options?: Record<string, unknown>): Promise<string>
  embed(text: string): Promise<number[]>
  chat(messages: Array<{ role: string; content: string }>): Promise<string>
}

/**
 * Workflow provider interface
 */
export interface WorkerdWorkflowProvider {
  on: unknown
  every: unknown
  send: (event: string, data: unknown) => Promise<void>
}

/**
 * Extended context with SDK methods ($)
 */
export interface WorkerdSDKContext extends WorkerdContext {
  /** Database client proxy */
  db: WorkerdDBClient
  /** AI provider */
  ai: WorkerdAIProvider
  /** Event handlers */
  on: unknown
  /** Scheduled handlers */
  every: unknown
  /** Send event */
  send: (event: string, data: unknown) => Promise<void>
  /** API client (optional) */
  api?: unknown
}

/**
 * Workerd SDK Provider
 */
export interface WorkerdSDKProvider {
  /** Database client */
  db: WorkerdDBClient
  /** AI provider */
  ai: WorkerdAIProvider
  /** Workflow provider */
  workflows: WorkerdWorkflowProvider
  /** Context object ($) */
  $: WorkerdSDKContext
  /** Get all globals for MDX injection */
  getGlobals(): Record<string, unknown>
  /** Dispose resources */
  dispose(): Promise<void>
}

/**
 * Check if running in local context (development)
 */
export function isLocalContext(env: WorkerEnv): boolean {
  // Local if explicitly marked or if LOADER binding is missing
  if (env.MDX_LOCAL_DEV === 'true') return true
  if (!env.LOADER) return true
  return false
}

/**
 * Check if running in remote context (production workerd)
 */
export function isRemoteContext(env: WorkerEnv): boolean {
  return !isLocalContext(env)
}

/**
 * Create workerd context object
 */
export function createWorkerdContext(options: {
  ns: string
  request?: Request
  user?: { id: string; name?: string; role?: string; [key: string]: unknown }
  env?: Record<string, string | undefined>
  config?: Record<string, unknown>
}): WorkerdContext {
  const { ns, request, user, env = {}, config = {} } = options

  // Extract headers from request
  const extractHeaders = (req: Request): Record<string, string> => {
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }

  const context: WorkerdContext = {
    ns,
    user: user || { id: 'anonymous', name: 'Anonymous', role: 'guest' },
    request: request
      ? {
          method: request.method,
          url: request.url,
          headers: extractHeaders(request),
          body: null,
        }
      : { method: 'GET', url: '/', headers: {}, body: null },
    env,
    config,
    meta: {},
    log: console.log,
    error: console.error,
    warn: console.warn,
    scope: async <T>(overrides: Partial<WorkerdContext>, fn: () => T | Promise<T>): Promise<T> => {
      // Save current values
      const prev = {
        ns: context.ns,
        user: context.user,
        env: context.env,
        config: context.config,
      }

      // Apply overrides
      if (overrides.ns !== undefined) context.ns = overrides.ns
      if (overrides.user !== undefined) context.user = overrides.user
      if (overrides.env !== undefined) context.env = overrides.env
      if (overrides.config !== undefined) context.config = overrides.config

      try {
        return await fn()
      } finally {
        // Restore original values
        context.ns = prev.ns
        context.user = prev.user
        context.env = prev.env
        context.config = prev.config
      }
    },
  }

  return context
}

/**
 * Inject database bindings into the SDK
 */
export function injectDatabaseBindings(bindings: DatabaseBindings): DatabaseBindings {
  return { ...bindings }
}

/**
 * Create in-memory database client for local development
 */
function createLocalDBClient(ns: string): WorkerdDBClient {
  // In-memory storage
  const things = new Map<string, Record<string, unknown>>()

  // Simple ID generator
  const generateId = () => Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9)

  const baseClient: WorkerdDBClient = {
    async list(options = {}) {
      let results = Array.from(things.values())
      const opts = options as { ns?: string; type?: string; limit?: number }
      if (opts.ns) results = results.filter(t => t.ns === opts.ns)
      if (opts.type) results = results.filter(t => t.type === opts.type)
      if (opts.limit) results = results.slice(0, opts.limit)
      return results
    },

    async get(url: string) {
      return things.get(url) || null
    },

    async create(options) {
      const id = options.id || generateId()
      const itemNs = options.ns || ns
      const url = `https://${itemNs}/${options.type}/${id}`
      const now = new Date()
      const thing = {
        ns: itemNs,
        type: options.type,
        id,
        url,
        data: options.data,
        createdAt: now,
        updatedAt: now,
      }
      things.set(url, thing)
      return thing
    },

    async update(url, options) {
      const existing = things.get(url)
      if (!existing) throw new Error(`Thing not found: ${url}`)
      const updated = {
        ...existing,
        data: { ...(existing.data as Record<string, unknown>), ...options.data },
        updatedAt: new Date(),
      }
      things.set(url, updated)
      return updated
    },

    async delete(url) {
      return things.delete(url)
    },

    async search(options) {
      const opts = options as { query?: string; limit?: number }
      const query = (opts.query || '').toLowerCase()
      let results = Array.from(things.values())
      results = results.filter(t => JSON.stringify(t.data).toLowerCase().includes(query))
      if (opts.limit) results = results.slice(0, opts.limit)
      return results
    },
  }

  // Create proxy for collection access (db.Posts, db.Users, etc.)
  return new Proxy(baseClient, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop]

      // Return a collection accessor for the type
      const type = prop
      return {
        async create(id: string, data: Record<string, unknown>) {
          return target.create({ type, id, data, ns })
        },
        async get(id: string) {
          const url = `https://${ns}/${type}/${id}`
          return target.get(url)
        },
        async list(options = {}) {
          return target.list({ ...options, type, ns })
        },
        async update(id: string, data: Record<string, unknown>) {
          const url = `https://${ns}/${type}/${id}`
          return target.update(url, { data })
        },
        async delete(id: string) {
          const url = `https://${ns}/${type}/${id}`
          return target.delete(url)
        },
      }
    },
  })
}

/**
 * Create remote database client using Worker Loader
 */
function createRemoteDBClient(ns: string, env: WorkerEnv): WorkerdDBClient {
  const createProxy = (path: string): unknown =>
    new Proxy(() => {}, {
      get: (_, prop: string) => {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined
        return createProxy(path ? `${path}.${prop}` : prop)
      },
      apply: async (_, __, args: unknown[]) => {
        if (!env.LOADER) {
          throw new Error('Worker Loader binding (LOADER) not available')
        }

        // Call through Worker Loader
        const worker = env.LOADER.get(`db-${ns}`, async () => ({
          mainModule: 'db.js',
          modules: {
            'db.js': `export default { fetch() { return new Response('DB proxy') } }`,
          },
          compatibilityDate: '2024-01-01',
        }))

        const entrypoint = worker.getEntrypoint()
        const response = await entrypoint.fetch(
          new Request('http://db/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, args }),
          })
        )

        if (!response.ok) {
          const error = (await response.json()) as { error: string }
          throw new Error(error.error)
        }

        const result = (await response.json()) as { result: unknown }
        return result.result
      },
    })

  return createProxy('db') as WorkerdDBClient
}

/**
 * Create local AI provider (stub implementation)
 */
function createLocalAIProvider(): WorkerdAIProvider {
  return {
    async generate(prompt) {
      return `[AI stub] Prompt: ${prompt.slice(0, 50)}...`
    },
    async embed() {
      return new Array(1536).fill(0)
    },
    async chat(messages) {
      const lastMessage = messages[messages.length - 1]
      return `[AI stub] Response to: ${lastMessage?.content || ''}`
    },
  }
}

/**
 * Create remote AI provider using Worker Loader
 */
function createRemoteAIProvider(env: WorkerEnv, rpcUrl?: string, token?: string): WorkerdAIProvider {
  const baseUrl = rpcUrl || 'https://rpc.do'

  return {
    async generate(prompt, options) {
      const response = await fetch(`${baseUrl}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, ...options }),
      })
      if (!response.ok) throw new Error(`AI generate failed: ${response.statusText}`)
      const data = (await response.json()) as { text?: string; result?: string }
      return data.text || data.result || ''
    },

    async embed(text) {
      const response = await fetch(`${baseUrl}/ai/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error(`AI embed failed: ${response.statusText}`)
      const data = (await response.json()) as { embedding?: number[]; result?: number[] }
      return data.embedding || data.result || []
    },

    async chat(messages) {
      const response = await fetch(`${baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages }),
      })
      if (!response.ok) throw new Error(`AI chat failed: ${response.statusText}`)
      const data = (await response.json()) as { text?: string; result?: string }
      return data.text || data.result || ''
    },
  }
}

/**
 * Create workflow provider
 */
function createWorkflowProvider(): WorkerdWorkflowProvider {
  const eventHandlers = new Map<string, Array<(data: unknown, ctx: unknown) => Promise<void>>>()
  const scheduleHandlers: Array<{ interval: string; handler: () => Promise<void> }> = []

  const on = new Proxy(
    {},
    {
      get: (_, entity: string) =>
        new Proxy(
          {},
          {
            get: (_, event: string) => (handler: (data: unknown, ctx: unknown) => Promise<void>) => {
              const key = `${entity}.${event}`
              if (!eventHandlers.has(key)) eventHandlers.set(key, [])
              eventHandlers.get(key)!.push(handler)
              return {
                unsubscribe: () => {
                  const handlers = eventHandlers.get(key)
                  if (handlers) {
                    const idx = handlers.indexOf(handler)
                    if (idx > -1) handlers.splice(idx, 1)
                  }
                },
              }
            },
          }
        ),
    }
  )

  const every = new Proxy(
    {},
    {
      get: (_, interval: string) => (handler: () => Promise<void>) => {
        scheduleHandlers.push({ interval, handler })
        return { cancel: () => {} }
      },
    }
  )

  const send = async (event: string, data: unknown) => {
    const handlers = eventHandlers.get(event) || []
    for (const handler of handlers) {
      await handler(data, {})
    }
  }

  return { on, every, send }
}

/**
 * Create a workerd-based SDK provider
 */
export async function createWorkerdSDKProvider(config: WorkerdSDKConfig): Promise<WorkerdSDKProvider> {
  const { context: contextType, ns, env = {} as WorkerEnv, rpcUrl, token } = config

  // Determine if local or remote
  const isLocal = contextType === 'local' || isLocalContext(env)

  // Create database client
  const db = isLocal ? createLocalDBClient(ns) : createRemoteDBClient(ns, env)

  // Create AI provider
  const ai = isLocal ? createLocalAIProvider() : createRemoteAIProvider(env, rpcUrl, token)

  // Create workflow provider
  const workflows = createWorkflowProvider()

  // Create base context
  const baseContext = createWorkerdContext({
    ns,
    env: {},
  })

  // Create $ context with SDK methods
  const $: WorkerdSDKContext = {
    ...baseContext,
    db,
    ai,
    on: workflows.on,
    every: workflows.every,
    send: workflows.send,
  }

  return {
    db,
    ai,
    workflows,
    $,
    getGlobals() {
      return {
        $,
        db: $.db,
        ai: $.ai,
        on: $.on,
        every: $.every,
        send: $.send,
      }
    },
    async dispose() {
      // Clean up resources if needed
    },
  }
}

/**
 * Generate workerd-compatible SDK injection code
 */
export function generateWorkerdSDKCode(config: { ns: string; context: 'local' | 'remote' }): string {
  const { ns, context } = config

  if (context === 'remote') {
    return `
// Workerd SDK - Remote (Worker Loader)
const __SDK_CONFIG__ = { ns: '${ns}' };

// Worker Loader proxy
const __createProxy__ = (path = '', env) => new Proxy(() => {}, {
  get: (_, prop) => {
    if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
    return __createProxy__(path ? path + '.' + String(prop) : String(prop), env);
  },
  apply: async (_, __, args) => {
    if (!env?.LOADER) throw new Error('Worker LOADER binding not available');
    const worker = env.LOADER.get('sdk-' + __SDK_CONFIG__.ns, async () => ({
      mainModule: 'entry.js',
      modules: { 'entry.js': 'export default { fetch() { return new Response("SDK") } }' },
      compatibilityDate: '2024-01-01'
    }));
    const ep = worker.getEntrypoint();
    const response = await ep.fetch(new Request('http://sdk/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, args })
    }));
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'SDK call failed');
    }
    const result = await response.json();
    return result.result;
  }
});

const $ = {
  ns: __SDK_CONFIG__.ns,
  db: __createProxy__('db', env),
  ai: __createProxy__('ai', env),
  on: __createProxy__('on', env),
  every: __createProxy__('every', env),
  send: (event, data) => __createProxy__('send', env)(event, data),
  user: { id: 'anonymous', name: 'Anonymous', role: 'guest' },
  request: { method: 'GET', path: '/', headers: {}, body: null },
  env: {},
  config: {},
  meta: {},
  log: console.log,
  error: console.error,
  warn: console.warn,
  async scope(overrides, fn) {
    const prev = { ns: $.ns, user: $.user };
    Object.assign($, overrides);
    try { return await fn(); }
    finally { Object.assign($, prev); }
  }
};

const db = $.db;
const ai = $.ai;
const on = $.on;
const every = $.every;
const send = $.send;
`
  }

  // Local context
  return `
// Workerd SDK - Local (In-Memory)
const __SDK_CONFIG__ = { ns: '${ns}' };

// In-memory database storage
const __db_things__ = new Map();

// Simple ID generator
const __generateId__ = () => Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);

// Local DB implementation
const db = {
  async list(options = {}) {
    let results = Array.from(__db_things__.values());
    if (options.ns) results = results.filter(t => t.ns === options.ns);
    if (options.type) results = results.filter(t => t.type === options.type);
    if (options.limit) results = results.slice(0, options.limit);
    return results;
  },
  async get(url) {
    return __db_things__.get(url) || null;
  },
  async create(options) {
    const id = options.id || __generateId__();
    const ns = options.ns || __SDK_CONFIG__.ns;
    const url = 'https://' + ns + '/' + options.type + '/' + id;
    const now = new Date();
    const thing = { ns, type: options.type, id, url, data: options.data, createdAt: now, updatedAt: now };
    __db_things__.set(url, thing);
    return thing;
  },
  async update(url, options) {
    const existing = __db_things__.get(url);
    if (!existing) throw new Error('Thing not found: ' + url);
    const updated = { ...existing, data: { ...existing.data, ...options.data }, updatedAt: new Date() };
    __db_things__.set(url, updated);
    return updated;
  },
  async delete(url) {
    return __db_things__.delete(url);
  },
  async search(options) {
    const query = (options.query || '').toLowerCase();
    let results = Array.from(__db_things__.values());
    results = results.filter(t => JSON.stringify(t.data).toLowerCase().includes(query));
    if (options.limit) results = results.slice(0, options.limit);
    return results;
  }
};

// Typed collection accessor (db.Posts, db.Users, etc.)
const __dbCollectionProxy__ = new Proxy(db, {
  get: (target, prop) => {
    if (prop in target) return target[prop];
    const type = String(prop);
    return {
      async create(id, data) {
        return db.create({ type, id, data, ns: __SDK_CONFIG__.ns });
      },
      async get(id) {
        const url = 'https://' + __SDK_CONFIG__.ns + '/' + type + '/' + id;
        return db.get(url);
      },
      async list(options = {}) {
        return db.list({ ...options, type, ns: __SDK_CONFIG__.ns });
      },
      async update(id, data) {
        const url = 'https://' + __SDK_CONFIG__.ns + '/' + type + '/' + id;
        return db.update(url, { data });
      },
      async delete(id) {
        const url = 'https://' + __SDK_CONFIG__.ns + '/' + type + '/' + id;
        return db.delete(url);
      }
    };
  }
});

// Local AI stub
const ai = {
  async generate(prompt, options) { return '[AI stub] ' + prompt.slice(0, 50); },
  async embed(text) { return new Array(1536).fill(0); },
  async chat(messages) { return '[AI stub] Response'; }
};

// Local workflow stubs
const __event_handlers__ = new Map();
const __schedule_handlers__ = [];

const on = new Proxy({}, {
  get: (_, entity) => new Proxy({}, {
    get: (_, event) => (handler) => {
      const key = entity + '.' + event;
      if (!__event_handlers__.has(key)) __event_handlers__.set(key, []);
      __event_handlers__.get(key).push(handler);
      return { unsubscribe: () => { const handlers = __event_handlers__.get(key); const idx = handlers.indexOf(handler); if (idx > -1) handlers.splice(idx, 1); } };
    }
  })
});

const every = new Proxy({}, {
  get: (_, interval) => (handler) => {
    __schedule_handlers__.push({ interval: String(interval), handler });
    return { cancel: () => {} };
  }
});

const send = async (event, data) => {
  const handlers = __event_handlers__.get(event) || [];
  for (const handler of handlers) {
    await handler(data, $);
  }
};

// Context object
const $ = {
  ns: __SDK_CONFIG__.ns,
  db: __dbCollectionProxy__,
  ai,
  on,
  every,
  send,
  user: { id: 'anonymous', name: 'Anonymous', role: 'guest' },
  request: { method: 'GET', path: '/', headers: {}, body: null },
  env: {},
  config: {},
  meta: {},
  log: console.log,
  error: console.error,
  warn: console.warn,
  async scope(overrides, fn) {
    const prev = { ns: $.ns, user: $.user };
    Object.assign($, overrides);
    try { return await fn(); }
    finally { Object.assign($, prev); }
  }
};
`
}
