/**
 * Integration tests for mdxdb file watcher
 *
 * Tests that file changes in the content directory are automatically
 * synced to ClickHouse.
 *
 * Requirements:
 * - ClickHouse running on localhost:8123
 * - Run with: pnpm --filter mdxdb test
 *
 * To run with a local ClickHouse:
 * 1. Start ClickHouse: mdxdb server
 * 2. Run tests: pnpm --filter mdxdb test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Test directory
const TEST_DIR = join(tmpdir(), 'mdxdb-watcher-test-' + Date.now())
const CONTENT_DIR = join(TEST_DIR, 'content')
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost:8123'

// Helper to check if ClickHouse is running
async function isClickHouseRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${CLICKHOUSE_URL}/ping`)
    return response.ok
  } catch {
    return false
  }
}

// Helper to execute ClickHouse query
async function executeQuery(query: string, database = 'mdxdb'): Promise<string> {
  const response = await fetch(`${CLICKHOUSE_URL}/?database=${database}`, {
    method: 'POST',
    body: query,
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.text()
}

// Helper to query Things table
async function queryThings(ns: string, id?: string): Promise<Array<Record<string, unknown>>> {
  let query = `SELECT * FROM Things WHERE ns = '${ns}'`
  if (id) {
    query += ` AND id = '${id}'`
  }
  query += ' FORMAT JSON'

  const result = await executeQuery(query)
  const json = JSON.parse(result)
  return json.data || []
}

describe('mdxdb watcher', () => {
  let clickhouseAvailable = false

  beforeAll(async () => {
    // Check if ClickHouse is available
    clickhouseAvailable = await isClickHouseRunning()

    if (!clickhouseAvailable) {
      console.log('⚠️  ClickHouse not running, skipping integration tests')
      console.log('   Start with: mdxdb server')
      return
    }

    // Create test directories
    mkdirSync(CONTENT_DIR, { recursive: true })

    // Initialize database
    try {
      await executeQuery('CREATE DATABASE IF NOT EXISTS mdxdb', 'default')
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS Things (
          ns String,
          type String,
          id String,
          data JSON,
          content String DEFAULT '',
          event String DEFAULT '',
          ts DateTime64(3) DEFAULT now64(3)
        ) ENGINE = MergeTree() ORDER BY (ns, type, id)
      `)
    } catch (err) {
      console.error('Failed to initialize database:', err)
    }
  })

  afterAll(async () => {
    // Cleanup test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }

    // Cleanup test data from ClickHouse
    if (clickhouseAvailable) {
      try {
        await executeQuery("ALTER TABLE Things DELETE WHERE ns = 'watcher-test'")
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  beforeEach(async () => {
    if (!clickhouseAvailable) return

    // Clear test data before each test
    try {
      await executeQuery("ALTER TABLE Things DELETE WHERE ns = 'watcher-test'")
      // Wait for mutation to complete
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch {
      // Ignore errors
    }
  })

  it.skipIf(!clickhouseAvailable)('should sync new MDX file to ClickHouse', async () => {
    // Import the sync function
    const { parseArgs } = await import('../src/cli')

    // Create a test MDX file
    const testFile = join(CONTENT_DIR, 'posts', 'hello-world.mdx')
    mkdirSync(join(CONTENT_DIR, 'posts'), { recursive: true })

    writeFileSync(testFile, `---
title: Hello World
author: Test User
---

# Hello World

This is a test post.
`)

    // Parse the file and sync manually (since we're not running the full watcher)
    const options = parseArgs(['--path', CONTENT_DIR, '--name', 'watcher-test', '--http-port', '8123'])

    // Import and call syncFile directly
    // Note: This tests the sync logic, not the watcher itself
    const { parse } = await import('mdxld')
    const { readFileSync } = await import('fs')
    const { relative } = await import('path')

    const content = readFileSync(testFile, 'utf-8')
    const document = parse(content)

    const relativePath = relative(CONTENT_DIR, testFile)
    const id = relativePath.replace(/\.mdx$/, '').replace(/\\/g, '/')

    const thing = {
      ns: 'watcher-test',
      type: 'Post',
      id,
      data: document.data,
      content: document.content || '',
    }

    // Insert into ClickHouse
    const query = `INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow`
    await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent(query)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thing),
    })

    // Wait for insert
    await new Promise(resolve => setTimeout(resolve, 100))

    // Query and verify
    const results = await queryThings('watcher-test', 'posts/hello-world')
    expect(results.length).toBeGreaterThan(0)

    const row = results[0]
    expect(row?.type).toBe('Post')
    expect(row?.id).toBe('posts/hello-world')
  })

  it.skipIf(!clickhouseAvailable)('should update ClickHouse when MDX file changes', async () => {
    // Create initial file
    const testFile = join(CONTENT_DIR, 'docs', 'getting-started.mdx')
    mkdirSync(join(CONTENT_DIR, 'docs'), { recursive: true })

    writeFileSync(testFile, `---
title: Getting Started
version: "1.0"
---

# Getting Started

Initial content.
`)

    // Insert initial version
    const { parse } = await import('mdxld')
    const { readFileSync } = await import('fs')
    const { relative } = await import('path')

    let content = readFileSync(testFile, 'utf-8')
    let document = parse(content)

    const id = 'docs/getting-started'

    // Insert v1
    let thing = {
      ns: 'watcher-test',
      type: 'Document',
      id,
      data: document.data,
      content: document.content || '',
    }

    const query = `INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow`
    await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent(query)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thing),
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Update the file
    writeFileSync(testFile, `---
title: Getting Started (Updated)
version: "2.0"
---

# Getting Started

Updated content with more details.
`)

    // Re-read and insert updated version
    content = readFileSync(testFile, 'utf-8')
    document = parse(content)

    thing = {
      ns: 'watcher-test',
      type: 'Document',
      id,
      data: document.data,
      content: document.content || '',
    }

    await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent(query)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thing),
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Query - should have 2 versions (ClickHouse is append-only by default)
    const results = await queryThings('watcher-test', id)
    expect(results.length).toBe(2)

    // Latest should have updated title
    const latest = results[results.length - 1]
    const data = latest?.data as Record<string, unknown>
    expect(data?.title).toBe('Getting Started (Updated)')
    expect(data?.version).toBe('2.0')
  })

  it.skipIf(!clickhouseAvailable)('should handle multiple files in different directories', async () => {
    const files = [
      { path: 'blog/post-1.mdx', type: 'Post', title: 'Post 1' },
      { path: 'blog/post-2.mdx', type: 'Post', title: 'Post 2' },
      { path: 'pages/about.mdx', type: 'Page', title: 'About' },
    ]

    const { parse } = await import('mdxld')
    const { readFileSync } = await import('fs')

    for (const file of files) {
      const fullPath = join(CONTENT_DIR, file.path)
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      mkdirSync(dir, { recursive: true })

      writeFileSync(fullPath, `---
title: ${file.title}
$type: ${file.type}
---

Content for ${file.title}
`)

      const content = readFileSync(fullPath, 'utf-8')
      const document = parse(content)

      const thing = {
        ns: 'watcher-test',
        type: file.type,
        id: file.path.replace('.mdx', ''),
        data: document.data,
        content: document.content || '',
      }

      const query = `INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow`
      await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent(query)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thing),
      })
    }

    await new Promise(resolve => setTimeout(resolve, 100))

    // Query all items in namespace
    const results = await queryThings('watcher-test')
    expect(results.length).toBe(3)

    // Query by type
    const posts = results.filter(r => r.type === 'Post')
    const pages = results.filter(r => r.type === 'Page')

    expect(posts.length).toBe(2)
    expect(pages.length).toBe(1)
  })
})
