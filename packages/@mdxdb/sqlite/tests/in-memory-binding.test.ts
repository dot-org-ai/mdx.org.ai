/**
 * In-memory binding tests (node pool)
 *
 * `createInMemoryBinding` from `@mdxdb/sqlite/miniflare` is the Node-side
 * stand-in for the MDXDatabase Durable Object namespace. These tests pin it
 * to the current _data/_rels RPC surface so it stays a faithful double for
 * the workerd-backed DO (see tests/workers/durable-object.test.ts).
 *
 * `createMiniflareBinding` (real miniflare + dist bundle) is deliberately not
 * exercised here: the DO itself is covered by the workers pool, and that path
 * would make the node pool depend on a prior `pnpm build` (see mdx-8je.44).
 *
 * Replaces the pre-rewrite tests/miniflare.test.ts, which targeted the API
 * removed in 19b37ab (mdx-8je.19).
 */

import { describe, it, expect } from 'vitest'
import { createInMemoryBinding } from '../src/miniflare.js'
import { MDXClient } from '../src/client.js'
import type { MDXDatabaseRPC } from '../src/types.js'

const NS = 'test.local'
const BASE = `https://${NS}`

type Binding = ReturnType<typeof createInMemoryBinding>
type InMemoryStub = MDXDatabaseRPC & { name?: string }

/**
 * The in-memory stub structurally implements MDXDatabaseRPC. Typing it that way
 * (rather than as DurableObjectStub<...>) keeps these tests independent of how
 * the RPC brand is declared in src/types.ts.
 */
function stubOf(binding: Binding, id: DurableObjectId): InMemoryStub {
  return binding.get(id) as unknown as InMemoryStub
}

function db(name = NS): InMemoryStub {
  const binding = createInMemoryBinding()
  return stubOf(binding, binding.idFromName(name))
}

describe('createInMemoryBinding namespace', () => {
  it('idFromName carries the name and get returns a stub bound to it', () => {
    const binding = createInMemoryBinding()
    const id = binding.idFromName(NS)
    expect(id.name).toBe(NS)
    expect(id.toString()).toBe(NS)
    const stub = stubOf(binding, id)
    expect(stub.$id()).toBe(BASE)
    expect(stub.name).toBe(NS)
  })

  it('keeps names as-is when they already carry a scheme', () => {
    const binding = createInMemoryBinding()
    expect(stubOf(binding, binding.idFromName('http://localhost:8787')).$id()).toBe(
      'http://localhost:8787'
    )
  })

  it('returns the same instance for the same name and isolates different names', async () => {
    const binding = createInMemoryBinding()
    const a1 = stubOf(binding, binding.idFromName('a.local'))
    const a2 = stubOf(binding, binding.idFromName('a.local'))
    const b = stubOf(binding, binding.idFromName('b.local'))

    await a1.create({ type: 'Post', id: 'x', data: {} })
    expect(await a2.get('https://a.local/Post/x')).not.toBeNull()
    expect(await b.list()).toEqual([])
  })

  it('newUniqueId / idFromString produce usable ids', async () => {
    const binding = createInMemoryBinding()
    const unique = binding.newUniqueId()
    expect(unique.toString().length).toBeGreaterThan(0)
    expect(stubOf(binding, unique).$id()).toBe(`https://${unique.toString()}`)

    const fromString = binding.idFromString('c.local')
    expect(stubOf(binding, fromString).$id()).toBe('https://c.local')
  })

  it('satisfies the MDXClient binding contract', async () => {
    const client = new MDXClient({ $id: NS, binding: createInMemoryBinding() })
    const post = await client.create({ type: 'Post', id: 'hello', data: { title: 'Hi' } })
    expect(post.url).toBe(`${BASE}/Post/hello`)
    expect((await client.get(post.url))?.data.title).toBe('Hi')
  })
})

describe('in-memory things', () => {
  it('create derives url from $id/type/id and stamps provenance + version 1', async () => {
    const stub = db()
    const before = Date.now()
    const thing = await stub.create({
      type: 'Post',
      id: 'hello',
      data: { title: 'Hello' },
      content: '# Hello',
      '@context': 'https://schema.org',
      by: 'alice',
      in: 'session-1',
    })

    expect(thing.url).toBe(`${BASE}/Post/hello`)
    expect(thing.type).toBe('Post')
    expect(thing.id).toBe('hello')
    expect(thing.data).toEqual({ title: 'Hello' })
    expect(thing.content).toBe('# Hello')
    expect(thing['@context']).toBe('https://schema.org')
    expect(thing.by).toBe('alice')
    expect(thing.in).toBe('session-1')
    expect(thing.version).toBe(1)
    expect(thing.at).toBeInstanceOf(Date)
    expect(thing.at.getTime()).toBeGreaterThanOrEqual(before - 1)
  })

  it('create generates an id when none is given', async () => {
    const stub = db()
    const thing = await stub.create({ type: 'Post', data: {} })
    expect(thing.id.length).toBeGreaterThan(0)
    expect(thing.url).toBe(`${BASE}/Post/${thing.id}`)
  })

  it('create rejects duplicates', async () => {
    const stub = db()
    await stub.create({ type: 'Post', id: 'dup', data: {} })
    await expect(stub.create({ type: 'Post', id: 'dup', data: {} })).rejects.toThrow(
      /already exists/
    )
  })

  it('get and getById resolve the same thing; missing returns null', async () => {
    const stub = db()
    const created = await stub.create({ type: 'User', id: 'u1', data: { name: 'A' } })
    const byUrl = await stub.get(created.url)
    const byId = await stub.getById('User', 'u1')
    expect(byUrl).toEqual(byId)
    expect(byUrl?.at).toBeInstanceOf(Date)
    expect(await stub.get(`${BASE}/User/missing`)).toBeNull()
    expect(await stub.getById('User', 'missing')).toBeNull()
  })

  it('update merges data, bumps version, and enforces optimistic concurrency', async () => {
    const stub = db()
    const t = await stub.create({ type: 'Post', id: 'p', data: { a: 1, b: 1 } })

    const v2 = await stub.update(t.url, { data: { b: 2 }, version: 1, by: 'bob' })
    expect(v2.data).toEqual({ a: 1, b: 2 })
    expect(v2.version).toBe(2)
    expect(v2.by).toBe('bob')
    expect((await stub.get(t.url))?.version).toBe(2)

    await expect(stub.update(t.url, { data: {}, version: 1 })).rejects.toThrow(/Version conflict/)
    await expect(stub.update(`${BASE}/Post/missing`, { data: {} })).rejects.toThrow(/not found/)
  })

  it('update replaces content only when provided', async () => {
    const stub = db()
    const t = await stub.create({ type: 'Doc', id: 'd', data: {}, content: 'one' })
    expect((await stub.update(t.url, { data: { x: 1 } })).content).toBe('one')
    expect((await stub.update(t.url, { content: 'two' })).content).toBe('two')
  })

  it('upsert creates then updates in place', async () => {
    const stub = db()
    const first = await stub.upsert({ type: 'User', id: 'u', data: { name: 'A' } })
    expect(first.version).toBe(1)
    const second = await stub.upsert({ type: 'User', id: 'u', data: { role: 'admin' } })
    expect(second.url).toBe(first.url)
    expect(second.version).toBe(2)
    expect(second.data).toEqual({ name: 'A', role: 'admin' })
    expect(await stub.list({ type: 'User' })).toHaveLength(1)
  })

  it('delete returns whether something was removed', async () => {
    const stub = db()
    const t = await stub.create({ type: 'Post', id: 'p', data: {} })
    expect(await stub.delete(t.url)).toBe(true)
    expect(await stub.get(t.url)).toBeNull()
    expect(await stub.delete(t.url)).toBe(false)
  })
})

describe('in-memory list', () => {
  async function seed() {
    const stub = db()
    await stub.create({ type: 'User', id: 'u1', data: { name: 'Carol', role: 'admin' } })
    await stub.create({ type: 'User', id: 'u2', data: { name: 'Alice', role: 'user' } })
    await stub.create({ type: 'User', id: 'u3', data: { name: 'Bob', role: 'user' } })
    await stub.create({ type: 'Post', id: 'p1', data: { title: 'Only post' } })
    return stub
  }

  it('lists everything by default and filters by type', async () => {
    const stub = await seed()
    expect(await stub.list()).toHaveLength(4)
    expect((await stub.list({ type: 'User' })).map((t) => t.type)).toEqual(['User', 'User', 'User'])
    expect(await stub.list({ type: 'Nope' })).toEqual([])
  })

  it('filters on data fields with where', async () => {
    const stub = await seed()
    const users = await stub.list({ type: 'User', where: { role: 'user' } })
    expect(users.map((u) => u.id).sort()).toEqual(['u2', 'u3'])
  })

  it('orders by a data field in either direction', async () => {
    const stub = await seed()
    const asc = await stub.list({ type: 'User', orderBy: 'name', order: 'asc' })
    expect(asc.map((u) => u.data.name)).toEqual(['Alice', 'Bob', 'Carol'])
    const desc = await stub.list({ type: 'User', orderBy: 'name', order: 'desc' })
    expect(desc.map((u) => u.data.name)).toEqual(['Carol', 'Bob', 'Alice'])
  })

  it('falls back to row columns when orderBy is not a data field', async () => {
    const stub = await seed()
    const byId = await stub.list({ type: 'User', orderBy: 'id', order: 'asc' })
    expect(byId.map((u) => u.id)).toEqual(['u1', 'u2', 'u3'])
  })

  it('paginates with limit and offset', async () => {
    const stub = await seed()
    const page = await stub.list({ type: 'User', orderBy: 'id', order: 'asc', limit: 2, offset: 1 })
    expect(page.map((u) => u.id)).toEqual(['u2', 'u3'])
  })

  it('returns Thing-shaped rows', async () => {
    const stub = await seed()
    const [post] = await stub.list({ type: 'Post' })
    expect(post).toMatchObject({ url: `${BASE}/Post/p1`, type: 'Post', id: 'p1', version: 1 })
    expect(post?.at).toBeInstanceOf(Date)
  })
})

describe('in-memory relationships', () => {
  async function graph() {
    const stub = db()
    const user = await stub.create({ type: 'User', id: 'u', data: {} })
    const p1 = await stub.create({ type: 'Post', id: 'p1', data: {} })
    const p2 = await stub.create({ type: 'Post', id: 'p2', data: {} })
    await stub.relate({ predicate: 'author', reverse: 'posts', from: p1.url, to: user.url })
    await stub.relate({ predicate: 'author', reverse: 'posts', from: p2.url, to: user.url })
    return { stub, user, p1, p2 }
  }

  it('relate returns the edge with provenance', async () => {
    const stub = db()
    const rel = await stub.relate({
      predicate: 'likes',
      reverse: 'likedBy',
      from: `${BASE}/User/a`,
      to: `${BASE}/Post/b`,
      data: { weight: 2 },
      by: 'alice',
      in: 'session',
      do: 'like',
    })
    expect(rel).toMatchObject({
      predicate: 'likes',
      reverse: 'likedBy',
      from: `${BASE}/User/a`,
      to: `${BASE}/Post/b`,
      data: { weight: 2 },
      by: 'alice',
      in: 'session',
      do: 'like',
    })
    expect(rel.id.length).toBeGreaterThan(0)
    expect(rel?.at).toBeInstanceOf(Date)
  })

  it('an edge is unique per (from, predicate, to)', async () => {
    const { stub, user, p1 } = await graph()
    await stub.relate({ predicate: 'author', reverse: 'posts', from: p1.url, to: user.url })
    expect(await stub.relationships(p1.url, { predicate: 'author' })).toHaveLength(1)
  })

  it('related follows the forward predicate', async () => {
    const { stub, user, p1 } = await graph()
    const authors = await stub.related(p1.url, 'author')
    expect(authors.map((t) => t.url)).toEqual([user.url])
    expect(await stub.related(p1.url, 'nope')).toEqual([])
  })

  it('relatedBy follows the reverse predicate', async () => {
    const { stub, user, p1, p2 } = await graph()
    const posts = await stub.relatedBy(user.url, 'posts')
    expect(posts.map((t) => t.url).sort()).toEqual([p1.url, p2.url].sort())
    expect(await stub.relatedBy(user.url, 'nope')).toEqual([])
  })

  it('relationships lists edges touching a url in either direction, with filters and paging', async () => {
    const { stub, user, p1 } = await graph()
    expect(await stub.relationships(user.url)).toHaveLength(2)
    expect(await stub.relationships(p1.url)).toHaveLength(1)
    expect(await stub.relationships(user.url, { reverse: 'posts' })).toHaveLength(2)
    expect(await stub.relationships(user.url, { predicate: 'other' })).toHaveLength(0)
    expect(await stub.relationships(user.url, { limit: 1 })).toHaveLength(1)
    expect(await stub.relationships(user.url, { offset: 1 })).toHaveLength(1)
    const [rel] = await stub.relationships(p1.url)
    expect(rel?.at).toBeInstanceOf(Date)
  })

  it('unrelate removes a single edge and reports whether it existed', async () => {
    const { stub, user, p1, p2 } = await graph()
    expect(await stub.unrelate(p1.url, 'author', user.url)).toBe(true)
    expect(await stub.unrelate(p1.url, 'author', user.url)).toBe(false)
    expect((await stub.relatedBy(user.url, 'posts')).map((t) => t.url)).toEqual([p2.url])
  })

  it('deleting a thing cascades to edges on both sides', async () => {
    const { stub, user, p1, p2 } = await graph()
    await stub.delete(p1.url)
    expect((await stub.relatedBy(user.url, 'posts')).map((t) => t.url)).toEqual([p2.url])

    await stub.delete(user.url)
    expect(await stub.relationships(p2.url)).toEqual([])
    expect(await stub.related(p2.url, 'author')).toEqual([])
  })

  it('related skips edges whose target no longer exists', async () => {
    const stub = db()
    const p = await stub.create({ type: 'Post', id: 'p', data: {} })
    await stub.relate({ predicate: 'author', from: p.url, to: `${BASE}/User/ghost` })
    expect(await stub.related(p.url, 'author')).toEqual([])
    expect(await stub.relationships(p.url)).toHaveLength(1)
  })
})
