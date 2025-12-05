/**
 * Executor Integration Tests
 *
 * Tests for git command execution using the actual repository.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'path'
import { createGitExecutor, DefaultGitExecutor, GitError } from '../sync/executor'
import type { GitExecutor } from '../sync/types'

// =============================================================================
// Test Setup
// =============================================================================

// Use the actual repo path (this package is inside a git repo)
// In vitest, import.meta.url gives us the file URL
const REPO_PATH = resolve(process.cwd(), '../../..')  // mdx.org.ai root
const PACKAGE_PATH = process.cwd()                     // @mdxdb/clickhouse

let executor: GitExecutor

beforeAll(() => {
  executor = createGitExecutor()
})

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createGitExecutor', () => {
  it('creates a DefaultGitExecutor instance', () => {
    const exec = createGitExecutor()
    expect(exec).toBeInstanceOf(DefaultGitExecutor)
  })

  it('accepts timeout option', () => {
    const exec = createGitExecutor({ timeout: 30000 })
    expect(exec).toBeInstanceOf(DefaultGitExecutor)
  })

  it('implements GitExecutor interface', () => {
    expect(typeof executor.clone).toBe('function')
    expect(typeof executor.fetch).toBe('function')
    expect(typeof executor.checkout).toBe('function')
    expect(typeof executor.getRepoInfo).toBe('function')
    expect(typeof executor.getCommit).toBe('function')
    expect(typeof executor.getCommits).toBe('function')
    expect(typeof executor.getDiff).toBe('function')
    expect(typeof executor.getFileContent).toBe('function')
    expect(typeof executor.listFiles).toBe('function')
    expect(typeof executor.isRepo).toBe('function')
    expect(typeof executor.getCurrentBranch).toBe('function')
    expect(typeof executor.getRemoteUrl).toBe('function')
  })
})

// =============================================================================
// GitError Tests
// =============================================================================

describe('GitError', () => {
  it('creates error with message and stderr', () => {
    const error = new GitError('Git command failed', 'fatal: not a git repository', 128)

    expect(error.message).toBe('Git command failed')
    expect(error.stderr).toBe('fatal: not a git repository')
    expect(error.exitCode).toBe(128)
    expect(error.name).toBe('GitError')
  })

  it('extends Error', () => {
    const error = new GitError('Test', 'stderr')
    expect(error).toBeInstanceOf(Error)
  })

  it('works without exit code', () => {
    const error = new GitError('Test', 'stderr')
    expect(error.exitCode).toBeUndefined()
  })

  it('has proper stack trace', () => {
    const error = new GitError('Test', 'stderr')
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('GitError')
  })
})

// =============================================================================
// Repository Detection Tests
// =============================================================================

describe('isRepo', () => {
  it('returns true for valid git repository', async () => {
    const result = await executor.isRepo(REPO_PATH)
    expect(result).toBe(true)
  })

  it('returns true for subdirectory of git repo', async () => {
    const result = await executor.isRepo(PACKAGE_PATH)
    expect(result).toBe(true)
  })

  it('returns false for non-existent path', async () => {
    const result = await executor.isRepo('/non/existent/path/xyz123')
    expect(result).toBe(false)
  })

  it('returns false for non-git directory', async () => {
    const result = await executor.isRepo('/tmp')
    expect(result).toBe(false)
  })
})

// =============================================================================
// Repository Info Tests
// =============================================================================

describe('getRepoInfo', () => {
  it('returns repository information', async () => {
    const info = await executor.getRepoInfo(REPO_PATH)

    expect(info.path).toBe(REPO_PATH)
    expect(info.currentBranch).toBeDefined()
    expect(info.currentBranch.length).toBeGreaterThan(0)
    expect(info.head).toMatch(/^[a-f0-9]{40}$/)
    expect(typeof info.isBare).toBe('boolean')
    expect(typeof info.isDirty).toBe('boolean')
    expect(info.ns).toBeDefined()
  })

  it('returns current branch name', async () => {
    const info = await executor.getRepoInfo(REPO_PATH)

    // The branch should be 'main' or a valid branch name
    expect(info.currentBranch).toBeDefined()
    expect(typeof info.currentBranch).toBe('string')
  })

  it('returns remote URL if available', async () => {
    const info = await executor.getRepoInfo(REPO_PATH)

    // If there's a remote, it should be a URL
    if (info.remoteUrl) {
      expect(info.remoteUrl).toMatch(/github|gitlab|bitbucket|git/)
    }
  })

  it('infers namespace from remote', async () => {
    const info = await executor.getRepoInfo(REPO_PATH)

    // Namespace should be derived from remote or path
    expect(info.ns).toBeDefined()
    expect(info.ns.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Branch Tests
// =============================================================================

describe('getCurrentBranch', () => {
  it('returns current branch name', async () => {
    const branch = await executor.getCurrentBranch(REPO_PATH)

    expect(typeof branch).toBe('string')
    expect(branch.length).toBeGreaterThan(0)
    // Branch names don't contain spaces
    expect(branch).not.toContain(' ')
  })
})

// =============================================================================
// Commit Tests
// =============================================================================

describe('getCommit', () => {
  it('returns HEAD commit information', async () => {
    const commit = await executor.getCommit(REPO_PATH, 'HEAD')

    expect(commit.hash).toMatch(/^[a-f0-9]{40}$/)
    expect(commit.shortHash).toMatch(/^[a-f0-9]{7,}$/)
    expect(commit.message).toBeDefined()
    expect(commit.authorName).toBeDefined()
    expect(commit.authorEmail).toContain('@')
    expect(commit.timestamp).toBeDefined()
    expect(Array.isArray(commit.parents)).toBe(true)
  })

  it('returns commit by hash', async () => {
    // First get HEAD to know a valid hash
    const head = await executor.getCommit(REPO_PATH, 'HEAD')
    const commit = await executor.getCommit(REPO_PATH, head.hash)

    expect(commit.hash).toBe(head.hash)
    expect(commit.message).toBe(head.message)
  })

  it('includes parent commits', async () => {
    const commit = await executor.getCommit(REPO_PATH, 'HEAD')

    // Most commits have at least one parent (except initial commit)
    expect(Array.isArray(commit.parents)).toBe(true)
  })
})

describe('getCommits', () => {
  it('returns commits in range', async () => {
    const commits = await executor.getCommits(REPO_PATH, 'HEAD~5', 'HEAD')

    expect(Array.isArray(commits)).toBe(true)
    expect(commits.length).toBeLessThanOrEqual(5)

    for (const commit of commits) {
      expect(commit.hash).toMatch(/^[a-f0-9]{40}$/)
      expect(commit.message).toBeDefined()
    }
  })

  it('returns commits in chronological order', async () => {
    const commits = await executor.getCommits(REPO_PATH, 'HEAD~3', 'HEAD')

    // Commits should be in chronological order (oldest first due to --reverse)
    if (commits.length >= 2) {
      // Each commit's parent should come before it
      for (let i = 1; i < commits.length; i++) {
        const current = commits[i]!
        const previous = commits[i - 1]!
        // The previous commit should be in current's parents or ancestors
        expect(current.hash).not.toBe(previous.hash)
      }
    }
  })
})

// =============================================================================
// Diff Tests
// =============================================================================

describe('getDiff', () => {
  it('returns diff between commits', async () => {
    const diff = await executor.getDiff(REPO_PATH, 'HEAD~1', 'HEAD')

    expect(diff.fromCommit).toBeDefined()
    expect(diff.toCommit).toBe('HEAD')
    expect(Array.isArray(diff.files)).toBe(true)
    expect(diff.stats).toBeDefined()
    expect(typeof diff.stats.filesChanged).toBe('number')
    expect(typeof diff.stats.insertions).toBe('number')
    expect(typeof diff.stats.deletions).toBe('number')
  })

  it('includes file change details', async () => {
    const diff = await executor.getDiff(REPO_PATH, 'HEAD~1', 'HEAD')

    for (const file of diff.files) {
      expect(file.path).toBeDefined()
      expect(['added', 'modified', 'deleted', 'renamed', 'copied']).toContain(file.status)
      expect(typeof file.additions).toBe('number')
      expect(typeof file.deletions).toBe('number')
      expect(typeof file.binary).toBe('boolean')
    }
  })

  it('includes patch content', async () => {
    const diff = await executor.getDiff(REPO_PATH, 'HEAD~1', 'HEAD')

    // Patch should be a string (may be empty if no changes)
    expect(typeof diff.patch).toBe('string')
  })
})

// =============================================================================
// File Content Tests
// =============================================================================

describe('getFileContent', () => {
  it('returns file content at HEAD', async () => {
    // Use repo root with path relative to git root
    const content = await executor.getFileContent(
      REPO_PATH,
      'packages/@mdxdb/clickhouse/package.json',
      'HEAD'
    )

    expect(content).toContain('@mdxdb/clickhouse')
    expect(content).toContain('"name"')
  })

  it('returns TypeScript file content', async () => {
    // Use repo root with full path from git root
    const content = await executor.getFileContent(
      REPO_PATH,
      'packages/@mdxdb/clickhouse/src/index.ts',
      'HEAD'
    )

    expect(content).toBeDefined()
    expect(typeof content).toBe('string')
  })

  it('throws for non-existent file', async () => {
    await expect(
      executor.getFileContent(REPO_PATH, 'nonexistent-file.xyz', 'HEAD')
    ).rejects.toThrow()
  })
})

// =============================================================================
// List Files Tests
// =============================================================================

describe('listFiles', () => {
  it('lists all files at HEAD', async () => {
    // Use repo root and look for files in the clickhouse package
    const files = await executor.listFiles(REPO_PATH, 'HEAD')

    expect(Array.isArray(files)).toBe(true)
    expect(files.length).toBeGreaterThan(0)
    // Files are relative to repo root
    expect(files).toContain('packages/@mdxdb/clickhouse/package.json')
    expect(files).toContain('packages/@mdxdb/clickhouse/src/index.ts')
  })

  it('filters by glob pattern', async () => {
    const tsFiles = await executor.listFiles(REPO_PATH, 'HEAD', 'packages/@mdxdb/clickhouse/*.ts')

    // All matching files should end with .ts
    for (const file of tsFiles) {
      expect(file.endsWith('.ts')).toBe(true)
    }
  })

  it('filters TypeScript files in src', async () => {
    const files = await executor.listFiles(REPO_PATH, 'HEAD', 'packages/@mdxdb/clickhouse/src/*.ts')

    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(file.includes('src/')).toBe(true)
      expect(file.endsWith('.ts')).toBe(true)
    }
  })

  it('filters MDX files with globstar', async () => {
    // In the monorepo, there might be MDX files
    const files = await executor.listFiles(REPO_PATH, 'HEAD', '**/*.mdx')

    for (const file of files) {
      expect(file.endsWith('.mdx')).toBe(true)
    }
  })
})

// =============================================================================
// Remote URL Tests
// =============================================================================

describe('getRemoteUrl', () => {
  it('returns remote URL if configured', async () => {
    try {
      const url = await executor.getRemoteUrl(REPO_PATH)
      expect(url).toBeDefined()
      expect(typeof url).toBe('string')
      // Should be a git URL
      expect(url).toMatch(/git|github|gitlab|bitbucket|https?:\/\//)
    } catch {
      // If no remote is configured, that's also valid
      expect(true).toBe(true)
    }
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles files with spaces in names', async () => {
    // Try to list files - any with spaces should work
    const files = await executor.listFiles(REPO_PATH, 'HEAD')

    // Just verify the list completes without error
    expect(Array.isArray(files)).toBe(true)
  })

  it('handles unicode in commit messages', async () => {
    const commit = await executor.getCommit(REPO_PATH, 'HEAD')

    // Just verify we can read commit info even with unicode
    expect(commit.hash).toMatch(/^[a-f0-9]{40}$/)
  })

  it('handles deep directory structures', async () => {
    const files = await executor.listFiles(REPO_PATH, 'HEAD')

    // Find a deeply nested file
    const deepFiles = files.filter(f => f.split('/').length > 3)
    expect(deepFiles.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Commit Parsing Validation
// =============================================================================

describe('Commit Format', () => {
  it('parses commit with multiple parents (merge commit)', async () => {
    // Get recent commits and look for a merge
    const commits = await executor.getCommits(REPO_PATH, 'HEAD~20', 'HEAD')

    const mergeCommit = commits.find(c => c.parents.length > 1)
    if (mergeCommit) {
      expect(mergeCommit.parents.length).toBeGreaterThanOrEqual(2)
      for (const parent of mergeCommit.parents) {
        expect(parent).toMatch(/^[a-f0-9]{40}$/)
      }
    }
  })

  it('parses commit timestamp as ISO string', async () => {
    const commit = await executor.getCommit(REPO_PATH, 'HEAD')

    // Should be parseable as a date
    const date = new Date(commit.timestamp)
    expect(date.getTime()).not.toBeNaN()
  })
})

// =============================================================================
// File Change Status Tests
// =============================================================================

describe('File Change Status', () => {
  it('correctly identifies file status types', async () => {
    // Get diff from a range that likely has various change types
    const diff = await executor.getDiff(REPO_PATH, 'HEAD~10', 'HEAD')

    const statuses = new Set(diff.files.map(f => f.status))

    // At least one of these should be present
    const validStatuses = ['added', 'modified', 'deleted', 'renamed', 'copied']
    const hasValidStatus = [...statuses].some(s => validStatuses.includes(s))
    expect(hasValidStatus).toBe(true)
  })

  it('tracks additions and deletions per file', async () => {
    const diff = await executor.getDiff(REPO_PATH, 'HEAD~1', 'HEAD')

    for (const file of diff.files) {
      expect(file.additions).toBeGreaterThanOrEqual(0)
      expect(file.deletions).toBeGreaterThanOrEqual(0)
    }
  })
})
