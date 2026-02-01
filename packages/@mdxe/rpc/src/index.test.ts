import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer, type Server } from 'node:http'
import {
  createRPCServer,
  createRPCClient,
  RPCServer,
  RPCClient,
  RPCError,
  type MDXLDDocument,
  type RPCRequest,
  type RPCResponse,
} from './index.js'
import { createTestServer, type TestServerContext, delay } from './test-utils.js'

describe('@mdxe/rpc', () => {
  describe('module exports', () => {
    it('should export all required functions and classes', () => {
      expect(createRPCServer).toBeDefined()
      expect(createRPCClient).toBeDefined()
      expect(RPCServer).toBeDefined()
      expect(RPCClient).toBeDefined()
      expect(RPCError).toBeDefined()
    })

    it('should load module successfully', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
      expect(mod.createRPCServer).toBeDefined()
      expect(mod.createRPCClient).toBeDefined()
    })
  })

  describe('createRPCServer', () => {
    it('should create an RPCServer instance', () => {
      const server = createRPCServer({})
      expect(server).toBeInstanceOf(RPCServer)
    })

    it('should accept handlers in options', () => {
      const handler = async (a: number, b: number) => a + b
      const server = createRPCServer({
        handlers: {
          testMethod: handler,
        },
      })
      expect(server).toBeInstanceOf(RPCServer)
      expect(server.getFunctions()).toContain('testMethod')
    })

    it('should accept MDX function documents', () => {
      const doc: MDXLDDocument = {
        id: 'test-function',
        data: {
          name: 'testFunction',
          description: 'A test function',
        },
        content: 'Test content',
      }
      const server = createRPCServer({
        functions: [doc],
      })
      expect(server.getFunctions()).toContain('testFunction')
    })

    it('should accept port and host options', () => {
      // Using port 0 allows OS to pick an available port
      const server = createRPCServer({
        port: 0,
        host: '0.0.0.0',
      })
      expect(server).toBeInstanceOf(RPCServer)
    })

    it('should accept CORS option', () => {
      const server = createRPCServer({
        cors: true,
      })
      expect(server).toBeInstanceOf(RPCServer)
    })
  })

  describe('RPCServer', () => {
    let server: RPCServer

    beforeEach(() => {
      server = new RPCServer({})
    })

    describe('register', () => {
      it('should register a function handler', () => {
        const handler = async (x: number) => x * 2
        server.register('myMethod', handler)
        expect(server.getFunctions()).toContain('myMethod')
      })

      it('should allow multiple function registrations', () => {
        server.register('method1', async () => 'result1')
        server.register('method2', async () => 'result2')
        server.register('method3', async () => 'result3')
        expect(server.getFunctions()).toHaveLength(3)
      })

      it('should overwrite existing function with same name', () => {
        server.register('myMethod', async () => 'first')
        server.register('myMethod', async () => 'second')
        expect(server.getFunctions()).toHaveLength(1)
      })
    })

    describe('registerFromDocument', () => {
      it('should register function from MDX document', () => {
        const doc: MDXLDDocument = {
          data: {
            name: 'documentFunction',
            description: 'Function from document',
          },
          content: 'Content',
        }
        server.registerFromDocument(doc)
        expect(server.getFunctions()).toContain('documentFunction')
      })

      it('should use document ID as function name if name not provided', () => {
        const doc: MDXLDDocument = {
          id: 'my-function-id',
          data: {},
          content: 'Content',
        }
        server.registerFromDocument(doc)
        expect(server.getFunctions()).toContain('my-function-id')
      })

      it('should register as "anonymous" if neither name nor id provided', () => {
        const doc: MDXLDDocument = {
          data: {},
          content: 'Content',
        }
        server.registerFromDocument(doc)
        expect(server.getFunctions()).toContain('anonymous')
      })

      it('should handle document with parameters', () => {
        const doc: MDXLDDocument = {
          data: {
            name: 'paramFunction',
            parameters: {
              type: 'object',
              properties: {
                arg1: { type: 'string' },
              },
            },
          },
          content: 'Content',
        }
        server.registerFromDocument(doc)
        const schema = server.getSchema()
        expect(schema.methods.paramFunction.parameters).toBeDefined()
      })
    })

    describe('handle', () => {
      it('should handle valid RPC request', async () => {
        let handlerCalled = false
        const handler = async () => {
          handlerCalled = true
          return 'success'
        }
        server.register('testMethod', handler)

        const request: RPCRequest = {
          jsonrpc: '2.0',
          method: 'testMethod',
          params: [],
          id: 1,
        }

        const response = await server.handle(request)
        expect(response.jsonrpc).toBe('2.0')
        expect(response.result).toBe('success')
        expect(response.id).toBe(1)
        expect(handlerCalled).toBe(true)
      })

      it('should handle async function handlers', async () => {
        const handler = async () => {
          // Use a slightly longer delay to be reliable across systems
          await delay(50)
          return 'async success'
        }
        server.register('asyncMethod', handler)

        const request: RPCRequest = {
          jsonrpc: '2.0',
          method: 'asyncMethod',
          params: [],
          id: 2,
        }

        const response = await server.handle(request)
        expect(response.result).toBe('async success')
      })

      it('should return error for method not found', async () => {
        const request: RPCRequest = {
          jsonrpc: '2.0',
          method: 'nonExistentMethod',
          params: [],
          id: 3,
        }

        const response = await server.handle(request)
        expect(response.error).toBeDefined()
        expect(response.error?.code).toBe(-32601)
        expect(response.error?.message).toContain('Method not found')
      })

      it('should handle array params', async () => {
        let receivedArgs: number[] = []
        const handler = async (a: number, b: number) => {
          receivedArgs = [a, b]
          return a + b
        }
        server.register('add', handler)

        const request: RPCRequest = {
          jsonrpc: '2.0',
          method: 'add',
          params: [5, 3],
          id: 4,
        }

        const response = await server.handle(request)
        expect(response.result).toBe(8)
        expect(receivedArgs).toEqual([5, 3])
      })

      it('should handle object params', async () => {
        let receivedParams: { name: string } | null = null
        const handler = async (params: { name: string }) => {
          receivedParams = params
          return `Hello ${params.name}`
        }
        server.register('greet', handler)

        const request: RPCRequest = {
          jsonrpc: '2.0',
          method: 'greet',
          params: { name: 'World' },
          id: 5,
        }

        const response = await server.handle(request)
        expect(response.result).toBe('Hello World')
        expect(receivedParams).toEqual({ name: 'World' })
      })

      it('should handle function errors gracefully', async () => {
        const handler = async () => {
          throw new Error('Function error')
        }
        server.register('errorMethod', handler)

        const request: RPCRequest = {
          jsonrpc: '2.0',
          method: 'errorMethod',
          params: [],
          id: 6,
        }

        const response = await server.handle(request)
        expect(response.error).toBeDefined()
        expect(response.error?.code).toBe(-32603)
        expect(response.error?.message).toBe('Function error')
      })

      it('should handle non-Error exceptions', async () => {
        const handler = async () => {
          throw 'String error'
        }
        server.register('stringError', handler)

        const request: RPCRequest = {
          jsonrpc: '2.0',
          method: 'stringError',
          params: [],
          id: 7,
        }

        const response = await server.handle(request)
        expect(response.error).toBeDefined()
        expect(response.error?.code).toBe(-32603)
        expect(response.error?.message).toBe('Internal error')
      })

      it('should preserve request id in response', async () => {
        server.register('test', async () => 'result')

        const stringId: RPCRequest = {
          jsonrpc: '2.0',
          method: 'test',
          id: 'string-id',
        }

        const response1 = await server.handle(stringId)
        expect(response1.id).toBe('string-id')

        const numberId: RPCRequest = {
          jsonrpc: '2.0',
          method: 'test',
          id: 42,
        }

        const response2 = await server.handle(numberId)
        expect(response2.id).toBe(42)
      })
    })

    describe('getFunctions', () => {
      it('should return empty array when no functions registered', () => {
        expect(server.getFunctions()).toEqual([])
      })

      it('should return all registered function names', () => {
        server.register('func1', async () => 'result1')
        server.register('func2', async () => 'result2')
        server.register('func3', async () => 'result3')
        const functions = server.getFunctions()
        expect(functions).toHaveLength(3)
        expect(functions).toContain('func1')
        expect(functions).toContain('func2')
        expect(functions).toContain('func3')
      })
    })

    describe('getSchema', () => {
      it('should return schema with all registered methods', () => {
        server.register('method1', async () => 'result1')
        server.register('method2', async () => 'result2')
        const schema = server.getSchema()
        expect(schema.methods).toHaveProperty('method1')
        expect(schema.methods).toHaveProperty('method2')
      })

      it('should include method descriptions in schema', () => {
        const doc: MDXLDDocument = {
          data: {
            name: 'describedMethod',
            description: 'This is a test method',
          },
          content: 'Content',
        }
        server.registerFromDocument(doc)
        const schema = server.getSchema()
        expect(schema.methods.describedMethod.description).toBe('This is a test method')
      })

      it('should include method parameters in schema', () => {
        const doc: MDXLDDocument = {
          data: {
            name: 'paramMethod',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
            },
          },
          content: 'Content',
        }
        server.registerFromDocument(doc)
        const schema = server.getSchema()
        expect(schema.methods.paramMethod.parameters).toEqual({
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        })
      })
    })

    describe('start', () => {
      it('should start with default options', async () => {
        const logs: string[] = []
        const originalLog = console.log
        console.log = (...args: unknown[]) => {
          logs.push(args.join(' '))
        }

        await server.start()
        expect(logs.some(log => log.includes('RPC server starting on localhost:3000'))).toBe(true)

        console.log = originalLog
      })

      it('should start with custom port and host', async () => {
        const customServer = new RPCServer({
          port: 8080,
          host: '0.0.0.0',
        })

        const logs: string[] = []
        const originalLog = console.log
        console.log = (...args: unknown[]) => {
          logs.push(args.join(' '))
        }

        await customServer.start()
        expect(logs.some(log => log.includes('RPC server starting on 0.0.0.0:8080'))).toBe(true)

        console.log = originalLog
      })
    })
  })

  describe('createRPCClient', () => {
    it('should create an RPCClient instance', () => {
      const client = createRPCClient({ url: 'http://localhost:3000' })
      expect(client).toBeInstanceOf(RPCClient)
    })

    it('should accept timeout option', () => {
      const client = createRPCClient({
        url: 'http://localhost:3000',
        timeout: 5000,
      })
      expect(client).toBeInstanceOf(RPCClient)
    })

    it('should accept custom headers', () => {
      const client = createRPCClient({
        url: 'http://localhost:3000',
        headers: {
          Authorization: 'Bearer token',
        },
      })
      expect(client).toBeInstanceOf(RPCClient)
    })
  })

  describe('RPCClient with real HTTP server', () => {
    let testServer: TestServerContext
    let rpcServer: RPCServer

    beforeEach(async () => {
      // Create RPC server with real handlers
      rpcServer = new RPCServer({})
      rpcServer.register('add', async (a: number, b: number) => a + b)
      rpcServer.register('greet', async (name: string) => `Hello ${name}`)
      rpcServer.register('echo', async (msg: string) => msg)
      rpcServer.register('error', async () => {
        throw new Error('Test error')
      })

      // Use test utilities for automatic port allocation and cleanup
      testServer = await createTestServer({ rpcServer })
    })

    afterEach(async () => {
      await testServer.close()
    })

    describe('call', () => {
      it('should make RPC call with correct request format', async () => {
        const client = new RPCClient<{
          add: (a: number, b: number) => number
        }>({
          url: testServer.url,
        })

        const result = await client.call('add', 2, 3)
        expect(result).toBe(5)
      })

      it('should increment request id for each call', async () => {
        const client = new RPCClient<{
          echo: (msg: string) => string
        }>({
          url: testServer.url,
        })

        const result1 = await client.call('echo', 'first')
        const result2 = await client.call('echo', 'second')

        expect(result1).toBe('first')
        expect(result2).toBe('second')
      })

      it('should throw RPCError on error response', async () => {
        const client = new RPCClient<{
          nonExistent: () => void
        }>({
          url: testServer.url,
        })

        await expect(client.call('nonExistent')).rejects.toThrow(RPCError)
        await expect(client.call('nonExistent')).rejects.toThrow('Method not found')
      })

      it('should throw RPCError on function error', async () => {
        const client = new RPCClient<{
          error: () => void
        }>({
          url: testServer.url,
        })

        await expect(client.call('error')).rejects.toThrow(RPCError)
        await expect(client.call('error')).rejects.toThrow('Test error')
      })

      it('should include custom headers in request', async () => {
        // Create a new HTTP server that checks headers using test utilities
        let receivedHeaders: Record<string, string | string[] | undefined> = {}

        const headerTestServer = await createTestServer({
          rpcServer,
          onRequest: () => {
            // Headers are captured via the test server's request handling
          },
        })

        // Override to capture headers - create custom server for header testing
        await headerTestServer.close()

        const headerServer = createServer(async (req, res) => {
          receivedHeaders = req.headers

          let body = ''
          for await (const chunk of req) {
            body += chunk
          }

          const request = JSON.parse(body) as RPCRequest
          const response = await rpcServer.handle(request)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        })

        const headerPort = await new Promise<number>((resolve) => {
          headerServer.listen(0, () => {
            const address = headerServer.address()
            if (address && typeof address === 'object') {
              resolve(address.port)
            }
          })
        })

        try {
          const clientWithHeaders = new RPCClient<{
            echo: (msg: string) => string
          }>({
            url: `http://localhost:${headerPort}`,
            headers: {
              Authorization: 'Bearer token',
              'X-Custom': 'value',
            },
          })

          await clientWithHeaders.call('echo', 'test')

          expect(receivedHeaders['authorization']).toBe('Bearer token')
          expect(receivedHeaders['x-custom']).toBe('value')
          expect(receivedHeaders['content-type']).toBe('application/json')
        } finally {
          await new Promise<void>((resolve, reject) => {
            headerServer.close((err) => {
              if (err) reject(err)
              else resolve()
            })
          })
        }
      })

      it('should handle timeout option', async () => {
        // Create a slow server using test utilities with a 500ms delay
        // Use a larger delay to be reliable (500ms) and a larger timeout (100ms)
        // to avoid flakiness on slower CI systems
        const slowTestServer = await createTestServer({
          rpcServer,
          responseDelay: 500, // Server takes 500ms to respond
        })

        try {
          const clientWithTimeout = new RPCClient<{
            echo: (msg: string) => string
          }>({
            url: slowTestServer.url,
            timeout: 100, // 100ms timeout - will expire before 500ms response
          })

          await expect(clientWithTimeout.call('echo', 'test')).rejects.toThrow()
        } finally {
          await slowTestServer.close()
        }
      })
    })

    describe('proxy', () => {
      it('should create proxy for method calls', async () => {
        const client = new RPCClient<{
          greet: (name: string) => string
        }>({
          url: testServer.url,
        })

        const proxy = client.proxy
        const result = await proxy.greet('World')

        expect(result).toBe('Hello World')
      })

      it('should handle multiple proxy calls', async () => {
        const client = new RPCClient<{
          add: (a: number, b: number) => number
          greet: (name: string) => string
        }>({
          url: testServer.url,
        })

        const proxy = client.proxy
        const result1 = await proxy.add(1, 2)
        const result2 = await proxy.greet('Alice')

        expect(result1).toBe(3)
        expect(result2).toBe('Hello Alice')
      })
    })
  })

  describe('RPCError', () => {
    it('should create error with code and message', () => {
      const error = new RPCError(-32601, 'Method not found')
      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe(-32601)
      expect(error.message).toBe('Method not found')
      expect(error.name).toBe('RPCError')
    })

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new RPCError(-32603, 'Internal error')
      }).toThrow(RPCError)

      try {
        throw new RPCError(-32700, 'Parse error')
      } catch (e) {
        expect(e).toBeInstanceOf(RPCError)
        if (e instanceof RPCError) {
          expect(e.code).toBe(-32700)
          expect(e.message).toBe('Parse error')
        }
      }
    })
  })

  describe('type definitions', () => {
    it('should export RPC and RPCPromise types from ai-functions', async () => {
      const mod = await import('./index.js')
      // Type exports are compile-time, but we can verify the import succeeds
      expect(mod).toBeDefined()
    })

    it('should have proper MDXLDDocument type', () => {
      const doc: MDXLDDocument = {
        id: 'test',
        type: 'Function',
        context: 'https://schema.org',
        data: { name: 'test' },
        content: 'content',
      }
      expect(doc.id).toBe('test')
      expect(doc.type).toBe('Function')
    })

    it('should support array types in MDXLDDocument', () => {
      const doc: MDXLDDocument = {
        type: ['Function', 'SoftwareSourceCode'],
        data: {},
        content: '',
      }
      expect(Array.isArray(doc.type)).toBe(true)
    })

    it('should support context as string or object', () => {
      const docWithString: MDXLDDocument = {
        context: 'https://schema.org',
        data: {},
        content: '',
      }
      expect(typeof docWithString.context).toBe('string')

      const docWithObject: MDXLDDocument = {
        context: { '@vocab': 'https://schema.org' },
        data: {},
        content: '',
      }
      expect(typeof docWithObject.context).toBe('object')
    })
  })

  describe('JSON-RPC 2.0 protocol compliance', () => {
    let server: RPCServer

    beforeEach(() => {
      server = new RPCServer({})
      server.register('echo', async (msg: string) => msg)
    })

    it('should handle notification (request without id)', async () => {
      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'echo',
        params: ['test'],
        // No id - this is a notification
      }

      const response = await server.handle(request)
      // Notifications should still return a response with undefined id
      expect(response.jsonrpc).toBe('2.0')
      expect(response.id).toBeUndefined()
    })

    it('should handle request with undefined params', async () => {
      server.register('noParams', async () => 'no params')
      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'noParams',
        id: 1,
      }

      const response = await server.handle(request)
      expect(response.result).toBe('no params')
    })

    it('should handle request with null params', async () => {
      server.register('nullParams', async (param: unknown) => param === null ? 'was null' : 'not null')
      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'nullParams',
        params: [null],
        id: 2,
      }

      const response = await server.handle(request)
      expect(response.result).toBe('was null')
    })

    it('should handle empty object params', async () => {
      server.register('emptyObj', async (params: Record<string, unknown>) => {
        return Object.keys(params).length === 0 ? 'empty' : 'not empty'
      })
      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'emptyObj',
        params: {},
        id: 3,
      }

      const response = await server.handle(request)
      expect(response.result).toBe('empty')
    })

    it('should handle empty array params', async () => {
      server.register('emptyArray', async () => 'called')
      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'emptyArray',
        params: [],
        id: 4,
      }

      const response = await server.handle(request)
      expect(response.result).toBe('called')
    })

    it('should return method not found error with correct code (-32601)', async () => {
      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'unknownMethod',
        id: 5,
      }

      const response = await server.handle(request)
      expect(response.error?.code).toBe(-32601)
    })

    it('should return internal error code (-32603) on handler exceptions', async () => {
      server.register('throws', async () => {
        throw new Error('Intentional error')
      })

      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'throws',
        id: 6,
      }

      const response = await server.handle(request)
      expect(response.error?.code).toBe(-32603)
    })
  })

  describe('server initialization edge cases', () => {
    it('should handle empty options', () => {
      const server = new RPCServer({})
      expect(server.getFunctions()).toEqual([])
    })

    it('should register both functions and handlers simultaneously', () => {
      const doc: MDXLDDocument = {
        data: { name: 'docFunction' },
        content: '',
      }
      const server = new RPCServer({
        functions: [doc],
        handlers: {
          handlerFunction: async () => 'result',
        },
      })
      const functions = server.getFunctions()
      expect(functions).toContain('docFunction')
      expect(functions).toContain('handlerFunction')
      expect(functions).toHaveLength(2)
    })

    it('should handle multiple MDX documents', () => {
      const docs: MDXLDDocument[] = [
        { data: { name: 'func1' }, content: '' },
        { data: { name: 'func2' }, content: '' },
        { data: { name: 'func3' }, content: '' },
      ]
      const server = new RPCServer({ functions: docs })
      expect(server.getFunctions()).toHaveLength(3)
    })
  })

  describe('RPCError edge cases', () => {
    it('should have correct error name', () => {
      const error = new RPCError(-32000, 'Custom error')
      expect(error.name).toBe('RPCError')
    })

    it('should handle standard JSON-RPC error codes', () => {
      const parseError = new RPCError(-32700, 'Parse error')
      const invalidRequest = new RPCError(-32600, 'Invalid Request')
      const methodNotFound = new RPCError(-32601, 'Method not found')
      const invalidParams = new RPCError(-32602, 'Invalid params')
      const internalError = new RPCError(-32603, 'Internal error')

      expect(parseError.code).toBe(-32700)
      expect(invalidRequest.code).toBe(-32600)
      expect(methodNotFound.code).toBe(-32601)
      expect(invalidParams.code).toBe(-32602)
      expect(internalError.code).toBe(-32603)
    })

    it('should support server error codes (-32000 to -32099)', () => {
      const serverError = new RPCError(-32000, 'Server error')
      expect(serverError.code).toBe(-32000)
      expect(serverError.message).toBe('Server error')
    })
  })

  describe('synchronous handler support', () => {
    let server: RPCServer

    beforeEach(() => {
      server = new RPCServer({})
    })

    it('should handle synchronous function handlers', async () => {
      // Even though handler is sync, server.handle is async
      server.register('syncAdd', (a: number, b: number) => a + b)

      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'syncAdd',
        params: [3, 4],
        id: 1,
      }

      const response = await server.handle(request)
      expect(response.result).toBe(7)
    })

    it('should handle synchronous handlers that throw', async () => {
      server.register('syncThrow', () => {
        throw new Error('Sync error')
      })

      const request: RPCRequest = {
        jsonrpc: '2.0',
        method: 'syncThrow',
        id: 2,
      }

      const response = await server.handle(request)
      expect(response.error?.message).toBe('Sync error')
    })
  })
})
