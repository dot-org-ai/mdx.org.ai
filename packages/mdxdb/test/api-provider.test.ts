/**
 * ApiProvider behaviour the contract suite cannot see from the outside: what
 * goes over the (fake) wire, and how wire errors come back.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { EntityAlreadyExistsError, EntityNotFoundError, type DBClient } from 'ai-database'
import { ApiProvider, createApiProvider, type ThingClientLike } from '../src/providers/api.js'
import { MemoryDBClient } from './helpers/memory-db-client.js'

// A real ai-database DBClient must satisfy ThingClientLike without a cast —
// resolve.ts depends on this; a drift in @mdxdb/api is a type error here.
const _structural: ThingClientLike = {} as DBClient
void _structural

describe('ApiProvider', () => {
  let client: MemoryDBClient
  let provider: ApiProvider

  beforeEach(() => {
    client = new MemoryDBClient()
    provider = createApiProvider({ client, ns: 'api.local' })
  })

  const sent = (method: string) => client.calls.filter((c) => c.method === method).map((c) => c.args)

  describe('errors', () => {
    it('maps a duplicate create onto EntityAlreadyExistsError', async () => {
      await provider.create('Post', 'dup', { title: 'One' })
      const err = await provider.create('Post', 'dup', { title: 'Two' }).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(EntityAlreadyExistsError)
      expect((err as EntityAlreadyExistsError).entityType).toBe('Post')
      expect((err as EntityAlreadyExistsError).entityId).toBe('dup')
      expect((err as EntityAlreadyExistsError).cause?.message).toMatch(/already exists/)
    })

    it('maps an update of a missing entity onto EntityNotFoundError', async () => {
      const err = await provider.update('Post', 'nope', { title: 'x' }).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(EntityNotFoundError)
      expect((err as EntityNotFoundError).entityId).toBe('nope')
    })

    it('passes every other wire error through untouched', async () => {
      const boom = new Error('upstream 503')
      const failing: ThingClientLike = { ...client, create: async () => Promise.reject(boom) } as ThingClientLike
      const p = createApiProvider({ client: failing, ns: 'api.local' })
      await expect(p.create('Post', 'x', {})).rejects.toBe(boom)
    })
  })

  describe('wire shape', () => {
    it('scopes every request by ns and builds https://<ns>/<Type>/<id> urls', async () => {
      await provider.create('Post', 'p', { title: 'P' })
      await provider.get('Post', 'p')
      await provider.update('Post', 'p', { title: 'Q' })
      expect(sent('create')[0]![0]).toMatchObject({ ns: 'api.local', type: 'Post', id: 'p' })
      expect(sent('getById')[0]).toEqual(['api.local', 'Post', 'p'])
      expect(sent('update')[0]![0]).toBe('https://api.local/Post/p')
      expect(provider.url('Post', 'p')).toBe('https://api.local/Post/p')
    })

    it('strips $id/$type and undefined from data before sending', async () => {
      await provider.create('Post', 'p', { title: 'P', $id: 'p', $type: 'Post', gone: undefined })
      expect(sent('create')[0]![0]).toMatchObject({ data: { title: 'P' } })
      await provider.update('Post', 'p', { $id: 'p', $type: 'Post', title: 'Q' })
      expect(sent('update')[0]![1]).toEqual({ data: { title: 'Q' } })
    })

    it('related asks for the outbound ("to") side of the edge', async () => {
      await provider.create('Post', 'hello', {})
      await provider.create('Author', 'john', {})
      await provider.relate('Post', 'hello', 'author', 'Author', 'john')
      expect(sent('relate')[0]![0]).toEqual({
        type: 'author',
        from: 'https://api.local/Post/hello',
        to: 'https://api.local/Author/john',
        data: undefined,
      })
      const authors = await provider.related('Post', 'hello', 'author')
      expect(sent('related')[0]).toEqual(['https://api.local/Post/hello', 'author', 'to'])
      expect(authors.map((a) => a['$id'])).toEqual(['john'])
      // and not the inbound set
      expect(await provider.related('Author', 'john', 'author')).toEqual([])
    })

    it('forwards relate metadata only when present', async () => {
      await provider.relate('Post', 'a', 'x', 'Post', 'b', { matchMode: 'fuzzy', similarity: 0.9 })
      expect(sent('relate')[0]![0]).toMatchObject({ data: { matchMode: 'fuzzy', similarity: 0.9 } })
      await provider.relate('Post', 'a', 'y', 'Post', 'b', {})
      expect(sent('relate')[1]![0]).toMatchObject({ data: undefined })
    })
  })

  describe('paging with where', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        await provider.create('Post', `p${i}`, { rank: i, status: i % 2 ? 'odd' : 'even', body: `post ${i}` })
      }
      client.calls.length = 0
    })

    it('list pushes limit/offset to the server only when there is no where', async () => {
      await provider.list('Post', { limit: 2, offset: 1, orderBy: 'rank', order: 'asc' })
      expect(sent('list')[0]![0]).toMatchObject({ ns: 'api.local', type: 'Post', limit: 2, offset: 1, orderBy: 'rank' })

      const odd = await provider.list('Post', { where: { status: 'odd' }, orderBy: 'rank', order: 'asc', limit: 2, offset: 1 })
      // the server page would be a page of *all* posts, so paging stays client-side
      expect(sent('list')[1]![0]).toMatchObject({ limit: undefined, offset: undefined })
      expect(odd.map((r) => r['rank'])).toEqual([3, 5])
    })

    it('search applies where before paging', async () => {
      const hits = await provider.search('Post', 'post', { where: { status: 'even' }, limit: 1, offset: 1 })
      expect(sent('search')[0]![0]).toMatchObject({ query: 'post', limit: undefined, offset: undefined })
      expect(hits.map((r) => r['rank'])).toEqual([4])
      await provider.search('Post', 'post', { limit: 1 })
      expect(sent('search')[1]![0]).toMatchObject({ limit: 1 })
    })
  })
})
