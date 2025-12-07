import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createFsDatabase } from '@mdxdb/fs'
import { createDatabaseTools } from './tools.js'
import type { Database } from '@mdxdb/fs'

describe('Integration: @mdxai/claude with @mdxdb/fs', () => {
  let testDir: string
  let db: Database

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdxai-claude-integration-'))
    db = createFsDatabase({ root: testDir })

    // Seed with test data
    await db.set('posts/hello-world', {
      type: 'BlogPost',
      data: {
        title: 'Hello World',
        author: 'John Doe',
        tags: ['intro', 'tutorial'],
      },
      content: '# Hello World\n\nWelcome to my blog!',
    })

    await db.set('posts/advanced-mdx', {
      type: 'BlogPost',
      data: {
        title: 'Advanced MDX Techniques',
        author: 'Jane Smith',
        tags: ['advanced', 'mdx'],
      },
      content: '# Advanced MDX\n\nLet me show you some advanced techniques.',
    })

    await db.set('docs/getting-started', {
      type: 'Documentation',
      data: {
        title: 'Getting Started Guide',
        version: '1.0',
      },
      content: '# Getting Started\n\nFollow these steps to get started.',
    })
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('Database Tools with Real Filesystem', () => {
    it('should list documents using mdxdb_list tool', async () => {
      const tools = createDatabaseTools(db)
      const listTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await listTool.handler({})

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse((result.content[0] as { text: string }).text)

      expect(parsed.total).toBe(3)
      expect(parsed.documents).toHaveLength(3)
    })

    it('should filter by type using mdxdb_list tool', async () => {
      const tools = createDatabaseTools(db)
      const listTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await listTool.handler({ type: 'BlogPost' })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.total).toBe(2)
      expect(parsed.documents.every((d: { type: string }) => d.type === 'BlogPost')).toBe(true)
    })

    it('should search documents using mdxdb_search tool', async () => {
      const tools = createDatabaseTools(db)
      const searchTool = tools[1]

      // @ts-expect-error - accessing handler for testing
      const result = await searchTool.handler({ query: 'advanced' })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.total).toBe(1)
      expect(parsed.documents[0].data.title).toBe('Advanced MDX Techniques')
      expect(parsed.documents[0].score).toBeGreaterThan(0)
    })

    it('should get document using mdxdb_get tool', async () => {
      const tools = createDatabaseTools(db)
      const getTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await getTool.handler({ id: 'posts/hello-world' })

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse((result.content[0] as { text: string }).text)

      expect(parsed.type).toBe('BlogPost')
      expect(parsed.data.title).toBe('Hello World')
      expect(parsed.data.author).toBe('John Doe')
      expect(parsed.content).toContain('Welcome to my blog!')
    })

    it('should return error for non-existent document', async () => {
      const tools = createDatabaseTools(db)
      const getTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await getTool.handler({ id: 'non-existent' })

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('Document not found')
    })

    it('should create document using mdxdb_set tool', async () => {
      const tools = createDatabaseTools(db)
      const setTool = tools[3]

      // @ts-expect-error - accessing handler for testing
      const result = await setTool.handler({
        id: 'posts/new-post',
        type: 'BlogPost',
        data: { title: 'New Post', author: 'Claude' },
        content: '# New Post\n\nCreated by Claude!',
      })

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.created).toBe(true)

      // Verify document was created
      const doc = await db.get('posts/new-post')
      expect(doc).not.toBeNull()
      expect(doc?.data.title).toBe('New Post')
    })

    it('should delete document using mdxdb_delete tool', async () => {
      const tools = createDatabaseTools(db)
      const deleteTool = tools[4]

      // @ts-expect-error - accessing handler for testing
      const result = await deleteTool.handler({ id: 'posts/hello-world' })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.deleted).toBe(true)

      // Verify document was deleted
      const doc = await db.get('posts/hello-world')
      expect(doc).toBeNull()
    })

    it('should handle pagination with mdxdb_list tool', async () => {
      const tools = createDatabaseTools(db)
      const listTool = tools[0]

      // Get first page
      // @ts-expect-error - accessing handler for testing
      const page1 = await listTool.handler({ limit: 2, offset: 0 })
      const parsed1 = JSON.parse((page1.content[0] as { text: string }).text)
      expect(parsed1.count).toBe(2)
      expect(parsed1.hasMore).toBe(true)

      // Get second page
      // @ts-expect-error - accessing handler for testing
      const page2 = await listTool.handler({ limit: 2, offset: 2 })
      const parsed2 = JSON.parse((page2.content[0] as { text: string }).text)
      expect(parsed2.count).toBe(1)
      expect(parsed2.hasMore).toBe(false)
    })

    it('should filter by prefix using mdxdb_list tool', async () => {
      const tools = createDatabaseTools(db)
      const listTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await listTool.handler({ prefix: 'posts' })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.total).toBe(2)
      expect(
        parsed.documents.every((d: { id: string }) => d.id?.startsWith('posts') || d.id === undefined)
      ).toBe(true)
    })

    it('should search with field filtering', async () => {
      const tools = createDatabaseTools(db)
      const searchTool = tools[1]

      // Search only in title field
      // @ts-expect-error - accessing handler for testing
      const result = await searchTool.handler({
        query: 'Getting Started',
        fields: ['title'],
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.total).toBe(1)
      expect(parsed.documents[0].data.title).toBe('Getting Started Guide')
    })

    it('should update existing document using mdxdb_set tool', async () => {
      const tools = createDatabaseTools(db)
      const setTool = tools[3]

      // Update existing document
      // @ts-expect-error - accessing handler for testing
      const result = await setTool.handler({
        id: 'posts/hello-world',
        type: 'BlogPost',
        data: { title: 'Hello World (Updated)', author: 'John Doe' },
        content: '# Hello World\n\nThis post has been updated!',
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.created).toBe(false) // Updated, not created

      // Verify update
      const doc = await db.get('posts/hello-world')
      expect(doc?.data.title).toBe('Hello World (Updated)')
      expect(doc?.content).toContain('updated')
    })
  })

  describe('Tool Names and Descriptions', () => {
    it('should have correct tool names', () => {
      const tools = createDatabaseTools(db)

      expect(tools.map((t) => t.name)).toEqual([
        'mdxdb_list',
        'mdxdb_search',
        'mdxdb_get',
        'mdxdb_set',
        'mdxdb_delete',
      ])
    })

    it('should have descriptive tool descriptions', () => {
      const tools = createDatabaseTools(db)

      expect(tools[0].description).toContain('List')
      expect(tools[1].description).toContain('Search')
      expect(tools[2].description).toContain('Get')
      expect(tools[3].description).toContain('Create')
      expect(tools[4].description).toContain('Delete')
    })
  })
})
