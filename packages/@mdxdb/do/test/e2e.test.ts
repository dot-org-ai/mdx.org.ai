/**
 * E2E test for MDXDurableObject with rpc.do
 *
 * Tests the full stack:
 * - MDXDurableObject with capnweb RPC
 * - rpc.do client with capnweb transport
 * - CRUD operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { unstable_dev, type UnstableDevWorker } from 'wrangler'
import { RPC } from 'rpc.do'

describe('MDXDurableObject E2E', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('dist/durable-object.bundled.js', {
      experimental: { disableExperimentalWarning: true },
      local: true,
      persist: false,
    })
  }, 30000)

  afterAll(async () => {
    await worker?.stop()
  })

  it('should respond to HTTP requests', async () => {
    // GET returns 400 because RPC endpoint only accepts POST or WebSocket
    const resp = await worker.fetch('http://test.local/')
    expect(resp.status).toBe(400)
    const text = await resp.text()
    expect(text).toContain('POST or WebSocket')
  })

  it('should create a thing via RPC', async () => {
    const db = RPC(`http://${worker.address}:${worker.port}`)
    const thing = await db.create({
      type: 'Post',
      data: { title: 'Hello World', body: 'This is a test' },
    })

    expect(thing).toBeDefined()
    expect(thing.type).toBe('Post')
    expect(thing.data.title).toBe('Hello World')
    expect(thing.url).toContain('/Post/')
  })

  it('should get $id via RPC', async () => {
    const db = RPC(`http://${worker.address}:${worker.port}`)
    const id = await db.$id()
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    // $id should be a valid URL (e.g., https://doName)
    expect(id).toMatch(/^https?:\/\//)
  })

  it('should list things via RPC', async () => {
    const db = RPC(`http://${worker.address}:${worker.port}`)
    const things = await db.list({})
    expect(Array.isArray(things)).toBe(true)
  })

  it('should handle create and get in separate calls', async () => {
    // Create
    const db1 = RPC(`http://${worker.address}:${worker.port}`)
    const created = await db1.create({
      type: 'Article',
      data: { title: 'Test Article' },
    })
    const createdUrl = created.url

    // Get (separate client to avoid batch issues)
    const db2 = RPC(`http://${worker.address}:${worker.port}`)
    const retrieved = await db2.get(createdUrl)
    expect(retrieved).toBeDefined()
    expect(retrieved?.data.title).toBe('Test Article')
  })

  it('should handle create and delete in separate calls', async () => {
    // Create
    const db1 = RPC(`http://${worker.address}:${worker.port}`)
    const thing = await db1.create({
      type: 'Temp',
      data: { value: 123 },
    })
    const thingUrl = thing.url

    // Delete (separate client)
    const db2 = RPC(`http://${worker.address}:${worker.port}`)
    const deleted = await db2.delete(thingUrl)
    expect(deleted).toBe(true)

    // Verify deleted (separate client)
    const db3 = RPC(`http://${worker.address}:${worker.port}`)
    const retrieved = await db3.get(thingUrl)
    expect(retrieved).toBeNull()
  })

  it('should create relationships via RPC', async () => {
    // Create author
    const db1 = RPC(`http://${worker.address}:${worker.port}`)
    const author = await db1.create({
      type: 'Author',
      data: { name: 'Jane Doe' },
    })

    // Create post
    const db2 = RPC(`http://${worker.address}:${worker.port}`)
    const post = await db2.create({
      type: 'BlogPost',
      data: { title: 'My First Post' },
    })

    // Create relationship
    const db3 = RPC(`http://${worker.address}:${worker.port}`)
    const rel = await db3.relate({
      predicate: 'author',
      reverse: 'posts',
      from: post.url,
      to: author.url,
    })

    expect(rel.predicate).toBe('author')
    expect(rel.from).toBe(post.url)
    expect(rel.to).toBe(author.url)
  })
})
