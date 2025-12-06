import { describe, it, expect, beforeEach } from 'vitest'
import { MDXClient, createInMemoryBinding } from './index.js'

describe('MDXClient', () => {
  let client: MDXClient

  beforeEach(() => {
    const binding = createInMemoryBinding()
    const id = binding.idFromName('test.local')
    const stub = binding.get(id)
    client = new MDXClient(stub, 'test.local')
  })

  describe('Thing operations', () => {
    it('should create a thing', async () => {
      const thing = await client.create({
        ns: 'test.local',
        type: 'Post',
        data: { title: 'Hello World' },
      })

      expect(thing.type).toBe('Post')
      expect(thing.data.title).toBe('Hello World')
      expect(thing.url).toBe('https://test.local/Post/' + thing.id)
    })

    it('should get a thing by URL', async () => {
      const created = await client.create({
        ns: 'test.local',
        type: 'Post',
        data: { title: 'Test Post' },
      })

      const thing = await client.get(created.url)
      expect(thing).not.toBeNull()
      expect(thing?.data.title).toBe('Test Post')
    })

    it('should list things by type', async () => {
      await client.create({ ns: 'test.local', type: 'Post', data: { title: 'Post 1' } })
      await client.create({ ns: 'test.local', type: 'Post', data: { title: 'Post 2' } })
      await client.create({ ns: 'test.local', type: 'User', data: { name: 'Alice' } })

      const posts = await client.list({ type: 'Post' })
      expect(posts).toHaveLength(2)
    })

    it('should update a thing', async () => {
      const created = await client.create({
        ns: 'test.local',
        type: 'Post',
        data: { title: 'Original' },
      })

      const updated = await client.update(created.url, {
        data: { title: 'Updated' },
      })

      expect(updated.data.title).toBe('Updated')
    })

    it('should delete a thing', async () => {
      const created = await client.create({
        ns: 'test.local',
        type: 'Post',
        data: { title: 'To Delete' },
      })

      const deleted = await client.delete(created.url)
      expect(deleted).toBe(true)

      const thing = await client.get(created.url)
      expect(thing).toBeNull()
    })

    it('should search things', async () => {
      await client.create({ ns: 'test.local', type: 'Post', data: { title: 'TypeScript Guide' } })
      await client.create({ ns: 'test.local', type: 'Post', data: { title: 'JavaScript Basics' } })

      const results = await client.search({ query: 'TypeScript' })
      expect(results).toHaveLength(1)
      expect(results[0]?.data.title).toBe('TypeScript Guide')
    })
  })

  describe('Relationship operations', () => {
    it('should create relationships', async () => {
      const user = await client.create({
        ns: 'test.local',
        type: 'User',
        data: { name: 'Alice' },
      })

      const post = await client.create({
        ns: 'test.local',
        type: 'Post',
        data: { title: 'My Post' },
      })

      const rel = await client.relate({
        type: 'authored',
        from: user.url,
        to: post.url,
      })

      expect(rel.type).toBe('authored')
      expect(rel.from).toBe(user.url)
      expect(rel.to).toBe(post.url)
    })

    it('should get related things', async () => {
      const user = await client.create({
        ns: 'test.local',
        type: 'User',
        data: { name: 'Bob' },
      })

      const post1 = await client.create({
        ns: 'test.local',
        type: 'Post',
        data: { title: 'Post 1' },
      })

      const post2 = await client.create({
        ns: 'test.local',
        type: 'Post',
        data: { title: 'Post 2' },
      })

      await client.relate({ type: 'authored', from: user.url, to: post1.url })
      await client.relate({ type: 'authored', from: user.url, to: post2.url })

      // direction='to' gets things that user points TO (outbound - the posts user authored)
      const related = await client.related(user.url, 'authored', 'to')
      expect(related).toHaveLength(2)
    })
  })

  describe('Event operations', () => {
    it('should track events', async () => {
      const event = await client.track({
        type: 'user.signup',
        source: 'auth',
        data: { userId: '123' },
      })

      expect(event.type).toBe('user.signup')
      expect(event.data.userId).toBe('123')
    })

    it('should query events', async () => {
      await client.track({ type: 'user.login', source: 'auth', data: {} })
      await client.track({ type: 'user.signup', source: 'auth', data: {} })
      await client.track({ type: 'post.created', source: 'content', data: {} })

      const authEvents = await client.queryEvents({ source: 'auth' })
      expect(authEvents).toHaveLength(2)
    })
  })

  describe('Action operations', () => {
    it('should send actions', async () => {
      const action = await client.send({
        actor: 'user:123',
        object: 'post:456',
        action: 'publish',
      })

      expect(action.status).toBe('pending')
      expect(action.actor).toBe('user:123')
    })

    it('should do actions (start immediately)', async () => {
      const action = await client.do({
        actor: 'user:123',
        object: 'post:456',
        action: 'publish',
      })

      expect(action.status).toBe('active')
      expect(action.startedAt).toBeDefined()
    })

    it('should complete actions', async () => {
      const action = await client.do({
        actor: 'user:123',
        object: 'post:456',
        action: 'publish',
      })

      const completed = await client.completeAction(action.id, { url: 'https://...' })
      expect(completed.status).toBe('completed')
      expect(completed.result).toEqual({ url: 'https://...' })
    })
  })

  describe('Artifact operations', () => {
    it('should store and retrieve artifacts', async () => {
      const artifact = await client.storeArtifact({
        key: 'post:123:ast',
        type: 'ast',
        source: 'post:123',
        sourceHash: 'abc123',
        content: { type: 'root', children: [] },
      })

      expect(artifact.key).toBe('post:123:ast')
      expect(artifact.content).toEqual({ type: 'root', children: [] })

      const retrieved = await client.getArtifact('post:123:ast')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.content).toEqual({ type: 'root', children: [] })
    })

    it('should delete artifacts', async () => {
      await client.storeArtifact({
        key: 'to-delete',
        type: 'bundle',
        source: 'src',
        sourceHash: 'hash',
        content: 'code',
      })

      const deleted = await client.deleteArtifact('to-delete')
      expect(deleted).toBe(true)

      const retrieved = await client.getArtifact('to-delete')
      expect(retrieved).toBeNull()
    })
  })
})
