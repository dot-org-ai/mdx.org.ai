/**
 * Tests for mock factories
 * RED PHASE: These tests define the expected behavior
 */

import { describe, it, expect, vi } from 'vitest'
import {
  createMockMiniflare,
  createMockWorkerLoader,
  createMockKVNamespace,
  createMockD1Database,
  createMockResponse,
  createMockRequest,
  createMockEnv,
} from '../src/mocks'

describe('Mock Factories', () => {
  describe('createMockMiniflare', () => {
    it('should create a mock Miniflare instance', () => {
      const mf = createMockMiniflare()

      expect(mf).toBeDefined()
      expect(mf.dispatchFetch).toBeDefined()
      expect(mf.dispose).toBeDefined()
    })

    it('should handle dispatchFetch and return a response', async () => {
      const mf = createMockMiniflare({
        script: 'export default { fetch: () => new Response("Hello") }',
      })

      const response = await mf.dispatchFetch('http://localhost/')
      expect(response).toBeDefined()
      expect(typeof response.text).toBe('function')
    })

    it('should support custom response handler', async () => {
      const mf = createMockMiniflare({
        onFetch: (url) => {
          if (url.includes('/api')) {
            return new Response(JSON.stringify({ data: 'test' }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }
          return new Response('Not Found', { status: 404 })
        },
      })

      const apiResponse = await mf.dispatchFetch('http://localhost/api')
      expect(apiResponse.status).toBe(200)

      const notFoundResponse = await mf.dispatchFetch('http://localhost/unknown')
      expect(notFoundResponse.status).toBe(404)
    })

    it('should support KV namespace binding', () => {
      const mf = createMockMiniflare({
        kvNamespaces: ['CONTENT', 'CACHE'],
      })

      const content = mf.getKVNamespace('CONTENT')
      expect(content).toBeDefined()
      expect(content.get).toBeDefined()
      expect(content.put).toBeDefined()
    })

    it('should support D1 database binding', () => {
      const mf = createMockMiniflare({
        d1Databases: ['DB'],
      })

      const db = mf.getD1Database('DB')
      expect(db).toBeDefined()
      expect(db.prepare).toBeDefined()
      expect(db.exec).toBeDefined()
    })

    it('should be disposable', async () => {
      const mf = createMockMiniflare()

      await expect(mf.dispose()).resolves.not.toThrow()
    })
  })

  describe('createMockWorkerLoader', () => {
    it('should create a mock worker loader', () => {
      const loader = createMockWorkerLoader()

      expect(loader).toBeDefined()
      expect(loader.loadWorker).toBeDefined()
    })

    it('should load a worker module and return an instance', async () => {
      const loader = createMockWorkerLoader()

      const instance = await loader.loadWorker({
        mainModule: 'entry.js',
        modules: {
          'entry.js': 'export function greet(name) { return `Hello, ${name}!` }',
        },
      })

      expect(instance).toBeDefined()
      expect(instance.call).toBeDefined()
      expect(instance.exports).toBeDefined()
      expect(instance.dispose).toBeDefined()
    })

    it('should call exported functions', async () => {
      const loader = createMockWorkerLoader({
        callHandler: async (name, args) => {
          if (name === 'greet') {
            return `Hello, ${args[0]}!`
          }
          if (name === 'add') {
            return (args[0] as number) + (args[1] as number)
          }
          return undefined
        },
      })

      const instance = await loader.loadWorker({
        mainModule: 'entry.js',
        modules: { 'entry.js': '' },
      })

      const greeting = await instance.call<string>('greet', 'World')
      expect(greeting).toBe('Hello, World!')

      const sum = await instance.call<number>('add', 2, 3)
      expect(sum).toBe(5)
    })

    it('should list exports', async () => {
      const loader = createMockWorkerLoader({
        exports: ['greet', 'add', 'multiply'],
      })

      const instance = await loader.loadWorker({
        mainModule: 'entry.js',
        modules: { 'entry.js': '' },
      })

      const exports = await instance.exports()
      expect(exports).toEqual(['greet', 'add', 'multiply'])
    })
  })

  describe('createMockKVNamespace', () => {
    it('should create a mock KV namespace', () => {
      const kv = createMockKVNamespace()

      expect(kv).toBeDefined()
      expect(kv.get).toBeDefined()
      expect(kv.put).toBeDefined()
      expect(kv.delete).toBeDefined()
      expect(kv.list).toBeDefined()
    })

    it('should store and retrieve values', async () => {
      const kv = createMockKVNamespace()

      await kv.put('key1', 'value1')
      const value = await kv.get('key1')

      expect(value).toBe('value1')
    })

    it('should return null for non-existent keys', async () => {
      const kv = createMockKVNamespace()

      const value = await kv.get('nonexistent')
      expect(value).toBeNull()
    })

    it('should delete keys', async () => {
      const kv = createMockKVNamespace()

      await kv.put('key1', 'value1')
      await kv.delete('key1')
      const value = await kv.get('key1')

      expect(value).toBeNull()
    })

    it('should list keys', async () => {
      const kv = createMockKVNamespace()

      await kv.put('key1', 'value1')
      await kv.put('key2', 'value2')
      const result = await kv.list()

      expect(result.keys).toHaveLength(2)
      expect(result.keys.map((k) => k.name)).toContain('key1')
      expect(result.keys.map((k) => k.name)).toContain('key2')
    })

    it('should support initial data', async () => {
      const kv = createMockKVNamespace({
        initialData: {
          existing: 'data',
        },
      })

      const value = await kv.get('existing')
      expect(value).toBe('data')
    })
  })

  describe('createMockD1Database', () => {
    it('should create a mock D1 database', () => {
      const db = createMockD1Database()

      expect(db).toBeDefined()
      expect(db.exec).toBeDefined()
      expect(db.prepare).toBeDefined()
    })

    it('should execute raw SQL', async () => {
      const db = createMockD1Database()

      await expect(db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)')).resolves.not.toThrow()
    })

    it('should prepare statements', () => {
      const db = createMockD1Database()

      const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
      expect(stmt).toBeDefined()
      expect(stmt.bind).toBeDefined()
      expect(stmt.first).toBeDefined()
      expect(stmt.all).toBeDefined()
      expect(stmt.run).toBeDefined()
    })

    it('should support query results', async () => {
      const db = createMockD1Database({
        queryResults: {
          'SELECT * FROM users': [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
        },
      })

      const stmt = db.prepare('SELECT * FROM users')
      const result = await stmt.all<{ id: number; name: string }>()

      expect(result.results).toHaveLength(2)
      expect(result.results[0].name).toBe('Alice')
    })

    it('should support first result', async () => {
      const db = createMockD1Database({
        queryResults: {
          'SELECT * FROM users WHERE id = ?': [{ id: 1, name: 'Alice' }],
        },
      })

      const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(1).first<{ id: number; name: string }>()

      expect(result).toEqual({ id: 1, name: 'Alice' })
    })
  })

  describe('createMockResponse', () => {
    it('should create a mock Response', () => {
      const response = createMockResponse('Hello World')

      expect(response).toBeInstanceOf(Response)
    })

    it('should support custom status', () => {
      const response = createMockResponse('Not Found', { status: 404 })

      expect(response.status).toBe(404)
    })

    it('should support custom headers', () => {
      const response = createMockResponse('{"data": true}', {
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should support JSON body helper', () => {
      const response = createMockResponse({ message: 'success' }, { json: true })

      expect(response.headers.get('Content-Type')).toContain('application/json')
    })
  })

  describe('createMockRequest', () => {
    it('should create a mock Request', () => {
      const request = createMockRequest('http://localhost/api')

      expect(request).toBeInstanceOf(Request)
      expect(request.url).toBe('http://localhost/api')
    })

    it('should support custom method', () => {
      const request = createMockRequest('http://localhost/api', { method: 'POST' })

      expect(request.method).toBe('POST')
    })

    it('should support custom headers', () => {
      const request = createMockRequest('http://localhost/api', {
        headers: { Authorization: 'Bearer token' },
      })

      expect(request.headers.get('Authorization')).toBe('Bearer token')
    })

    it('should support JSON body', () => {
      const request = createMockRequest('http://localhost/api', {
        method: 'POST',
        body: { data: 'test' },
        json: true,
      })

      expect(request.headers.get('Content-Type')).toContain('application/json')
    })
  })

  describe('createMockEnv', () => {
    it('should create a mock environment object', () => {
      const env = createMockEnv()

      expect(env).toBeDefined()
    })

    it('should include KV namespaces', () => {
      const env = createMockEnv({
        kvNamespaces: ['CONTENT', 'CACHE'],
      })

      expect(env.CONTENT).toBeDefined()
      expect(env.CACHE).toBeDefined()
    })

    it('should include D1 databases', () => {
      const env = createMockEnv({
        d1Databases: ['DB'],
      })

      expect(env.DB).toBeDefined()
    })

    it('should include custom bindings', () => {
      const env = createMockEnv({
        bindings: {
          API_KEY: 'secret',
          DEBUG: true,
        },
      })

      expect(env.API_KEY).toBe('secret')
      expect(env.DEBUG).toBe(true)
    })

    it('should include worker loader binding', () => {
      const env = createMockEnv({
        workerLoader: true,
      })

      expect(env.LOADER).toBeDefined()
      expect(env.LOADER.loadWorker).toBeDefined()
    })
  })
})
