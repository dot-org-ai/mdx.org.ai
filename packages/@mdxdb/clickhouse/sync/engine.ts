/**
 * Sync Engine
 *
 * Bi-directional synchronization between git repositories and the database.
 * Supports both local and remote ClickHouse providers via HTTP.
 */

import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { inferNsFromRepo, parseGitRemote } from '../schema/actions'
import { createGitExecutor } from './executor'
import { parseCommitChanges } from './parser'
import type {
  SyncOptions,
  SyncResult,
  SyncState,
  SyncStats,
  SyncedFile,
  SyncError,
  SyncProvider,
  GitExecutor,
  GitCommit,
  RepoInfo,
  SyncConflict,
  ConflictResolution,
} from './types'
import type { ActionObject } from '../schema/actions'

// =============================================================================
// Sync Engine
// =============================================================================

/**
 * Sync engine configuration
 */
export interface SyncEngineConfig {
  /** Git executor (for testing) */
  executor?: GitExecutor
  /** Database provider */
  provider: SyncProvider
  /** Temporary directory for clones */
  tempDir?: string
  /** Cleanup temp files after sync */
  cleanup?: boolean
  /** Maximum commits to process in one sync */
  maxCommits?: number
}

/**
 * Create a sync engine
 */
export function createSyncEngine(config: SyncEngineConfig): SyncEngine {
  return new SyncEngine(config)
}

/**
 * Sync engine for bi-directional git synchronization
 */
export class SyncEngine {
  private executor: GitExecutor
  private provider: SyncProvider
  private tempDir: string
  private cleanup: boolean
  private maxCommits: number

  constructor(config: SyncEngineConfig) {
    this.executor = config.executor ?? createGitExecutor()
    this.provider = config.provider
    this.tempDir = config.tempDir ?? join(tmpdir(), 'mdxdb-sync')
    this.cleanup = config.cleanup ?? true
    this.maxCommits = config.maxCommits ?? 1000
  }

  /**
   * Main sync method
   */
  async sync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: SyncError[] = []
    const files: SyncedFile[] = []
    const commits: GitCommit[] = []

    // Resolve repo URL
    const repoUrl = this.resolveRepoUrl(options.repo)
    const branch = options.branch ?? 'main'

    // Get or create working directory
    const workDir = await this.ensureWorkDir(repoUrl, options)

    try {
      // Get repo info
      const repoInfo = await this.executor.getRepoInfo(workDir)

      // Determine namespace
      const ns = options.ns ?? repoInfo.ns

      // Get sync state (for incremental sync)
      const syncState = await this.provider.getSyncState(repoUrl, branch)

      // Determine commit range
      const { fromCommit, toCommit } = await this.determineCommitRange(
        workDir,
        options,
        syncState
      )

      // Check if there's anything to sync
      if (fromCommit === toCommit) {
        return this.createResult({
          success: true,
          repo: repoInfo,
          direction: options.direction ?? 'pull',
          commits: [],
          files: [],
          errors: [],
          stats: this.createEmptyStats(Date.now() - startTime),
          state: syncState ?? this.createInitialState(repoUrl, branch, toCommit, ns),
          dryRun: options.dryRun ?? false,
        })
      }

      // Get commits to process
      const commitList = await this.executor.getCommits(workDir, fromCommit, toCommit)

      // Limit commits
      const limitedCommits = commitList.slice(-this.maxCommits)
      commits.push(...limitedCommits)

      if (options.verbose) {
        console.log(`Processing ${limitedCommits.length} commits from ${fromCommit || 'beginning'} to ${toCommit}`)
      }

      // Create sync action
      let actionId: string | undefined
      if (!options.dryRun) {
        const lastCommit = limitedCommits[limitedCommits.length - 1]
        actionId = await this.provider.createSyncAction({
          ns,
          actor: options.actor ?? 'system:sync',
          repo: repoUrl,
          branch,
          fromCommit,
          toCommit,
          commitMessage: lastCommit?.message ?? 'sync',
          commitAuthor: lastCommit?.authorName ?? 'unknown',
          commitEmail: lastCommit?.authorEmail ?? '',
          commitTs: lastCommit?.timestamp ?? new Date().toISOString(),
          diff: '', // Will be populated below
          objects: [], // Will be populated below
        })

        // Emit start event
        await this.provider.emitEvent({
          type: 'Sync.started',
          ns,
          actor: options.actor ?? 'system:sync',
          data: {
            actionId,
            repo: repoUrl,
            branch,
            fromCommit,
            toCommit,
            commits: limitedCommits.length,
          },
        })
      }

      // Process each commit
      const allObjects: ActionObject[] = []

      for (let i = 0; i < limitedCommits.length; i++) {
        const commit = limitedCommits[i]
        if (!commit) continue

        if (options.verbose) {
          console.log(`[${i + 1}/${limitedCommits.length}] Processing commit ${commit.shortHash}: ${commit.message}`)
        }

        try {
          // Get diff for this commit
          const parentCommit = commit.parents[0] ?? ''
          const diff = await this.executor.getDiff(workDir, parentCommit, commit.hash)

          // Parse changes into ActionObjects
          const objects = await parseCommitChanges(
            commit,
            diff.files,
            this.executor,
            workDir,
            {
              ns,
              include: options.include,
              exclude: options.exclude,
              extractRelationships: true,
              extractSearch: true,
            }
          )

          allObjects.push(...objects)

          // Track files
          for (const obj of objects) {
            files.push({
              path: obj.path,
              change: obj.change ?? 'modified',
              type: obj.type,
              id: obj.id,
              synced: !options.dryRun,
              object: obj,
            })
          }

          // Update progress
          if (actionId && !options.dryRun) {
            await this.provider.updateActionProgress(
              actionId,
              i + 1,
              limitedCommits.length
            )
          }
        } catch (err) {
          const error = err as Error
          errors.push({
            code: 'COMMIT_PROCESS_ERROR',
            message: error.message,
            commit: commit.hash,
            stack: error.stack,
          })
        }
      }

      // Apply changes to database
      if (!options.dryRun && allObjects.length > 0) {
        const applyResult = await this.applyChanges(ns, allObjects, options)
        errors.push(...applyResult.errors)

        // Update files with apply results
        for (const file of files) {
          const result = applyResult.results.get(file.path)
          if (result) {
            file.synced = result.success
            file.error = result.error
          }
        }
      }

      // Calculate stats
      const stats = this.calculateStats(files, commits, Date.now() - startTime)

      // Save sync state
      const newState: SyncState = {
        repo: repoUrl,
        ns,
        branch,
        lastCommit: toCommit,
        lastSyncAt: new Date().toISOString(),
        totalFiles: (syncState?.totalFiles ?? 0) + stats.filesSynced,
        totalCommits: (syncState?.totalCommits ?? 0) + stats.commitsProcessed,
      }

      if (!options.dryRun) {
        await this.provider.saveSyncState(newState)

        // Complete action
        if (actionId) {
          if (errors.length > 0) {
            await this.provider.failAction(actionId, errors.map((e) => e.message).join('; '))
          } else {
            await this.provider.completeAction(actionId, { stats })
          }

          // Emit completion event
          await this.provider.emitEvent({
            type: errors.length > 0 ? 'Sync.failed' : 'Sync.completed',
            ns,
            actor: options.actor ?? 'system:sync',
            data: {
              actionId,
              stats,
              errors: errors.length,
            },
            correlationId: actionId,
          })
        }
      }

      return this.createResult({
        success: errors.length === 0,
        actionId,
        repo: repoInfo,
        direction: options.direction ?? 'pull',
        commits,
        files,
        errors,
        stats,
        state: newState,
        dryRun: options.dryRun ?? false,
      })
    } finally {
      // Cleanup temp directory
      if (this.cleanup && workDir.startsWith(this.tempDir)) {
        try {
          rmSync(workDir, { recursive: true, force: true })
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Check for conflicts before sync
   */
  async checkConflicts(options: SyncOptions): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = []

    // Get working directory
    const repoUrl = this.resolveRepoUrl(options.repo)
    const workDir = await this.ensureWorkDir(repoUrl, options)
    const repoInfo = await this.executor.getRepoInfo(workDir)
    const ns = options.ns ?? repoInfo.ns

    // Get sync state
    const syncState = await this.provider.getSyncState(repoUrl, options.branch ?? 'main')

    if (!syncState) {
      return conflicts // No previous sync, no conflicts
    }

    // Get files changed since last sync
    const { toCommit } = await this.determineCommitRange(workDir, options, syncState)
    const diff = await this.executor.getDiff(workDir, syncState.lastCommit, toCommit)

    // Check each changed file against DB
    for (const file of diff.files) {
      if (file.status === 'deleted') continue

      const type = this.inferTypeFromPath(file.path)
      const id = this.inferIdFromPath(file.path)
      const url = `${ns}/${type}/${id}`

      const dbThing = await this.provider.getThing(url)
      if (!dbThing) continue

      // Check if DB version was modified after last sync
      const dbModifiedAt = new Date(dbThing.updatedAt)
      const lastSyncAt = new Date(syncState.lastSyncAt)

      if (dbModifiedAt > lastSyncAt) {
        // Potential conflict - both modified
        const gitContent = await this.executor.getFileContent(workDir, file.path, toCommit)
        const gitHash = this.hashContent(gitContent)

        if (gitHash !== dbThing.hash) {
          conflicts.push({
            type: 'both_modified',
            path: file.path,
            git: {
              commit: toCommit,
              hash: gitHash,
              timestamp: new Date().toISOString(), // Would need actual commit timestamp
            },
            db: {
              version: dbThing.version,
              hash: dbThing.hash,
              timestamp: dbThing.updatedAt,
            },
            suggestion: 'merge',
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Resolve conflicts and continue sync
   */
  async resolveAndSync(
    options: SyncOptions,
    resolutions: ConflictResolution[]
  ): Promise<SyncResult> {
    // Apply resolutions
    // For now, just proceed with sync using force flag
    return this.sync({ ...options, force: true })
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Resolve repo URL from shorthand
   */
  private resolveRepoUrl(repo: string): string {
    // Already a full URL
    if (repo.startsWith('https://') || repo.startsWith('git@')) {
      return repo
    }

    // Local path
    if (repo.startsWith('/') || repo.startsWith('./') || repo.startsWith('../')) {
      return repo
    }

    // GitHub shorthand: org/repo or user/repo
    if (repo.match(/^[\w-]+\/[\w-]+$/)) {
      return `https://github.com/${repo}.git`
    }

    return repo
  }

  /**
   * Ensure working directory exists
   */
  private async ensureWorkDir(repoUrl: string, options: SyncOptions): Promise<string> {
    // If explicit work dir provided, use it
    if (options.workDir) {
      if (await this.executor.isRepo(options.workDir)) {
        // Only fetch if repo has a remote
        try {
          await this.executor.getRemoteUrl(options.workDir)
          await this.executor.fetch(options.workDir)
        } catch {
          // No remote, skip fetch
        }
        if (options.branch) {
          try {
            await this.executor.checkout(options.workDir, options.branch)
          } catch {
            // Branch may not exist
          }
        }
        return options.workDir
      }
    }

    // Local repo path
    if (repoUrl.startsWith('/') && (await this.executor.isRepo(repoUrl))) {
      return repoUrl
    }

    // Create temp directory and clone
    const repoName = this.extractRepoName(repoUrl)
    const workDir = join(this.tempDir, `${repoName}-${Date.now()}`)

    mkdirSync(workDir, { recursive: true })

    await this.executor.clone(repoUrl, workDir, {
      branch: options.branch,
      depth: options.depth,
      singleBranch: true,
      token: options.token,
    })

    return workDir
  }

  /**
   * Determine commit range for sync
   */
  private async determineCommitRange(
    workDir: string,
    options: SyncOptions,
    syncState: SyncState | null
  ): Promise<{ fromCommit: string; toCommit: string }> {
    // Get current HEAD
    const head = await this.executor.getCommit(workDir, 'HEAD')
    const toCommit = options.toCommit ?? head.hash

    // Explicit from commit
    if (options.fromCommit) {
      return { fromCommit: options.fromCommit, toCommit }
    }

    // Full sync mode
    if (options.mode === 'full') {
      return { fromCommit: '', toCommit }
    }

    // Incremental from last sync
    if (syncState?.lastCommit) {
      return { fromCommit: syncState.lastCommit, toCommit }
    }

    // First sync - start from beginning
    return { fromCommit: '', toCommit }
  }

  /**
   * Apply changes to database
   */
  private async applyChanges(
    ns: string,
    objects: ActionObject[],
    options: SyncOptions
  ): Promise<{
    results: Map<string, { success: boolean; error?: string }>
    errors: SyncError[]
  }> {
    const results = new Map<string, { success: boolean; error?: string }>()
    const errors: SyncError[] = []

    for (const obj of objects) {
      try {
        if (obj.operation === 'delete') {
          await this.provider.deleteThing(ns, obj.type, obj.id ?? '')
        } else {
          await this.provider.upsertThing(ns, obj)
        }
        results.set(obj.path, { success: true })
      } catch (err) {
        const error = err as Error
        results.set(obj.path, { success: false, error: error.message })
        errors.push({
          code: 'APPLY_ERROR',
          message: error.message,
          path: obj.path,
          stack: error.stack,
        })
      }
    }

    return { results, errors }
  }

  /**
   * Calculate sync statistics
   */
  private calculateStats(
    files: SyncedFile[],
    commits: GitCommit[],
    durationMs: number
  ): SyncStats {
    return {
      commitsProcessed: commits.length,
      filesScanned: files.length,
      filesSynced: files.filter((f) => f.synced).length,
      filesSkipped: files.filter((f) => !f.synced && !f.error).length,
      filesFailed: files.filter((f) => !!f.error).length,
      thingsCreated: files.filter((f) => f.synced && f.change === 'added').length,
      thingsUpdated: files.filter(
        (f) => f.synced && (f.change === 'modified' || f.change === 'renamed')
      ).length,
      thingsDeleted: files.filter((f) => f.synced && f.change === 'deleted').length,
      relationshipsCreated: 0, // Would need to track from pipeline
      durationMs,
    }
  }

  /**
   * Create empty stats
   */
  private createEmptyStats(durationMs: number): SyncStats {
    return {
      commitsProcessed: 0,
      filesScanned: 0,
      filesSynced: 0,
      filesSkipped: 0,
      filesFailed: 0,
      thingsCreated: 0,
      thingsUpdated: 0,
      thingsDeleted: 0,
      relationshipsCreated: 0,
      durationMs,
    }
  }

  /**
   * Create initial sync state
   */
  private createInitialState(
    repo: string,
    branch: string,
    commit: string,
    ns: string
  ): SyncState {
    return {
      repo,
      ns,
      branch,
      lastCommit: commit,
      lastSyncAt: new Date().toISOString(),
      totalFiles: 0,
      totalCommits: 0,
    }
  }

  /**
   * Create result object
   */
  private createResult(
    partial: Omit<SyncResult, 'repo'> & { repo: RepoInfo }
  ): SyncResult {
    return partial as SyncResult
  }

  /**
   * Extract repo name from URL
   */
  private extractRepoName(url: string): string {
    const parsed = parseGitRemote(url)
    return `${parsed.org}-${parsed.repo}`
  }

  /**
   * Infer type from path (delegated)
   */
  private inferTypeFromPath(path: string): string {
    // Import from parser to avoid duplication
    const parts = path.split('/')
    if (parts.length >= 2) {
      const dir = parts[parts.length - 2] ?? 'Document'
      return dir.charAt(0).toUpperCase() + dir.slice(1).toLowerCase()
    }
    return 'Document'
  }

  /**
   * Infer ID from path (delegated)
   */
  private inferIdFromPath(path: string): string {
    const parts = path.split('/')
    const filename = parts[parts.length - 1] ?? ''
    return filename.replace(/\.(mdx?|md)$/i, '')
  }

  /**
   * Hash content for comparison
   */
  private hashContent(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }
}

// =============================================================================
// CLI Helper
// =============================================================================

/**
 * Parse sync command arguments
 */
export function parseSyncArgs(args: string[]): SyncOptions {
  const options: SyncOptions = {
    repo: '',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg) continue

    // Positional: repo
    if (!arg.startsWith('-') && !options.repo) {
      options.repo = arg
      continue
    }

    switch (arg) {
      case '--branch':
      case '-b':
        options.branch = args[++i] ?? ''
        break
      case '--ns':
      case '--namespace':
        options.ns = args[++i] ?? ''
        break
      case '--from':
        options.fromCommit = args[++i] ?? ''
        break
      case '--to':
        options.toCommit = args[++i] ?? ''
        break
      case '--mode':
        options.mode = (args[++i] ?? 'incremental') as SyncOptions['mode']
        break
      case '--direction':
        options.direction = (args[++i] ?? 'pull') as SyncOptions['direction']
        break
      case '--include':
        options.include = options.include ?? []
        options.include.push(args[++i] ?? '')
        break
      case '--exclude':
        options.exclude = options.exclude ?? []
        options.exclude.push(args[++i] ?? '')
        break
      case '--dry-run':
      case '-n':
        options.dryRun = true
        break
      case '--force':
      case '-f':
        options.force = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--depth':
        options.depth = parseInt(args[++i] ?? '0', 10)
        break
      case '--actor':
        options.actor = args[++i] ?? ''
        break
      case '--token':
        options.token = args[++i] ?? ''
        break
    }
  }

  return options
}
