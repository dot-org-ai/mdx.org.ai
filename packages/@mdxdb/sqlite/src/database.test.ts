import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSqliteDatabase, SqliteDatabase } from './database.js'

describe('SqliteDatabase', () => {
  let db: SqliteDatabase

  beforeEach(async () => {
    // Use in-memory database for tests
    db = await createSqliteDatabase({ url: ':memory:' })
  })

  afterEach(async () => {
    await db.close()
  })

  describe('create and get', () => {
    it('should create and retrieve a thing', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Article',
        data: { title: 'Test Article', content: '# Hello World\n\nThis is a test.' },
      })

      expect(thing.ns).toBe('example.com')
      expect(thing.type).toBe('Article')
      expect(thing.id).toBeDefined()
      expect(thing.url).toContain('example.com/Article/')
      expect(thing.data.title).toBe('Test Article')

      const retrieved = await db.get(thing.url!)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(thing.id)
      expect(retrieved?.type).toBe('Article')
      expect(retrieved?.data.title).toBe('Test Article')
    })

    it('should get a thing by namespace/type/id', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Post',
        id: 'my-post',
        data: { title: 'My Post' },
      })

      const retrieved = await db.getById('example.com', 'Post', 'my-post')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe('my-post')
      expect(retrieved?.data.title).toBe('My Post')
    })

    it('should throw when creating a thing that already exists', async () => {
      await db.create({
        ns: 'example.com',
        type: 'Test',
        id: 'exists',
        data: {},
      })

      await expect(db.create({
        ns: 'example.com',
        type: 'Test',
        id: 'exists',
        data: {},
      })).rejects.toThrow('already exists')
    })

    it('should return null for non-existent thing', async () => {
      const result = await db.get('https://example.com/Thing/non-existent')
      expect(result).toBeNull()
    })

    it('should store and retrieve @context', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Article',
        data: { title: 'With Context' },
        '@context': 'https://schema.org',
      })

      const retrieved = await db.get(thing.url!)
      expect(retrieved?.['@context']).toBe('https://schema.org')
    })
  })

  describe('set and update', () => {
    it('should create a thing with set', async () => {
      const url = 'https://example.com/Post/new-post'
      const thing = await db.set(url, { title: 'New Post' })

      expect(thing.url).toBe(url)
      expect(thing.data.title).toBe('New Post')
    })

    it('should update a thing with set', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Post',
        id: 'update-me',
        data: { title: 'Original' },
      })

      const updated = await db.set(thing.url!, { title: 'Updated' })
      expect(updated.data.title).toBe('Updated')

      const retrieved = await db.get(thing.url!)
      expect(retrieved?.data.title).toBe('Updated')
    })

    it('should partial update with update method', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Post',
        id: 'partial-update',
        data: { title: 'Original', author: 'John' },
      })

      const updated = await db.update(thing.url!, { data: { title: 'New Title' } })
      expect(updated.data.title).toBe('New Title')
      expect(updated.data.author).toBe('John') // Should preserve
    })

    it('should upsert - create if not exists', async () => {
      const thing = await db.upsert({
        ns: 'example.com',
        type: 'Post',
        id: 'upsert-new',
        data: { title: 'Created' },
      })

      expect(thing.data.title).toBe('Created')
    })

    it('should upsert - update if exists', async () => {
      await db.create({
        ns: 'example.com',
        type: 'Post',
        id: 'upsert-existing',
        data: { title: 'Original' },
      })

      const thing = await db.upsert({
        ns: 'example.com',
        type: 'Post',
        id: 'upsert-existing',
        data: { title: 'Updated' },
      })

      expect(thing.data.title).toBe('Updated')
    })
  })

  describe('list', () => {
    beforeEach(async () => {
      await db.create({ ns: 'example.com', type: 'Post', id: 'post-1', data: { title: 'First Post' } })
      await db.create({ ns: 'example.com', type: 'Post', id: 'post-2', data: { title: 'Second Post' } })
      await db.create({ ns: 'example.com', type: 'Article', id: 'article-1', data: { title: 'First Article' } })
      await db.create({ ns: 'other.com', type: 'Post', id: 'post-3', data: { title: 'Other Post' } })
    })

    it('should list all things', async () => {
      const result = await db.list()
      expect(result).toHaveLength(4)
    })

    it('should filter by type', async () => {
      const result = await db.list({ type: 'Post' })
      expect(result).toHaveLength(3)
      expect(result.every((t) => t.type === 'Post')).toBe(true)
    })

    it('should filter by namespace', async () => {
      const result = await db.list({ ns: 'example.com' })
      expect(result).toHaveLength(3)
      expect(result.every((t) => t.ns === 'example.com')).toBe(true)
    })

    it('should filter by where conditions', async () => {
      const result = await db.list({ where: { title: 'First Post' } })
      expect(result).toHaveLength(1)
      expect(result[0]?.data.title).toBe('First Post')
    })

    it('should paginate results', async () => {
      const page1 = await db.list({ limit: 2 })
      expect(page1).toHaveLength(2)

      const page2 = await db.list({ limit: 2, offset: 2 })
      expect(page2).toHaveLength(2)
    })

    it('should sort by data field', async () => {
      const result = await db.list({ orderBy: 'title', order: 'asc', ns: 'example.com' })
      const titles = result.map((t) => t.data.title)
      expect(titles).toEqual(['First Article', 'First Post', 'Second Post'])
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      await db.create({
        ns: 'example.com',
        type: 'Post',
        id: 'search-1',
        data: { title: 'Hello World', content: 'Welcome to the hello world tutorial' },
      })
      await db.create({
        ns: 'example.com',
        type: 'Post',
        id: 'search-2',
        data: { title: 'Goodbye', content: 'Goodbye cruel world' },
      })
      await db.create({
        ns: 'example.com',
        type: 'Post',
        id: 'search-3',
        data: { title: 'Unrelated', content: 'Something completely different' },
      })
    })

    it('should find things matching query in title', async () => {
      const result = await db.search({ query: 'Hello' })
      expect(result).toHaveLength(1)
      expect(result[0]?.data.title).toBe('Hello World')
    })

    it('should find things matching query in content', async () => {
      const result = await db.search({ query: 'world' })
      expect(result).toHaveLength(2)
    })

    it('should return empty results for non-matching query', async () => {
      const result = await db.search({ query: 'nonexistent' })
      expect(result).toHaveLength(0)
    })

    it('should filter by type when searching', async () => {
      await db.create({
        ns: 'example.com',
        type: 'Article',
        id: 'search-article',
        data: { title: 'World Article', content: 'World content' },
      })

      const result = await db.search({ query: 'world', type: 'Article' })
      expect(result).toHaveLength(1)
      expect(result[0]?.type).toBe('Article')
    })
  })

  describe('delete', () => {
    it('should delete an existing thing', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Test',
        id: 'delete-me',
        data: {},
      })

      const deleted = await db.delete(thing.url!)
      expect(deleted).toBe(true)

      const retrieved = await db.get(thing.url!)
      expect(retrieved).toBeNull()
    })

    it('should return false for non-existent thing', async () => {
      const deleted = await db.delete('https://example.com/Thing/non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('relationships', () => {
    beforeEach(async () => {
      await db.create({ ns: 'example.com', type: 'User', id: 'alice', data: { name: 'Alice' } })
      await db.create({ ns: 'example.com', type: 'User', id: 'bob', data: { name: 'Bob' } })
      await db.create({ ns: 'example.com', type: 'Post', id: 'post-1', data: { title: 'Hello' } })
    })

    it('should create a relationship between things', async () => {
      const rel = await db.relate({
        type: 'follows',
        from: 'https://example.com/User/alice',
        to: 'https://example.com/User/bob',
      })

      expect(rel.type).toBe('follows')
      expect(rel.from).toBe('https://example.com/User/alice')
      expect(rel.to).toBe('https://example.com/User/bob')
    })

    it('should find related things', async () => {
      await db.relate({
        type: 'follows',
        from: 'https://example.com/User/alice',
        to: 'https://example.com/User/bob',
      })

      const following = await db.related('https://example.com/User/alice', 'follows', 'from')
      expect(following).toHaveLength(1)
      expect(following[0]?.id).toBe('bob')
    })

    it('should get all relationships for a thing', async () => {
      await db.relate({
        type: 'follows',
        from: 'https://example.com/User/alice',
        to: 'https://example.com/User/bob',
      })
      await db.relate({
        type: 'authored',
        from: 'https://example.com/User/alice',
        to: 'https://example.com/Post/post-1',
      })

      const rels = await db.relationships('https://example.com/User/alice')
      expect(rels).toHaveLength(2)
    })

    it('should get references (inbound relationships)', async () => {
      await db.relate({
        type: 'follows',
        from: 'https://example.com/User/alice',
        to: 'https://example.com/User/bob',
      })

      const followers = await db.references('https://example.com/User/bob', 'follows')
      expect(followers).toHaveLength(1)
      expect(followers[0]?.id).toBe('alice')
    })

    it('should remove a relationship', async () => {
      await db.relate({
        type: 'follows',
        from: 'https://example.com/User/alice',
        to: 'https://example.com/User/bob',
      })

      const removed = await db.unrelate(
        'https://example.com/User/alice',
        'follows',
        'https://example.com/User/bob'
      )
      expect(removed).toBe(true)

      const following = await db.related('https://example.com/User/alice', 'follows', 'from')
      expect(following).toHaveLength(0)
    })

    it('should store relationship data', async () => {
      await db.relate({
        type: 'follows',
        from: 'https://example.com/User/alice',
        to: 'https://example.com/User/bob',
        data: { since: '2024-01-01', mutual: false },
      })

      const rels = await db.relationships('https://example.com/User/alice', 'follows')
      expect(rels).toHaveLength(1)
      expect(rels[0]?.data?.since).toBe('2024-01-01')
    })
  })

  describe('forEach', () => {
    it('should iterate over all things', async () => {
      await db.create({ ns: 'example.com', type: 'Post', id: 'a', data: {} })
      await db.create({ ns: 'example.com', type: 'Post', id: 'b', data: {} })
      await db.create({ ns: 'example.com', type: 'Post', id: 'c', data: {} })

      const ids: string[] = []
      await db.forEach({}, (thing) => {
        ids.push(thing.id)
      })

      expect(ids).toHaveLength(3)
    })

    it('should filter during iteration', async () => {
      await db.create({ ns: 'example.com', type: 'Post', id: 'a', data: {} })
      await db.create({ ns: 'example.com', type: 'Article', id: 'b', data: {} })
      await db.create({ ns: 'example.com', type: 'Post', id: 'c', data: {} })

      const ids: string[] = []
      await db.forEach({ type: 'Post' }, (thing) => {
        ids.push(thing.id)
      })

      expect(ids).toHaveLength(2)
    })
  })

  describe('complex data types', () => {
    it('should store arrays in data', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Test',
        data: { tags: ['a', 'b', 'c'], numbers: [1, 2, 3] },
      })

      const retrieved = await db.get(thing.url!)
      expect(retrieved?.data.tags).toEqual(['a', 'b', 'c'])
      expect(retrieved?.data.numbers).toEqual([1, 2, 3])
    })

    it('should store nested objects in data', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Test',
        data: {
          author: { name: 'John', email: 'john@example.com' },
          meta: { views: 100, likes: 50 },
        },
      })

      const retrieved = await db.get(thing.url!)
      expect(retrieved?.data.author).toEqual({ name: 'John', email: 'john@example.com' })
      expect(retrieved?.data.meta).toEqual({ views: 100, likes: 50 })
    })

    it('should store complex @context', async () => {
      const thing = await db.create({
        ns: 'example.com',
        type: 'Test',
        '@context': { '@vocab': 'https://schema.org/', 'custom': 'https://example.com/' },
        data: {},
      })

      const retrieved = await db.get(thing.url!)
      expect(retrieved?.['@context']).toEqual({ '@vocab': 'https://schema.org/', 'custom': 'https://example.com/' })
    })
  })

  describe('database client', () => {
    it('should expose the underlying libSQL client', () => {
      const client = db.getClient()
      expect(client).toBeDefined()
      expect(typeof client.execute).toBe('function')
    })
  })
})
