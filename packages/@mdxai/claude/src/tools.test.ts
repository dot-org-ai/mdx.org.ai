import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Database, ListResult, SearchResult, SetResult, DeleteResult } from 'mdxdb'
import type { Executor, DoResult, TestResult, DeployResult } from 'mdxe'
import type { MDXLDDocument, MDXLDData } from 'mdxld'
import { createDatabaseTools, createExecutorTools } from './tools.js'

// Mock document
const mockDocument: MDXLDDocument = {
  id: 'test/doc',
  type: 'Article',
  data: {
    $type: 'Article',
    title: 'Test Document',
  },
  content: '# Hello World',
}

// Mock database implementation
function createMockDatabase(): Database {
  return {
    list: vi.fn().mockResolvedValue({
      documents: [mockDocument],
      total: 1,
      hasMore: false,
    } as ListResult),
    search: vi.fn().mockResolvedValue({
      documents: [{ ...mockDocument, score: 0.95 }],
      total: 1,
      hasMore: false,
    } as SearchResult),
    get: vi.fn().mockResolvedValue(mockDocument),
    set: vi.fn().mockResolvedValue({
      id: 'test/doc',
      created: true,
      version: '1',
    } as SetResult),
    delete: vi.fn().mockResolvedValue({
      id: 'test/doc',
      deleted: true,
    } as DeleteResult),
  }
}

// Mock executor implementation
function createMockExecutor(): Executor {
  return {
    do: vi.fn().mockResolvedValue({
      success: true,
      output: 'executed',
      returnValue: { result: 'ok' },
      duration: 100,
    } as DoResult),
    test: vi.fn().mockResolvedValue({
      passed: true,
      total: 5,
      passed_count: 5,
      failed_count: 0,
      skipped_count: 0,
      duration: 500,
    } as TestResult),
    deploy: vi.fn().mockResolvedValue({
      success: true,
      url: 'https://example.com',
      deploymentId: 'deploy-123',
    } as DeployResult),
  }
}

describe('createDatabaseTools', () => {
  let mockDb: Database

  beforeEach(() => {
    mockDb = createMockDatabase()
  })

  it('should create all database tools', () => {
    const tools = createDatabaseTools(mockDb)
    expect(tools).toHaveLength(5)
    // Check tool names are defined (tools are tuples with specific structure)
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
      const tools = createDatabaseTools(mockDb)
      const listTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await listTool.handler({ limit: 10 })

      expect(mockDb.list).toHaveBeenCalledWith({
        limit: 10,
        offset: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        type: undefined,
        prefix: undefined,
      })
      expect(result.content[0].type).toBe('text')
      expect(result.isError).toBeUndefined()

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.total).toBe(1)
      expect(parsed.documents).toHaveLength(1)
    })

    it('should handle errors', async () => {
      const errorDb = createMockDatabase()
      errorDb.list = vi.fn().mockRejectedValue(new Error('Database error'))

      const tools = createDatabaseTools(errorDb)
      const listTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await listTool.handler({})

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('Error listing documents')
    })
  })

  describe('search tool', () => {
    it('should search documents', async () => {
      const tools = createDatabaseTools(mockDb)
      const searchTool = tools[1]

      // @ts-expect-error - accessing handler for testing
      const result = await searchTool.handler({ query: 'hello' })

      expect(mockDb.search).toHaveBeenCalledWith({
        query: 'hello',
        limit: undefined,
        offset: undefined,
        fields: undefined,
        semantic: undefined,
        type: undefined,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.documents[0].score).toBe(0.95)
    })
  })

  describe('get tool', () => {
    it('should get a document', async () => {
      const tools = createDatabaseTools(mockDb)
      const getTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await getTool.handler({ id: 'test/doc' })

      expect(mockDb.get).toHaveBeenCalledWith('test/doc', {
        includeAst: undefined,
        includeCode: undefined,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.id).toBe('test/doc')
      expect(parsed.type).toBe('Article')
    })

    it('should return error for missing document', async () => {
      const emptyDb = createMockDatabase()
      emptyDb.get = vi.fn().mockResolvedValue(null)

      const tools = createDatabaseTools(emptyDb)
      const getTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await getTool.handler({ id: 'missing' })

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('Document not found')
    })
  })

  describe('set tool', () => {
    it('should create/update a document', async () => {
      const tools = createDatabaseTools(mockDb)
      const setTool = tools[3]

      // @ts-expect-error - accessing handler for testing
      const result = await setTool.handler({
        id: 'new/doc',
        type: 'Post',
        content: '# New post',
        data: { title: 'New Post' },
      })

      expect(mockDb.set).toHaveBeenCalled()

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.created).toBe(true)
    })
  })

  describe('delete tool', () => {
    it('should delete a document', async () => {
      const tools = createDatabaseTools(mockDb)
      const deleteTool = tools[4]

      // @ts-expect-error - accessing handler for testing
      const result = await deleteTool.handler({ id: 'test/doc' })

      expect(mockDb.delete).toHaveBeenCalledWith('test/doc', {
        soft: undefined,
      })

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.deleted).toBe(true)
    })
  })
})

describe('createExecutorTools', () => {
  let mockDb: Database
  let mockExecutor: Executor

  beforeEach(() => {
    mockDb = createMockDatabase()
    mockExecutor = createMockExecutor()
  })

  it('should create all executor tools', () => {
    const tools = createExecutorTools(mockExecutor, mockDb)
    expect(tools).toHaveLength(3)
    expect(tools.map((t) => t.name)).toEqual(['mdxe_do', 'mdxe_test', 'mdxe_deploy'])
  })

  describe('do tool', () => {
    it('should execute a document', async () => {
      const tools = createExecutorTools(mockExecutor, mockDb)
      const doTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await doTool.handler({
        id: 'test/doc',
        action: 'generate',
      })

      expect(mockDb.get).toHaveBeenCalledWith('test/doc')
      expect(mockExecutor.do).toHaveBeenCalled()

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.returnValue).toEqual({ result: 'ok' })
    })

    it('should return error for missing document', async () => {
      const emptyDb = createMockDatabase()
      emptyDb.get = vi.fn().mockResolvedValue(null)

      const tools = createExecutorTools(mockExecutor, emptyDb)
      const doTool = tools[0]

      // @ts-expect-error - accessing handler for testing
      const result = await doTool.handler({ id: 'missing' })

      expect(result.isError).toBe(true)
    })
  })

  describe('test tool', () => {
    it('should run tests', async () => {
      const tools = createExecutorTools(mockExecutor, mockDb)
      const testTool = tools[1]

      // @ts-expect-error - accessing handler for testing
      const result = await testTool.handler({
        target: 'test/doc',
        coverage: true,
      })

      expect(mockExecutor.test).toHaveBeenCalled()

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.passed).toBe(true)
      expect(parsed.total).toBe(5)
    })
  })

  describe('deploy tool', () => {
    it('should deploy documents', async () => {
      const tools = createExecutorTools(mockExecutor, mockDb)
      const deployTool = tools[2]

      // @ts-expect-error - accessing handler for testing
      const result = await deployTool.handler({
        target: 'test/doc',
        platform: 'vercel',
      })

      expect(mockExecutor.deploy).toHaveBeenCalled()

      const parsed = JSON.parse((result.content[0] as { text: string }).text)
      expect(parsed.success).toBe(true)
      expect(parsed.url).toBe('https://example.com')
    })
  })
})
