/**
 * Two live DB() instances must never share a backend (mdx-8je.65).
 *
 * ai-database's entity operations, DBPromise pipelining and relation getters
 * all read one process-wide provider (mdx-8je.56). Before the router, every
 * `DB()` call re-pointed that global, so an older instance's reads and writes
 * landed on the newest instance's backend — in a Worker, on another request's
 * (tenant's) Durable Object. Every case here failed against commit 877abc3.
 */
import { describe, it, expect } from 'vitest'
import { DB as aiDB, MemoryProvider } from 'ai-database'
import { DB, NoInstanceContextError, router } from '../src/index.js'
import { FakeNamespace } from './helpers/fake-do.js'

const schema = {
  Post: { title: 'string', author: 'Author.posts' },
  Author: { name: 'string' },
}

type Entity = { $id: string; title?: string; name?: string }

function pair() {
  const a = new MemoryProvider()
  const b = new MemoryProvider()
  const dbA = DB(schema, { provider: a })
  const dbB = DB(schema, { provider: b })
  return { a, b, dbA, dbB }
}

describe('two live DB() instances', () => {
  it('writes through the older instance land on its own backend, not the newest one', async () => {
    const { a, b, dbA, dbB } = pair()

    await dbA.Post.create('x', { title: 'from-A' })
    await dbB.Post.create('y', { title: 'from-B' })

    expect(await a.get('Post', 'x')).toMatchObject({ title: 'from-A' })
    expect(await b.get('Post', 'x')).toBeNull()
    expect(await b.get('Post', 'y')).toMatchObject({ title: 'from-B' })
    expect(await a.get('Post', 'y')).toBeNull()
  })

  it('reads through each instance see only that backend', async () => {
    const { a, b, dbA, dbB } = pair()
    await a.create('Post', 'only-a', { title: 'A' })
    await b.create('Post', 'only-b', { title: 'B' })

    expect(await dbA.Post.get('only-a')).toMatchObject({ title: 'A' })
    expect(await dbA.Post.get('only-b')).toBeNull()
    expect(await dbB.Post.get('only-b')).toMatchObject({ title: 'B' })
    expect(await dbB.Post.get('only-a')).toBeNull()

    expect((await dbA.Post.list()).map((p) => p.$id)).toEqual(['only-a'])
    expect((await dbB.Post.list()).map((p) => p.$id)).toEqual(['only-b'])
  })

  it('an instance created later does not capture an existing one', async () => {
    const a = new MemoryProvider()
    const dbA = DB(schema, { provider: a })
    await dbA.Post.create('before', { title: 'before' })

    const b = new MemoryProvider()
    const dbB = DB(schema, { provider: b })

    await dbA.Post.create('after', { title: 'after' })
    await dbA.Post.update('before', { title: 'edited' })
    expect(await dbA.Post.delete('after')).toBe(true)

    expect(await a.get('Post', 'before')).toMatchObject({ title: 'edited' })
    expect(await b.get('Post', 'before')).toBeNull()
    expect(await b.get('Post', 'after')).toBeNull()
    expect(await b.list('Post')).toEqual([])
    expect(await dbB.Post.list()).toEqual([])
  })

  it('interleaved concurrent operations stay on their own backends', async () => {
    const { a, b, dbA, dbB } = pair()
    const n = 20
    await Promise.all(
      Array.from({ length: n }, (_, i) => [
        dbA.Post.create(`a${i}`, { title: `A${i}` }),
        dbB.Post.create(`b${i}`, { title: `B${i}` }),
      ]).flat()
    )
    const [fromA, fromB] = await Promise.all([dbA.Post.list(), dbB.Post.list()])
    expect(fromA.map((p) => p.$id).sort()).toEqual(Array.from({ length: n }, (_, i) => `a${i}`).sort())
    expect(fromB.map((p) => p.$id).sort()).toEqual(Array.from({ length: n }, (_, i) => `b${i}`).sort())
    expect((await a.list('Post')).length).toBe(n)
    expect((await b.list('Post')).length).toBe(n)
  })

  it('relation getters on hydrated entities resolve on the entity’s own backend', async () => {
    const { dbA, dbB } = pair()
    await dbA.Author.create('john', { name: 'John of A' })
    await dbA.Post.create('p', { title: 'in A', author: 'john' })
    await dbB.Author.create('john', { name: 'John of B' })
    await dbB.Post.create('p', { title: 'in B', author: 'john' })

    const postA = (await dbA.Post.get('p')) as unknown as { author: Promise<Entity> }
    const postB = (await dbB.Post.get('p')) as unknown as { author: Promise<Entity> }
    // Resolve the newer instance's relation first, then the older one's.
    expect(await postB.author).toMatchObject({ $id: 'john', name: 'John of B' })
    expect(await postA.author).toMatchObject({ $id: 'john', name: 'John of A' })

    // Reverse side, from the entity and through DBPromise pipelining.
    const johnA = (await dbA.Author.get('john')) as unknown as { posts: Promise<Entity[]> }
    expect((await johnA.posts).map((p) => p.title)).toEqual(['in A'])
    // @ts-expect-error DBPromise does not type relation getters (model gap mdx-8je.57)
    const postsB = (await dbB.Author.get('john').posts) as Entity[]
    expect(postsB.map((p) => p.title)).toEqual(['in B'])
    // @ts-expect-error DBPromise does not type relation getters (model gap mdx-8je.57)
    const postsA = (await dbA.Author.get('john').posts) as Entity[]
    expect(postsA.map((p) => p.title)).toEqual(['in A'])
  })

  it('entities reached by iterating a list keep their instance', async () => {
    const { dbA, dbB } = pair()
    await dbA.Author.create('ann', { name: 'Ann of A' })
    await dbA.Post.create('p1', { title: 'A1', author: 'ann' })
    await dbA.Post.create('p2', { title: 'A2', author: 'ann' })
    await dbB.Author.create('ann', { name: 'Ann of B' })

    const names: string[] = []
    for (const post of await dbA.Post.list()) {
      const author = await (post as unknown as { author: Promise<Entity> }).author
      names.push(author.name!)
    }
    expect(names).toEqual(['Ann of A', 'Ann of A'])

    const viaMap = await Promise.all(
      (await dbA.Post.list()).map(async (post) => (await (post as unknown as { author: Promise<Entity> }).author).name)
    )
    expect(viaMap).toEqual(['Ann of A', 'Ann of A'])
  })

  it('promise chaining (.then / .catch) stays bound', async () => {
    const { dbA, dbB } = pair()
    await dbA.Post.create('p', { title: 'A' })
    await dbB.Post.create('p', { title: 'B' })

    const titleA = await dbA.Post.get('p').then((post) => post?.title)
    const titleB = await dbB.Post.get('p').then((post) => post?.title)
    expect([titleA, titleB]).toEqual(['A', 'B'])

    // A relation resolved inside a .then callback of the other instance still routes to its own instance.
    await dbA.Author.create('ann', { name: 'Ann of A' })
    await dbA.Post.update('p', { author: 'ann' })
    const nested = await dbB.Post.get('p').then(async () => {
      const post = (await dbA.Post.get('p')) as unknown as { author: Promise<Entity> }
      return (await post.author).name
    })
    expect(nested).toBe('Ann of A')

    const caught = await dbA.Post.create('p', { title: 'dup' }).catch((error: Error) => error.name)
    expect(caught).toBe('EntityAlreadyExistsError')
  })

  it('returns plain entities, not proxies', async () => {
    const { dbA } = pair()
    await dbA.Post.create('p', { title: 'A' })
    const post = await dbA.Post.get('p')
    expect(Object.getPrototypeOf(post)).toBe(Object.prototype)
    expect(JSON.parse(JSON.stringify(post))).toMatchObject({ $id: 'p', $type: 'Post', title: 'A' })
    expect(await dbA.Post.list()).toBeInstanceOf(Array)
  })

  it('two do:// instances in one env write to their own Durable Objects', async () => {
    const MDXDB = new FakeNamespace()
    const tenantA = DB(schema, { env: { DATABASE_URL: 'do://a.example', MDXDB } })
    const tenantB = DB(schema, { env: { DATABASE_URL: 'do://b.example', MDXDB } })

    await tenantA.Author.create('ann', { name: 'Ann' })
    await tenantB.Author.create('bob', { name: 'Bob' })
    await Promise.all([
      tenantA.Post.create('pa', { title: 'A', author: 'ann' }),
      tenantB.Post.create('pb', { title: 'B', author: 'bob' }),
    ])

    const doA = MDXDB.get(MDXDB.idFromName('a.example'))
    const doB = MDXDB.get(MDXDB.idFromName('b.example'))
    expect((await doA.list({})).map((t) => t.url).sort()).toEqual([
      'https://a.example/Author/ann',
      'https://a.example/Post/pa',
    ])
    expect((await doB.list({})).map((t) => t.url).sort()).toEqual([
      'https://b.example/Author/bob',
      'https://b.example/Post/pb',
    ])
    expect(doA.edges().map((e) => e.from)).toEqual(['https://a.example/Post/pa'])
    expect(doB.edges().map((e) => e.from)).toEqual(['https://b.example/Post/pb'])

    // @ts-expect-error DBPromise does not type relation getters (model gap mdx-8je.57)
    const postsOfAnn = (await tenantA.Author.get('ann').posts) as Entity[]
    expect(postsOfAnn.map((p) => p.$id)).toEqual(['pa'])
    expect(await tenantB.Post.get('pa')).toBeNull()
  })

  it('fails closed: an entity operation outside any instance context throws instead of guessing', async () => {
    pair() // at least two instances alive in this process
    expect(router.instances).toBeGreaterThan(1)
    // ai-database's own DB() reads the process-global provider — the router — with no instance in context.
    const bare = aiDB(schema)
    await expect(bare.Post.get('x')).rejects.toBeInstanceOf(NoInstanceContextError)
    await expect(bare.Post.create('x', { title: 'x' })).rejects.toThrow(/outside a DB\(\) instance context/)
  })
})
