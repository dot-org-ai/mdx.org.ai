import { describe, it, expect } from 'vitest'
import { EntityAlreadyExistsError, EntityNotFoundError } from 'ai-database'
import { createDOProvider, thingToRecord } from '../src/providers/do.js'
import { schemaRelations, withSchemaRelations } from '../src/relations.js'
import { FakeNamespace } from './helpers/fake-do.js'

describe('DOProvider', () => {
  describe('$id handshake', () => {
    it('uses $init(name) when the object exposes it and derives urls from the result', async () => {
      const ns = new FakeNamespace({ withInit: true })
      const provider = createDOProvider({ namespace: ns, name: 'headless.ly' })
      expect(await provider.$id()).toBe('https://headless.ly')
      expect(await provider.url('Post', 'hello')).toBe('https://headless.ly/Post/hello')
      const fake = ns.get(ns.idFromName('headless.ly'))
      expect(fake.calls).toEqual(['$init:headless.ly'])
    })

    it('falls back to $id() on objects without $init (pre mdx-8je.24)', async () => {
      const ns = new FakeNamespace({ withInit: false, unnamedBase: 'https://abc123' })
      const provider = createDOProvider({ namespace: ns, name: 'headless.ly' })
      expect(await provider.$id()).toBe('https://abc123')
      const fake = ns.get(ns.idFromName('headless.ly'))
      expect(fake.calls).toEqual(['$id'])
      // Every url is built on what the object reports, never on the name.
      const created = await provider.create('Post', 'p', { title: 'x' })
      expect(created).toMatchObject({ $id: 'p', $type: 'Post', title: 'x' })
      expect(await provider.get('Post', 'p')).toMatchObject({ $id: 'p' })
    })

    it('resolves the base once per provider', async () => {
      const ns = new FakeNamespace()
      const provider = createDOProvider({ namespace: ns, name: 'x.y' })
      await Promise.all([provider.get('A', '1'), provider.get('A', '2'), provider.list('A')])
      expect(ns.get(ns.idFromName('x.y')).calls).toEqual(['$init:x.y'])
    })
  })

  describe('record mapping', () => {
    it('flattens a Thing into { ...data, $id, $type }', () => {
      expect(
        thingToRecord({ url: 'https://a/Post/p', type: 'Post', id: 'p', data: { title: 'T', n: 1 }, at: 'now', version: 1 })
      ).toEqual({ title: 'T', n: 1, $id: 'p', $type: 'Post' })
    })

    it('never persists $id/$type inside data', async () => {
      const ns = new FakeNamespace()
      const provider = createDOProvider({ namespace: ns, name: 'a' })
      await provider.create('Post', 'p', { $id: 'p', $type: 'Post', title: 'T' } as Record<string, unknown>)
      const raw = await ns.get(ns.idFromName('a')).getById('Post', 'p')
      expect(raw?.data).toEqual({ title: 'T' })
      await provider.update('Post', 'p', { $id: 'p', $type: 'Post', title: 'U' } as Record<string, unknown>)
      const raw2 = await ns.get(ns.idFromName('a')).getById('Post', 'p')
      expect(raw2?.data).toEqual({ title: 'U' })
    })

    it('maps DO errors onto ai-database error classes', async () => {
      const provider = createDOProvider({ namespace: new FakeNamespace(), name: 'a' })
      await provider.create('Post', 'p', {})
      await expect(provider.create('Post', 'p', {})).rejects.toBeInstanceOf(EntityAlreadyExistsError)
      await expect(provider.update('Post', 'missing', {})).rejects.toBeInstanceOf(EntityNotFoundError)
    })
  })

  describe('bidirectional edges', () => {
    const schema = {
      Post: { title: 'string', author: 'Author.posts', tags: ['Tag.posts'] as [string] },
      Author: { name: 'string' },
      Tag: { name: 'string' },
    }

    it('writes the reverse predicate from the schema so relatedBy works natively', async () => {
      const ns = new FakeNamespace()
      const provider = createDOProvider({ namespace: ns, name: 'a', relations: schemaRelations(schema) })
      await provider.create('Author', 'john', { name: 'John' })
      await provider.create('Post', 'p', { title: 'P', author: 'john' })
      await provider.relate('Post', 'p', 'author', 'Author', 'john')

      const fake = ns.get(ns.idFromName('a'))
      expect(fake.edges()).toEqual([
        expect.objectContaining({
          predicate: 'author',
          reverse: 'posts',
          from: 'https://a/Post/p',
          to: 'https://a/Author/john',
        }),
      ])
      expect((await provider.related('Post', 'p', 'author')).map((r) => r['$id'])).toEqual(['john'])
      expect((await provider.related('Author', 'john', 'posts')).map((r) => r['$id'])).toEqual(['p'])
      expect((await fake.relatedBy('https://a/Author/john', 'posts')).map((t) => t.id)).toEqual(['p'])
    })

    it('leaves reverse undefined for predicates the schema does not know', async () => {
      const ns = new FakeNamespace()
      const provider = createDOProvider({ namespace: ns, name: 'a', relations: schemaRelations(schema) })
      await provider.create('Post', 'p', {})
      await provider.create('Author', 'j', {})
      await provider.relate('Post', 'p', 'reviewer', 'Author', 'j')
      expect(ns.get(ns.idFromName('a')).edges()[0]?.reverse).toBeUndefined()
    })

    it('with the schema wrapper, creating an entity records the edge automatically', async () => {
      const ns = new FakeNamespace()
      const relations = schemaRelations(schema)
      const provider = withSchemaRelations(createDOProvider({ namespace: ns, name: 'a' }), relations)
      await provider.create('Author', 'john', { name: 'John' })
      await provider.create('Post', 'p', { title: 'P', author: 'john' })
      expect((await provider.related('Author', 'john', 'posts')).map((r) => r['$id'])).toEqual(['p'])

      await provider.create('Author', 'jane', { name: 'Jane' })
      await provider.update('Post', 'p', { author: 'jane' })
      expect(await provider.related('Author', 'john', 'posts')).toEqual([])
      expect((await provider.related('Author', 'jane', 'posts')).map((r) => r['$id'])).toEqual(['p'])
    })
  })
})

describe('schemaRelations', () => {
  it('marks the declared field forward and the auto-created mirror reverse', () => {
    const rel = schemaRelations({
      Post: { title: 'string', author: 'Author.posts' },
      Author: { name: 'string' },
    })
    expect(rel['Post']?.['author']).toEqual({ direction: 'forward', type: 'Author', reverse: 'posts', isArray: false })
    expect(rel['Author']?.['posts']).toEqual({
      direction: 'reverse',
      type: 'Post',
      forward: 'author',
      forwardIsArray: false,
      isArray: true,
    })
  })

  it('handles array-owned edges', () => {
    const rel = schemaRelations({
      Post: { tags: ['Tag.posts'] as [string] },
      Tag: { name: 'string' },
    })
    expect(rel['Post']?.['tags']).toEqual({ direction: 'forward', type: 'Tag', reverse: 'posts', isArray: true })
    expect(rel['Tag']?.['posts']).toMatchObject({ direction: 'reverse', forward: 'tags', forwardIsArray: true })
  })

  it('ignores relations without a backref', () => {
    const rel = schemaRelations({ Post: { author: 'Author' }, Author: { name: 'string' } })
    expect(rel['Post']?.['author']).toEqual({ direction: 'forward', type: 'Author', reverse: undefined, isArray: false })
    expect(rel['Author']).toBeUndefined()
  })
})
