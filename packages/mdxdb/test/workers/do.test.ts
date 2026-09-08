/**
 * mdxdb against the real @mdxdb/do Durable Object inside workerd.
 *
 * Storage is shared for the run (see vitest.workers.config.ts), so every
 * provider gets a fresh DO name.
 */
import { describe, it, expect } from 'vitest'
import { env } from 'cloudflare:test'
import { DB, createDOProvider, DOProvider, resolveProvider } from '../../src/index.js'
import { createProviderContractTests } from '../../src/tests.js'

let seq = 0
/** Fresh DO name per use so tests never share storage. */
function uniqueName(): string {
  return `t${++seq}-${Date.now().toString(36)}.local`
}

createProviderContractTests('do (@mdxdb/do in workerd)', {
  create: () => createDOProvider({ namespace: env.MDXDB, name: uniqueName() }),
})

describe('DOProvider on MDXDurableObject', () => {
  it('reaches the Durable Object through the real namespace binding', async () => {
    const name = uniqueName()
    const provider = createDOProvider({ namespace: env.MDXDB, name })
    const base = await provider.$id()
    expect(base).toMatch(/^https:\/\//)

    const created = await provider.create('Post', 'hello', { title: 'Hello' })
    expect(created).toMatchObject({ $id: 'hello', $type: 'Post', title: 'Hello' })

    // The DO stored a Thing at the url the provider derives from its $id.
    const stub = env.MDXDB.get(env.MDXDB.idFromName(name))
    const thing = await stub.getById('Post', 'hello')
    expect(thing?.url).toBe(`${base}/Post/hello`)
    expect(thing?.data).toEqual({ title: 'Hello' })
  })

  it('resolves from the Worker env (DATABASE_URL var + MDXDB binding)', async () => {
    expect(env.DATABASE_URL).toBe('do://headless.ly')
    const provider = await resolveProvider({ env: env as unknown as Record<string, unknown> })
    expect(provider).toBeInstanceOf(DOProvider)
    expect((provider as DOProvider).name).toBe('headless.ly')
  })

  it('DB(schema, { env }) resolves the DO and stores bidirectional edges', async () => {
    const name = uniqueName()
    const db = DB(
      { Post: { title: 'string', author: 'Author.posts' }, Author: { name: 'string' } },
      { env: { DATABASE_URL: `do://${name}`, MDXDB: env.MDXDB } }
    )
    await db.Author.create('ann', { name: 'Ann' })
    await db.Post.create('p1', { title: 'One', author: 'ann' })
    await db.Post.create('p2', { title: 'Two', author: 'ann' })

    const provider = (await db.$provider()) as DOProvider
    const base = await provider.$id()
    const stub = env.MDXDB.get(env.MDXDB.idFromName(name))
    const rels = await stub.relationships(`${base}/Author/ann`)
    expect(rels.map((r) => [r.predicate, r.reverse, r.from]).sort()).toEqual([
      ['author', 'posts', `${base}/Post/p1`],
      ['author', 'posts', `${base}/Post/p2`],
    ])
    const viaDo = await stub.relatedBy(`${base}/Author/ann`, 'posts')
    expect(viaDo.map((t) => t.id).sort()).toEqual(['p1', 'p2'])
  })
})

describe('CLAUDE.md "Database Interface" example (verbatim, on @mdxdb/do)', () => {
  it('runs against the Durable Object', async () => {
    const env2 = { DATABASE_URL: `do://${uniqueName()}`, MDXDB: env.MDXDB }

    const db = DB(
      {
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
      },
      { env: env2 }
    )

    await db.Author.create('john', { name: 'John', email: 'john@example.com' })
    await db.Post.create('hello-world', { title: 'Hello World', content: '# Hello', author: 'john' })

    // Typed, provider-agnostic access
    const post = await db.Post.get('hello-world')
    // @ts-expect-error CLAUDE.md example: `post` is typed nullable
    const author = await post.author // Resolved Author
    // @ts-expect-error DBPromise does not type relation getters (model gap mdx-8je.57)
    const posts = await db.Author.get('john').posts // Post[]

    expect(post).toMatchObject({ $id: 'hello-world', $type: 'Post', title: 'Hello World', content: '# Hello' })
    expect(author).toMatchObject({ $id: 'john', $type: 'Author', name: 'John', email: 'john@example.com' })
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({ $id: 'hello-world', $type: 'Post', title: 'Hello World' })
  })
})
