import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FsDatabase } from '@mdxdb/fs'
import type { Executor, DoResult, TestResult, DeployResult } from 'mdxe'
import type { MDXLDDocument } from 'mdxld'
import { createDatabaseTools, createExecutorTools } from './tools.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Test document
const testDocument: MDXLDDocument = {
  id: 'test/doc',
  type: 'Article',
  data: {
    $type: 'Article',
    title: 'Test Document',
  },
  content: '# Hello World',
}

// Real executor implementation for testing
class TestExecutor implements Executor {
  async do(document: MDXLDDocument, options?: any): Promise<DoResult> {
    return {
      success: true,
      output: 'executed',
      returnValue: { result: 'ok', action: options?.action },
      duration: 100,
    }
  }

  async test(documents: MDXLDDocument[] | string, options?: any): Promise<TestResult> {
    return {
      passed: true,
      total: 5,
      passed_count: 5,
      failed_count: 0,
      skipped_count: 0,
      duration: 500,
    }
  }

  async deploy(documents: MDXLDDocument[] | string, options?: any): Promise<DeployResult> {
    return {
      success: true,
      url: 'https://example.com',
      deploymentId: 'deploy-123',
    }
  }
}

let db: FsDatabase
let tmpDir: string
let executor: Executor

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdxai-claude-test-'))
  db = new FsDatabase({ root: tmpDir })
  executor = new TestExecutor()

  // Create test document
  await db.set('test/doc', testDocument)
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('createDatabaseTools', () => {
  it('should create all database tools', () => {
    const tools = createDatabaseTools(db)
    expect(tools).toHaveLength(5)
    expect(tools.map((t) => t.name)).toEqual([
      'mdxdb_list',
      'mdxdb_search',
      'mdxdb_get',
      'mdxdb_set',
      'mdxdb_delete',
    ])
  })

  describe('list tool', () => {
    it('should list documents', async () => {
      const tools = createDatabaseTools(db)
      const listTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await listTool.handler({ limit: 10 })

      expect(result.content[0].type).toBe('text')
      expect(result.isError).toBeUndefined()

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.total).toBeGreaterThanOrEqual(1)
      expect(parsed.documents).toBeDefined()
    })

    it('should handle errors with invalid options', async () => {
      const tools = createDatabaseTools(db)
      const listTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await listTool.handler({ limit: -1 })

      // Even with invalid limit, FsDatabase should handle it gracefully
      expect(result.content[0].type).toBe('text')
    })
  })

  describe('search tool', () => {
    it('should search documents', async () => {
      const tools = createDatabaseTools(db)
      const searchTool = tools[1]

      // @ts-expect-error - accessing handler for testing
      const result = await searchTool.handler({ query: 'hello' })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.documents).toBeDefined()
      expect(Array.isArray(parsed.documents)).toBe(true)
    })

    it('should search with semantic option', async () => {
      const tools = createDatabaseTools(db)
      const searchTool = tools[1]

      // @ts-expect-error - accessing handler for testing
      const result = await searchTool.handler({
        query: 'machine learning',
        semantic: true,
        limit: 5,
        fields: ['title', 'content'],
      })

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.documents).toBeDefined()
    })
  })

  describe('get tool', () => {
    it('should get a document', async () => {
      const tools = createDatabaseTools(db)
      const getTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await getTool.handler({ id: 'test/doc' })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.id).toBe('test/doc')
      expect(parsed.type).toBe('Article')
      expect(parsed.data.title).toBe('Test Document')
    })

    it('should return error for missing document', async () => {
      const tools = createDatabaseTools(db)
      const getTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await getTool.handler({ id: 'missing/doc' })

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('Document not found')
    })

    it('should get document with AST included', async () => {
      const tools = createDatabaseTools(db)
      const getTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await getTool.handler({
        id: 'test/doc',
        includeAst: true,
      })

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.id).toBe('test/doc')
    })
  })

  describe('set tool', () => {
    it('should create a new document', async () => {
      const tools = createDatabaseTools(db)
      const setTool = tools[3]

      // @ts-expect-error - accessing handler for testing
      const result = await setTool.handler({
        id: 'new/doc',
        type: 'Post',
        content: '# New post',
        data: { title: 'New Post' },
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.id).toBe('new/doc')

      // Verify document was created
      const doc = await db.get('new/doc')
      expect(doc).toBeDefined()
      expect(doc?.data.title).toBe('New Post')
    })

    it('should update an existing document', async () => {
      const tools = createDatabaseTools(db)
      const setTool = tools[3]

      // @ts-expect-error - accessing handler for testing
      const result = await setTool.handler({
        id: 'test/doc',
        content: '# Updated content',
        data: { title: 'Updated Title' },
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)

      // Verify document was updated
      const doc = await db.get('test/doc')
      expect(doc?.data.title).toBe('Updated Title')
    })

    it('should handle set with create-only flag', async () => {
      const tools = createDatabaseTools(db)
      const setTool = tools[3]

      // @ts-expect-error - accessing handler for testing
      const result = await setTool.handler({
        id: 'create-only/doc',
        type: 'Article',
        content: '# Create only',
        data: { title: 'Create Only' },
        createOnly: true,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
    })

    it('should handle set with update-only flag', async () => {
      const tools = createDatabaseTools(db)
      const setTool = tools[3]

      // Create a document first
      await db.set('update-only/doc', {
        id: 'update-only/doc',
        type: 'Article',
        data: { $type: 'Article', title: 'Original' },
        content: '# Original',
      })

      // @ts-expect-error - accessing handler for testing
      const result = await setTool.handler({
        id: 'update-only/doc',
        content: '# Updated content',
        updateOnly: true,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
    })
  })

  describe('delete tool', () => {
    it('should delete a document', async () => {
      const tools = createDatabaseTools(db)
      const deleteTool = tools[4]

      // Create a document to delete
      await db.set('to-delete/doc', {
        id: 'to-delete/doc',
        type: 'Article',
        data: { $type: 'Article', title: 'Delete Me' },
        content: '# Delete Me',
      })

      // @ts-expect-error - accessing handler for testing
      const result = await deleteTool.handler({ id: 'to-delete/doc' })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.deleted).toBe(true)

      // Verify document was deleted
      const doc = await db.get('to-delete/doc')
      expect(doc).toBeNull()
    })

    it('should handle soft delete', async () => {
      const tools = createDatabaseTools(db)
      const deleteTool = tools[4]

      // Create a document to soft delete
      await db.set('soft-delete/doc', {
        id: 'soft-delete/doc',
        type: 'Article',
        data: { $type: 'Article', title: 'Soft Delete' },
        content: '# Soft Delete',
      })

      // @ts-expect-error - accessing handler for testing
      const result = await deleteTool.handler({
        id: 'soft-delete/doc',
        soft: true,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.deleted).toBe(true)
    })

    it('should handle delete errors for non-existent documents', async () => {
      const tools = createDatabaseTools(db)
      const deleteTool = tools[4]

      // @ts-expect-error - accessing handler for testing
      const result = await deleteTool.handler({ id: 'nonexistent/doc' })

      // FsDatabase may not throw an error for deleting non-existent files
      // It should either succeed or return an appropriate result
      expect(result.content[0].type).toBe('text')
    })
  })
})

describe('createExecutorTools', () => {
  it('should create all executor tools', () => {
    const tools = createExecutorTools(executor, db)
    expect(tools).toHaveLength(3)
    expect(tools.map((t) => t.name)).toEqual(['mdxe_do', 'mdxe_test', 'mdxe_deploy'])
  })

  describe('do tool', () => {
    it('should execute a document', async () => {
      const tools = createExecutorTools(executor, db)
      const doTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await doTool.handler({
        id: 'test/doc',
        action: 'generate',
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.returnValue).toEqual({ result: 'ok', action: 'generate' })
    })

    it('should return error for missing document', async () => {
      const tools = createExecutorTools(executor, db)
      const doTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await doTool.handler({ id: 'missing/doc' })

      expect(result.isError).toBe(true)
    })

    it('should handle do with action and arguments', async () => {
      const tools = createExecutorTools(executor, db)
      const doTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await doTool.handler({
        id: 'test/doc',
        action: 'process',
        args: ['arg1', 'arg2'],
        input: { data: 'test' },
        timeout: 5000,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.duration).toBeDefined()
    })
  })

  describe('test tool', () => {
    it('should run tests', async () => {
      const tools = createExecutorTools(executor, db)
      const testTool = tools[1]

      // @ts-expect-error - accessing handler for testing
      const result = await testTool.handler({
        target: 'test/doc',
        coverage: true,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.passed).toBe(true)
      expect(parsed.total).toBe(5)
      expect(parsed.passed_count).toBe(5)
    })

    it('should handle test with pattern and coverage', async () => {
      const tools = createExecutorTools(executor, db)
      const testTool = tools[1]

      // @ts-expect-error - accessing handler for testing
      const result = await testTool.handler({
        target: 'test/doc',
        pattern: 'should.*',
        coverage: true,
        timeout: 10000,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.passed).toBe(true)
      expect(parsed.total).toBe(5)
      expect(parsed.passed_count).toBe(5)
    })
  })

  describe('deploy tool', () => {
    it('should deploy documents', async () => {
      const tools = createExecutorTools(executor, db)
      const deployTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await deployTool.handler({
        target: 'test/doc',
        platform: 'vercel',
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.url).toBe('https://example.com')
    })

    it('should handle deploy with environment variables', async () => {
      const tools = createExecutorTools(executor, db)
      const deployTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await deployTool.handler({
        target: 'test/doc',
        platform: 'cloudflare',
        env: { API_KEY: 'secret' },
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
    })

    it('should handle deploy with dry run', async () => {
      const tools = createExecutorTools(executor, db)
      const deployTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await deployTool.handler({
        target: 'test/doc',
        platform: 'netlify',
        dryRun: true,
      })

      expect(result.isError).toBeUndefined()
    })

    it('should handle deploy with force flag', async () => {
      const tools = createExecutorTools(executor, db)
      const deployTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await deployTool.handler({
        target: 'test/doc',
        platform: 'custom',
        force: true,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
    })
  })
})

describe('Database Tools - Advanced Scenarios', () => {
  it('should handle list with all filter options', async () => {
    const tools = createDatabaseTools(db)
    const listTool = tools[0]

    // @ts-expect-error - accessing handler for testing
    const result = await listTool.handler({
      limit: 20,
      offset: 0,
      sortBy: 'id',
      sortOrder: 'desc',
      type: 'Article',
      prefix: 'test/',
    })

    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse((result.content[0] as { text: string }).text)
    expect(parsed.documents).toBeDefined()
  })
})
