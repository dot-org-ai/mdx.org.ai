/**
 * @mdxe/rpc - RPC protocol for MDX functions using capnweb
 *
 * Built on top of ai-functions RPC and RPCPromise
 */

// Re-export from ai-functions
export { RPC, RPCPromise } from 'ai-functions'

export interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}

export interface RPCFunction {
  name: string
  description?: string
  parameters?: Record<string, unknown>
  handler: (...args: unknown[]) => unknown | Promise<unknown>
}

export interface RPCServerOptions {
  /** MDX documents defining RPC functions */
  functions?: MDXLDDocument[]
  /** Direct function handlers */
  handlers?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>
  /** Port to listen on */
  port?: number
  /** Host to bind to */
  host?: string
  /** Enable CORS */
  cors?: boolean
}

export interface RPCClientOptions {
  /** Server URL */
  url: string
  /** Request timeout in ms */
  timeout?: number
  /** Custom headers */
  headers?: Record<string, string>
}

/**
 * Create an RPC server from MDX function documents
 */
export function createRPCServer(options: RPCServerOptions): RPCServer {
  return new RPCServer(options)
}

/**
 * Create an RPC client to connect to an RPC server
 */
export function createRPCClient<T extends Record<string, (...args: unknown[]) => unknown>>(
  options: RPCClientOptions
): RPCClient<T> {
  return new RPCClient<T>(options)
}

/**
 * RPC Server implementation
 */
export class RPCServer {
  private functions: Map<string, RPCFunction> = new Map()
  private options: RPCServerOptions

  constructor(options: RPCServerOptions) {
    this.options = options

    // Register functions from MDX documents
    if (options.functions) {
      for (const doc of options.functions) {
        this.registerFromDocument(doc)
      }
    }

    // Register direct handlers
    if (options.handlers) {
      for (const [name, handler] of Object.entries(options.handlers)) {
        this.register(name, handler)
      }
    }
  }

  /**
   * Register a function from an MDX document
   */
  registerFromDocument(doc: MDXLDDocument): void {
    const name = (doc.data.name as string) || doc.id || 'anonymous'
    const description = doc.data.description as string | undefined
    const parameters = doc.data.parameters as Record<string, unknown> | undefined

    // Extract handler from document (would need evaluation)
    const handler = async (..._args: unknown[]) => {
      // Placeholder - actual implementation would evaluate MDX
      throw new Error(`Function ${name} not implemented`)
    }

    this.functions.set(name, {
      name,
      description,
      parameters,
      handler,
    })
  }

  /**
   * Register a function handler
   */
  register(name: string, handler: (...args: unknown[]) => unknown | Promise<unknown>): void {
    this.functions.set(name, {
      name,
      handler,
    })
  }

  /**
   * Handle an RPC request
   */
  async handle(request: RPCRequest): Promise<RPCResponse> {
    const { method, params, id } = request

    const fn = this.functions.get(method)
    if (!fn) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
        id,
      }
    }

    try {
      const args = Array.isArray(params) ? params : [params]
      const result = await fn.handler(...args)
      return {
        jsonrpc: '2.0',
        result,
        id,
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id,
      }
    }
  }

  /**
   * Start the RPC server
   */
  async start(): Promise<void> {
    const { port = 3000, host = 'localhost' } = this.options

    // This would start an HTTP server handling JSON-RPC requests
    // Implementation depends on runtime (node, bun, workers)
    console.log(`RPC server starting on ${host}:${port}`)
  }

  /**
   * Get registered function names
   */
  getFunctions(): string[] {
    return Array.from(this.functions.keys())
  }

  /**
   * Get function metadata for schema generation
   */
  getSchema(): RPCSchema {
    const methods: Record<string, RPCMethodSchema> = {}

    for (const [name, fn] of this.functions) {
      methods[name] = {
        description: fn.description,
        parameters: fn.parameters,
      }
    }

    return { methods }
  }
}

/**
 * RPC Client implementation
 */
export class RPCClient<T extends Record<string, (...args: unknown[]) => unknown>> {
  private options: RPCClientOptions
  private nextId = 1

  constructor(options: RPCClientOptions) {
    this.options = options
  }

  /**
   * Call a remote function
   */
  async call<K extends keyof T>(
    method: K,
    ...params: Parameters<T[K]>
  ): Promise<Awaited<ReturnType<T[K]>>> {
    const request: RPCRequest = {
      jsonrpc: '2.0',
      method: method as string,
      params,
      id: this.nextId++,
    }

    const response = await fetch(this.options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.options.headers,
      },
      body: JSON.stringify(request),
      signal: this.options.timeout
        ? AbortSignal.timeout(this.options.timeout)
        : undefined,
    })

    const result: RPCResponse = await response.json()

    if (result.error) {
      throw new RPCError(result.error.code, result.error.message)
    }

    return result.result as Awaited<ReturnType<T[K]>>
  }

  /**
   * Create a proxy for method calls
   */
  get proxy(): T {
    return new Proxy({} as T, {
      get: (_target, prop: string) => {
        return (...args: unknown[]) => this.call(prop as keyof T, ...args as Parameters<T[keyof T]>)
      },
    })
  }
}

/**
 * RPC Error class
 */
export class RPCError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'RPCError'
  }
}

// JSON-RPC 2.0 types
export interface RPCRequest {
  jsonrpc: '2.0'
  method: string
  params?: unknown[] | Record<string, unknown>
  id?: string | number
}

export interface RPCResponse {
  jsonrpc: '2.0'
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
  id?: string | number
}

export interface RPCSchema {
  methods: Record<string, RPCMethodSchema>
}

export interface RPCMethodSchema {
  description?: string
  parameters?: Record<string, unknown>
}

// Export types
export type {
  MDXLDDocument,
  RPCFunction,
  RPCServerOptions,
  RPCClientOptions,
  RPCRequest,
  RPCResponse,
  RPCSchema,
  RPCMethodSchema,
}
