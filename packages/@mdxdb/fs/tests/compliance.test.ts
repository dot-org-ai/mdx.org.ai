/**
 * @mdxdb/fs Compliance Tests
 *
 * NOTE: @mdxdb/fs implements a different interface than other @mdxdb adapters.
 *
 * Interface Comparison:
 * - @mdxdb/fs: Implements `Database<TData>` from `mdxdb` package
 *   - Works with MDXLDDocument objects (YAML frontmatter + content)
 *   - Methods: get(id), set(id, document), list(), search(), delete()
 *   - File-based storage with .mdx/.md files
 *
 * - @mdxdb/sqlite, @mdxdb/clickhouse: Implement `DBClient<TData>` from `ai-database`
 *   - Works with Thing objects (graph nodes with relationships)
 *   - Methods: get(url), create(options), relate(), track(), etc.
 *   - Database storage with graphs, events, actions, artifacts
 *
 * The unified compliance tests from `ai-database/tests` are designed for DBClient/DBClientExtended.
 * @mdxdb/fs cannot use these tests without an adapter layer that would convert between interfaces.
 *
 * This file provides fs-specific tests that verify the `Database<TData>` interface.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createFsDatabase, type FsDatabaseConfig } from '../src/index.js'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

// Skip tests if explicitly disabled
const SKIP_COMPLIANCE = process.env.SKIP_FS_COMPLIANCE === 'true'

if (!SKIP_COMPLIANCE) {
  describe('@mdxdb/fs Compliance Tests', () => {
    let testDir: string
    let db: ReturnType<typeof createFsDatabase>

    beforeAll(async () => {
      // Create a temp directory for test files
      testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdxdb-fs-test-'))
      db = createFsDatabase({ root: testDir })
    })

    afterAll(async () => {
      await db.close()
      // Cleanup temp directory
      try {
        await fs.rm(testDir, { recursive: true })
      } catch {
        // Ignore cleanup errors
      }
    })

    describe('Document CRUD', () => {
      it('creates a document with set()', async () => {
        const doc = {
          type: 'Post',
          data: { title: 'Hello World', slug: 'hello-world' },
          content: '# Hello World\n\nThis is the content.',
        }

        const result = await db.set('posts/hello-world', doc)

        expect(result.id).toBe('posts/hello-world')
        expect(result.created).toBe(true)
      })

      it('reads a document with get()', async () => {
        const doc = await db.get('posts/hello-world')

        expect(doc).not.toBeNull()
        expect(doc?.data.title).toBe('Hello World')
        expect(doc?.content).toContain('Hello World')
      })

      it('returns null for non-existent document', async () => {
        const doc = await db.get('posts/does-not-exist')

        expect(doc).toBeNull()
      })

      it('updates an existing document', async () => {
        const doc = await db.get('posts/hello-world')
        expect(doc).not.toBeNull()

        const updated = {
          ...doc!,
          data: { ...doc!.data, title: 'Updated Title' },
        }

        const result = await db.set('posts/hello-world', updated)
        expect(result.created).toBe(false)

        const retrieved = await db.get('posts/hello-world')
        expect(retrieved?.data.title).toBe('Updated Title')
      })

      it('deletes a document', async () => {
        // Create then delete
        await db.set('posts/to-delete', {
          type: 'Post',
          data: { title: 'To Delete' },
          content: '',
        })

        const result = await db.delete('posts/to-delete')
        expect(result.deleted).toBe(true)

        const doc = await db.get('posts/to-delete')
        expect(doc).toBeNull()
      })
    })

    describe('Listing and Search', () => {
      beforeAll(async () => {
        // Seed test data
        await db.set('users/alice', {
          type: 'User',
          data: { name: 'Alice', email: 'alice@example.com' },
          content: '',
        })
        await db.set('users/bob', {
          type: 'User',
          data: { name: 'Bob', email: 'bob@example.com' },
          content: '',
        })
        await db.set('posts/first', {
          type: 'Post',
          data: { title: 'First Post', authorId: 'alice' },
          content: 'This is the first post.',
        })
      })

      it('lists all documents', async () => {
        const result = await db.list()

        expect(result.documents.length).toBeGreaterThanOrEqual(3)
        expect(result.total).toBeGreaterThanOrEqual(3)
      })

      it('lists documents by type', async () => {
        const result = await db.list({ type: 'User' })

        expect(result.documents.length).toBe(2)
        expect(result.documents.every(d => d.type === 'User' || d.data.$type === 'User')).toBe(true)
      })

      it('lists with limit', async () => {
        const result = await db.list({ limit: 1 })

        expect(result.documents.length).toBe(1)
        expect(result.hasMore).toBe(true)
      })

      it('lists with offset', async () => {
        const all = await db.list()
        const offset = await db.list({ offset: 1, limit: 2 })

        expect(offset.documents.length).toBeLessThanOrEqual(2)
      })

      it('searches by query', async () => {
        const result = await db.search({ query: 'first' })

        expect(result.documents.length).toBeGreaterThanOrEqual(1)
        expect(result.documents.some(d => d.data.title === 'First Post')).toBe(true)
      })

      it('searches by type', async () => {
        const result = await db.search({ query: 'alice', type: 'User' })

        expect(result.documents.some(d => d.data.name === 'Alice')).toBe(true)
      })
    })

    describe('Interface Notes', () => {
      it('implements Database interface, not DBClient', () => {
        // This test documents the interface difference
        expect(typeof db.get).toBe('function')
        expect(typeof db.set).toBe('function')
        expect(typeof db.list).toBe('function')
        expect(typeof db.search).toBe('function')
        expect(typeof db.delete).toBe('function')

        // These DBClient methods are NOT available
        expect((db as any).create).toBeUndefined()
        expect((db as any).update).toBeUndefined()
        expect((db as any).relate).toBeUndefined()
        expect((db as any).track).toBeUndefined()
      })
    })
  })
}
