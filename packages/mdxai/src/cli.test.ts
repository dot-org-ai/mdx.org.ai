/**
 * CLI and MCP Server Tests
 *
 * Tests for the mdxai CLI including:
 * - Argument parsing
 * - CLI startup and help
 * - Database creation
 * - MCP server tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn, ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { parseArgs, createDatabase, type CliOptions } from './cli.js'
import { createMcpServer } from './server.js'
import { createSqliteDatabase } from '@mdxdb/sqlite'
import type { Database } from 'mdxdb'

// Path to the built CLI
const CLI_PATH = resolve(import.meta.dirname, '../dist/cli.js')

/**
 * Helper to spawn the CLI and communicate via stdio
 */
function spawnCli(args: string[] = []): ChildProcess {
  return spawn('node', [CLI_PATH, ...args], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

/**
 * Helper to read all output from a stream until it closes or times out
 */
function readStream(stream: NodeJS.ReadableStream, timeout = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    const timer = setTimeout(() => {
      resolve(data)
    }, timeout)

    stream.on('data', (chunk) => {
      data += chunk.toString()
    })

    stream.on('end', () => {
      clearTimeout(timer)
      resolve(data)
    })

    stream.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

describe('CLI Argument Parsing', () => {
  it('should use default values when no args provided', () => {
    const options = parseArgs([])
    expect(options.database).toBe('fs')
    expect(options.path).toBe('./content')
    expect(options.name).toBe('mdxai')
    expect(options.help).toBe(false)
  })

  it('should parse --database flag', () => {
    const options = parseArgs(['--database', 'sqlite'])
    expect(options.database).toBe('sqlite')
    expect(options.path).toBe('./mdxdb.sqlite') // Default sqlite path
  })

  it('should parse -d short flag', () => {
    const options = parseArgs(['-d', 'sqlite'])
    expect(options.database).toBe('sqlite')
  })

  it('should parse --path flag', () => {
    const options = parseArgs(['--path', '/custom/path'])
    expect(options.path).toBe('/custom/path')
  })

  it('should parse -p short flag', () => {
    const options = parseArgs(['-p', '/custom/path'])
    expect(options.path).toBe('/custom/path')
  })

  it('should parse --name flag', () => {
    const options = parseArgs(['--name', 'my-server'])
    expect(options.name).toBe('my-server')
  })

  it('should parse --help flag', () => {
    const options = parseArgs(['--help'])
    expect(options.help).toBe(true)
  })

  it('should parse -h short flag', () => {
    const options = parseArgs(['-h'])
    expect(options.help).toBe(true)
  })

  it('should parse multiple flags together', () => {
    const options = parseArgs(['-d', 'sqlite', '-p', ':memory:', '-n', 'test-server'])
    expect(options.database).toBe('sqlite')
    expect(options.path).toBe(':memory:')
    expect(options.name).toBe('test-server')
  })
})

describe('Database Creation', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(resolve(tmpdir(), 'mdxai-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should create SQLite database with in-memory path', () => {
    const options: CliOptions = {
      database: 'sqlite',
      path: ':memory:',
      name: 'test',
      version: '0.0.0',
      help: false,
    }

    const db = createDatabase(options)
    expect(db).toBeDefined()
    expect(typeof db.list).toBe('function')
    expect(typeof db.get).toBe('function')
    expect(typeof db.set).toBe('function')
  })

  it('should create filesystem database', () => {
    const options: CliOptions = {
      database: 'fs',
      path: tempDir,
      name: 'test',
      version: '0.0.0',
      help: false,
    }

    const db = createDatabase(options)
    expect(db).toBeDefined()
    expect(typeof db.list).toBe('function')
  })
})

describe('CLI Help and Version', () => {
  it('should display help when --help is passed', async () => {
    const proc = spawnCli(['--help'])
    const stdout = await readStream(proc.stdout!, 2000)

    expect(stdout).toContain('mdxai - MDX AI Agent CLI')
    expect(stdout).toContain('Usage:')
    expect(stdout).toContain('--database')
    expect(stdout).toContain('--path')
    expect(stdout).toContain('Examples:')

    proc.kill()
  })

  it('should display version when --version is passed', async () => {
    const proc = spawnCli(['--version'])
    const stdout = await readStream(proc.stdout!, 2000)

    expect(stdout).toContain('mdxai version')

    proc.kill()
  })
})

describe('CLI Startup', () => {
  it('should start MCP server and output startup message to stderr', async () => {
    const proc = spawnCli(['--database', 'sqlite', '--path', ':memory:'])

    // Startup messages go to stderr
    const stderr = await readStream(proc.stderr!, 2000)

    expect(stderr).toContain('mdxai MCP server starting')
    expect(stderr).toContain('Database: sqlite')
    expect(stderr).toContain('Path: :memory:')

    proc.kill()
  })
})

describe('MCP Server', () => {
  let db: Database

  beforeEach(() => {
    db = createSqliteDatabase({ filename: ':memory:' })
  })

  afterEach(async () => {
    await db.close?.()
  })

  it('should create MCP server with database', () => {
    const server = createMcpServer({ database: db })
    expect(server).toBeDefined()
  })

  it('should create MCP server with custom name and version', () => {
    const server = createMcpServer({
      name: 'custom-server',
      version: '2.0.0',
      database: db,
    })
    expect(server).toBeDefined()
  })
})

describe('Database Operations (used by MCP tools)', () => {
  let db: Database

  beforeEach(() => {
    db = createSqliteDatabase({ filename: ':memory:' })
  })

  afterEach(async () => {
    await db.close?.()
  })

  it('should list documents', async () => {
    await db.set('doc1', { data: { title: 'Doc 1' }, content: '# Doc 1' })
    await db.set('doc2', { data: { title: 'Doc 2' }, content: '# Doc 2' })

    const result = await db.list({})

    expect(result.documents).toHaveLength(2)
    expect(result.documents.map((d) => d.id)).toContain('doc1')
    expect(result.documents.map((d) => d.id)).toContain('doc2')
  })

  it('should set and get document', async () => {
    await db.set('new-doc', {
      type: 'Article',
      data: { title: 'New Document' },
      content: '# New Document\n\nContent here.',
    })

    const doc = await db.get('new-doc')
    expect(doc).not.toBeNull()
    expect(doc?.type).toBe('Article')
    expect(doc?.data.title).toBe('New Document')
  })

  it('should search documents', async () => {
    await db.set('search-1', {
      data: { title: 'Hello World' },
      content: '# Hello World\n\nThis is searchable content.',
    })
    await db.set('search-2', {
      data: { title: 'Goodbye' },
      content: '# Goodbye\n\nDifferent content.',
    })

    const result = await db.search({ query: 'searchable' })

    expect(result.documents.length).toBeGreaterThan(0)
    expect(result.documents.map((d) => d.id)).toContain('search-1')
  })

  it('should delete document', async () => {
    await db.set('to-delete', { data: {}, content: '# Delete me' })

    const result = await db.delete('to-delete')
    expect(result.deleted).toBe(true)

    const doc = await db.get('to-delete')
    expect(doc).toBeNull()
  })

  it('should return null for non-existent document', async () => {
    const doc = await db.get('non-existent')
    expect(doc).toBeNull()
  })
})
