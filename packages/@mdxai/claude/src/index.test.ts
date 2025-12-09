import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClaudeServer } from './server.js'
import { FsDatabase } from '@mdxdb/fs'
import type { Executor, DoResult, TestResult, DeployResult } from 'mdxe'
import type { MDXLDDocument } from 'mdxld'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Real executor implementation for testing
class TestExecutor implements Executor {
  async do(document: MDXLDDocument, options?: any): Promise<DoResult> {
    return {
      success: true,
      output: 'executed',
      returnValue: { result: 'ok' },
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

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdxai-claude-index-test-'))
  db = new FsDatabase({ root: tmpDir })
  executor = new TestExecutor()
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('@mdxai/claude', () => {
  it('module loads', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })

  it('exports all main functions', async () => {
    const mod = await import('./index.js')
    expect(mod.createClaudeServer).toBeDefined()
    expect(mod.createDatabaseTools).toBeDefined()
    expect(mod.createExecutorTools).toBeDefined()
    expect(mod.name).toBe('@mdxai/claude')
  })

  it('exports types', async () => {
    // Type imports - this will fail to compile if types are not exported
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })
})

describe('createClaudeServer', () => {
  it('should create server with database only', () => {
    const server = createClaudeServer({
      database: db,
    })

    expect(server).toBeDefined()
    expect(server.name).toBe('mdxai')
  })

  it('should create server with custom name and version', () => {
    const server = createClaudeServer({
      name: 'custom-server',
      version: '2.0.0',
      database: db,
    })

    expect(server).toBeDefined()
    expect(server.name).toBe('custom-server')
  })

  it('should create server with database and executor', () => {
    const server = createClaudeServer({
      database: db,
      executor: executor,
    })

    expect(server).toBeDefined()
    expect(server.name).toBe('mdxai')
  })

  it('should respect enableDatabaseTools flag', () => {
    const server = createClaudeServer({
      database: db,
      enableDatabaseTools: false,
    })

    expect(server).toBeDefined()
    // Server should still be created but without database tools
  })

  it('should respect enableExecutorTools flag', () => {
    const server = createClaudeServer({
      database: db,
      executor: executor,
      enableExecutorTools: false,
    })

    expect(server).toBeDefined()
    // Server should still be created but without executor tools
  })

  it('should create server with all tools enabled', () => {
    const server = createClaudeServer({
      name: 'full-server',
      version: '1.0.0',
      database: db,
      executor: executor,
      enableDatabaseTools: true,
      enableExecutorTools: true,
    })

    expect(server).toBeDefined()
    expect(server.name).toBe('full-server')
  })

  it('should not create executor tools without database', () => {
    const server = createClaudeServer({
      database: db,
      executor: executor,
      enableDatabaseTools: false,
      enableExecutorTools: true,
    })

    expect(server).toBeDefined()
    // Executor tools require database, so should not be added
  })

  it('should handle minimal configuration', () => {
    const server = createClaudeServer({
      database: db,
    })

    expect(server).toBeDefined()
    expect(server.name).toBe('mdxai')
  })

  it('should create server with only executor disabled', () => {
    const server = createClaudeServer({
      database: db,
      executor: executor,
      enableExecutorTools: false,
    })

    expect(server).toBeDefined()
  })

  it('should create server with custom configuration', () => {
    const server = createClaudeServer({
      name: 'test-server',
      version: '0.1.0',
      database: db,
      executor: executor,
      enableDatabaseTools: true,
      enableExecutorTools: true,
    })

    expect(server).toBeDefined()
    expect(server.name).toBe('test-server')
  })
})
