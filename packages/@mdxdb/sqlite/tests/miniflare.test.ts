/**
 * Miniflare Integration Tests
 *
 * Tests the actual SQLite Durable Object implementation via miniflare.
 * These tests use real SQLite storage (not the in-memory mock).
 *
 * Note: These tests require the package to be built first (pnpm build).
 * The tests use the compiled dist/ output to ensure miniflare can load the module.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createMiniflareBinding, disposeMiniflare } from '../dist/miniflare.js'
import { MDXClient } from '../dist/client.js'
import type { DurableObjectNamespace, MDXDatabaseRPC } from '../dist/types.js'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'

// Use a unique temp directory for each test run
const TEST_PERSIST_PATH = join(tmpdir(), `mdxdb-test-${Date.now()}`)

describe('Miniflare SQLite Integration', () => {
  let binding: DurableObjectNamespace<MDXDatabaseRPC>
  let client: MDXClient

  beforeAll(async () => {
    binding = await createMiniflareBinding(TEST_PERSIST_PATH)
    const id = binding.idFromName('test.miniflare.local')
    const stub = binding.get(id)
    client = new MDXClient(stub, 'test.miniflare.local')
  })

  afterAll(async () => {
    await disposeMiniflare()
    // Clean up persist directory
    try {
      rmSync(TEST_PERSIST_PATH, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('Thing Operations', () => {
    it('creates and retrieves a thing', async () => {
      const thing = await client.create({
        ns: 'test.miniflare.local',
        type: 'Post',
        id: 'hello',
        data: { title: 'Hello World' },
      })

      expect(thing.type).toBe('Post')
      expect(thing.id).toBe('hello')
      expect(thing.data.title).toBe('Hello World')

      const retrieved = await client.get(thing.url)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.data.title).toBe('Hello World')
    })

    it('lists things with filtering', async () => {
      await client.upsert({
        ns: 'test.miniflare.local',
        type: 'User',
        id: 'user-1',
        data: { name: 'Alice', role: 'admin' },
      })
      await client.upsert({
        ns: 'test.miniflare.local',
        type: 'User',
        id: 'user-2',
        data: { name: 'Bob', role: 'user' },
      })

      const users = await client.list({ type: 'User' })
      expect(users.length).toBeGreaterThanOrEqual(2)
    })

    it('lists with ordering', async () => {
      const asc = await client.list({ type: 'User', orderBy: 'id', order: 'asc' })
      const desc = await client.list({ type: 'User', orderBy: 'id', order: 'desc' })

      expect(asc[0]?.id).toBe('user-1')
      expect(desc[0]?.id).toBe('user-2')
    })

    it('lists with offset and limit', async () => {
      const all = await client.list({ type: 'User', orderBy: 'id' })
      const offset = await client.list({ type: 'User', orderBy: 'id', offset: 1, limit: 1 })

      expect(offset.length).toBe(1)
      expect(offset[0]?.id).toBe(all[1]?.id)
    })

    it('updates a thing', async () => {
      const updated = await client.update('https://test.miniflare.local/User/user-1', {
        data: { name: 'Alice Updated', role: 'superadmin' },
      })

      expect(updated.data.name).toBe('Alice Updated')
      expect(updated.data.role).toBe('superadmin')
    })

    it('deletes a thing', async () => {
      await client.create({
        ns: 'test.miniflare.local',
        type: 'Temp',
        id: 'to-delete',
        data: { value: 'test' },
      })

      const deleted = await client.delete('https://test.miniflare.local/Temp/to-delete')
      expect(deleted).toBe(true)

      const retrieved = await client.get('https://test.miniflare.local/Temp/to-delete')
      expect(retrieved).toBeNull()
    })
  })

  describe('Relationship Operations', () => {
    it('creates and queries relationships', async () => {
      const author = await client.upsert({
        ns: 'test.miniflare.local',
        type: 'Author',
        id: 'author-1',
        data: { name: 'Jane' },
      })

      const post = await client.upsert({
        ns: 'test.miniflare.local',
        type: 'Article',
        id: 'article-1',
        data: { title: 'My Article' },
      })

      const rel = await client.relate({
        type: 'wrote',
        from: author.url,
        to: post.url,
      })

      expect(rel.type).toBe('wrote')
      expect(rel.from).toBe(author.url)
      expect(rel.to).toBe(post.url)

      // Query outbound (what author wrote)
      const articles = await client.related(author.url, 'wrote', 'to')
      expect(articles.length).toBe(1)
      expect(articles[0]?.id).toBe('article-1')

      // Query inbound (who wrote this article)
      const authors = await client.related(post.url, 'wrote', 'from')
      expect(authors.length).toBe(1)
      expect(authors[0]?.id).toBe('author-1')
    })
  })

  describe('Event Operations', () => {
    it('tracks and queries events', async () => {
      const event = await client.track({
        type: 'test.event',
        source: 'miniflare-test',
        data: { key: 'value' },
      })

      expect(event.type).toBe('test.event')
      expect(event.source).toBe('miniflare-test')

      const events = await client.queryEvents({ source: 'miniflare-test' })
      expect(events.some(e => e.type === 'test.event')).toBe(true)
    })
  })

  describe('Action Operations', () => {
    it('creates and manages actions', async () => {
      const action = await client.send({
        actor: 'user:test',
        object: 'thing:test',
        action: 'process',
      })

      expect(action.status).toBe('pending')

      const started = await client.startAction(action.id)
      expect(started.status).toBe('active')

      const completed = await client.completeAction(action.id, { success: true })
      expect(completed.status).toBe('completed')
    })
  })

  describe('Artifact Operations', () => {
    it('stores and retrieves artifacts', async () => {
      const artifact = await client.storeArtifact({
        key: 'test-artifact',
        type: 'json',
        source: 'https://test.miniflare.local/Post/hello',
        sourceHash: 'abc123',
        content: { compiled: true },
      })

      expect(artifact.key).toBe('test-artifact')
      expect(artifact.type).toBe('json')

      const retrieved = await client.getArtifact('test-artifact')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.content).toEqual({ compiled: true })
    })

    it('handles artifact expiration', async () => {
      const artifact = await client.storeArtifact({
        key: 'expiring-artifact',
        type: 'json',
        source: 'test',
        sourceHash: 'hash',
        content: { temp: true },
        ttl: 1, // 1ms TTL
      })

      expect(artifact.expiresAt).toBeDefined()

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10))

      const retrieved = await client.getArtifact('expiring-artifact')
      expect(retrieved).toBeNull()
    })
  })

  describe('Search Operations', () => {
    it('searches by text', async () => {
      await client.upsert({
        ns: 'test.miniflare.local',
        type: 'Doc',
        id: 'searchable',
        data: { title: 'Searchable Document', content: 'This contains special keyword' },
      })

      const results = await client.search({ query: 'special keyword' })
      expect(results.some(r => r.id === 'searchable')).toBe(true)
    })
  })
})
