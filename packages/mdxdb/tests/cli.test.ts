/**
 * Tests for mdxdb CLI - publish command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseArgs } from '../src/cli.js'

// Mock oauth.do
vi.mock('oauth.do', () => ({
  ensureLoggedIn: vi.fn().mockResolvedValue({ token: 'test-token', isNewLogin: false }),
}))

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('CLI parseArgs', () => {
  it('should default to publish command', () => {
    const result = parseArgs([])
    expect(result.command).toBe('publish')
  })

  it('should parse publish command explicitly', () => {
    const result = parseArgs(['publish'])
    expect(result.command).toBe('publish')
  })

  it('should parse --path option', () => {
    const result = parseArgs(['publish', '--path', './docs'])
    expect(result.path).toBe('./docs')
  })

  it('should parse -p short option', () => {
    const result = parseArgs(['publish', '-p', './content'])
    expect(result.path).toBe('./content')
  })

  it('should parse --name option', () => {
    const result = parseArgs(['publish', '--name', 'my-project'])
    expect(result.name).toBe('my-project')
  })

  it('should parse --base-url option', () => {
    const result = parseArgs(['publish', '--base-url', 'https://custom.api'])
    expect(result.baseUrl).toBe('https://custom.api')
  })

  it('should parse --dry-run flag', () => {
    const result = parseArgs(['publish', '--dry-run'])
    expect(result.dryRun).toBe(true)
  })

  it('should parse --verbose flag', () => {
    const result = parseArgs(['publish', '--verbose'])
    expect(result.verbose).toBe(true)
  })

  it('should parse help command', () => {
    const result = parseArgs(['help'])
    expect(result.command).toBe('help')
  })

  it('should parse --help flag', () => {
    const result = parseArgs(['--help'])
    expect(result.command).toBe('help')
  })

  it('should parse version command', () => {
    const result = parseArgs(['version'])
    expect(result.command).toBe('version')
  })

  it('should use default values', () => {
    const result = parseArgs([])
    expect(result.path).toBe('./content')
    expect(result.baseUrl).toBe('https://mdx.do')
    expect(result.dryRun).toBe(false)
    expect(result.verbose).toBe(false)
  })

  it('should handle multiple options', () => {
    const result = parseArgs([
      'publish',
      '--path', './docs',
      '--name', 'my-docs',
      '--base-url', 'https://api.example.com',
      '--dry-run',
      '--verbose',
    ])

    expect(result.command).toBe('publish')
    expect(result.path).toBe('./docs')
    expect(result.name).toBe('my-docs')
    expect(result.baseUrl).toBe('https://api.example.com')
    expect(result.dryRun).toBe(true)
    expect(result.verbose).toBe(true)
  })
})

describe('CLI runPublish', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxdb-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    mockFetch.mockReset()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should find MDX files in directory', async () => {
    // Create test MDX files
    writeFileSync(
      join(testDir, 'post1.mdx'),
      `---
$type: BlogPost
title: First Post
---

# First Post

Content here.
`
    )

    writeFileSync(
      join(testDir, 'post2.md'),
      `---
$type: Article
title: Second Post
---

# Second Post

More content.
`
    )

    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, published: 2, url: 'https://mdx.do/my-project' }),
    })

    const { runPublish } = await import('../src/cli.js')

    await runPublish({
      command: 'publish',
      path: testDir,
      name: 'my-project',
      baseUrl: 'https://mdx.do',
      dryRun: false,
      verbose: false,
      help: false,
    })

    // Verify fetch was called with correct payload
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://mdx.do/db')
    expect(options.method).toBe('POST')
    expect(options.headers['Authorization']).toBe('Bearer test-token')

    const body = JSON.parse(options.body)
    expect(body.name).toBe('my-project')
    expect(body.documents).toHaveLength(2)
    expect(body.documents.map((d: { id: string }) => d.id).sort()).toEqual(['post1', 'post2'])
  })

  it('should skip publishing in dry-run mode', async () => {
    writeFileSync(
      join(testDir, 'test.mdx'),
      `---
title: Test
---

# Test
`
    )

    const { runPublish } = await import('../src/cli.js')

    await runPublish({
      command: 'publish',
      path: testDir,
      name: 'test-project',
      baseUrl: 'https://mdx.do',
      dryRun: true,
      verbose: false,
      help: false,
    })

    // Verify fetch was NOT called in dry-run mode
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should find files in subdirectories', async () => {
    mkdirSync(join(testDir, 'posts'), { recursive: true })
    mkdirSync(join(testDir, 'pages'), { recursive: true })

    writeFileSync(
      join(testDir, 'posts', 'hello.mdx'),
      `---
title: Hello
---

# Hello
`
    )

    writeFileSync(
      join(testDir, 'pages', 'about.mdx'),
      `---
title: About
---

# About
`
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, published: 2 }),
    })

    const { runPublish } = await import('../src/cli.js')

    await runPublish({
      command: 'publish',
      path: testDir,
      baseUrl: 'https://mdx.do',
      dryRun: false,
      verbose: false,
      help: false,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const ids = body.documents.map((d: { id: string }) => d.id).sort()
    expect(ids).toEqual(['pages/about', 'posts/hello'])
  })

  it('should handle API errors gracefully', async () => {
    writeFileSync(
      join(testDir, 'test.mdx'),
      `---
title: Test
---

# Test
`
    )

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    })

    const { runPublish } = await import('../src/cli.js')

    // Mock process.exit to prevent test from exiting
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })

    await expect(
      runPublish({
        command: 'publish',
        path: testDir,
        baseUrl: 'https://mdx.do',
        dryRun: false,
        verbose: false,
        help: false,
      })
    ).rejects.toThrow('process.exit called')

    mockExit.mockRestore()
  })
})

describe('E2E Publish Flow', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxdb-e2e-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    mockFetch.mockReset()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should publish MDX documents with correct structure', async () => {
    // Create a realistic MDX document
    writeFileSync(
      join(testDir, 'getting-started.mdx'),
      `---
$type: Documentation
$id: https://docs.example.com/getting-started
title: Getting Started
description: Learn how to get started
author: test
---

# Getting Started

Welcome to the documentation!

## Installation

\`\`\`bash
npm install my-package
\`\`\`

## Usage

Import and use the package:

\`\`\`typescript
import { something } from 'my-package'
\`\`\`
`
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        published: 1,
        url: 'https://mdx.do/test-project',
      }),
    })

    const { runPublish } = await import('../src/cli.js')

    await runPublish({
      command: 'publish',
      path: testDir,
      name: 'test-project',
      baseUrl: 'https://mdx.do',
      dryRun: false,
      verbose: true,
      help: false,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://mdx.do/db')

    const body = JSON.parse(options.body)
    expect(body.name).toBe('test-project')
    expect(body.documents).toHaveLength(1)

    const doc = body.documents[0]
    expect(doc.id).toBe('getting-started')
    expect(doc.type).toBe('Documentation')
    expect(doc.data.title).toBe('Getting Started')
    expect(doc.data.description).toBe('Learn how to get started')
    expect(doc.content).toContain('# Getting Started')
  })
})
