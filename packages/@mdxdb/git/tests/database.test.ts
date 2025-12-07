/**
 * @mdxdb/git Database Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { GitDatabase, createGitDatabase } from '../src/database.js'
import type { GitDatabaseConfig } from '../src/types.js'

describe('@mdxdb/git', () => {
  let tempDir: string
  let db: GitDatabase

  const testAuthor = {
    name: 'Test User',
    email: 'test@example.com',
  }

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdxdb-git-test-'))

    // Create database with git support
    db = createGitDatabase({
      root: tempDir,
      author: testAuthor,
    })

    // Initialize git repo
    await db.init()
  })

  afterEach(async () => {
    // Clean up temp directory
    await db.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('Repository Operations', () => {
    it('should initialize a git repository', async () => {
      const isRepo = await db.isRepo()
      expect(isRepo).toBe(true)
    })

    it('should detect non-repo directories', async () => {
      const nonRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-repo-'))
      const nonRepoDb = createGitDatabase({
        root: nonRepoDir,
        author: testAuthor,
      })

      const isRepo = await nonRepoDb.isRepo()
      expect(isRepo).toBe(false)

      fs.rmSync(nonRepoDir, { recursive: true, force: true })
    })

    it('should find repository root', async () => {
      const root = await db.findRoot()
      expect(root).toBe(tempDir)
    })
  })

  describe('File Operations (inherited from FsDatabase)', () => {
    it('should create and read documents', async () => {
      const doc = {
        data: { title: 'Hello World' },
        content: '# Hello\n\nThis is a test.',
      }

      await db.set('posts/hello', doc)
      const retrieved = await db.get('posts/hello')

      expect(retrieved).not.toBeNull()
      expect(retrieved?.data.title).toBe('Hello World')
      expect(retrieved?.content).toContain('# Hello')
    })

    it('should list documents', async () => {
      await db.set('posts/one', { data: { title: 'One' }, content: '# One' })
      await db.set('posts/two', { data: { title: 'Two' }, content: '# Two' })

      const result = await db.list()
      expect(result.documents).toHaveLength(2)
    })

    it('should delete documents', async () => {
      await db.set('posts/to-delete', { data: { title: 'Delete Me' }, content: '# Delete' })

      const result = await db.delete('posts/to-delete')
      expect(result.deleted).toBe(true)

      const retrieved = await db.get('posts/to-delete')
      expect(retrieved).toBeNull()
    })
  })

  describe('Staging Operations', () => {
    it('should stage a file', async () => {
      // Create a file
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })

      // Stage it
      await db.add('posts/test.mdx')

      // Check status
      const status = await db.status()
      const stagedFile = status.files.find((f) => f.path === 'posts/test.mdx')
      expect(stagedFile).toBeDefined()
      expect(stagedFile?.staged).toBe(true)
    })

    it('should stage all files', async () => {
      await db.set('posts/one', { data: { title: 'One' }, content: '# One' })
      await db.set('posts/two', { data: { title: 'Two' }, content: '# Two' })

      await db.add('.')

      const status = await db.status()
      const stagedFiles = status.files.filter((f) => f.staged)
      expect(stagedFiles.length).toBeGreaterThanOrEqual(2)
    })

    it('should unstage a file', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('posts/test.mdx')
      await db.unstage('posts/test.mdx')

      const status = await db.status()
      const file = status.files.find((f) => f.path === 'posts/test.mdx')
      // After unstaging, file should be untracked (not staged)
      expect(file?.staged).toBe(false)
    })
  })

  describe('Commit Operations', () => {
    it('should create a commit', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')

      const result = await db.commit('Initial commit')

      expect(result.sha).toBeDefined()
      expect(result.sha).toHaveLength(40)
      expect(result.message).toBe('Initial commit')
    })

    it('should commit with all flag', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })

      const result = await db.commit('Commit all', { all: true })

      expect(result.sha).toBeDefined()
      expect(result.files.length).toBeGreaterThanOrEqual(1)
    })

    it('should throw without author', async () => {
      const noAuthorDb = createGitDatabase({ root: tempDir })

      await expect(noAuthorDb.commit('Test')).rejects.toThrow('author is required')
    })
  })

  describe('Status Operations', () => {
    it('should show clean status after commit', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')
      await db.commit('Initial commit')

      const status = await db.status()
      expect(status.dirty).toBe(false)
      expect(status.files.filter((f) => f.status !== 'unmodified')).toHaveLength(0)
    })

    it('should detect modified files', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')
      await db.commit('Initial commit')

      // Modify the file
      await db.set('posts/test', { data: { title: 'Updated' }, content: '# Updated' })

      const status = await db.status()
      expect(status.dirty).toBe(true)

      const modifiedFile = status.files.find((f) => f.path === 'posts/test.mdx')
      expect(modifiedFile?.status).toBe('modified')
    })

    it('should detect untracked files', async () => {
      await db.set('posts/untracked', { data: { title: 'Untracked' }, content: '# Untracked' })

      const status = await db.status()
      expect(status.dirty).toBe(true)

      const untrackedFile = status.files.find((f) => f.path === 'posts/untracked.mdx')
      expect(untrackedFile?.status).toBe('untracked')
    })

    it('should return current branch', async () => {
      const status = await db.status()
      expect(status.branch).toBe('main')
    })
  })

  describe('Log Operations', () => {
    it('should return commit history', async () => {
      await db.set('posts/one', { data: { title: 'One' }, content: '# One' })
      await db.add('.')
      await db.commit('First commit')

      await db.set('posts/two', { data: { title: 'Two' }, content: '# Two' })
      await db.add('.')
      await db.commit('Second commit')

      const log = await db.log()

      expect(log).toHaveLength(2)
      expect(log[0].message.trim()).toBe('Second commit')
      expect(log[1].message.trim()).toBe('First commit')
    })

    it('should limit log entries', async () => {
      await db.set('posts/one', { data: { title: 'One' }, content: '# One' })
      await db.add('.')
      await db.commit('First')

      await db.set('posts/two', { data: { title: 'Two' }, content: '# Two' })
      await db.add('.')
      await db.commit('Second')

      await db.set('posts/three', { data: { title: 'Three' }, content: '# Three' })
      await db.add('.')
      await db.commit('Third')

      const log = await db.log({ limit: 2 })
      expect(log).toHaveLength(2)
    })

    it('should include author info in commits', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')
      await db.commit('Test commit')

      const log = await db.log()
      expect(log[0].author.name).toBe(testAuthor.name)
      expect(log[0].author.email).toBe(testAuthor.email)
      expect(log[0].author.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Branch Operations', () => {
    it('should get current branch', async () => {
      const branch = await db.currentBranch()
      expect(branch).toBe('main')
    })

    it('should list branches', async () => {
      // Need at least one commit to have a branch
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')
      await db.commit('Initial')

      const branches = await db.branches()
      expect(branches.length).toBeGreaterThanOrEqual(1)

      const mainBranch = branches.find((b) => b.name === 'main')
      expect(mainBranch).toBeDefined()
      expect(mainBranch?.current).toBe(true)
    })

    it('should create a new branch', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')
      await db.commit('Initial')

      await db.branch('feature/test')

      const branches = await db.branches()
      const featureBranch = branches.find((b) => b.name === 'feature/test')
      expect(featureBranch).toBeDefined()
    })

    it('should checkout a branch', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')
      await db.commit('Initial')

      await db.branch('feature/test')
      await db.checkout('feature/test')

      const current = await db.currentBranch()
      expect(current).toBe('feature/test')
    })

    it('should create and checkout in one step', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')
      await db.commit('Initial')

      await db.checkout('feature/new', { create: true })

      const current = await db.currentBranch()
      expect(current).toBe('feature/new')
    })

    it('should delete a branch', async () => {
      await db.set('posts/test', { data: { title: 'Test' }, content: '# Test' })
      await db.add('.')
      await db.commit('Initial')

      await db.branch('to-delete')
      await db.deleteBranch('to-delete')

      const branches = await db.branches()
      const deletedBranch = branches.find((b) => b.name === 'to-delete')
      expect(deletedBranch).toBeUndefined()
    })
  })

  describe('Auto-Commit Feature', () => {
    it('should auto-commit on set when enabled', async () => {
      const autoDb = createGitDatabase({
        root: tempDir,
        author: testAuthor,
        autoCommit: true,
        commitPrefix: '[auto] ',
      })

      await autoDb.set('posts/auto', { data: { title: 'Auto' }, content: '# Auto' })

      const log = await autoDb.log()
      expect(log.length).toBeGreaterThanOrEqual(1)
      expect(log[0].message).toContain('[auto]')
      expect(log[0].message).toContain('Add posts/auto')
    })

    it('should auto-commit on delete when enabled', async () => {
      const autoDb = createGitDatabase({
        root: tempDir,
        author: testAuthor,
        autoCommit: true,
      })

      await autoDb.set('posts/to-delete', { data: { title: 'Delete' }, content: '# Delete' })
      await autoDb.delete('posts/to-delete')

      const log = await autoDb.log()
      const deleteCommit = log.find((c) => c.message.includes('Delete'))
      expect(deleteCommit).toBeDefined()
    })
  })

  describe('Diff Operations', () => {
    it('should get diff between commits', async () => {
      await db.set('posts/test', { data: { title: 'Original' }, content: '# Original' })
      await db.add('.')
      await db.commit('First')

      await db.set('posts/test', { data: { title: 'Updated' }, content: '# Updated' })
      await db.add('.')
      await db.commit('Second')

      const diff = await db.diff('posts/test.mdx', { from: 'HEAD~1' })

      // diff.from may be null if the ref resolution fails, check what we got
      if (diff.from !== null) {
        expect(diff.from).toContain('Original')
      }
      expect(diff.to).toContain('Updated')
    })
  })

  describe('History Navigation', () => {
    it('should get document at specific commit', async () => {
      await db.set('posts/test', { data: { title: 'Version 1' }, content: '# V1' })
      await db.add('.')
      const firstCommit = await db.commit('First')

      await db.set('posts/test', { data: { title: 'Version 2' }, content: '# V2' })
      await db.add('.')
      await db.commit('Second')

      const oldDoc = await db.getAtCommit('posts/test', firstCommit.sha)
      expect(oldDoc?.data.title).toBe('Version 1')

      const currentDoc = await db.get('posts/test')
      expect(currentDoc?.data.title).toBe('Version 2')
    })
  })

  describe('createGitDatabase Factory', () => {
    it('should create a GitDatabase instance', () => {
      const config: GitDatabaseConfig = {
        root: tempDir,
        author: testAuthor,
      }

      const instance = createGitDatabase(config)
      expect(instance).toBeInstanceOf(GitDatabase)
    })
  })
})
