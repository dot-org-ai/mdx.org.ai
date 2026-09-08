/**
 * MDXDatabase Durable Object tests (workers pool)
 *
 * Runs inside workerd via @cloudflare/vitest-pool-workers against a real
 * SQLite-backed Durable Object declared in wrangler.test.jsonc.
 *
 * Storage is shared for the run (see vitest.workers.config.ts), so every
 * test gets its own DO name and seeds what it needs.
 */

import { describe, it, expect } from 'vitest'
import { env, runInDurableObject } from 'cloudflare:test'
import { MDXClient } from '../../src/client.js'
import { MDXDatabase } from '../../src/durable-object.js'
import { TABLES } from '../../src/schema/index.js'

let seq = 0
/** Fresh DO name per test so tests never share storage. */
function uniqueNs(): string {
  return `t${++seq}-${Date.now().toString(36)}.local`
}

function stubFor(ns: string) {
  return env.MDXDB.get(env.MDXDB.idFromName(ns))
}

function clientFor(ns: string): MDXClient {
  return new MDXClient({ $id: ns, binding: env.MDXDB })
}

/** Open a client and resolve the DO's actual base URL. */
async function open(ns = uniqueNs()) {
  const db = clientFor(ns)
  const base = await stubFor(ns).$id()
  return { ns, db, base }
}

describe('MDXDatabase (workerd)', () => {
  describe('identity', () => {
    it('client.$id() echoes the configured $id', () => {
      const ns = uniqueNs()
      expect(clientFor(ns).$id()).toBe(ns)
    })

    it('$id() is an https URL with no trailing slash', async () => {
      const base = await stubFor(uniqueNs()).$id()
      expect(base).toMatch(/^https:\/\/[^/]+$/)
    })

    // Documented contract: "$id is derived from the DO name". Inside workerd the
    // DO sees ctx.id.name === undefined, so $id() falls back to the hex id.
    // Tracked as model gap mdx-8je.24; this it.fails flips to a failure once fixed.
    it.fails('derives $id from the DO name (ctx.id.name)', async () => {
      const ns = uniqueNs()
      const name = await runInDurableObject(stubFor(ns), (_i: MDXDatabase, state) => state.id.name)
      expect(name).toBe(ns)
      expect(await stubFor(ns).$id()).toBe(`https://${ns}`)
    })

    it('creates the _data and _rels tables on first use', async () => {
      const stub = stubFor(uniqueNs())
      await stub.list()
      const tables = await runInDurableObject(stub, (instance: MDXDatabase, state) => {
        expect(instance).toBeInstanceOf(MDXDatabase)
        return state.storage.sql
          .exec<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`)
          .toArray()
          .map((r) => r.name)
      })
      for (const table of TABLES) expect(tables).toContain(table)
    })
  })

  describe('thing operations', () => {
    it('creates and retrieves a thing', async () => {
      const { db, base } = await open()
      const thing = await db.create({ type: 'Post', id: 'hello', data: { title: 'Hello World' } })

      expect(thing.url).toBe(`${base}/Post/hello`)
      expect(thing.type).toBe('Post')
      expect(thing.id).toBe('hello')
      expect(thing.version).toBe(1)
      expect(thing.at).toBeInstanceOf(Date)

      const byUrl = await db.get(thing.url)
      expect(byUrl?.data.title).toBe('Hello World')

      const byId = await db.getById('Post', 'hello')
      expect(byId?.url).toBe(thing.url)
    })

    it('generates an id when none is given', async () => {
      const { db, base } = await open()
      const thing = await db.create({ type: 'Note', data: {} })
      expect(thing.id).toMatch(/^[a-z0-9]+_[a-z0-9]+$/)
      expect(thing.url).toBe(`${base}/Note/${thing.id}`)
    })

    it('returns null for a missing thing', async () => {
      const { db, base } = await open()
      expect(await db.get(`${base}/Post/nope`)).toBeNull()
    })

    it('rejects duplicate creates', async () => {
      const { db } = await open()
      await db.create({ type: 'Post', id: 'dup', data: {} })
      await expect(db.create({ type: 'Post', id: 'dup', data: {} })).rejects.toThrow(
        /already exists/
      )
    })

    it('hashes content and stores context', async () => {
      const { db } = await open()
      const thing = await db.create({
        type: 'Doc',
        id: 'c',
        data: {},
        content: '# Hello',
        '@context': 'https://schema.org',
      })
      expect(thing.hash).toBeTruthy()
      const stored = await db.get(thing.url)
      expect(stored?.content).toBe('# Hello')
      expect(stored?.hash).toBe(thing.hash)
      expect(stored?.['@context']).toBe('https://schema.org')
    })

    it('lists with type and where filters', async () => {
      const { db } = await open()
      await db.create({ type: 'User', id: 'u1', data: { name: 'Alice', role: 'admin' } })
      await db.create({ type: 'User', id: 'u2', data: { name: 'Bob', role: 'user' } })
      await db.create({ type: 'Post', id: 'p1', data: { title: 'x' } })

      expect((await db.list()).length).toBe(3)
      expect((await db.list({ type: 'User' })).length).toBe(2)

      const admins = await db.list({ type: 'User', where: { role: 'admin' } })
      expect(admins.map((u) => u.id)).toEqual(['u1'])
    })

    it('lists with ordering, offset and limit', async () => {
      const { db } = await open()
      await db.create({ type: 'User', id: 'u1', data: { name: 'Alice' } })
      await db.create({ type: 'User', id: 'u2', data: { name: 'Bob' } })
      await db.create({ type: 'User', id: 'u3', data: { name: 'Carol' } })

      const asc = await db.list({ type: 'User', orderBy: 'id', order: 'asc' })
      expect(asc.map((u) => u.id)).toEqual(['u1', 'u2', 'u3'])

      const desc = await db.list({ type: 'User', orderBy: 'id', order: 'desc' })
      expect(desc.map((u) => u.id)).toEqual(['u3', 'u2', 'u1'])

      const byData = await db.list({ type: 'User', orderBy: 'name', order: 'desc' })
      expect(byData[0]?.data.name).toBe('Carol')

      const page = await db.list({ type: 'User', orderBy: 'id', order: 'asc', offset: 1, limit: 1 })
      expect(page.map((u) => u.id)).toEqual(['u2'])
    })

    it('updates with merge and bumps version', async () => {
      const { db } = await open()
      const created = await db.create({ type: 'User', id: 'u1', data: { name: 'Alice', role: 'admin' } })
      const updated = await db.update(created.url, { data: { name: 'Alice Updated' } })

      expect(updated.data).toEqual({ name: 'Alice Updated', role: 'admin' })
      expect(updated.version).toBe(2)

      const stored = await db.get(created.url)
      expect(stored?.data.name).toBe('Alice Updated')
      expect(stored?.version).toBe(2)
    })

    it('enforces optimistic locking on update', async () => {
      const { db, base } = await open()
      const created = await db.create({ type: 'User', id: 'u1', data: {} })
      await expect(db.update(created.url, { data: { a: 1 }, version: 99 })).rejects.toThrow(
        /Version conflict/
      )
      await expect(db.update(`${base}/User/missing`, { data: {} })).rejects.toThrow(/not found/)
    })

    it('upserts: create then update', async () => {
      const { db } = await open()
      const first = await db.upsert({ type: 'User', id: 'u1', data: { name: 'A' } })
      expect(first.version).toBe(1)
      const second = await db.upsert({ type: 'User', id: 'u1', data: { name: 'B' } })
      expect(second.version).toBe(2)
      expect(second.data.name).toBe('B')
      expect((await db.list({ type: 'User' })).length).toBe(1)
    })

    it('deletes a thing and reports whether it existed', async () => {
      const { db } = await open()
      const t = await db.create({ type: 'Temp', id: 'x', data: {} })
      expect(await db.delete(t.url)).toBe(true)
      expect(await db.get(t.url)).toBeNull()
      expect(await db.delete(t.url)).toBe(false)
    })
  })

  describe('relationship operations', () => {
    async function seed() {
      const { db } = await open()
      const author = await db.create({ type: 'Author', id: 'jane', data: { name: 'Jane' } })
      const post = await db.create({ type: 'Post', id: 'p1', data: { title: 'My Post' } })
      const rel = await db.relate({
        predicate: 'author',
        reverse: 'posts',
        from: post.url,
        to: author.url,
        data: { since: 2024 },
      })
      return { db, author, post, rel }
    }

    it('relates with bidirectional predicates', async () => {
      const { db, author, post, rel } = await seed()

      expect(rel.id).toMatch(/^rel_/)
      expect(rel.predicate).toBe('author')
      expect(rel.reverse).toBe('posts')
      expect(rel.from).toBe(post.url)
      expect(rel.to).toBe(author.url)

      const authors = await db.related(post.url, 'author')
      expect(authors.map((a) => a.id)).toEqual(['jane'])

      const posts = await db.relatedBy(author.url, 'posts')
      expect(posts.map((p) => p.id)).toEqual(['p1'])

      expect(await db.related(author.url, 'author')).toEqual([])
    })

    it('lists and filters relationships for a thing', async () => {
      const { db, author, post } = await seed()
      await db.relate({ predicate: 'likes', from: author.url, to: post.url })

      const all = await db.relationships(post.url)
      expect(all.length).toBe(2)
      expect(all.find((r) => r.predicate === 'author')?.data).toEqual({ since: 2024 })

      const onlyAuthor = await db.relationships(post.url, { predicate: 'author' })
      expect(onlyAuthor.length).toBe(1)

      const byReverse = await db.relationships(author.url, { reverse: 'posts' })
      expect(byReverse.map((r) => r.from)).toEqual([post.url])
    })

    it('relate is idempotent per (from, predicate, to)', async () => {
      const { db, author, post } = await seed()
      await db.relate({ predicate: 'author', from: post.url, to: author.url })
      expect((await db.relationships(post.url, { predicate: 'author' })).length).toBe(1)
    })

    it('unrelates', async () => {
      const { db, author, post } = await seed()
      expect(await db.unrelate(post.url, 'author', author.url)).toBe(true)
      expect(await db.related(post.url, 'author')).toEqual([])
      expect(await db.unrelate(post.url, 'author', author.url)).toBe(false)
    })

    it('deleting a thing removes its relationships', async () => {
      const { db, author, post } = await seed()
      await db.delete(post.url)
      expect(await db.relationships(author.url)).toEqual([])
      expect(await db.relatedBy(author.url, 'posts')).toEqual([])
    })
  })

  describe('code execution', () => {
    const MDX = `---
title: Greeter
---

export function greet(name) {
  return \`Hello, \${name}!\`
}

export async function add(a, b) {
  return a + b
}

export const answer = 42

# Welcome
`

    it('compile rejects a missing thing', async () => {
      const { ns, base } = await open()
      await expect(stubFor(ns).compile(`${base}/Doc/missing`)).rejects.toThrow(/not found/)
    })

    it('compile rejects a thing without content', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'no-content', data: {} })
      await expect(stubFor(ns).compile(t.url)).rejects.toThrow(/no content to compile/)
    })

    it('call rejects a thing without content or code', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'empty', data: {} })
      await expect(stubFor(ns).call(t.url, { fn: 'greet' })).rejects.toThrow(/no executable code/)
    })

    it('env.LOADER (Worker Loader) is bound in the test pool', () => {
      expect(env.LOADER).toBeDefined()
      expect(typeof env.LOADER?.get).toBe('function')
    })

    it('compiles MDX content and caches the module on the row', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'greeter', data: {}, content: MDX })

      const compiled = await stubFor(ns).compile(t.url)
      expect(compiled.mainModule).toBe('entry.js')
      expect(Object.keys(compiled.modules)).toEqual(
        expect.arrayContaining(['entry.js', 'mdx.js', 'jsx-runtime'])
      )
      expect(compiled.data).toEqual({ title: 'Greeter' })
      expect(compiled.hash).toBe(t.hash)

      const stored = await db.get(t.url)
      expect(stored?.code).toBeTruthy()
      expect(JSON.parse(stored!.code!)).toEqual(compiled)
    })

    it('meta lists exported functions and the default MDX component', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'greeter', data: {}, content: MDX })

      const meta = await stubFor(ns).meta(t.url)
      expect(meta.hasDefault).toBe(true)
      expect(meta.functions).toEqual(expect.arrayContaining(['greet', 'add']))
      expect(meta.exports).toContain('answer')
      expect(meta.functions).not.toContain('answer')
    })

    it('meta returns an empty shape for a thing without content', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'blank', data: {} })
      expect(await stubFor(ns).meta(t.url)).toEqual({ functions: [], hasDefault: false, exports: [] })
    })

    it('call runs an exported function in a dynamically loaded isolate', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'greeter', data: {}, content: MDX })

      const hello = await stubFor(ns).call<string>(t.url, { fn: 'greet', args: ['World'] })
      expect(hello.result).toBe('Hello, World!')
      expect(hello.duration).toBeGreaterThanOrEqual(0)

      const sum = await stubFor(ns).call<number>(t.url, { fn: 'add', args: [2, 3] })
      expect(sum.result).toBe(5)
    })

    it('call surfaces isolate errors and unknown functions', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'greeter', data: {}, content: MDX })
      await expect(stubFor(ns).call(t.url, { fn: 'nope' })).rejects.toThrow(/Function not found: nope/)
      // `answer` is a value, not a function
      await expect(stubFor(ns).call(t.url, { fn: 'answer' })).rejects.toThrow(/Function not found/)
    })

    it('call recompiles after the content changes', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'v', data: {}, content: 'export const v = () => 1\n' })
      expect((await stubFor(ns).call<number>(t.url, { fn: 'v' })).result).toBe(1)

      await db.update(t.url, { content: 'export const v = () => 2\n' })
      const after = await db.get(t.url)
      expect(after?.code).toBeUndefined() // content change clears the cached module
      expect((await stubFor(ns).call<number>(t.url, { fn: 'v' })).result).toBe(2)
    })

    it('render invokes the default MDX export', async () => {
      const { ns, db } = await open()
      const t = await db.create({ type: 'Doc', id: 'greeter', data: {}, content: MDX })
      const out = await stubFor(ns).render(t.url, {})
      // The bundled JSX runtime produces a serialisable element tree, which
      // render() falls back to JSON-encoding (no HTML renderer in the isolate).
      expect(typeof out).toBe('string')
      expect(out).not.toBe('[object Object]')
      // The document body is a single heading, so the tree is that element
      // (a multi-node body would come back wrapped in a Fragment whose Symbol
      // `type` JSON drops). Frontmatter must not leak into the tree.
      const tree = JSON.parse(out) as { type?: string; props: { children?: unknown } }
      expect(tree).toEqual({ type: 'h1', props: { children: 'Welcome' } })
      expect(out).not.toContain('title: Greeter')
    })
  })

  describe('isolation', () => {
    it('separates data by DO name', async () => {
      const a = await open()
      const b = await open()
      const t = await a.db.create({ type: 'Post', id: 'only-a', data: {} })
      expect(await b.db.get(t.url)).toBeNull()
      expect((await b.db.list()).length).toBe(0)
      expect((await a.db.list()).length).toBe(1)
    })
  })
})
