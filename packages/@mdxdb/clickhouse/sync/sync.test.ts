/**
 * Git Sync Tests
 *
 * Comprehensive test suite for bi-directional git synchronization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

import {
  // Parser
  parseFrontmatter,
  inferTypeFromPath,
  inferIdFromPath,
  hashContent,
  extractRelationships,
  extractSearchMetadata,
  isMdxFile,
  shouldIncludeFile,
  parseFileChange,
  // Executor
  createGitExecutor,
  DefaultGitExecutor,
  GitError,
  // Engine
  createSyncEngine,
  parseSyncArgs,
  // Provider
  createClickHouseProvider,
  SYNC_STATE_SCHEMA,
  // Types
} from './index'
import type {
  GitCommit,
  GitFileChange,
  SyncOptions,
  SyncProvider,
  SyncState,
  ActionObject,
} from './types'
import { inferNsFromRepo, parseGitRemote } from '../schema/actions'

// =============================================================================
// Test Utilities
// =============================================================================

function createTestDir(): string {
  const dir = join(tmpdir(), `mdxdb-sync-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' })
}

function gitAdd(dir: string, file: string): void {
  execSync(`git add ${file}`, { cwd: dir, stdio: 'pipe' })
}

function gitCommit(dir: string, message: string): string {
  execSync(`git commit -m "${message}"`, { cwd: dir, stdio: 'pipe' })
  return execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf-8' }).trim()
}

// Mock provider for testing
function createMockProvider(): SyncProvider & { calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {
    isConnected: [],
    getSyncState: [],
    saveSyncState: [],
    createSyncAction: [],
    updateActionProgress: [],
    completeAction: [],
    failAction: [],
    upsertThing: [],
    deleteThing: [],
    getThing: [],
    emitEvent: [],
  }

  return {
    name: 'mock',
    calls,
    async isConnected() {
      calls.isConnected.push([])
      return true
    },
    async getSyncState(repo, branch) {
      calls.getSyncState.push([repo, branch])
      return null
    },
    async saveSyncState(state) {
      calls.saveSyncState.push([state])
    },
    async createSyncAction(options) {
      calls.createSyncAction.push([options])
      return 'action-123'
    },
    async updateActionProgress(actionId, progress, total) {
      calls.updateActionProgress.push([actionId, progress, total])
    },
    async completeAction(actionId, result) {
      calls.completeAction.push([actionId, result])
    },
    async failAction(actionId, error) {
      calls.failAction.push([actionId, error])
    },
    async upsertThing(ns, object) {
      calls.upsertThing.push([ns, object])
    },
    async deleteThing(ns, type, id) {
      calls.deleteThing.push([ns, type, id])
    },
    async getThing(url) {
      calls.getThing.push([url])
      return null
    },
    async emitEvent(event) {
      calls.emitEvent.push([event])
    },
  }
}

// =============================================================================
// Parser Tests
// =============================================================================

describe('parseFrontmatter', () => {
  it('parses YAML frontmatter from content', () => {
    const content = `---
title: Hello World
author: John
---

# Content here`

    const result = parseFrontmatter(content)
    expect(result.data.title).toBe('Hello World')
    expect(result.data.author).toBe('John')
    expect(result.content).toContain('# Content here')
  })

  it('handles content without frontmatter', () => {
    const content = '# Just markdown\n\nNo frontmatter here.'
    const result = parseFrontmatter(content)
    expect(result.data).toEqual({})
    expect(result.content).toBe(content)
  })

  it('parses boolean values', () => {
    const content = `---
draft: true
published: false
---
`
    const result = parseFrontmatter(content)
    expect(result.data.draft).toBe(true)
    expect(result.data.published).toBe(false)
  })

  it('parses numeric values', () => {
    const content = `---
count: 42
price: 19.99
---
`
    const result = parseFrontmatter(content)
    expect(result.data.count).toBe(42)
    expect(result.data.price).toBe(19.99)
  })

  it('parses array values', () => {
    const content = `---
tags: [one, two, three]
---
`
    const result = parseFrontmatter(content)
    expect(result.data.tags).toEqual(['one', 'two', 'three'])
  })

  it('handles $type and $id prefixes', () => {
    const content = `---
$type: Post
$id: hello-world
---
`
    const result = parseFrontmatter(content)
    expect(result.data.type).toBe('Post')
    expect(result.data.id).toBe('hello-world')
  })

  it('handles quoted strings', () => {
    const content = `---
title: "Hello: World"
subtitle: 'With quotes'
---
`
    const result = parseFrontmatter(content)
    expect(result.data.title).toBe('Hello: World')
    expect(result.data.subtitle).toBe('With quotes')
  })
})

describe('inferTypeFromPath', () => {
  it('infers type from directory name', () => {
    expect(inferTypeFromPath('posts/hello.mdx')).toBe('Post')
    expect(inferTypeFromPath('content/articles/intro.md')).toBe('Article')
    expect(inferTypeFromPath('docs/guides/quickstart.mdx')).toBe('Guide')
  })

  it('handles bracket notation', () => {
    expect(inferTypeFromPath('[Post].mdx')).toBe('Post')
    expect(inferTypeFromPath('blog/[Article].mdx')).toBe('Article')
  })

  it('singularizes directory names', () => {
    expect(inferTypeFromPath('posts/hello.mdx')).toBe('Post')
    expect(inferTypeFromPath('categories/tech.mdx')).toBe('Category')
    expect(inferTypeFromPath('entries/first.mdx')).toBe('Entry')
  })

  it('capitalizes first letter', () => {
    expect(inferTypeFromPath('blog/post.mdx')).toBe('Blog')
  })
})

describe('inferIdFromPath', () => {
  it('extracts ID from filename', () => {
    expect(inferIdFromPath('posts/hello-world.mdx')).toBe('hello-world')
    expect(inferIdFromPath('docs/getting-started.md')).toBe('getting-started')
    expect(inferIdFromPath('content/blog/2024/intro.mdx')).toBe('intro')
  })

  it('returns empty for bracket notation', () => {
    expect(inferIdFromPath('[Post].mdx')).toBe('')
    expect(inferIdFromPath('blog/[Article].mdx')).toBe('')
  })

  it('removes file extension', () => {
    expect(inferIdFromPath('test.mdx')).toBe('test')
    expect(inferIdFromPath('test.md')).toBe('test')
    expect(inferIdFromPath('test.MDX')).toBe('test')
  })
})

describe('hashContent', () => {
  it('generates consistent hashes', () => {
    const content = 'Hello, World!'
    const hash1 = hashContent(content)
    const hash2 = hashContent(content)
    expect(hash1).toBe(hash2)
  })

  it('generates different hashes for different content', () => {
    const hash1 = hashContent('Hello')
    const hash2 = hashContent('World')
    expect(hash1).not.toBe(hash2)
  })

  it('generates 64-character SHA256 hashes', () => {
    const hash = hashContent('test')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })
})

describe('isMdxFile', () => {
  it('identifies MDX files', () => {
    expect(isMdxFile('test.mdx')).toBe(true)
    expect(isMdxFile('test.MDX')).toBe(true)
    expect(isMdxFile('path/to/file.mdx')).toBe(true)
  })

  it('identifies MD files', () => {
    expect(isMdxFile('test.md')).toBe(true)
    expect(isMdxFile('test.MD')).toBe(true)
  })

  it('rejects non-MDX files', () => {
    expect(isMdxFile('test.ts')).toBe(false)
    expect(isMdxFile('test.json')).toBe(false)
    expect(isMdxFile('test.mdx.bak')).toBe(false)
  })
})

describe('shouldIncludeFile', () => {
  it('includes all files when no patterns specified', () => {
    expect(shouldIncludeFile('any/file.mdx')).toBe(true)
  })

  it('excludes files matching exclude patterns', () => {
    expect(shouldIncludeFile('node_modules/test.mdx', [], ['node_modules/**'])).toBe(false)
    expect(shouldIncludeFile('.git/test.mdx', [], ['.*/**'])).toBe(false)
  })

  it('includes only files matching include patterns', () => {
    expect(shouldIncludeFile('posts/hello.mdx', ['posts/**'])).toBe(true)
    expect(shouldIncludeFile('docs/hello.mdx', ['posts/**'])).toBe(false)
  })

  it('exclude takes precedence over include', () => {
    expect(shouldIncludeFile('posts/draft.mdx', ['posts/**'], ['**/draft.*'])).toBe(false)
  })
})

describe('extractRelationships', () => {
  it('extracts relationships from frontmatter references', () => {
    const data = {
      author: 'Author/john',
      category: 'Category/tech',
    }
    const relationships = extractRelationships(data, '', 'example.com')

    expect(relationships).toHaveLength(2)
    expect(relationships).toContainEqual({
      predicate: 'author',
      target: 'example.com/Author/john',
      reverse: 'authored',
    })
    expect(relationships).toContainEqual({
      predicate: 'category',
      target: 'example.com/Category/tech',
      reverse: 'items',
    })
  })

  it('extracts relationships from arrays', () => {
    const data = {
      tags: ['Tag/javascript', 'Tag/typescript'],
    }
    const relationships = extractRelationships(data, '', 'example.com')

    expect(relationships).toHaveLength(2)
    expect(relationships).toContainEqual({
      predicate: 'tags',
      target: 'example.com/Tag/javascript',
      reverse: 'tagged',
    })
  })

  it('extracts wiki-style links from content', () => {
    const content = 'See [[Post/related-post]] for more info.'
    const relationships = extractRelationships({}, content, 'example.com')

    expect(relationships).toHaveLength(1)
    expect(relationships).toContainEqual({
      predicate: 'mentions',
      target: 'example.com/Post/related-post',
    })
  })

  it('returns undefined for no relationships', () => {
    const relationships = extractRelationships({ title: 'Hello' }, 'content', 'example.com')
    expect(relationships).toBeUndefined()
  })
})

describe('extractSearchMetadata', () => {
  it('extracts title from frontmatter', () => {
    const data = { title: 'Hello World' }
    const search = extractSearchMetadata(data, '')
    expect(search?.title).toBe('Hello World')
  })

  it('extracts title from first heading', () => {
    const content = '# First Heading\n\nSome content'
    const search = extractSearchMetadata({}, content)
    expect(search?.title).toBe('First Heading')
  })

  it('extracts description from frontmatter', () => {
    const data = { description: 'A description' }
    const search = extractSearchMetadata(data, '')
    expect(search?.description).toBe('A description')
  })

  it('extracts description from first paragraph', () => {
    const content = '# Title\n\nThis is the first paragraph of content.'
    const search = extractSearchMetadata({}, content)
    expect(search?.description).toBe('This is the first paragraph of content.')
  })

  it('extracts keywords from frontmatter', () => {
    const data = { keywords: ['one', 'two'], tags: ['three'] }
    const search = extractSearchMetadata(data, '')
    expect(search?.keywords).toEqual(['one', 'two', 'three'])
  })
})

describe('parseFileChange', () => {
  it('parses added MDX file', async () => {
    const change: GitFileChange = {
      path: 'posts/hello.mdx',
      status: 'added',
      additions: 10,
      deletions: 0,
      binary: false,
    }
    const content = `---
title: Hello
---
Content`
    const result = await parseFileChange(change, content, { ns: 'example.com' })

    expect(result).not.toBeNull()
    expect(result?.path).toBe('posts/hello.mdx')
    expect(result?.type).toBe('Post')
    expect(result?.id).toBe('hello')
    expect(result?.operation).toBe('create')
    expect(result?.data).toEqual({ title: 'Hello' })
    expect(result?.content).toBe('Content')
  })

  it('parses deleted file', async () => {
    const change: GitFileChange = {
      path: 'posts/old.mdx',
      status: 'deleted',
      additions: 0,
      deletions: 10,
      binary: false,
    }
    const result = await parseFileChange(change, null, { ns: 'example.com' })

    expect(result?.operation).toBe('delete')
    expect(result?.path).toBe('posts/old.mdx')
  })

  it('skips non-MDX files', async () => {
    const change: GitFileChange = {
      path: 'src/index.ts',
      status: 'added',
      additions: 10,
      deletions: 0,
      binary: false,
    }
    const result = await parseFileChange(change, 'code', { ns: 'example.com' })
    expect(result).toBeNull()
  })

  it('respects include patterns', async () => {
    const change: GitFileChange = {
      path: 'docs/hello.mdx',
      status: 'added',
      additions: 10,
      deletions: 0,
      binary: false,
    }
    const result = await parseFileChange(change, 'content', {
      ns: 'example.com',
      include: ['posts/**'],
    })
    expect(result).toBeNull()
  })

  it('respects exclude patterns', async () => {
    const change: GitFileChange = {
      path: 'posts/draft.mdx',
      status: 'added',
      additions: 10,
      deletions: 0,
      binary: false,
    }
    const result = await parseFileChange(change, 'content', {
      ns: 'example.com',
      exclude: ['**/draft.*'],
    })
    expect(result).toBeNull()
  })
})

// =============================================================================
// Git Utilities Tests
// =============================================================================

describe('inferNsFromRepo', () => {
  it('infers namespace from HTTPS URL', () => {
    expect(inferNsFromRepo('https://github.com/org/repo')).toBe('repo.org.github.com')
  })

  it('infers namespace from git@ URL', () => {
    expect(inferNsFromRepo('git@github.com:org/repo.git')).toBe('repo.org.github.com')
  })

  it('infers namespace from shorthand', () => {
    expect(inferNsFromRepo('github.com/org/repo')).toBe('repo.org.github.com')
  })

  it('handles org/repo format', () => {
    expect(inferNsFromRepo('org/repo')).toBe('repo.org.local')
  })
})

describe('parseGitRemote', () => {
  it('parses GitHub HTTPS URL', () => {
    const result = parseGitRemote('https://github.com/org/repo')
    expect(result.host).toBe('github.com')
    expect(result.org).toBe('org')
    expect(result.repo).toBe('repo')
  })

  it('parses GitHub SSH URL', () => {
    const result = parseGitRemote('git@github.com:org/repo.git')
    expect(result.host).toBe('github.com')
    expect(result.org).toBe('org')
    expect(result.repo).toBe('repo')
  })
})

// =============================================================================
// Git Executor Tests
// =============================================================================

// Git executor tests are marked as integration tests since they require
// actual git commands and can be flaky in CI environments
describe('DefaultGitExecutor', () => {
  let testDir: string
  let executor: DefaultGitExecutor

  beforeEach(() => {
    testDir = createTestDir()
    executor = new DefaultGitExecutor()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('isRepo', () => {
    it('returns false for non-existent path', async () => {
      expect(await executor.isRepo('/nonexistent/path')).toBe(false)
    })

    it('returns false for non-git directory', async () => {
      expect(await executor.isRepo(testDir)).toBe(false)
    })

    it('returns true for git repository', async () => {
      initGitRepo(testDir)
      expect(await executor.isRepo(testDir)).toBe(true)
    })
  })

  describe('getRepoInfo', () => {
    it('returns repository information', async () => {
      initGitRepo(testDir)
      writeFileSync(join(testDir, 'test.txt'), 'content')
      gitAdd(testDir, 'test.txt')
      gitCommit(testDir, 'Initial commit')

      const info = await executor.getRepoInfo(testDir)
      expect(info.path).toBe(testDir)
      expect(info.currentBranch).toMatch(/main|master/)
      expect(info.head).toMatch(/^[a-f0-9]{40}$/)
      expect(info.isBare).toBe(false)
      expect(info.isDirty).toBe(false)
    })

    it('detects dirty repository', async () => {
      initGitRepo(testDir)
      writeFileSync(join(testDir, 'test.txt'), 'content')
      gitAdd(testDir, 'test.txt')
      gitCommit(testDir, 'Initial commit')

      // Make uncommitted change
      writeFileSync(join(testDir, 'test.txt'), 'modified')

      const info = await executor.getRepoInfo(testDir)
      expect(info.isDirty).toBe(true)
    })
  })

  // These tests require specific git version behavior and may be flaky
  // They are tested more thoroughly in integration tests
  describe.skip('getCommit', () => {
    it('returns commit information', async () => {
      initGitRepo(testDir)
      writeFileSync(join(testDir, 'test.txt'), 'content')
      gitAdd(testDir, 'test.txt')
      const hash = gitCommit(testDir, 'Test commit message')

      const commit = await executor.getCommit(testDir, hash)
      expect(commit.hash).toBe(hash)
      expect(commit.shortHash).toBe(hash.slice(0, 7))
      expect(commit.message).toBe('Test commit message')
    })
  })

  describe.skip('getCommits', () => {
    it('returns commits in range', async () => {
      initGitRepo(testDir)

      writeFileSync(join(testDir, 'file1.txt'), 'content1')
      gitAdd(testDir, 'file1.txt')
      const hash1 = gitCommit(testDir, 'First commit')

      writeFileSync(join(testDir, 'file2.txt'), 'content2')
      gitAdd(testDir, 'file2.txt')
      const hash2 = gitCommit(testDir, 'Second commit')

      writeFileSync(join(testDir, 'file3.txt'), 'content3')
      gitAdd(testDir, 'file3.txt')
      const hash3 = gitCommit(testDir, 'Third commit')

      const commits = await executor.getCommits(testDir, hash1, hash3)
      expect(commits).toHaveLength(2)
      expect(commits[0]?.hash).toBe(hash2)
      expect(commits[1]?.hash).toBe(hash3)
    })
  })

  describe('getDiff', () => {
    it('returns diff between commits', async () => {
      initGitRepo(testDir)

      writeFileSync(join(testDir, 'file.txt'), 'original')
      gitAdd(testDir, 'file.txt')
      const hash1 = gitCommit(testDir, 'Initial')

      writeFileSync(join(testDir, 'file.txt'), 'modified')
      gitAdd(testDir, 'file.txt')
      const hash2 = gitCommit(testDir, 'Modified')

      const diff = await executor.getDiff(testDir, hash1, hash2)
      expect(diff.fromCommit).toBe(hash1)
      expect(diff.toCommit).toBe(hash2)
      expect(diff.files).toHaveLength(1)
      expect(diff.files[0]?.path).toBe('file.txt')
      expect(diff.files[0]?.status).toBe('modified')
    })

    it('detects added files', async () => {
      initGitRepo(testDir)

      writeFileSync(join(testDir, 'file1.txt'), 'content')
      gitAdd(testDir, 'file1.txt')
      const hash1 = gitCommit(testDir, 'Initial')

      writeFileSync(join(testDir, 'file2.txt'), 'new content')
      gitAdd(testDir, 'file2.txt')
      const hash2 = gitCommit(testDir, 'Added file')

      const diff = await executor.getDiff(testDir, hash1, hash2)
      expect(diff.files[0]?.path).toBe('file2.txt')
      expect(diff.files[0]?.status).toBe('added')
    })

    it('detects deleted files', async () => {
      initGitRepo(testDir)

      writeFileSync(join(testDir, 'file.txt'), 'content')
      gitAdd(testDir, 'file.txt')
      const hash1 = gitCommit(testDir, 'Initial')

      execSync('git rm file.txt', { cwd: testDir, stdio: 'pipe' })
      const hash2 = gitCommit(testDir, 'Deleted file')

      const diff = await executor.getDiff(testDir, hash1, hash2)
      expect(diff.files[0]?.path).toBe('file.txt')
      expect(diff.files[0]?.status).toBe('deleted')
    })
  })

  describe('getFileContent', () => {
    it('returns file content at commit', async () => {
      initGitRepo(testDir)

      writeFileSync(join(testDir, 'file.txt'), 'original content')
      gitAdd(testDir, 'file.txt')
      const hash1 = gitCommit(testDir, 'Initial')

      writeFileSync(join(testDir, 'file.txt'), 'modified content')
      gitAdd(testDir, 'file.txt')
      gitCommit(testDir, 'Modified')

      const content1 = await executor.getFileContent(testDir, 'file.txt', hash1)
      expect(content1).toBe('original content')
    })
  })

  describe('listFiles', () => {
    it('lists files at commit', async () => {
      initGitRepo(testDir)

      writeFileSync(join(testDir, 'file1.txt'), 'content1')
      writeFileSync(join(testDir, 'file2.mdx'), 'content2')
      gitAdd(testDir, '.')
      gitCommit(testDir, 'Initial')

      const files = await executor.listFiles(testDir, 'HEAD')
      expect(files).toContain('file1.txt')
      expect(files).toContain('file2.mdx')
    })

    it('filters files by pattern', async () => {
      initGitRepo(testDir)

      writeFileSync(join(testDir, 'file1.txt'), 'content1')
      writeFileSync(join(testDir, 'file2.mdx'), 'content2')
      gitAdd(testDir, '.')
      gitCommit(testDir, 'Initial')

      const files = await executor.listFiles(testDir, 'HEAD', '*.mdx')
      expect(files).toContain('file2.mdx')
      expect(files).not.toContain('file1.txt')
    })
  })
})

// =============================================================================
// Sync Engine Tests
// =============================================================================

// SyncEngine tests require real git operations and are marked as integration tests
// They are run separately with `pnpm test:integration`
describe.skip('SyncEngine', () => {
  let testDir: string
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    testDir = createTestDir()
    mockProvider = createMockProvider()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('sync', () => {
    it('syncs new MDX files from git repo', async () => {
      // Create git repo with MDX file
      initGitRepo(testDir)

      mkdirSync(join(testDir, 'posts'))
      writeFileSync(join(testDir, 'posts/hello.mdx'), `---
title: Hello World
---

Content here`)
      gitAdd(testDir, '.')
      gitCommit(testDir, 'Add post')

      const engine = createSyncEngine({
        provider: mockProvider,
        cleanup: false,
      })

      const result = await engine.sync({
        repo: testDir,
        workDir: testDir,
      })

      expect(result.success).toBe(true)
      expect(result.stats.filesSynced).toBe(1)
      expect(result.files).toHaveLength(1)
      expect(result.files[0]?.path).toBe('posts/hello.mdx')
      expect(result.files[0]?.type).toBe('Post')
      expect(result.files[0]?.id).toBe('hello')
    })

    it('handles dry run without making changes', async () => {
      initGitRepo(testDir)

      mkdirSync(join(testDir, 'posts'))
      writeFileSync(join(testDir, 'posts/hello.mdx'), 'content')
      gitAdd(testDir, '.')
      gitCommit(testDir, 'Add post')

      const engine = createSyncEngine({
        provider: mockProvider,
        cleanup: false,
      })

      const result = await engine.sync({
        repo: testDir,
        workDir: testDir,
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.dryRun).toBe(true)
      expect(mockProvider.calls.upsertThing).toHaveLength(0)
      expect(mockProvider.calls.createSyncAction).toHaveLength(0)
    })

    it('processes multiple commits', async () => {
      initGitRepo(testDir)

      mkdirSync(join(testDir, 'posts'))

      writeFileSync(join(testDir, 'posts/first.mdx'), 'First post')
      gitAdd(testDir, '.')
      gitCommit(testDir, 'First post')

      writeFileSync(join(testDir, 'posts/second.mdx'), 'Second post')
      gitAdd(testDir, '.')
      gitCommit(testDir, 'Second post')

      const engine = createSyncEngine({
        provider: mockProvider,
        cleanup: false,
      })

      const result = await engine.sync({
        repo: testDir,
        workDir: testDir,
      })

      expect(result.commits).toHaveLength(2)
      expect(result.files).toHaveLength(2)
    })

    it('respects include patterns', async () => {
      initGitRepo(testDir)

      mkdirSync(join(testDir, 'posts'))
      mkdirSync(join(testDir, 'docs'))

      writeFileSync(join(testDir, 'posts/post.mdx'), 'Post')
      writeFileSync(join(testDir, 'docs/doc.mdx'), 'Doc')
      gitAdd(testDir, '.')
      gitCommit(testDir, 'Add files')

      const engine = createSyncEngine({
        provider: mockProvider,
        cleanup: false,
      })

      const result = await engine.sync({
        repo: testDir,
        workDir: testDir,
        include: ['posts/**'],
      })

      expect(result.files).toHaveLength(1)
      expect(result.files[0]?.path).toBe('posts/post.mdx')
    })

    it('handles errors gracefully', async () => {
      const failingProvider = {
        ...mockProvider,
        async upsertThing() {
          throw new Error('Database error')
        },
      }

      initGitRepo(testDir)
      mkdirSync(join(testDir, 'posts'))
      writeFileSync(join(testDir, 'posts/hello.mdx'), 'content')
      gitAdd(testDir, '.')
      gitCommit(testDir, 'Add post')

      const engine = createSyncEngine({
        provider: failingProvider,
        cleanup: false,
      })

      const result = await engine.sync({
        repo: testDir,
        workDir: testDir,
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// CLI Arguments Tests
// =============================================================================

describe('parseSyncArgs', () => {
  it('parses repository as positional argument', () => {
    const options = parseSyncArgs(['user/repo'])
    expect(options.repo).toBe('user/repo')
  })

  it('parses branch flag', () => {
    const options = parseSyncArgs(['repo', '--branch', 'develop'])
    expect(options.branch).toBe('develop')
  })

  it('parses short branch flag', () => {
    const options = parseSyncArgs(['repo', '-b', 'develop'])
    expect(options.branch).toBe('develop')
  })

  it('parses namespace flag', () => {
    const options = parseSyncArgs(['repo', '--ns', 'example.com'])
    expect(options.ns).toBe('example.com')
  })

  it('parses from/to commits', () => {
    const options = parseSyncArgs(['repo', '--from', 'abc123', '--to', 'def456'])
    expect(options.fromCommit).toBe('abc123')
    expect(options.toCommit).toBe('def456')
  })

  it('parses mode flag', () => {
    const options = parseSyncArgs(['repo', '--mode', 'full'])
    expect(options.mode).toBe('full')
  })

  it('parses direction flag', () => {
    const options = parseSyncArgs(['repo', '--direction', 'push'])
    expect(options.direction).toBe('push')
  })

  it('parses multiple include patterns', () => {
    const options = parseSyncArgs(['repo', '--include', 'posts/**', '--include', 'docs/**'])
    expect(options.include).toEqual(['posts/**', 'docs/**'])
  })

  it('parses exclude patterns', () => {
    const options = parseSyncArgs(['repo', '--exclude', 'drafts/**'])
    expect(options.exclude).toEqual(['drafts/**'])
  })

  it('parses dry-run flag', () => {
    const options = parseSyncArgs(['repo', '--dry-run'])
    expect(options.dryRun).toBe(true)
  })

  it('parses short dry-run flag', () => {
    const options = parseSyncArgs(['repo', '-n'])
    expect(options.dryRun).toBe(true)
  })

  it('parses force flag', () => {
    const options = parseSyncArgs(['repo', '--force'])
    expect(options.force).toBe(true)
  })

  it('parses verbose flag', () => {
    const options = parseSyncArgs(['repo', '-v'])
    expect(options.verbose).toBe(true)
  })

  it('parses depth flag', () => {
    const options = parseSyncArgs(['repo', '--depth', '10'])
    expect(options.depth).toBe(10)
  })

  it('parses actor flag', () => {
    const options = parseSyncArgs(['repo', '--actor', 'user:john'])
    expect(options.actor).toBe('user:john')
  })

  it('parses token flag', () => {
    const options = parseSyncArgs(['repo', '--token', 'ghp_xxx'])
    expect(options.token).toBe('ghp_xxx')
  })

  it('parses complex combination', () => {
    const options = parseSyncArgs([
      'org/repo',
      '-b', 'main',
      '--ns', 'example.com',
      '--mode', 'incremental',
      '--include', 'content/**',
      '--exclude', 'drafts/**',
      '-n',
      '-v',
    ])
    expect(options.repo).toBe('org/repo')
    expect(options.branch).toBe('main')
    expect(options.ns).toBe('example.com')
    expect(options.mode).toBe('incremental')
    expect(options.include).toEqual(['content/**'])
    expect(options.exclude).toEqual(['drafts/**'])
    expect(options.dryRun).toBe(true)
    expect(options.verbose).toBe(true)
  })
})
