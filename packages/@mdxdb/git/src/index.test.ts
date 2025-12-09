/**
 * @mdxdb/git Package Tests
 *
 * Tests for the main package exports and GitDatabase implementation
 */

import { describe, it, expect } from 'vitest'
import {
  GitDatabase,
  createGitDatabase,
  type GitDatabaseConfig,
  type GitAuthor,
  type GitRemote,
  type GitAuth,
  type GitCommit,
  type GitStatus,
  type GitFileStatus,
  type GitBranch,
  type GitLogOptions,
  type GitPushOptions,
  type GitPullOptions,
  type GitCheckoutOptions,
  type GitCommitResult,
  type GitPushResult,
  type GitPullResult,
  name,
} from './index.js'

describe('@mdxdb/git', () => {
  describe('Package Exports', () => {
    it('should export package name', () => {
      expect(name).toBe('@mdxdb/git')
    })

    it('should export GitDatabase class', () => {
      expect(typeof GitDatabase).toBe('function')
      expect(GitDatabase.name).toBe('GitDatabase')
    })

    it('should export createGitDatabase factory function', () => {
      expect(typeof createGitDatabase).toBe('function')
    })
  })

  describe('Type Exports', () => {
    it('should have GitDatabaseConfig type', () => {
      const config: GitDatabaseConfig = {
        root: '/tmp/test',
        author: {
          name: 'Test User',
          email: 'test@example.com',
        },
      }
      expect(config).toBeDefined()
    })

    it('should have GitAuthor type', () => {
      const author: GitAuthor = {
        name: 'Test User',
        email: 'test@example.com',
      }
      expect(author).toBeDefined()
    })

    it('should have GitRemote type', () => {
      const remote: GitRemote = {
        url: 'https://github.com/user/repo.git',
        name: 'origin',
      }
      expect(remote).toBeDefined()
    })

    it('should have GitAuth type with token', () => {
      const auth: GitAuth = {
        token: 'github_pat_token',
      }
      expect(auth).toBeDefined()
    })

    it('should have GitAuth type with username/password', () => {
      const auth: GitAuth = {
        username: 'user',
        password: 'pass',
      }
      expect(auth).toBeDefined()
    })

    it('should have GitAuth type with callback', () => {
      const auth: GitAuth = {
        onAuth: async (url: string) => ({
          username: 'user',
          password: 'pass',
        }),
      }
      expect(auth).toBeDefined()
    })

    it('should have GitCommit type', () => {
      const commit: GitCommit = {
        sha: 'abc123def456',
        message: 'Initial commit',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: new Date(),
        },
        committer: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: new Date(),
        },
        parents: [],
      }
      expect(commit).toBeDefined()
    })

    it('should have GitStatus type', () => {
      const status: GitStatus = {
        branch: 'main',
        dirty: true,
        ahead: 1,
        behind: 0,
        files: [],
      }
      expect(status).toBeDefined()
    })

    it('should have GitFileStatus type', () => {
      const fileStatus: GitFileStatus = {
        path: 'README.md',
        status: 'modified',
        staged: true,
      }
      expect(fileStatus).toBeDefined()
    })

    it('should have GitBranch type', () => {
      const branch: GitBranch = {
        name: 'main',
        sha: 'abc123',
        current: true,
      }
      expect(branch).toBeDefined()
    })

    it('should have GitLogOptions type', () => {
      const options: GitLogOptions = {
        limit: 10,
        ref: 'main',
      }
      expect(options).toBeDefined()
    })

    it('should have GitPushOptions type', () => {
      const options: GitPushOptions = {
        remote: 'origin',
        branch: 'main',
        force: false,
      }
      expect(options).toBeDefined()
    })

    it('should have GitPullOptions type', () => {
      const options: GitPullOptions = {
        remote: 'origin',
        branch: 'main',
        fastForwardOnly: true,
      }
      expect(options).toBeDefined()
    })

    it('should have GitCheckoutOptions type', () => {
      const options: GitCheckoutOptions = {
        create: true,
        force: false,
      }
      expect(options).toBeDefined()
    })

    it('should have GitCommitResult type', () => {
      const result: GitCommitResult = {
        sha: 'abc123',
        message: 'Test commit',
        files: ['README.md'],
      }
      expect(result).toBeDefined()
    })

    it('should have GitPushResult type', () => {
      const result: GitPushResult = {
        ok: true,
        refs: [
          {
            remote: 'refs/heads/main',
            local: 'refs/heads/main',
            status: 'ok',
          },
        ],
      }
      expect(result).toBeDefined()
    })

    it('should have GitPullResult type', () => {
      const result: GitPullResult = {
        ok: true,
        fastForward: true,
        mergeCommit: 'abc123',
      }
      expect(result).toBeDefined()
    })
  })

  describe('Re-exported FsDatabase Types', () => {
    it('should re-export FsDatabaseConfig', async () => {
      // Import is successful if types are exported
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
    })

    it('should re-export Database interface types', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
    })

    it('should re-export MDXLDDocument types', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
    })
  })

  describe('Factory Function', () => {
    it('should create GitDatabase instance with minimal config', () => {
      const db = createGitDatabase({
        root: '/tmp/test',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
      })

      expect(db).toBeInstanceOf(GitDatabase)
    })

    it('should create GitDatabase instance with full config', () => {
      const config: GitDatabaseConfig = {
        root: '/tmp/test',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
        auth: {
          token: 'test-token',
        },
        remote: {
          name: 'origin',
          url: 'https://github.com/user/repo.git',
        },
        defaultBranch: 'main',
        autoCommit: true,
        autoPush: false,
        commitPrefix: '[auto] ',
      }

      const db = createGitDatabase(config)
      expect(db).toBeInstanceOf(GitDatabase)
    })

    it('should create GitDatabase with autoCommit enabled', () => {
      const db = createGitDatabase({
        root: '/tmp/test',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
        autoCommit: true,
      })

      expect(db).toBeInstanceOf(GitDatabase)
    })

    it('should create GitDatabase with autoPush enabled', () => {
      const db = createGitDatabase({
        root: '/tmp/test',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
        autoCommit: true,
        autoPush: true,
      })

      expect(db).toBeInstanceOf(GitDatabase)
    })

    it('should create GitDatabase with custom commitPrefix', () => {
      const db = createGitDatabase({
        root: '/tmp/test',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
        commitPrefix: '[bot] ',
      })

      expect(db).toBeInstanceOf(GitDatabase)
    })

    it('should create GitDatabase with custom defaultBranch', () => {
      const db = createGitDatabase({
        root: '/tmp/test',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
        defaultBranch: 'develop',
      })

      expect(db).toBeInstanceOf(GitDatabase)
    })
  })

  describe('Module Loading', () => {
    it('should load module successfully', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
      expect(mod.GitDatabase).toBeDefined()
      expect(mod.createGitDatabase).toBeDefined()
      expect(mod.name).toBe('@mdxdb/git')
    })

    it('should export all documented types', async () => {
      const mod = await import('./index.js')

      // Check that the module has the expected exports
      expect(typeof mod.GitDatabase).toBe('function')
      expect(typeof mod.createGitDatabase).toBe('function')
      expect(typeof mod.name).toBe('string')
    })
  })

  describe('Integration with FsDatabase', () => {
    it('should extend FsDatabase', () => {
      const db = createGitDatabase({
        root: '/tmp/test',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
      })

      // GitDatabase should have all FsDatabase methods
      expect(typeof db.get).toBe('function')
      expect(typeof db.set).toBe('function')
      expect(typeof db.list).toBe('function')
      expect(typeof db.search).toBe('function')
      expect(typeof db.delete).toBe('function')
    })

    it('should have git-specific methods', () => {
      const db = createGitDatabase({
        root: '/tmp/test',
        author: {
          name: 'Test',
          email: 'test@example.com',
        },
      })

      // Git-specific methods
      expect(typeof db.init).toBe('function')
      expect(typeof db.clone).toBe('function')
      expect(typeof db.add).toBe('function')
      expect(typeof db.commit).toBe('function')
      expect(typeof db.push).toBe('function')
      expect(typeof db.pull).toBe('function')
      expect(typeof db.status).toBe('function')
      expect(typeof db.log).toBe('function')
      expect(typeof db.branch).toBe('function')
      expect(typeof db.checkout).toBe('function')
    })
  })
})
