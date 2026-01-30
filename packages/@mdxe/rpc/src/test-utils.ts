/**
 * Test utilities for @mdxe/rpc tests
 *
 * Provides helpers for:
 * - Dynamic port allocation to avoid conflicts
 * - Test server lifecycle management
 * - Async testing utilities
 */

import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { RPCServer, type RPCRequest, type RPCResponse } from './index.js'

/**
 * Get an available port by binding to port 0 and letting the OS assign one.
 * This avoids port conflicts in parallel test runs.
 */
export function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, () => {
      const address = server.address() as AddressInfo
      const port = address.port
      server.close((err) => {
        if (err) reject(err)
        else resolve(port)
      })
    })
    server.on('error', reject)
  })
}

/**
 * Options for creating a test server
 */
export interface TestServerOptions {
  /** RPC server to handle requests */
  rpcServer?: RPCServer
  /** Request timeout in ms (for slow response tests) */
  responseDelay?: number
  /** Custom request handler */
  onRequest?: (req: RPCRequest) => void
}

/**
 * Test server context returned by createTestServer
 */
export interface TestServerContext {
  /** The underlying HTTP server */
  server: Server
  /** The port the server is listening on */
  port: number
  /** Base URL for the server (http://localhost:PORT) */
  url: string
  /** Close the server and clean up resources */
  close: () => Promise<void>
}

/**
 * Create a test HTTP server with automatic port allocation and cleanup.
 *
 * @example
 * ```ts
 * let ctx: TestServerContext
 *
 * beforeEach(async () => {
 *   const rpcServer = new RPCServer({})
 *   rpcServer.register('add', async (a, b) => a + b)
 *   ctx = await createTestServer({ rpcServer })
 * })
 *
 * afterEach(async () => {
 *   await ctx.close()
 * })
 *
 * it('should make RPC call', async () => {
 *   const client = new RPCClient({ url: ctx.url })
 *   const result = await client.call('add', 1, 2)
 *   expect(result).toBe(3)
 * })
 * ```
 */
export async function createTestServer(options: TestServerOptions = {}): Promise<TestServerContext> {
  const { rpcServer, responseDelay, onRequest } = options

  // Create a default RPC server if none provided
  const server = rpcServer || new RPCServer({})

  const httpServer = createServer(async (req, res) => {
    if (req.method === 'POST') {
      let body = ''
      for await (const chunk of req) {
        body += chunk
      }

      try {
        const request = JSON.parse(body) as RPCRequest

        // Call optional request hook
        if (onRequest) {
          onRequest(request)
        }

        // Add optional delay for timeout testing
        if (responseDelay) {
          await delay(responseDelay)
        }

        const response = await server.handle(request)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    } else {
      res.writeHead(405)
      res.end()
    }
  })

  // Start server on random available port
  const port = await new Promise<number>((resolve, reject) => {
    httpServer.listen(0, () => {
      const address = httpServer.address() as AddressInfo
      resolve(address.port)
    })
    httpServer.on('error', reject)
  })

  const url = `http://localhost:${port}`

  const close = async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  return {
    server: httpServer,
    port,
    url,
    close,
  }
}

/**
 * Wait for a condition to be true with timeout.
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Timeout and interval options
 * @throws Error if condition is not met within timeout
 *
 * @example
 * ```ts
 * await waitFor(() => element.isVisible())
 * await waitFor(() => counter.value === 10, { timeout: 5000 })
 * ```
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const result = await condition()
    if (result) {
      return
    }
    await delay(interval)
  }

  throw new Error(`waitFor: condition not met within ${timeout}ms`)
}

/**
 * Delay execution for specified milliseconds.
 * A more readable alternative to setTimeout in async code.
 *
 * @example
 * ```ts
 * await delay(100) // Wait 100ms
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Flush all pending promises in the microtask queue.
 * Useful for testing async code that uses Promise.resolve().
 *
 * @example
 * ```ts
 * myAsyncFunction()
 * await flushPromises()
 * expect(result).toBe('completed')
 * ```
 */
export async function flushPromises(): Promise<void> {
  // Use setImmediate if available (Node.js), otherwise setTimeout(0)
  return new Promise((resolve) => {
    if (typeof setImmediate !== 'undefined') {
      setImmediate(resolve)
    } else {
      setTimeout(resolve, 0)
    }
  })
}

/**
 * Retry a function until it succeeds or max attempts reached.
 * Useful for flaky operations that may need multiple attempts.
 *
 * @example
 * ```ts
 * const result = await retry(
 *   () => fetchWithRetry('/api/data'),
 *   { maxAttempts: 3, delay: 100 }
 * )
 * ```
 */
export async function retry<T>(
  fn: () => T | Promise<T>,
  options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay: delayMs = 100 } = options
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxAttempts) {
        await delay(delayMs)
      }
    }
  }

  throw lastError || new Error('Retry failed')
}
