/**
 * Provider contract suite
 *
 * One provider-agnostic suite every mdxdb backend runs. Import it from a
 * package's test file and hand it a factory that returns a fresh, empty
 * provider:
 *
 * ```ts
 * import { createProviderContractTests } from 'mdxdb/tests'
 * import { createMemoryProvider } from 'ai-database'
 *
 * createProviderContractTests('memory', { create: () => createMemoryProvider() })
 * ```
 *
 * The suite covers the `DBProvider` surface (things, listing, relationships,
 * search) and then the CLAUDE.md bi-directional relationship example through
 * `DB()` — so an adapter is only compliant when the documented developer
 * experience works on it, not just the raw provider calls.
 *
 * Requires `vitest` (optional peer).
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { DBProvider } from 'ai-database'
import { DB } from './index.js'

export interface ProviderContractOptions {
  /** Return a fresh, empty provider. Called before every test. */
  create: () => DBProvider | Promise<DBProvider>
  /** Optional teardown after every test. */
  cleanup?: (provider: DBProvider) => void | Promise<void>
  /**
   * Whether `search()` finds substrings inside string fields. Providers with
   * a real full-text index may tokenise differently; default true.
   */
  substringSearch?: boolean
}

/**
 * Register the contract suite under `name`.
 */
export function createProviderContractTests(name: string, options: ProviderContractOptions): void {
  const substringSearch = options.substringSearch ?? true

  describe(`mdxdb provider contract: ${name}`, () => {
    let provider: DBProvider

    beforeEach(async () => {
      provider = await options.create()
    })

    afterEach(async () => {
      await options.cleanup?.(provider)
    })

    describe('things', () => {
      it('creates and reads back a flat record with $id and $type', async () => {
        const created = await provider.create('Post', 'hello', { title: 'Hello', draft: true })
        expect(created['$id']).toBe('hello')
        expect(created['$type']).toBe('Post')
        expect(created['title']).toBe('Hello')

        const read = await provider.get('Post', 'hello')
        expect(read).not.toBeNull()
        expect(read!['$id']).toBe('hello')
        expect(read!['$type']).toBe('Post')
        expect(read!['title']).toBe('Hello')
        expect(read!['draft']).toBe(true)
      })

      it('generates an id when none is given', async () => {
        const created = await provider.create('Post', undefined, { title: 'Anon' })
        expect(typeof created['$id']).toBe('string')
        expect((created['$id'] as string).length).toBeGreaterThan(0)
        const read = await provider.get('Post', created['$id'] as string)
        expect(read?.['title']).toBe('Anon')
      })

      it('returns null for a missing entity', async () => {
        expect(await provider.get('Post', 'missing')).toBeNull()
      })

      it('rejects a duplicate id within a type', async () => {
        await provider.create('Post', 'dup', { title: 'One' })
        await expect(provider.create('Post', 'dup', { title: 'Two' })).rejects.toThrow()
      })

      it('scopes ids by type', async () => {
        await provider.create('Post', 'shared', { kind: 'post' })
        await provider.create('Author', 'shared', { kind: 'author' })
        expect((await provider.get('Post', 'shared'))?.['kind']).toBe('post')
        expect((await provider.get('Author', 'shared'))?.['kind']).toBe('author')
      })

      it('update merges fields and returns the whole record', async () => {
        await provider.create('Post', 'u', { title: 'Old', tags: ['a'] })
        const updated = await provider.update('Post', 'u', { title: 'New' })
        expect(updated['title']).toBe('New')
        expect(updated['tags']).toEqual(['a'])
        expect(updated['$id']).toBe('u')
        const read = await provider.get('Post', 'u')
        expect(read?.['title']).toBe('New')
        expect(read?.['tags']).toEqual(['a'])
      })

      it('update of a missing entity throws', async () => {
        await expect(provider.update('Post', 'nope', { title: 'x' })).rejects.toThrow()
      })

      it('delete returns true once, then the entity is gone', async () => {
        await provider.create('Post', 'd', { title: 'Bye' })
        expect(await provider.delete('Post', 'd')).toBe(true)
        expect(await provider.get('Post', 'd')).toBeNull()
        expect(await provider.delete('Post', 'd')).toBe(false)
      })
    })

    describe('listing', () => {
      beforeEach(async () => {
        await provider.create('Post', 'p1', { title: 'First', status: 'published', rank: 1 })
        await provider.create('Post', 'p2', { title: 'Second', status: 'draft', rank: 2 })
        await provider.create('Post', 'p3', { title: 'Third', status: 'published', rank: 3 })
        await provider.create('Author', 'a1', { name: 'Ann' })
      })

      it('lists only the requested type', async () => {
        const posts = await provider.list('Post')
        expect(posts.map((p) => p['$id']).sort()).toEqual(['p1', 'p2', 'p3'])
        expect(posts.every((p) => p['$type'] === 'Post')).toBe(true)
        const authors = await provider.list('Author')
        expect(authors.map((a) => a['$id'])).toEqual(['a1'])
      })

      it('returns an empty array for an unknown type', async () => {
        expect(await provider.list('Nothing')).toEqual([])
      })

      it('filters with where (exact match on a string field)', async () => {
        const published = await provider.list('Post', { where: { status: 'published' } })
        expect(published.map((p) => p['$id']).sort()).toEqual(['p1', 'p3'])
        expect(await provider.list('Post', { where: { status: 'archived' } })).toEqual([])
      })

      it('honours limit and offset', async () => {
        const all = await provider.list('Post', { orderBy: 'rank', order: 'asc' })
        expect(all.map((p) => p['rank'])).toEqual([1, 2, 3])
        const page = await provider.list('Post', { orderBy: 'rank', order: 'asc', limit: 2, offset: 1 })
        expect(page.map((p) => p['rank'])).toEqual([2, 3])
        const limited = await provider.list('Post', { limit: 1 })
        expect(limited).toHaveLength(1)
      })

      it('orders by a field in both directions', async () => {
        const asc = await provider.list('Post', { orderBy: 'rank', order: 'asc' })
        expect(asc.map((p) => p['$id'])).toEqual(['p1', 'p2', 'p3'])
        const desc = await provider.list('Post', { orderBy: 'rank', order: 'desc' })
        expect(desc.map((p) => p['$id'])).toEqual(['p3', 'p2', 'p1'])
      })
    })

    describe('relationships', () => {
      beforeEach(async () => {
        await provider.create('Author', 'john', { name: 'John' })
        await provider.create('Author', 'jane', { name: 'Jane' })
        await provider.create('Post', 'hello', { title: 'Hello' })
        await provider.create('Post', 'world', { title: 'World' })
      })

      it('relate → related returns the targets as flat records', async () => {
        await provider.relate('Post', 'hello', 'author', 'Author', 'john')
        const related = await provider.related('Post', 'hello', 'author')
        expect(related).toHaveLength(1)
        expect(related[0]!['$id']).toBe('john')
        expect(related[0]!['$type']).toBe('Author')
        expect(related[0]!['name']).toBe('John')
      })

      it('related is scoped to the predicate and the source', async () => {
        await provider.relate('Post', 'hello', 'author', 'Author', 'john')
        await provider.relate('Post', 'hello', 'reviewer', 'Author', 'jane')
        expect((await provider.related('Post', 'hello', 'author')).map((r) => r['$id'])).toEqual(['john'])
        expect((await provider.related('Post', 'hello', 'reviewer')).map((r) => r['$id'])).toEqual(['jane'])
        expect(await provider.related('Post', 'world', 'author')).toEqual([])
        expect(await provider.related('Post', 'hello', 'editor')).toEqual([])
      })

      it('supports many targets on one predicate', async () => {
        await provider.relate('Post', 'hello', 'contributors', 'Author', 'john')
        await provider.relate('Post', 'hello', 'contributors', 'Author', 'jane')
        const ids = (await provider.related('Post', 'hello', 'contributors')).map((r) => r['$id']).sort()
        expect(ids).toEqual(['jane', 'john'])
      })

      it('relating the same edge twice is idempotent', async () => {
        await provider.relate('Post', 'hello', 'author', 'Author', 'john')
        await provider.relate('Post', 'hello', 'author', 'Author', 'john')
        expect(await provider.related('Post', 'hello', 'author')).toHaveLength(1)
      })

      it('unrelate removes exactly that edge', async () => {
        await provider.relate('Post', 'hello', 'author', 'Author', 'john')
        await provider.relate('Post', 'world', 'author', 'Author', 'john')
        await provider.unrelate('Post', 'hello', 'author', 'Author', 'john')
        expect(await provider.related('Post', 'hello', 'author')).toEqual([])
        expect((await provider.related('Post', 'world', 'author')).map((r) => r['$id'])).toEqual(['john'])
      })
    })

    describe('search', () => {
      it('finds entities by text', async () => {
        await provider.create('Post', 's1', { title: 'Cloudflare Workers', body: 'edge' })
        await provider.create('Post', 's2', { title: 'Durable Objects', body: 'stateful edge' })
        await provider.create('Post', 's3', { title: 'Unrelated', body: 'nothing' })
        const hits = await provider.search('Post', 'edge')
        expect(hits.map((h) => h['$id']).sort()).toEqual(['s1', 's2'])
        if (substringSearch) {
          const partial = await provider.search('Post', 'Durable')
          expect(partial.map((h) => h['$id'])).toEqual(['s2'])
        }
        expect(await provider.search('Post', 'zzz-no-match')).toEqual([])
      })
    })

    describe('DB() facade (CLAUDE.md example)', () => {
      it('resolves Post.author and Author.posts in both directions', async () => {
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
          { provider }
        )

        await db.Author.create('john', { name: 'John', email: 'john@example.com' })
        await db.Post.create('hello-world', { title: 'Hello World', content: '# Hi', author: 'john' })
        await db.Post.create('second', { title: 'Second', content: '…', author: 'john' })

        // Typed, provider-agnostic access
        const post = await db.Post.get('hello-world')
        expect(post).not.toBeNull()
        expect(post!.title).toBe('Hello World')

        const author = await post!.author // Resolved Author
        expect(author).toMatchObject({ $id: 'john', $type: 'Author', name: 'John' })

        // @ts-expect-error DBPromise does not type relation getters (model gap mdx-8je.57)
        const posts = await db.Author.get('john').posts // Post[]
        expect(Array.isArray(posts)).toBe(true)
        expect((posts as Array<{ $id: string }>).map((p) => p.$id).sort()).toEqual(['hello-world', 'second'])

        const john = await db.Author.get('john')
        const viaEntity = await (john as unknown as { posts: Promise<Array<{ $id: string }>> }).posts
        expect(viaEntity.map((p) => p.$id).sort()).toEqual(['hello-world', 'second'])
      })

      it('records the reverse edge on the provider', async () => {
        const db = DB(
          { Post: { title: 'string', author: 'Author.posts' }, Author: { name: 'string' } },
          { provider }
        )
        await db.Author.create('ann', { name: 'Ann' })
        await db.Post.create('p', { title: 'P', author: 'ann' })

        const resolved = await db.$provider()
        const forward = await resolved.related('Post', 'p', 'author')
        expect(forward.map((r) => r['$id'])).toEqual(['ann'])
        const reverse = await resolved.related('Author', 'ann', 'posts')
        expect(reverse.map((r) => r['$id'])).toEqual(['p'])
      })

      it('moves the edge when the relation field is updated', async () => {
        const db = DB(
          { Post: { title: 'string', author: 'Author.posts' }, Author: { name: 'string' } },
          { provider }
        )
        await db.Author.create('a', { name: 'A' })
        await db.Author.create('b', { name: 'B' })
        await db.Post.create('p', { title: 'P', author: 'a' })
        await db.Post.update('p', { author: 'b' })

        const resolved = await db.$provider()
        expect((await resolved.related('Author', 'a', 'posts')).map((r) => r['$id'])).toEqual([])
        expect((await resolved.related('Author', 'b', 'posts')).map((r) => r['$id'])).toEqual(['p'])
      })
    })
  })
}
