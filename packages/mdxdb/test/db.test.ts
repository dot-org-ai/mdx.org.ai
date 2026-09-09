import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryProvider } from 'ai-database'
import { DB, DOProvider, isSchemaAware } from '../src/index.js'
import { FakeNamespace } from './helpers/fake-do.js'

const schema = {
  Post: {
    title: 'string',
    content: 'markdown',
    author: 'Author.posts', // Creates Post.author -> Author AND Author.posts -> Post[]
  },
  Author: {
    name: 'string',
    email: 'string',
    // posts: Post[] auto-created from backref
  },
}

describe('DB()', () => {
  const saved = process.env['DATABASE_URL']
  beforeEach(() => {
    delete process.env['DATABASE_URL']
  })
  afterEach(() => {
    if (saved === undefined) delete process.env['DATABASE_URL']
    else process.env['DATABASE_URL'] = saved
  })

  it('is synchronous and resolves the provider on first use', async () => {
    const db = DB(schema, { url: ':memory:' })
    expect(typeof db.Post.create).toBe('function')
    const provider = await db.$provider()
    // The wrapper sits in front of the memory provider (prototype chain).
    expect(Object.getPrototypeOf(provider)).toBeInstanceOf(MemoryProvider)
  })

  it('resolves from process.env.DATABASE_URL when no url/env is given', async () => {
    process.env['DATABASE_URL'] = ':memory:'
    const db = DB(schema)
    expect(Object.getPrototypeOf(await db.$provider())).toBeInstanceOf(MemoryProvider)
  })

  it('resolves do:// from a Workers env (env.DATABASE_URL + env.MDXDB)', async () => {
    const MDXDB = new FakeNamespace()
    const db = DB(schema, { env: { DATABASE_URL: 'do://headless.ly', MDXDB } })
    const provider = await db.$provider()
    expect(Object.getPrototypeOf(provider)).toBeInstanceOf(DOProvider)
    expect(isSchemaAware(provider)).toBe(true)

    await db.Author.create('john', { name: 'John', email: 'john@example.com' })
    await db.Post.create('hello-world', { title: 'Hello', content: 'Hi', author: 'john' })

    // The DO holds bidirectional edges, not just a foreign key.
    const fake = MDXDB.get(MDXDB.idFromName('headless.ly'))
    expect(fake.edges()).toEqual([
      expect.objectContaining({ predicate: 'author', reverse: 'posts', from: 'https://headless.ly/Post/hello-world' }),
    ])
    expect((await fake.relatedBy('https://headless.ly/Author/john', 'posts')).map((t) => t.id)).toEqual(['hello-world'])
  })

  it('accepts an explicit provider instance or factory', async () => {
    const direct = new MemoryProvider()
    const db1 = DB(schema, { provider: direct })
    expect(Object.getPrototypeOf(await db1.$provider())).toBe(direct)

    let calls = 0
    const db2 = DB(schema, {
      provider: async () => {
        calls++
        return new MemoryProvider()
      },
    })
    await Promise.all([db2.$provider(), db2.$provider()])
    expect(calls).toBe(1)
  })

  it('surfaces resolution errors on first use, not at DB() time', async () => {
    const db = DB(schema, { url: 'do://nowhere' })
    await expect(db.Post.list()).rejects.toThrow(/binding "MDXDB"/)
  })

  it('runs the CLAUDE.md example verbatim', async () => {
    const db = DB(schema, { url: ':memory:' })
    await db.Author.create('john', { name: 'John', email: 'john@example.com' })
    await db.Post.create('hello-world', { title: 'Hello World', content: '# Hi', author: 'john' })

    // Typed, provider-agnostic access
    const post = await db.Post.get('hello-world')
    // @ts-expect-error CLAUDE.md example: `post` is typed nullable
    const author = await post.author // Resolved Author
    // @ts-expect-error DBPromise does not type relation getters (model gap mdx-8je.57)
    const posts = await db.Author.get('john').posts // Post[]

    expect(author).toMatchObject({ $id: 'john', name: 'John' })
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({ $id: 'hello-world', title: 'Hello World' })
  })
})
