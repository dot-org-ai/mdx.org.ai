/**
 * @mdxdb/git Types
 *
 * @packageDocumentation
 */

import type { FsDatabaseConfig } from '@mdxdb/fs'
// Note: SetOptions, SetResult, DeleteResult are now exported from @mdxdb/fs

/**
 * Git author information
 */
export interface GitAuthor {
  /** Author name */
  name: string
  /** Author email */
  email: string
}

/**
 * Git remote configuration
 */
export interface GitRemote {
  /** Remote name (default: 'origin') */
  name?: string
  /** Remote URL */
  url: string
}

/**
 * Authentication options for git operations
 */
export interface GitAuth {
  /** Username for HTTP(S) auth */
  username?: string
  /** Password or token for HTTP(S) auth */
  password?: string
  /** OAuth2 token (alternative to username/password) */
  token?: string
  /** SSH private key (for SSH URLs) */
  privateKey?: string
  /** SSH passphrase */
  passphrase?: string
  /** Custom auth callback */
  onAuth?: (url: string) => GitAuth | Promise<GitAuth>
}

/**
 * Configuration for the git database
 */
export interface GitDatabaseConfig extends FsDatabaseConfig {
  /** Git author for commits (required for commit operations) */
  author?: GitAuthor
  /** Git remote configuration */
  remote?: GitRemote
  /** Authentication options */
  auth?: GitAuth
  /** Default branch name (default: 'main') */
  defaultBranch?: string
  /** Auto-commit on set/delete operations (default: false) */
  autoCommit?: boolean
  /** Auto-push after commits (default: false) */
  autoPush?: boolean
  /** Commit message prefix for auto-commits */
  commitPrefix?: string
}

/**
 * Git commit information
 */
export interface GitCommit {
  /** Commit SHA */
  sha: string
  /** Commit message */
  message: string
  /** Author information */
  author: GitAuthor & { timestamp: Date }
  /** Committer information */
  committer: GitAuthor & { timestamp: Date }
  /** Parent commit SHAs */
  parents: string[]
}

/**
 * Git status of a file
 */
export interface GitFileStatus {
  /** File path relative to repo root */
  path: string
  /** Status in HEAD vs workdir */
  status: 'unmodified' | 'modified' | 'added' | 'deleted' | 'untracked' | 'ignored'
  /** Whether file is staged */
  staged: boolean
}

/**
 * Git repository status
 */
export interface GitStatus {
  /** Current branch name */
  branch: string
  /** Whether there are uncommitted changes */
  dirty: boolean
  /** Ahead/behind counts relative to upstream */
  ahead: number
  behind: number
  /** File statuses */
  files: GitFileStatus[]
}

/**
 * Git branch information
 */
export interface GitBranch {
  /** Branch name */
  name: string
  /** Commit SHA the branch points to */
  sha: string
  /** Whether this is the current branch */
  current: boolean
  /** Remote tracking branch (if any) */
  upstream?: string
}

/**
 * Options for git log
 */
export interface GitLogOptions {
  /** Maximum number of commits to return */
  limit?: number
  /** Start from this ref (default: HEAD) */
  ref?: string
  /** Only show commits affecting this path */
  path?: string
  /** Skip this many commits */
  skip?: number
}

/**
 * Options for git push
 */
export interface GitPushOptions {
  /** Remote name (default: 'origin') */
  remote?: string
  /** Branch to push (default: current branch) */
  branch?: string
  /** Force push */
  force?: boolean
  /** Set upstream tracking */
  setUpstream?: boolean
}

/**
 * Options for git pull
 */
export interface GitPullOptions {
  /** Remote name (default: 'origin') */
  remote?: string
  /** Branch to pull (default: current branch) */
  branch?: string
  /** Fast-forward only */
  fastForwardOnly?: boolean
}

/**
 * Options for git checkout
 */
export interface GitCheckoutOptions {
  /** Create new branch */
  create?: boolean
  /** Force checkout (discard local changes) */
  force?: boolean
}

/**
 * Result of a commit operation
 */
export interface GitCommitResult {
  /** Commit SHA */
  sha: string
  /** Commit message */
  message: string
  /** Files that were committed */
  files: string[]
}

/**
 * Result of a push operation
 */
export interface GitPushResult {
  /** Whether push was successful */
  ok: boolean
  /** Refs that were updated */
  refs: Array<{
    remote: string
    local: string
    status: 'ok' | 'rejected' | 'error'
  }>
}

/**
 * Result of a pull operation
 */
export interface GitPullResult {
  /** Whether pull was successful */
  ok: boolean
  /** Whether there was a fast-forward */
  fastForward: boolean
  /** Merge commit SHA (if merge was needed) */
  mergeCommit?: string
}
