/**
 * SDK Provider Factory
 *
 * Creates local or remote implementations of the SDK ($, db, ai, on, every, send)
 *
 * @packageDocumentation
 */

// Simplified DBClient interface for SDK provider
interface DBClient {
  list?(options?: Record<string, unknown>): Promise<unknown[]>
  get?(id: string): Promise<unknown>
  create?(options: Record<string, unknown>): Promise<unknown>
  update?(id: string, options: Record<string, unknown>): Promise<unknown>
  delete?(id: string): Promise<boolean>
  search?(options: Record<string, unknown>): Promise<unknown[]>
  close?(): Promise<void>
  ns?: string
}

export interface SDKProviderConfig {
  /** Execution context */
  context: 'local' | 'remote'
  /** Database backend for local context */
  db: 'memory' | 'fs' | 'sqlite' | 'postgres' | 'clickhouse' | 'mongo'
  /** AI mode */
  aiMode: 'local' | 'remote'
  /** Namespace */
  ns?: string
  /** Database path (for fs/sqlite) */
  dbPath?: string
  /** RPC URL for remote context */
  rpcUrl?: string
  /** Auth token */
  token?: string
}

export interface SDKProvider {
  /** Database client */
  db: DBClient
  /** AI functions */
  ai: AIProvider
  /** Workflow functions */
  workflows: WorkflowProvider
  /** Context object */
  context: ContextProvider
  /** Cleanup function */
  close: () => Promise<void>
}

export interface AIProvider {
  generate: (prompt: string, options?: Record<string, unknown>) => Promise<string>
  embed: (text: string) => Promise<number[]>
  chat: (messages: Array<{ role: string; content: string }>) => Promise<string>
}

export interface WorkflowProvider {
  on: unknown
  every: unknown
  send: (event: string, data: unknown) => Promise<void>
}

export interface ContextProvider {
  ns: string
  user: Record<string, unknown>
  request: Record<string, unknown>
  env: Record<string, string>
  config: Record<string, unknown>
}

/**
 * Create an SDK provider based on configuration
 */
export async function createSDKProvider(config: SDKProviderConfig): Promise<SDKProvider> {
  if (config.context === 'remote') {
    return createRemoteSDKProvider(config)
  }
  return createLocalSDKProvider(config)
}

/**
 * Create a local SDK provider using mdxdb, mdxai, and ai-workflows
 */
async function createLocalSDKProvider(config: SDKProviderConfig): Promise<SDKProvider> {
  // Create database client based on backend
  let db: DBClient

  // Try to import ai-database, fall back to stub if not available
  try {
    const aiDbModule = await import('ai-database')
    const { createMemoryProvider } = aiDbModule

    switch (config.db) {
      case 'fs': {
        try {
          const { createFsDatabase } = await import('@mdxdb/fs')
          const fsDb = createFsDatabase({ root: config.dbPath || './content' })
          // Use fs database wrapped as DBClient interface
          db = fsDb as unknown as DBClient
        } catch {
          console.warn('@mdxdb/fs not available, falling back to memory')
          db = createMemoryProvider() as unknown as DBClient
        }
        break
      }
      case 'sqlite': {
        try {
          const { createSqliteDatabase } = await import('@mdxdb/sqlite')
          const sqliteDb = createSqliteDatabase({ path: config.dbPath || ':memory:' })
          db = sqliteDb as unknown as DBClient
        } catch {
          console.warn('@mdxdb/sqlite not available, falling back to memory')
          db = createMemoryProvider() as unknown as DBClient
        }
        break
      }
      case 'postgres': {
        // TODO: Implement postgres backend
        console.warn('Postgres backend not yet implemented, falling back to memory')
        db = createMemoryProvider() as unknown as DBClient
        break
      }
      case 'clickhouse': {
        // TODO: Implement clickhouse backend
        console.warn('ClickHouse backend not yet implemented, falling back to memory')
        db = createMemoryProvider() as unknown as DBClient
        break
      }
      case 'mongo': {
        // TODO: Implement mongo backend
        console.warn('MongoDB backend not yet implemented, falling back to memory')
        db = createMemoryProvider() as unknown as DBClient
        break
      }
      case 'memory':
      default:
        db = createMemoryProvider() as unknown as DBClient
    }
  } catch {
    // ai-database not available, use stub implementation
    console.warn('ai-database not available, using stub implementation')
    db = createStubDBClient(config.ns || 'default')
  }

  // Create AI provider
  const ai = await createLocalAIProvider(config)

  // Create workflow provider
  const workflows = await createLocalWorkflowProvider(db)

  // Create context
  const context: ContextProvider = {
    ns: config.ns || 'default',
    user: { id: 'anonymous', name: 'Anonymous', role: 'guest' },
    request: { method: 'GET', path: '/', headers: {}, body: null },
    env: { ...process.env } as Record<string, string>,
    config: {},
  }

  return {
    db,
    ai,
    workflows,
    context,
    close: async () => {
      await db.close?.()
    },
  }
}

/**
 * Create a remote SDK provider using RPC
 */
async function createRemoteSDKProvider(config: SDKProviderConfig): Promise<SDKProvider> {
  const rpcUrl = config.rpcUrl || 'https://rpc.do'
  const token = config.token || process.env.DO_TOKEN || ''

  // Create RPC client
  const rpc = createRPCClient(rpcUrl, token)

  // Create proxied DB client
  const db = createProxiedDBClient(rpc, config.ns)

  // Create proxied AI provider
  const ai = createProxiedAIProvider(rpc)

  // Create proxied workflow provider
  const workflows = createProxiedWorkflowProvider(rpc)

  // Create context
  const context: ContextProvider = {
    ns: config.ns || 'default',
    user: { id: 'anonymous', name: 'Anonymous', role: 'guest' },
    request: { method: 'GET', path: '/', headers: {}, body: null },
    env: {},
    config: {},
  }

  return {
    db,
    ai,
    workflows,
    context,
    close: async () => {},
  }
}

/**
 * Create local AI provider using mdxai
 */
async function createLocalAIProvider(config: SDKProviderConfig): Promise<AIProvider> {
  // For now, use a simple implementation that calls remote AI if needed
  // In future, this could use local models via mdxai

  if (config.aiMode === 'remote') {
    const rpcUrl = config.rpcUrl || 'https://rpc.do'
    const token = config.token || process.env.DO_TOKEN || ''

    return {
      generate: async (prompt, options) => {
        const response = await fetch(`${rpcUrl}/ai/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt, ...options }),
        })
        if (!response.ok) throw new Error(`AI generate failed: ${response.statusText}`)
        const data = await response.json() as Record<string, unknown>
        return (data.text || data.result || '') as string
      },
      embed: async (text) => {
        const response = await fetch(`${rpcUrl}/ai/embed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text }),
        })
        if (!response.ok) throw new Error(`AI embed failed: ${response.statusText}`)
        const data = await response.json() as Record<string, unknown>
        return (data.embedding || data.result || []) as number[]
      },
      chat: async (messages) => {
        const response = await fetch(`${rpcUrl}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ messages }),
        })
        if (!response.ok) throw new Error(`AI chat failed: ${response.statusText}`)
        const data = await response.json() as Record<string, unknown>
        return (data.text || data.result || '') as string
      },
    }
  }

  // Local AI - stub for now, can be expanded to use local models
  return {
    generate: async (prompt) => `[Local AI stub] Prompt: ${prompt.slice(0, 50)}...`,
    embed: async () => new Array(1536).fill(0),
    chat: async (messages) => `[Local AI stub] Last message: ${messages[messages.length - 1]?.content || ''}`,
  }
}

/**
 * Create local workflow provider using ai-workflows
 */
async function createLocalWorkflowProvider(db: DBClient): Promise<WorkflowProvider> {
  try {
    const { on, every, send } = await import('ai-workflows')
    return { on, every, send }
  } catch {
    // Fallback if ai-workflows not available
    return {
      on: new Proxy({}, {
        get: () => new Proxy(() => {}, {
          get: () => () => {},
          apply: () => {},
        }),
      }),
      every: new Proxy({}, {
        get: () => () => {},
      }),
      send: async () => {},
    }
  }
}

/**
 * Create RPC client for remote context
 */
function createRPCClient(rpcUrl: string, token: string) {
  return {
    async call(method: string, ...args: unknown[]) {
      const response = await fetch(`${rpcUrl}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ method, args }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as Record<string, unknown>
        throw new Error((error.error as string) || `RPC error: ${response.statusText}`)
      }
      return response.json()
    },
  }
}

/**
 * Create proxied DB client for remote context
 */
function createProxiedDBClient(rpc: ReturnType<typeof createRPCClient>, ns?: string): DBClient {
  const createProxy = (path: string) => new Proxy(() => {}, {
    get: (_, prop) => createProxy(`${path}.${String(prop)}`),
    apply: (_, __, args) => rpc.call(path, ...args),
  })

  return createProxy('db') as unknown as DBClient
}

/**
 * Create proxied AI provider for remote context
 */
function createProxiedAIProvider(rpc: ReturnType<typeof createRPCClient>): AIProvider {
  return {
    generate: (prompt, options) => rpc.call('ai.generate', prompt, options) as Promise<string>,
    embed: (text) => rpc.call('ai.embed', text) as Promise<number[]>,
    chat: (messages) => rpc.call('ai.chat', messages) as Promise<string>,
  }
}

/**
 * Create proxied workflow provider for remote context
 */
function createProxiedWorkflowProvider(rpc: ReturnType<typeof createRPCClient>): WorkflowProvider {
  const createProxy = (path: string) => new Proxy(() => {}, {
    get: (_, prop) => createProxy(`${path}.${String(prop)}`),
    apply: (_, __, args) => rpc.call(path, ...args),
  })

  return {
    on: createProxy('on'),
    every: createProxy('every'),
    send: (event, data) => rpc.call('send', event, data) as Promise<void>,
  }
}

/**
 * Generate SDK code for injection into sandbox worker
 *
 * This generates the code that will be embedded in the worker to provide
 * the SDK globals ($, db, ai, on, every, send, etc.)
 */
export function generateSDKInjectionCode(config: SDKProviderConfig): string {
  if (config.context === 'remote') {
    return generateRemoteSDKCode(config)
  }
  return generateLocalSDKCode(config)
}

/**
 * Generate SDK code for remote context (RPC-based)
 */
function generateRemoteSDKCode(config: SDKProviderConfig): string {
  const rpcUrl = config.rpcUrl || 'https://rpc.do'
  const token = config.token || ''
  const ns = config.ns || 'default'

  return `
// Remote SDK - RPC-based implementation
const __SDK_CONFIG__ = {
  rpcUrl: '${rpcUrl}',
  token: '${token}',
  ns: '${ns}'
};

const __rpc__ = {
  async do(path, ...args) {
    const headers = { 'Content-Type': 'application/json' };
    if (__SDK_CONFIG__.token) {
      headers['Authorization'] = 'Bearer ' + __SDK_CONFIG__.token;
    }
    const response = await fetch(__SDK_CONFIG__.rpcUrl + '/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify({ method: 'do', path, args })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'RPC error: ' + response.statusText);
    }
    return response.json();
  }
};

const __createProxy__ = (path = '') => new Proxy(() => {}, {
  get: (_, prop) => {
    if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
    return __createProxy__(path ? path + '.' + String(prop) : String(prop));
  },
  apply: (_, __, args) => __rpc__.do(path, ...args)
});

const $ = __createProxy__();
const db = $.db;
const ai = $.ai;
const api = $.api;
const on = $.on;
const send = $.send;
const every = $.every;
$.ns = __SDK_CONFIG__.ns;
`
}

/**
 * Create a stub DB client when mdxdb is not available
 */
function createStubDBClient(ns: string): DBClient {
  const stub: any = {
    ns,
    close: async () => {},
  }

  // Create a proxy that returns stub methods
  return new Proxy(stub, {
    get: (target, prop) => {
      if (prop in target) return target[prop]
      // Return async stub functions for unknown methods
      return async () => {
        console.warn(`DBClient.${String(prop)}() called but mdxdb is not available`)
        return null
      }
    },
  }) as DBClient
}

/**
 * Generate SDK code for local context (in-memory/local DB)
 */
function generateLocalSDKCode(config: SDKProviderConfig): string {
  const ns = config.ns || 'default'

  return `
// Local SDK - In-memory implementation
const __SDK_CONFIG__ = { ns: '${ns}' };

// In-memory database storage
const __db_things__ = new Map();
const __db_relationships__ = new Map();

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
    const url = options.url || 'https://' + ns + '/' + options.type + '/' + id;
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
  },
  async relate(options) {
    const id = options.from + ':' + options.type + ':' + options.to;
    const rel = { id, type: options.type, from: options.from, to: options.to, data: options.data, createdAt: new Date() };
    __db_relationships__.set(id, rel);
    return rel;
  },
  async related(url, type, direction = 'from') {
    const results = [];
    for (const rel of __db_relationships__.values()) {
      if (type && rel.type !== type) continue;
      if (direction === 'from' && rel.from === url) {
        const thing = __db_things__.get(rel.to);
        if (thing) results.push(thing);
      }
      if (direction === 'to' && rel.to === url) {
        const thing = __db_things__.get(rel.from);
        if (thing) results.push(thing);
      }
    }
    return results;
  }
};

// Typed collection accessor (db.Users, db.Posts, etc.)
const __dbCollectionProxy__ = new Proxy(db, {
  get: (target, prop) => {
    if (prop in target) return target[prop];
    // Return a collection accessor for the type
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
  context: {},
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

// Also expose as standalone
const api = $.api || {};
const search = $.search || db.search;
const track = $.track || (() => {});
const decide = $.decide || (() => {});
`
}
