/**
 * Mock Factories for MDX Testing
 *
 * Provides mock implementations of common dependencies like Miniflare,
 * Worker Loaders, KV namespaces, and D1 databases.
 */

import type {
  MockMiniflare,
  MockMiniflareOptions,
  MockWorkerLoader,
  MockWorkerInstance,
  MockKVNamespace,
  MockD1Database,
  MockD1Statement,
  MockLoaderOptions,
} from './types'

/**
 * Extended Miniflare options with fetch handler
 */
export interface MockMiniflareConfig extends MockMiniflareOptions {
  /** Custom fetch handler for routing */
  onFetch?: (url: string, init?: RequestInit) => Response | Promise<Response>
}

/**
 * Create a mock Miniflare instance for testing
 */
export function createMockMiniflare(options: MockMiniflareConfig = {}): MockMiniflare {
  const kvNamespaces = new Map<string, MockKVNamespace>()
  const d1Databases = new Map<string, MockD1Database>()

  // Initialize KV namespaces
  if (options.kvNamespaces) {
    for (const name of options.kvNamespaces) {
      kvNamespaces.set(name, createMockKVNamespace())
    }
  }

  // Initialize D1 databases
  if (options.d1Databases) {
    for (const name of options.d1Databases) {
      d1Databases.set(name, createMockD1Database())
    }
  }

  return {
    async dispatchFetch(url: string, init?: RequestInit): Promise<Response> {
      if (options.onFetch) {
        return options.onFetch(url, init)
      }
      // Default response
      return new Response('OK', { status: 200 })
    },

    async dispose(): Promise<void> {
      // Cleanup resources
      kvNamespaces.clear()
      d1Databases.clear()
    },

    getKVNamespace(name: string): MockKVNamespace {
      let kv = kvNamespaces.get(name)
      if (!kv) {
        kv = createMockKVNamespace()
        kvNamespaces.set(name, kv)
      }
      return kv
    },

    getD1Database(name: string): MockD1Database {
      let db = d1Databases.get(name)
      if (!db) {
        db = createMockD1Database()
        d1Databases.set(name, db)
      }
      return db
    },
  }
}

/**
 * Worker loader configuration with handlers
 */
export interface MockWorkerLoaderConfig extends MockLoaderOptions {
  /** Handler for function calls */
  callHandler?: (name: string, args: unknown[]) => Promise<unknown>
  /** List of exports to report */
  exports?: string[]
}

/**
 * Create a mock Worker Loader for testing
 */
export function createMockWorkerLoader(options: MockWorkerLoaderConfig = {}): MockWorkerLoader {
  return {
    async loadWorker(config: {
      mainModule: string
      modules: Record<string, string>
    }): Promise<MockWorkerInstance> {
      return {
        async call<T = unknown>(name: string, ...args: unknown[]): Promise<T> {
          if (options.callHandler) {
            return options.callHandler(name, args) as Promise<T>
          }
          throw new Error(`Function ${name} not found`)
        },

        async exports(): Promise<string[]> {
          return options.exports || []
        },

        async dispose(): Promise<void> {
          // Cleanup
        },
      }
    },
  }
}

/**
 * KV Namespace configuration
 */
export interface MockKVConfig {
  /** Initial data to populate the KV store */
  initialData?: Record<string, string>
}

/**
 * Create a mock KV Namespace for testing
 */
export function createMockKVNamespace(config: MockKVConfig = {}): MockKVNamespace {
  const store = new Map<string, string>(
    config.initialData ? Object.entries(config.initialData) : []
  )

  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null
    },

    async put(key: string, value: string): Promise<void> {
      store.set(key, value)
    },

    async delete(key: string): Promise<void> {
      store.delete(key)
    },

    async list(): Promise<{ keys: Array<{ name: string }> }> {
      return {
        keys: Array.from(store.keys()).map((name) => ({ name })),
      }
    },
  }
}

/**
 * D1 Database configuration
 */
export interface MockD1Config {
  /** Predefined query results */
  queryResults?: Record<string, unknown[]>
}

/**
 * Create a mock D1 Database for testing
 */
export function createMockD1Database(config: MockD1Config = {}): MockD1Database {
  const tables = new Map<string, unknown[]>()

  return {
    async exec(query: string): Promise<void> {
      // Simulate SQL execution
      // In a real implementation, this would parse and execute the query
    },

    prepare(query: string): MockD1Statement {
      let boundValues: unknown[] = []
      const results = config.queryResults?.[query] || []

      const statement: MockD1Statement = {
        bind(...values: unknown[]): MockD1Statement {
          boundValues = values
          return statement
        },

        async first<T = unknown>(): Promise<T | null> {
          const result = results[0]
          return (result as T) ?? null
        },

        async all<T = unknown>(): Promise<{ results: T[] }> {
          return { results: results as T[] }
        },

        async run(): Promise<{ success: boolean }> {
          return { success: true }
        },
      }

      return statement
    },
  }
}

/**
 * Response creation options
 */
export interface MockResponseOptions {
  /** HTTP status code */
  status?: number
  /** HTTP status text */
  statusText?: string
  /** Response headers */
  headers?: Record<string, string>
  /** Whether to JSON-stringify the body and set content-type */
  json?: boolean
}

/**
 * Create a mock Response for testing
 */
export function createMockResponse(
  body: unknown,
  options: MockResponseOptions = {}
): Response {
  let responseBody: string
  const headers = new Headers(options.headers)

  if (options.json || (typeof body === 'object' && body !== null)) {
    responseBody = JSON.stringify(body)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  } else {
    responseBody = String(body)
  }

  return new Response(responseBody, {
    status: options.status ?? 200,
    statusText: options.statusText,
    headers,
  })
}

/**
 * Request creation options
 */
export interface MockRequestOptions {
  /** HTTP method */
  method?: string
  /** Request headers */
  headers?: Record<string, string>
  /** Request body */
  body?: unknown
  /** Whether to JSON-stringify the body and set content-type */
  json?: boolean
}

/**
 * Create a mock Request for testing
 */
export function createMockRequest(
  url: string,
  options: MockRequestOptions = {}
): Request {
  const headers = new Headers(options.headers)
  let body: string | undefined

  if (options.body !== undefined) {
    if (options.json) {
      body = JSON.stringify(options.body)
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
    } else if (typeof options.body === 'string') {
      body = options.body
    } else {
      body = JSON.stringify(options.body)
    }
  }

  return new Request(url, {
    method: options.method ?? 'GET',
    headers,
    body,
  })
}

/**
 * Environment creation options
 */
export interface MockEnvOptions {
  /** KV namespace bindings */
  kvNamespaces?: string[]
  /** D1 database bindings */
  d1Databases?: string[]
  /** Custom bindings (env vars, secrets, etc.) */
  bindings?: Record<string, unknown>
  /** Include a worker loader binding */
  workerLoader?: boolean
  /** Worker loader configuration */
  workerLoaderConfig?: MockWorkerLoaderConfig
}

/**
 * Create a mock Cloudflare Workers environment for testing
 */
export function createMockEnv(options: MockEnvOptions = {}): Record<string, unknown> {
  const env: Record<string, unknown> = {}

  // Add KV namespaces
  if (options.kvNamespaces) {
    for (const name of options.kvNamespaces) {
      env[name] = createMockKVNamespace()
    }
  }

  // Add D1 databases
  if (options.d1Databases) {
    for (const name of options.d1Databases) {
      env[name] = createMockD1Database()
    }
  }

  // Add worker loader
  if (options.workerLoader) {
    env.LOADER = createMockWorkerLoader(options.workerLoaderConfig)
  }

  // Add custom bindings
  if (options.bindings) {
    Object.assign(env, options.bindings)
  }

  return env
}

/**
 * Create a mock ExecutionContext for Cloudflare Workers
 */
export function createMockExecutionContext(): {
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
} {
  const pendingPromises: Promise<unknown>[] = []

  return {
    waitUntil(promise: Promise<unknown>): void {
      pendingPromises.push(promise)
    },
    passThroughOnException(): void {
      // No-op in mock
    },
  }
}

/**
 * Create a mock cache for Cloudflare Workers
 */
export function createMockCache(): {
  match: (request: Request | string) => Promise<Response | undefined>
  put: (request: Request | string, response: Response) => Promise<void>
  delete: (request: Request | string) => Promise<boolean>
} {
  const store = new Map<string, Response>()

  function getKey(request: Request | string): string {
    return typeof request === 'string' ? request : request.url
  }

  return {
    async match(request: Request | string): Promise<Response | undefined> {
      const key = getKey(request)
      return store.get(key)?.clone()
    },

    async put(request: Request | string, response: Response): Promise<void> {
      const key = getKey(request)
      store.set(key, response.clone())
    },

    async delete(request: Request | string): Promise<boolean> {
      const key = getKey(request)
      return store.delete(key)
    },
  }
}
