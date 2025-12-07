/**
 * @mdxdb/git Database Implementation
 *
 * Git-aware database that extends FsDatabase with version control operations.
 * Uses isomorphic-git for pure JavaScript git implementation.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import { FsDatabase } from '@mdxdb/fs'
import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type { SetOptions, SetResult, DeleteResult } from '@mdxdb/fs'
import type {
  GitDatabaseConfig,
  GitCommit,
  GitStatus,
  GitFileStatus,
  GitBranch,
  GitLogOptions,
  GitPushOptions,
  GitPullOptions,
  GitCheckoutOptions,
  GitCommitResult,
  GitPushResult,
  GitPullResult,
  GitAuthor,
  GitAuth,
} from './types.js'

/**
 * Git-aware MDX document database
 *
 * Extends FsDatabase with git version control operations.
 * All file operations are inherited from FsDatabase, with optional
 * auto-commit and auto-push functionality.
 *
 * @example
 * ```ts
 * import { createGitDatabase } from '@mdxdb/git'
 *
 * const db = createGitDatabase({
 *   root: './content',
 *   author: { name: 'Bot', email: 'bot@example.com' },
 *   autoCommit: true,
 * })
 *
 * // File operations (inherited from FsDatabase)
 * await db.set('posts/hello', { data: { title: 'Hello' }, content: '# Hello' })
 *
 * // Git operations
 * await db.commit('Add hello post')
 * await db.push()
 *
 * // Get status
 * const status = await db.status()
 * console.log(status.files)
 * ```
 */
export class GitDatabase<TData extends MDXLDData = MDXLDData> extends FsDatabase<TData> {
  private readonly gitRoot: string
  private readonly author?: GitAuthor
  private readonly auth?: GitAuth
  private readonly defaultBranch: string
  private readonly autoCommit: boolean
  private readonly autoPush: boolean
  private readonly commitPrefix: string
  private readonly remoteUrl?: string
  private readonly remoteName: string

  constructor(config: GitDatabaseConfig) {
    super(config)
    this.gitRoot = path.resolve(config.root)
    this.author = config.author
    this.auth = config.auth
    this.defaultBranch = config.defaultBranch ?? 'main'
    this.autoCommit = config.autoCommit ?? false
    this.autoPush = config.autoPush ?? false
    this.commitPrefix = config.commitPrefix ?? ''
    this.remoteUrl = config.remote?.url
    this.remoteName = config.remote?.name ?? 'origin'
  }

  /**
   * Get auth callback for isomorphic-git
   */
  private getAuthCallback() {
    if (!this.auth) return undefined

    return async (url: string) => {
      if (this.auth?.onAuth) {
        return this.auth.onAuth(url)
      }

      if (this.auth?.token) {
        return {
          username: this.auth.token,
          password: 'x-oauth-basic',
        }
      }

      return {
        username: this.auth?.username,
        password: this.auth?.password,
      }
    }
  }

  // ===========================================================================
  // Overridden File Operations (with auto-commit support)
  // ===========================================================================

  /**
   * Set/create a document with optional auto-commit
   */
  override async set(id: string, document: MDXLDDocument<TData>, options: SetOptions = {}): Promise<SetResult> {
    const result = await super.set(id, document, options)

    if (this.autoCommit) {
      const filePath = this.getFilePath(id)
      await this.add(filePath)
      const action = result.created ? 'Add' : 'Update'
      await this.commit(`${this.commitPrefix}${action} ${id}`)

      if (this.autoPush) {
        await this.push()
      }
    }

    return result
  }

  /**
   * Delete a document with optional auto-commit
   */
  override async delete(id: string, options: { soft?: boolean } = {}): Promise<DeleteResult> {
    const result = await super.delete(id, options)

    if (this.autoCommit && result.deleted) {
      const filePath = this.getFilePath(id)
      await this.remove(filePath)
      await this.commit(`${this.commitPrefix}Delete ${id}`)

      if (this.autoPush) {
        await this.push()
      }
    }

    return result
  }

  /**
   * Get file path for an ID (helper for auto-commit)
   */
  private getFilePath(id: string): string {
    // Try common extensions
    for (const ext of ['.mdx', '.md']) {
      const filePath = path.join(this.gitRoot, `${id}${ext}`)
      if (fs.existsSync(filePath)) {
        return path.relative(this.gitRoot, filePath)
      }
    }
    return `${id}.mdx`
  }

  // ===========================================================================
  // Git Repository Operations
  // ===========================================================================

  /**
   * Initialize a new git repository
   *
   * @example
   * ```ts
   * await db.init()
   * ```
   */
  async init(): Promise<void> {
    await git.init({
      fs,
      dir: this.gitRoot,
      defaultBranch: this.defaultBranch,
    })
  }

  /**
   * Clone a remote repository
   *
   * @example
   * ```ts
   * await db.clone('https://github.com/user/repo.git')
   * ```
   */
  async clone(url: string, options: { depth?: number; branch?: string } = {}): Promise<void> {
    await git.clone({
      fs,
      http,
      dir: this.gitRoot,
      url,
      depth: options.depth,
      ref: options.branch,
      singleBranch: !!options.branch,
      onAuth: this.getAuthCallback(),
    })
  }

  // ===========================================================================
  // Staging Operations
  // ===========================================================================

  /**
   * Stage a file for commit
   *
   * @example
   * ```ts
   * await db.add('posts/hello.mdx')
   * await db.add('.') // Stage all
   * ```
   */
  async add(filepath: string): Promise<void> {
    if (filepath === '.' || filepath === '*') {
      // Stage all files
      const status = await this.status()
      for (const file of status.files) {
        if (file.status !== 'unmodified' && file.status !== 'ignored') {
          await git.add({
            fs,
            dir: this.gitRoot,
            filepath: file.path,
          })
        }
      }
    } else {
      await git.add({
        fs,
        dir: this.gitRoot,
        filepath,
      })
    }
  }

  /**
   * Unstage a file (remove from index but keep working changes)
   *
   * @example
   * ```ts
   * await db.unstage('posts/hello.mdx')
   * ```
   */
  async unstage(filepath: string): Promise<void> {
    await git.resetIndex({
      fs,
      dir: this.gitRoot,
      filepath,
    })
  }

  /**
   * Remove a file from git tracking
   *
   * @example
   * ```ts
   * await db.remove('posts/old.mdx')
   * ```
   */
  async remove(filepath: string): Promise<void> {
    await git.remove({
      fs,
      dir: this.gitRoot,
      filepath,
    })
  }

  // ===========================================================================
  // Commit Operations
  // ===========================================================================

  /**
   * Create a commit with staged changes
   *
   * @example
   * ```ts
   * await db.add('.')
   * const result = await db.commit('Update posts')
   * console.log(result.sha)
   * ```
   */
  async commit(message: string, options: { all?: boolean } = {}): Promise<GitCommitResult> {
    if (!this.author) {
      throw new Error('Git author is required for commits. Set author in config.')
    }

    // Stage all changes if requested
    if (options.all) {
      await this.add('.')
    }

    // Get list of staged files
    const status = await this.status()
    const stagedFiles = status.files.filter((f) => f.staged).map((f) => f.path)

    const sha = await git.commit({
      fs,
      dir: this.gitRoot,
      message,
      author: {
        name: this.author.name,
        email: this.author.email,
      },
    })

    return {
      sha,
      message,
      files: stagedFiles,
    }
  }

  // ===========================================================================
  // Remote Operations
  // ===========================================================================

  /**
   * Push commits to remote
   *
   * @example
   * ```ts
   * await db.push()
   * await db.push({ remote: 'origin', branch: 'main' })
   * ```
   */
  async push(options: GitPushOptions = {}): Promise<GitPushResult> {
    const remote = options.remote ?? this.remoteName
    const branch = options.branch ?? (await this.currentBranch())

    const result = await git.push({
      fs,
      http,
      dir: this.gitRoot,
      remote,
      ref: branch,
      force: options.force,
      onAuth: this.getAuthCallback(),
    })

    // isomorphic-git returns { ok, refs: { [refPath]: RefUpdateStatus } }
    // RefUpdateStatus has: ok, error
    const refs: GitPushResult['refs'] = []
    if (result.refs) {
      for (const [refPath, status] of Object.entries(result.refs)) {
        refs.push({
          remote: refPath,
          local: refPath,
          status: status.error ? 'error' : 'ok',
        })
      }
    }

    return {
      ok: result.ok ?? true,
      refs,
    }
  }

  /**
   * Pull changes from remote
   *
   * @example
   * ```ts
   * await db.pull()
   * await db.pull({ remote: 'origin', branch: 'main' })
   * ```
   */
  async pull(options: GitPullOptions = {}): Promise<GitPullResult> {
    const remote = options.remote ?? this.remoteName
    const branch = options.branch ?? (await this.currentBranch())

    if (!this.author) {
      throw new Error('Git author is required for pull (in case of merge). Set author in config.')
    }

    // isomorphic-git pull returns void, but we can detect changes by checking refs before/after
    const beforeRef = await git.resolveRef({ fs, dir: this.gitRoot, ref: branch }).catch(() => null)

    await git.pull({
      fs,
      http,
      dir: this.gitRoot,
      remote,
      ref: branch,
      fastForwardOnly: options.fastForwardOnly,
      author: {
        name: this.author.name,
        email: this.author.email,
      },
      onAuth: this.getAuthCallback(),
    })

    const afterRef = await git.resolveRef({ fs, dir: this.gitRoot, ref: branch }).catch(() => null)
    const fastForward = beforeRef !== afterRef

    return {
      ok: true,
      fastForward,
      mergeCommit: fastForward && afterRef ? afterRef : undefined,
    }
  }

  /**
   * Fetch updates from remote without merging
   *
   * @example
   * ```ts
   * await db.fetch()
   * await db.fetch('origin')
   * ```
   */
  async fetch(remote?: string): Promise<void> {
    await git.fetch({
      fs,
      http,
      dir: this.gitRoot,
      remote: remote ?? this.remoteName,
      onAuth: this.getAuthCallback(),
    })
  }

  /**
   * Add a remote
   *
   * @example
   * ```ts
   * await db.addRemote('origin', 'https://github.com/user/repo.git')
   * ```
   */
  async addRemote(name: string, url: string): Promise<void> {
    await git.addRemote({
      fs,
      dir: this.gitRoot,
      remote: name,
      url,
    })
  }

  /**
   * List remotes
   */
  async listRemotes(): Promise<Array<{ remote: string; url: string }>> {
    return git.listRemotes({
      fs,
      dir: this.gitRoot,
    })
  }

  // ===========================================================================
  // Branch Operations
  // ===========================================================================

  /**
   * Get current branch name
   *
   * @example
   * ```ts
   * const branch = await db.currentBranch()
   * console.log(branch) // 'main'
   * ```
   */
  async currentBranch(): Promise<string> {
    const branch = await git.currentBranch({
      fs,
      dir: this.gitRoot,
      fullname: false,
    })
    return branch ?? this.defaultBranch
  }

  /**
   * List all branches
   *
   * @example
   * ```ts
   * const branches = await db.branches()
   * console.log(branches.map(b => b.name))
   * ```
   */
  async branches(): Promise<GitBranch[]> {
    const current = await this.currentBranch()
    const localBranches = await git.listBranches({
      fs,
      dir: this.gitRoot,
    })

    const branches: GitBranch[] = []

    for (const name of localBranches) {
      const sha = await git.resolveRef({
        fs,
        dir: this.gitRoot,
        ref: name,
      })

      branches.push({
        name,
        sha,
        current: name === current,
      })
    }

    return branches
  }

  /**
   * Create a new branch
   *
   * @example
   * ```ts
   * await db.branch('feature/new-posts')
   * await db.branch('feature/fix', { checkout: true })
   * ```
   */
  async branch(name: string, options: { checkout?: boolean; ref?: string } = {}): Promise<void> {
    await git.branch({
      fs,
      dir: this.gitRoot,
      ref: name,
      object: options.ref,
    })

    if (options.checkout) {
      await this.checkout(name)
    }
  }

  /**
   * Delete a branch
   *
   * @example
   * ```ts
   * await db.deleteBranch('feature/old')
   * ```
   */
  async deleteBranch(name: string): Promise<void> {
    await git.deleteBranch({
      fs,
      dir: this.gitRoot,
      ref: name,
    })
  }

  /**
   * Checkout a branch or commit
   *
   * @example
   * ```ts
   * await db.checkout('main')
   * await db.checkout('feature/new', { create: true })
   * ```
   */
  async checkout(ref: string, options: GitCheckoutOptions = {}): Promise<void> {
    if (options.create) {
      await this.branch(ref)
    }

    await git.checkout({
      fs,
      dir: this.gitRoot,
      ref,
      force: options.force,
    })
  }

  // ===========================================================================
  // Status & History Operations
  // ===========================================================================

  /**
   * Get repository status
   *
   * @example
   * ```ts
   * const status = await db.status()
   * if (status.dirty) {
   *   console.log('Uncommitted changes:', status.files)
   * }
   * ```
   */
  async status(): Promise<GitStatus> {
    const branch = await this.currentBranch()
    const matrix = await git.statusMatrix({
      fs,
      dir: this.gitRoot,
    })

    const files: GitFileStatus[] = []
    let dirty = false

    for (const [filepath, head, workdir, stage] of matrix) {
      // [HEAD, WORKDIR, STAGE]
      // 0 = absent, 1 = identical to HEAD, 2 = different from HEAD

      let status: GitFileStatus['status'] = 'unmodified'
      let staged = false

      if (head === 0 && workdir === 2 && stage === 0) {
        status = 'untracked'
        dirty = true
      } else if (head === 0 && workdir === 2 && stage === 2) {
        status = 'added'
        staged = true
        dirty = true
      } else if (head === 1 && workdir === 2 && stage === 1) {
        status = 'modified'
        dirty = true
      } else if (head === 1 && workdir === 2 && stage === 2) {
        status = 'modified'
        staged = true
        dirty = true
      } else if (head === 1 && workdir === 0 && stage === 0) {
        status = 'deleted'
        staged = true
        dirty = true
      } else if (head === 1 && workdir === 0 && stage === 1) {
        status = 'deleted'
        dirty = true
      } else if (head === 0 && workdir === 0 && stage === 2) {
        status = 'added'
        staged = true
        dirty = true
      }

      if (status !== 'unmodified') {
        files.push({
          path: filepath,
          status,
          staged,
        })
      }
    }

    // Get ahead/behind (simplified - just returns 0 for now if no remote)
    let ahead = 0
    let behind = 0

    try {
      const localRef = await git.resolveRef({
        fs,
        dir: this.gitRoot,
        ref: branch,
      })

      const remoteRef = await git.resolveRef({
        fs,
        dir: this.gitRoot,
        ref: `${this.remoteName}/${branch}`,
      })

      if (localRef !== remoteRef) {
        // Simplified: just mark as ahead if different
        // Full implementation would walk commit graph
        ahead = localRef !== remoteRef ? 1 : 0
      }
    } catch {
      // No remote tracking branch
    }

    return {
      branch,
      dirty,
      ahead,
      behind,
      files,
    }
  }

  /**
   * Get commit history
   *
   * @example
   * ```ts
   * const commits = await db.log({ limit: 10 })
   * for (const commit of commits) {
   *   console.log(`${commit.sha.slice(0, 7)} ${commit.message}`)
   * }
   * ```
   */
  async log(options: GitLogOptions = {}): Promise<GitCommit[]> {
    const commits = await git.log({
      fs,
      dir: this.gitRoot,
      depth: options.limit,
      ref: options.ref,
    })

    return commits.map((entry) => ({
      sha: entry.oid,
      message: entry.commit.message,
      author: {
        name: entry.commit.author.name,
        email: entry.commit.author.email,
        timestamp: new Date(entry.commit.author.timestamp * 1000),
      },
      committer: {
        name: entry.commit.committer.name,
        email: entry.commit.committer.email,
        timestamp: new Date(entry.commit.committer.timestamp * 1000),
      },
      parents: entry.commit.parent,
    }))
  }

  /**
   * Get diff of a file between commits
   *
   * @example
   * ```ts
   * const diff = await db.diff('posts/hello.mdx')
   * const diff = await db.diff('posts/hello.mdx', { from: 'HEAD~1', to: 'HEAD' })
   * ```
   */
  async diff(
    filepath: string,
    options: { from?: string; to?: string } = {}
  ): Promise<{ from: string | null; to: string | null }> {
    const fromRef = options.from ?? 'HEAD'
    const toRef = options.to

    // Get content at 'from' ref
    let fromContent: string | null = null
    try {
      const { blob } = await git.readBlob({
        fs,
        dir: this.gitRoot,
        oid: await git.resolveRef({ fs, dir: this.gitRoot, ref: fromRef }),
        filepath,
      })
      fromContent = new TextDecoder().decode(blob)
    } catch {
      // File didn't exist at that ref
    }

    // Get content at 'to' ref (or working directory)
    let toContent: string | null = null
    if (toRef) {
      try {
        const { blob } = await git.readBlob({
          fs,
          dir: this.gitRoot,
          oid: await git.resolveRef({ fs, dir: this.gitRoot, ref: toRef }),
          filepath,
        })
        toContent = new TextDecoder().decode(blob)
      } catch {
        // File didn't exist at that ref
      }
    } else {
      // Read from working directory
      try {
        toContent = fs.readFileSync(path.join(this.gitRoot, filepath), 'utf-8')
      } catch {
        // File doesn't exist
      }
    }

    return { from: fromContent, to: toContent }
  }

  /**
   * Get a document at a specific commit
   *
   * @example
   * ```ts
   * const oldDoc = await db.getAtCommit('posts/hello', 'abc1234')
   * ```
   */
  async getAtCommit(id: string, commitSha: string): Promise<MDXLDDocument<TData> | null> {
    const filepath = this.getFilePath(id)

    try {
      const { blob } = await git.readBlob({
        fs,
        dir: this.gitRoot,
        oid: commitSha,
        filepath,
      })

      const content = new TextDecoder().decode(blob)
      const { parse } = await import('mdxld')
      return parse(content) as MDXLDDocument<TData>
    } catch {
      return null
    }
  }

  // ===========================================================================
  // Utility Operations
  // ===========================================================================

  /**
   * Check if directory is a git repository
   */
  async isRepo(): Promise<boolean> {
    try {
      // Check for .git directory existence - works even on empty repos
      const gitDir = path.join(this.gitRoot, '.git')
      const stats = fs.statSync(gitDir)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * Get the root directory of the repository
   */
  async findRoot(): Promise<string> {
    return git.findRoot({
      fs,
      filepath: this.gitRoot,
    })
  }
}

/**
 * Create a git-aware database instance
 *
 * @example
 * ```ts
 * import { createGitDatabase } from '@mdxdb/git'
 *
 * const db = createGitDatabase({
 *   root: './content',
 *   author: { name: 'Bot', email: 'bot@example.com' },
 *   remote: { url: 'https://github.com/user/repo.git' },
 *   auth: { token: process.env.GITHUB_TOKEN },
 *   autoCommit: true,
 *   autoPush: true,
 * })
 *
 * // All FsDatabase operations work
 * await db.set('posts/hello', { data: { title: 'Hello' }, content: '# Hi!' })
 *
 * // Git operations
 * const status = await db.status()
 * const log = await db.log({ limit: 5 })
 * ```
 */
export function createGitDatabase<TData extends MDXLDData = MDXLDData>(
  config: GitDatabaseConfig
): GitDatabase<TData> {
  return new GitDatabase<TData>(config)
}
