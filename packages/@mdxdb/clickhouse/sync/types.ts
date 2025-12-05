/**
 * Git Sync Types
 *
 * Type definitions for bi-directional git synchronization.
 * Supports both local and remote ClickHouse providers via HTTP.
 */

import type { ActionObject } from '../schema/actions'

// =============================================================================
// Git Types
// =============================================================================

/**
 * Git commit information
 */
export interface GitCommit {
  /** Commit hash (full SHA) */
  hash: string
  /** Short hash (7 chars) */
  shortHash: string
  /** Commit message */
  message: string
  /** Author name */
  authorName: string
  /** Author email */
  authorEmail: string
  /** Commit timestamp (ISO 8601) */
  timestamp: string
  /** Parent commit hash(es) */
  parents: string[]
}

/**
 * Git file change from diff
 */
export interface GitFileChange {
  /** File path relative to repo root */
  path: string
  /** Previous path (for renames) */
  previousPath?: string
  /** Change type */
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied'
  /** Number of lines added */
  additions: number
  /** Number of lines deleted */
  deletions: number
  /** Binary file flag */
  binary: boolean
}

/**
 * Git diff result
 */
export interface GitDiff {
  /** From commit */
  fromCommit: string
  /** To commit */
  toCommit: string
  /** Files changed */
  files: GitFileChange[]
  /** Full diff patch */
  patch: string
  /** Statistics */
  stats: {
    filesChanged: number
    insertions: number
    deletions: number
  }
}

/**
 * Repository information
 */
export interface RepoInfo {
  /** Repository root path */
  path: string
  /** Remote URL (origin) */
  remoteUrl: string
  /** Current branch */
  currentBranch: string
  /** Current HEAD commit */
  head: string
  /** Is bare repository */
  isBare: boolean
  /** Has uncommitted changes */
  isDirty: boolean
  /** Inferred namespace */
  ns: string
}

// =============================================================================
// Sync Types
// =============================================================================

/**
 * Sync direction
 */
export type SyncDirection = 'pull' | 'push' | 'both'

/**
 * Sync mode
 */
export type SyncMode =
  | 'full'      // Complete sync from scratch
  | 'incremental' // Only changes since last sync
  | 'commit'    // Specific commit(s)
  | 'diff'      // Explicit from/to commits

/**
 * Sync options
 */
export interface SyncOptions {
  /** Repository URL or local path */
  repo: string
  /** Branch to sync (default: main) */
  branch?: string
  /** Sync direction */
  direction?: SyncDirection
  /** Sync mode */
  mode?: SyncMode
  /** From commit (for diff mode) */
  fromCommit?: string
  /** To commit (for diff mode) */
  toCommit?: string
  /** Specific commits to sync */
  commits?: string[]
  /** File patterns to include (glob) */
  include?: string[]
  /** File patterns to exclude (glob) */
  exclude?: string[]
  /** Namespace override (default: inferred from repo) */
  ns?: string
  /** Actor performing the sync */
  actor?: string
  /** Dry run (no actual changes) */
  dryRun?: boolean
  /** Force sync even if conflicts */
  force?: boolean
  /** Clone depth for shallow clones */
  depth?: number
  /** Working directory for git operations */
  workDir?: string
  /** Git authentication token */
  token?: string
  /** Verbose logging */
  verbose?: boolean
}

/**
 * Sync state (persisted for incremental sync)
 */
export interface SyncState {
  /** Repository URL */
  repo: string
  /** Namespace */
  ns: string
  /** Branch */
  branch: string
  /** Last synced commit */
  lastCommit: string
  /** Last sync timestamp */
  lastSyncAt: string
  /** Total files synced */
  totalFiles: number
  /** Total commits synced */
  totalCommits: number
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean
  /** Action ID created for this sync */
  actionId?: string
  /** Repository info */
  repo: RepoInfo
  /** Direction that was synced */
  direction: SyncDirection
  /** Commits processed */
  commits: GitCommit[]
  /** Files synced */
  files: SyncedFile[]
  /** Errors encountered */
  errors: SyncError[]
  /** Statistics */
  stats: SyncStats
  /** New sync state */
  state: SyncState
  /** Dry run flag */
  dryRun: boolean
}

/**
 * Synced file info
 */
export interface SyncedFile {
  /** File path */
  path: string
  /** Change type */
  change: 'added' | 'modified' | 'deleted' | 'renamed'
  /** Entity type (if MDX) */
  type?: string
  /** Entity ID */
  id?: string
  /** Whether successfully synced */
  synced: boolean
  /** Error if failed */
  error?: string
  /** Created ActionObject */
  object?: ActionObject
}

/**
 * Sync error
 */
export interface SyncError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** File path (if file-specific) */
  path?: string
  /** Commit hash (if commit-specific) */
  commit?: string
  /** Stack trace */
  stack?: string
}

/**
 * Sync statistics
 */
export interface SyncStats {
  /** Commits processed */
  commitsProcessed: number
  /** Files scanned */
  filesScanned: number
  /** Files synced */
  filesSynced: number
  /** Files skipped */
  filesSkipped: number
  /** Files failed */
  filesFailed: number
  /** Things created */
  thingsCreated: number
  /** Things updated */
  thingsUpdated: number
  /** Things deleted */
  thingsDeleted: number
  /** Relationships created */
  relationshipsCreated: number
  /** Duration in milliseconds */
  durationMs: number
}

// =============================================================================
// Conflict Types
// =============================================================================

/**
 * Conflict type
 */
export type ConflictType =
  | 'both_modified'   // Changed in both git and DB
  | 'delete_modify'   // Deleted in git, modified in DB
  | 'modify_delete'   // Modified in git, deleted in DB
  | 'type_mismatch'   // Type changed incompatibly

/**
 * Sync conflict
 */
export interface SyncConflict {
  /** Conflict type */
  type: ConflictType
  /** File path */
  path: string
  /** Git version info */
  git: {
    commit: string
    hash: string
    timestamp: string
  }
  /** Database version info */
  db: {
    version: number
    hash: string
    timestamp: string
  }
  /** Suggested resolution */
  suggestion: 'use_git' | 'use_db' | 'merge' | 'manual'
}

/**
 * Conflict resolution
 */
export interface ConflictResolution {
  /** Path being resolved */
  path: string
  /** Resolution strategy */
  strategy: 'use_git' | 'use_db' | 'merge' | 'skip'
  /** Merged content (for merge strategy) */
  mergedContent?: string
}

// =============================================================================
// Provider Interface
// =============================================================================

/**
 * Sync provider interface
 *
 * Abstracts database operations for ClickHouse (local or remote via HTTP).
 */
export interface SyncProvider {
  /** Provider name */
  readonly name: string

  /** Check if provider is connected */
  isConnected(): Promise<boolean>

  /** Get last sync state for a repo */
  getSyncState(repo: string, branch: string): Promise<SyncState | null>

  /** Save sync state */
  saveSyncState(state: SyncState): Promise<void>

  /** Create sync action */
  createSyncAction(options: CreateSyncActionOptions): Promise<string>

  /** Update action progress */
  updateActionProgress(actionId: string, progress: number, total: number): Promise<void>

  /** Complete action */
  completeAction(actionId: string, result: Record<string, unknown>): Promise<void>

  /** Fail action */
  failAction(actionId: string, error: string): Promise<void>

  /** Upsert thing from ActionObject */
  upsertThing(ns: string, object: ActionObject): Promise<void>

  /** Delete thing */
  deleteThing(ns: string, type: string, id: string): Promise<void>

  /** Get thing by URL for conflict detection */
  getThing(url: string): Promise<ThingSnapshot | null>

  /** Emit event */
  emitEvent(event: SyncEvent): Promise<void>
}

/**
 * Options for creating a sync action
 */
export interface CreateSyncActionOptions {
  ns: string
  actor: string
  repo: string
  branch: string
  fromCommit?: string
  toCommit: string
  commitMessage: string
  commitAuthor: string
  commitEmail: string
  commitTs: string
  diff: string
  objects: ActionObject[]
}

/**
 * Thing snapshot for conflict detection
 */
export interface ThingSnapshot {
  url: string
  version: number
  hash: string
  updatedAt: string
}

/**
 * Sync event for audit trail
 */
export interface SyncEvent {
  type: string
  ns: string
  actor: string
  data: Record<string, unknown>
  correlationId?: string
}

// =============================================================================
// Git Executor Interface
// =============================================================================

/**
 * Git executor interface
 *
 * Abstracts git operations for testing and different implementations.
 */
export interface GitExecutor {
  /** Clone a repository */
  clone(url: string, dest: string, options?: CloneOptions): Promise<void>

  /** Fetch updates */
  fetch(repoPath: string, remote?: string): Promise<void>

  /** Checkout branch or commit */
  checkout(repoPath: string, ref: string): Promise<void>

  /** Get repository info */
  getRepoInfo(repoPath: string): Promise<RepoInfo>

  /** Get commit info */
  getCommit(repoPath: string, ref: string): Promise<GitCommit>

  /** Get commits in range */
  getCommits(repoPath: string, from: string, to: string): Promise<GitCommit[]>

  /** Get diff between commits */
  getDiff(repoPath: string, from: string, to: string): Promise<GitDiff>

  /** Get file content at commit */
  getFileContent(repoPath: string, path: string, ref: string): Promise<string>

  /** List files at commit */
  listFiles(repoPath: string, ref: string, pattern?: string): Promise<string[]>

  /** Check if path is a git repo */
  isRepo(path: string): Promise<boolean>

  /** Get current branch */
  getCurrentBranch(repoPath: string): Promise<string>

  /** Get remote URL */
  getRemoteUrl(repoPath: string, remote?: string): Promise<string>
}

/**
 * Clone options
 */
export interface CloneOptions {
  /** Branch to clone */
  branch?: string
  /** Shallow clone depth */
  depth?: number
  /** Single branch only */
  singleBranch?: boolean
  /** Auth token for private repos */
  token?: string
}
