/**
 * Git Executor
 *
 * Executes git commands and parses output into structured data.
 * Designed to work in Node.js, Bun, and potentially other environments.
 */

import { execFile, execSync } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'
import { inferNsFromRepo } from '../schema/actions'
import type {
  GitExecutor,
  GitCommit,
  GitDiff,
  GitFileChange,
  RepoInfo,
  CloneOptions,
} from './types'

const execFileAsync = promisify(execFile)

/**
 * Default git executor using child_process
 */
export class DefaultGitExecutor implements GitExecutor {
  private timeout: number

  constructor(options: { timeout?: number } = {}) {
    this.timeout = options.timeout ?? 60000 // 1 minute default
  }

  /**
   * Execute a git command
   * Uses execFile instead of exec to avoid shell interpretation of special characters
   */
  private async git(
    repoPath: string,
    args: string[],
    options: { env?: Record<string, string> } = {}
  ): Promise<string> {
    const command = `git ${args.join(' ')}`

    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd: repoPath,
        timeout: this.timeout,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large diffs
        env: {
          ...process.env,
          ...options.env,
          // Prevent git from asking for credentials interactively
          GIT_TERMINAL_PROMPT: '0',
          // Use English output for parsing
          LC_ALL: 'C',
        },
      })
      return stdout.trim()
    } catch (error) {
      const err = error as Error & { stderr?: string; code?: number }
      throw new GitError(
        `Git command failed: ${command}`,
        err.stderr || err.message,
        err.code
      )
    }
  }

  /**
   * Clone a repository
   */
  async clone(url: string, dest: string, options: CloneOptions = {}): Promise<void> {
    const args = ['clone']

    if (options.branch) {
      args.push('--branch', options.branch)
    }

    if (options.depth) {
      args.push('--depth', String(options.depth))
    }

    if (options.singleBranch) {
      args.push('--single-branch')
    }

    // Handle authentication
    let cloneUrl = url
    if (options.token) {
      cloneUrl = this.injectToken(url, options.token)
    }

    args.push(cloneUrl, dest)

    // Run from parent directory
    const parentDir = join(dest, '..')
    await execAsync(`git ${args.join(' ')}`, {
      cwd: parentDir,
      timeout: this.timeout * 5, // Longer timeout for clone
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      },
    })
  }

  /**
   * Fetch updates from remote
   */
  async fetch(repoPath: string, remote = 'origin'): Promise<void> {
    await this.git(repoPath, ['fetch', remote, '--prune'])
  }

  /**
   * Checkout a branch or commit
   */
  async checkout(repoPath: string, ref: string): Promise<void> {
    await this.git(repoPath, ['checkout', ref])
  }

  /**
   * Get repository information
   */
  async getRepoInfo(repoPath: string): Promise<RepoInfo> {
    const [remoteUrl, currentBranch, head, isDirty] = await Promise.all([
      this.getRemoteUrl(repoPath).catch(() => ''),
      this.getCurrentBranch(repoPath),
      this.git(repoPath, ['rev-parse', 'HEAD']),
      this.git(repoPath, ['status', '--porcelain']).then((out) => out.length > 0),
    ])

    const isBare = await this.git(repoPath, ['rev-parse', '--is-bare-repository'])
      .then((out) => out === 'true')

    return {
      path: repoPath,
      remoteUrl,
      currentBranch,
      head,
      isBare,
      isDirty,
      ns: inferNsFromRepo(remoteUrl || repoPath),
    }
  }

  /**
   * Get commit information
   */
  async getCommit(repoPath: string, ref: string): Promise<GitCommit> {
    // Format: hash|shortHash|message|authorName|authorEmail|timestamp|parents
    const format = '%H|%h|%s|%an|%ae|%aI|%P'
    const output = await this.git(repoPath, ['log', '-1', `--format=${format}`, ref])

    const parts = output.split('|')
    const hash = parts[0] ?? ''
    const shortHash = parts[1] ?? ''
    const message = parts[2] ?? ''
    const authorName = parts[3] ?? ''
    const authorEmail = parts[4] ?? ''
    const timestamp = parts[5] ?? ''
    const parentsStr = parts[6] ?? ''

    return {
      hash,
      shortHash,
      message,
      authorName,
      authorEmail,
      timestamp,
      parents: parentsStr ? parentsStr.split(' ').filter(Boolean) : [],
    }
  }

  /**
   * Get commits in a range
   */
  async getCommits(repoPath: string, from: string, to: string): Promise<GitCommit[]> {
    const format = '%H|%h|%s|%an|%ae|%aI|%P'
    const range = from ? `${from}..${to}` : to

    const output = await this.git(repoPath, [
      'log',
      `--format=${format}`,
      '--reverse',
      range,
    ])

    if (!output) return []

    return output.split('\n').map((line) => {
      const parts = line.split('|')
      const hash = parts[0] ?? ''
      const shortHash = parts[1] ?? ''
      const message = parts[2] ?? ''
      const authorName = parts[3] ?? ''
      const authorEmail = parts[4] ?? ''
      const timestamp = parts[5] ?? ''
      const parentsStr = parts[6] ?? ''
      return {
        hash,
        shortHash,
        message,
        authorName,
        authorEmail,
        timestamp,
        parents: parentsStr ? parentsStr.split(' ').filter(Boolean) : [],
      }
    })
  }

  /**
   * Get diff between commits
   */
  async getDiff(repoPath: string, from: string, to: string): Promise<GitDiff> {
    const range = from ? `${from}..${to}` : `${to}^..${to}`

    // Get file list with stats
    const nameStatus = await this.git(repoPath, [
      'diff',
      '--name-status',
      '--no-renames',
      range,
    ])

    // Get numstat for additions/deletions
    const numstat = await this.git(repoPath, ['diff', '--numstat', range])

    // Get full patch
    const patch = await this.git(repoPath, ['diff', range])

    // Parse file changes
    const files = this.parseFileChanges(nameStatus, numstat)

    // Calculate stats
    const stats = {
      filesChanged: files.length,
      insertions: files.reduce((sum, f) => sum + f.additions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    }

    return {
      fromCommit: from || `${to}^`,
      toCommit: to,
      files,
      patch,
      stats,
    }
  }

  /**
   * Get file content at a specific commit
   */
  async getFileContent(repoPath: string, path: string, ref: string): Promise<string> {
    return this.git(repoPath, ['show', `${ref}:${path}`])
  }

  /**
   * List files at a commit
   */
  async listFiles(repoPath: string, ref: string, pattern?: string): Promise<string[]> {
    const args = ['ls-tree', '-r', '--name-only', ref]

    const output = await this.git(repoPath, args)
    let files = output.split('\n').filter(Boolean)

    // Filter by pattern if provided
    if (pattern) {
      const regex = this.globToRegex(pattern)
      files = files.filter((f) => regex.test(f))
    }

    return files
  }

  /**
   * Check if a path is a git repository
   */
  async isRepo(path: string): Promise<boolean> {
    if (!existsSync(path)) return false

    try {
      await this.git(path, ['rev-parse', '--git-dir'])
      return true
    } catch {
      return false
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      return await this.git(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    } catch {
      // Detached HEAD state
      return await this.git(repoPath, ['rev-parse', '--short', 'HEAD'])
    }
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(repoPath: string, remote = 'origin'): Promise<string> {
    return this.git(repoPath, ['remote', 'get-url', remote])
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Parse git name-status and numstat output into file changes
   */
  private parseFileChanges(nameStatus: string, numstat: string): GitFileChange[] {
    if (!nameStatus) return []

    // Parse numstat into a map
    const statsMap = new Map<string, { additions: number; deletions: number }>()
    for (const line of numstat.split('\n').filter(Boolean)) {
      const parts = line.split('\t')
      const add = parts[0] ?? '0'
      const del = parts[1] ?? '0'
      const path = parts[2] ?? ''
      if (path) {
        statsMap.set(path, {
          additions: add === '-' ? 0 : parseInt(add, 10),
          deletions: del === '-' ? 0 : parseInt(del, 10),
        })
      }
    }

    // Parse name-status
    const files: GitFileChange[] = []
    for (const line of nameStatus.split('\n').filter(Boolean)) {
      const parts = line.split('\t')
      const statusCode = parts[0] ?? ''
      const pathParts = parts.slice(1)
      const path = pathParts.join('\t') // Handle paths with tabs

      if (!statusCode || !path) continue

      const status = this.parseStatusCode(statusCode)
      const stats = statsMap.get(path) || { additions: 0, deletions: 0 }
      const binary = stats.additions === 0 && stats.deletions === 0

      const change: GitFileChange = {
        path,
        status,
        additions: stats.additions,
        deletions: stats.deletions,
        binary,
      }

      // Handle renames
      if (statusCode.startsWith('R') && pathParts.length === 2) {
        change.previousPath = pathParts[0] ?? ''
        change.path = pathParts[1] ?? ''
        change.status = 'renamed'
      }

      // Handle copies
      if (statusCode.startsWith('C') && pathParts.length === 2) {
        change.previousPath = pathParts[0] ?? ''
        change.path = pathParts[1] ?? ''
        change.status = 'copied'
      }

      files.push(change)
    }

    return files
  }

  /**
   * Parse git status code to change type
   */
  private parseStatusCode(code: string): GitFileChange['status'] {
    const firstChar = code[0] ?? ''
    switch (firstChar) {
      case 'A':
        return 'added'
      case 'M':
        return 'modified'
      case 'D':
        return 'deleted'
      case 'R':
        return 'renamed'
      case 'C':
        return 'copied'
      default:
        return 'modified'
    }
  }

  /**
   * Inject auth token into git URL
   */
  private injectToken(url: string, token: string): string {
    // Handle HTTPS URLs
    if (url.startsWith('https://')) {
      const urlObj = new URL(url)
      urlObj.username = 'oauth2'
      urlObj.password = token
      return urlObj.toString()
    }

    // Handle github shorthand
    if (url.match(/^[\w-]+\/[\w-]+$/)) {
      return `https://oauth2:${token}@github.com/${url}.git`
    }

    return url
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/{{GLOBSTAR}}/g, '.*')

    return new RegExp(`^${escaped}$`)
  }
}

/**
 * Git error with additional context
 */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly exitCode?: number
  ) {
    super(message)
    this.name = 'GitError'
  }
}

/**
 * Create a git executor instance
 */
export function createGitExecutor(options?: { timeout?: number }): GitExecutor {
  return new DefaultGitExecutor(options)
}
