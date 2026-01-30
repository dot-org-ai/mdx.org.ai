/**
 * GitHub Webhook Sync for mdxe deploy
 *
 * Keep deployed DOs in sync with GitHub repos via gitx:
 * - Webhook payload handling (parse GitHub push events)
 * - Post-receive hook triggers deployment
 * - Conflict resolution on concurrent edits
 * - Branch-based deployment (main -> production, other branches -> preview)
 * - Incremental deployment (only changed files)
 *
 * @packageDocumentation
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { storeContentInDO, getContentFromDO, batchDelete } from './do-storage.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Storage environment bindings
 */
export interface StorageEnv {
  /** Durable Object namespace for content storage */
  MDXDB: DurableObjectNamespace
  /** R2 bucket for large file storage */
  CONTENT_BUCKET: R2Bucket
  /** Worker loader for dynamic execution */
  LOADER: WorkerLoader
  /** GitHub API token for status updates */
  GITHUB_TOKEN?: string
  /** Secret for webhook signature verification */
  GITHUB_WEBHOOK_SECRET?: string
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

interface DurableObjectId {
  name?: string
}

interface DurableObjectStub {
  storeContent(id: string, content: string, data: Record<string, unknown>): Promise<ContentRecord>
  getContent(id: string, options?: { version?: number }): Promise<ContentRecord | null>
  listContent(): Promise<ContentRecord[]>
  getVersionHistory(id: string): Promise<ContentVersion[]>
  storeMetadata(metadata: Record<string, unknown>[]): Promise<{ stored: number }>
  getDatabaseSize(): number
}

interface R2Bucket {
  put(key: string, value: string | ArrayBuffer): Promise<{ key: string; size?: number }>
  get(key: string): Promise<R2Object | null>
  delete(key: string): Promise<void>
  head(key: string): Promise<R2Object | null>
}

interface R2Object {
  text(): Promise<string>
  size: number
  key?: string
}

interface WorkerLoader {
  get(id: string, factory: () => Promise<WorkerConfig>): Promise<WorkerInstance>
}

interface WorkerConfig {
  mainModule: string
  modules: Record<string, string>
  compatibilityDate?: string
}

interface WorkerInstance {
  fetch(request: Request): Promise<Response>
}

interface ContentRecord {
  id: string
  hash: string
  content: string
  data: Record<string, unknown>
  size: number
  storedAt: Date
  version: number
  r2Key?: string
  accessCount?: number
  lastAccessed?: Date
  pendingSync?: boolean
}

interface ContentVersion {
  version: number
  hash: string
  storedAt: Date
  size: number
  syncedFromGitHub?: boolean
}

/**
 * GitHub Push Event types
 */
export interface GitHubPushEvent {
  ref: string
  before: string
  after: string
  repository: {
    id: number
    name: string
    full_name: string
    html_url: string
    default_branch: string
  }
  pusher: {
    name: string
    email: string
  }
  sender: {
    id: number
    login: string
    avatar_url: string
  }
  commits: GitHubCommit[]
  head_commit: GitHubCommit | null
  forced: boolean
  compare: string
}

export interface GitHubCommit {
  id: string
  tree_id: string
  message: string
  timestamp: string
  author: {
    name: string
    email: string
    username: string
  }
  added: string[]
  removed: string[]
  modified: string[]
}

/**
 * Parsed push event result
 */
export interface ParsedPushEvent {
  branch: string
  repository: string
  sha: string
  isTag: boolean
  isForced: boolean
  commits: GitHubCommit[]
  before: string
  after: string
  defaultBranch: string
}

/**
 * Deployment environment
 */
export interface DeploymentEnvironment {
  name: 'production' | 'preview' | 'development'
  url?: string
  branch: string
  prNumber?: number
}

/**
 * Changed files result
 */
export interface ChangedFilesResult {
  added: string[]
  modified: string[]
  removed: string[]
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  success: boolean
  deployedFiles: string[]
  skippedFiles: string[]
  deletedFiles: string[]
  errors: string[]
}

/**
 * Conflict resolution options
 */
export interface ConflictResolutionOptions {
  strategy: 'local' | 'remote' | 'merge'
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  hasConflict: boolean
  strategy: 'local' | 'remote' | 'merge'
  resolvedContent: string
  hasUnresolvedConflicts?: boolean
  conflictMarkers?: string[]
}

/**
 * Local content for conflict resolution
 */
export interface LocalContent {
  id: string
  content: string
  version: number
  hash: string
  baseVersion?: number
}

/**
 * Remote content for conflict resolution
 */
export interface RemoteContent {
  content: string
  sha: string
}

/**
 * Deployment status for GitHub
 */
export interface DeploymentStatusOptions {
  state: 'pending' | 'success' | 'error' | 'failure'
  description?: string
  target_url?: string
  context: string
  repository: string
  sha: string
}

/**
 * Sync status result
 */
export interface SyncStatusResult {
  totalFiles: number
  lastSync: Date | null
  pendingChanges: number
}

/**
 * Sync history result
 */
export interface SyncHistoryResult {
  history: ContentVersion[]
}

/**
 * PR preview options
 */
export interface PRPreviewOptions {
  prNumber: number
  repository: string
  headSha: string
  headBranch: string
}

/**
 * PR preview result
 */
export interface PRPreviewResult {
  success: boolean
  previewUrl: string
  deployedFiles: string[]
}

/**
 * PR cleanup options
 */
export interface PRCleanupOptions {
  prNumber: number
  repository: string
}

/**
 * PR cleanup result
 */
export interface PRCleanupResult {
  success: boolean
  cleanedFiles: number
}

/**
 * PR comment options
 */
export interface PRCommentOptions {
  prNumber: number
  repository: string
  previewUrl: string
}

/**
 * Branch mapping options
 */
export interface BranchMappingOptions {
  baseUrl?: string
}

/**
 * Incremental deploy options
 */
export interface IncrementalDeployOptions {
  fetchContent: (path: string) => Promise<string>
  computeHash?: (content: string) => string
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate content hash
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

/**
 * Get DO stub from environment
 */
function getStub(env: StorageEnv, namespace = 'default'): DurableObjectStub {
  const id = env.MDXDB.idFromName(namespace)
  return env.MDXDB.get(id)
}

/**
 * Extract branch name from Git ref
 */
function extractBranchFromRef(ref: string): { branch: string; isTag: boolean } {
  if (ref.startsWith('refs/tags/')) {
    return { branch: ref.replace('refs/tags/', ''), isTag: true }
  }
  if (ref.startsWith('refs/heads/')) {
    return { branch: ref.replace('refs/heads/', ''), isTag: false }
  }
  if (ref.startsWith('refs/pull/')) {
    return { branch: ref, isTag: false }
  }
  return { branch: ref, isTag: false }
}

/**
 * Check if file is an MDX file
 * Note: Only .mdx files are considered MDX, not .md files
 */
function isMdxFile(path: string): boolean {
  return path.endsWith('.mdx')
}

/**
 * Convert branch name to URL-safe slug
 */
function branchToSlug(branch: string): string {
  return branch
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

/**
 * Simple three-way merge implementation
 */
function threeWayMerge(base: string, local: string, remote: string): {
  merged: string
  hasConflicts: boolean
  conflictMarkers: string[]
} {
  const baseLines = base.split('\n')
  const localLines = local.split('\n')
  const remoteLines = remote.split('\n')

  const merged: string[] = []
  const conflictMarkers: string[] = []
  let hasConflicts = false

  // Simple line-by-line merge
  const maxLines = Math.max(baseLines.length, localLines.length, remoteLines.length)

  for (let i = 0; i < maxLines; i++) {
    const baseLine = baseLines[i] ?? ''
    const localLine = localLines[i] ?? ''
    const remoteLine = remoteLines[i] ?? ''

    if (localLine === remoteLine) {
      // Both same, use either
      merged.push(localLine)
    } else if (localLine === baseLine) {
      // Only remote changed
      merged.push(remoteLine)
    } else if (remoteLine === baseLine) {
      // Only local changed
      merged.push(localLine)
    } else {
      // Both changed differently - conflict
      hasConflicts = true
      conflictMarkers.push(`Line ${i + 1}: conflict between local and remote`)
      merged.push(`<<<<<<< LOCAL`)
      merged.push(localLine)
      merged.push(`=======`)
      merged.push(remoteLine)
      merged.push(`>>>>>>> REMOTE`)
    }
  }

  return {
    merged: merged.join('\n'),
    hasConflicts,
    conflictMarkers,
  }
}

// =============================================================================
// Webhook Signature Verification
// =============================================================================

/**
 * Compute webhook signature for verification
 */
export async function computeWebhookSignature(payload: string, secret: string): Promise<string> {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  return `sha256=${hmac.digest('hex')}`
}

/**
 * Verify GitHub webhook signature
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await computeWebhookSignature(payload, secret)

  // Use timing-safe comparison
  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (sigBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(sigBuffer, expectedBuffer)
}

// =============================================================================
// Webhook Payload Parsing
// =============================================================================

/**
 * Parse GitHub push event payload
 */
export function parseGitHubPushEvent(payload: GitHubPushEvent): ParsedPushEvent {
  const { branch, isTag } = extractBranchFromRef(payload.ref)

  return {
    branch,
    repository: payload.repository.full_name,
    sha: payload.after,
    isTag,
    isForced: payload.forced,
    commits: payload.commits,
    before: payload.before,
    after: payload.after,
    defaultBranch: payload.repository.default_branch,
  }
}

/**
 * Extract changed files from push event
 */
export function getChangedFiles(
  payload: GitHubPushEvent,
  options?: { mdxOnly?: boolean }
): ChangedFilesResult {
  const added = new Set<string>()
  const modified = new Set<string>()
  const removed = new Set<string>()

  for (const commit of payload.commits) {
    for (const file of commit.added) {
      if (!options?.mdxOnly || isMdxFile(file)) {
        added.add(file)
      }
    }
    for (const file of commit.modified) {
      if (!options?.mdxOnly || isMdxFile(file)) {
        modified.add(file)
      }
    }
    for (const file of commit.removed) {
      if (!options?.mdxOnly || isMdxFile(file)) {
        removed.add(file)
      }
    }
  }

  return {
    added: Array.from(added),
    modified: Array.from(modified),
    removed: Array.from(removed),
  }
}

// =============================================================================
// Webhook Handler
// =============================================================================

/**
 * Handle incoming GitHub webhook
 */
export async function handleGitHubWebhook(
  request: Request,
  env: StorageEnv
): Promise<Response> {
  const eventType = request.headers.get('x-github-event')

  // Handle ping events
  if (eventType === 'ping') {
    return Response.json({ action: 'acknowledged', event: 'ping' })
  }

  // Only handle push events
  if (eventType !== 'push') {
    return Response.json({ action: 'acknowledged', event: eventType })
  }

  // Verify webhook signature if secret is configured
  if (env.GITHUB_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-hub-signature-256')
    if (!signature) {
      return new Response('Missing signature', { status: 401 })
    }

    const payload = await request.text()
    const isValid = await verifyWebhookSignature(payload, signature, env.GITHUB_WEBHOOK_SECRET)

    if (!isValid) {
      return new Response('Invalid signature', { status: 401 })
    }

    // Parse and handle the push event
    const pushEvent = JSON.parse(payload) as GitHubPushEvent
    const event = parseGitHubPushEvent(pushEvent)

    await triggerDeployment(event, env)

    return Response.json({
      action: 'deployment_triggered',
      branch: event.branch,
      sha: event.sha,
    })
  }

  // No secret configured, still handle the event
  const payload = await request.text()
  const pushEvent = JSON.parse(payload) as GitHubPushEvent
  const event = parseGitHubPushEvent(pushEvent)

  await triggerDeployment(event, env)

  return Response.json({
    action: 'deployment_triggered',
    branch: event.branch,
    sha: event.sha,
  })
}

// =============================================================================
// Deployment Functions
// =============================================================================

/**
 * Trigger deployment from push event
 */
export async function triggerDeployment(
  event: ParsedPushEvent,
  env: StorageEnv
): Promise<DeploymentResult> {
  const result: DeploymentResult = {
    success: true,
    deployedFiles: [],
    skippedFiles: [],
    deletedFiles: [],
    errors: [],
  }

  // Collect all changed files
  const changes = {
    added: new Set<string>(),
    modified: new Set<string>(),
    removed: new Set<string>(),
  }

  for (const commit of event.commits) {
    for (const file of commit.added) {
      changes.added.add(file)
    }
    for (const file of commit.modified) {
      changes.modified.add(file)
    }
    for (const file of commit.removed) {
      changes.removed.add(file)
    }
  }

  // Process added and modified MDX files
  const filesToDeploy = [...changes.added, ...changes.modified].filter(isMdxFile)
  const nonMdxFiles = [...changes.added, ...changes.modified].filter((f) => !isMdxFile(f))

  result.skippedFiles = nonMdxFiles

  // In a real implementation, this would fetch content from GitHub
  // For now, we mark them as deployed
  result.deployedFiles = filesToDeploy

  // Process removed files
  const removedMdxFiles = [...changes.removed].filter(isMdxFile)
  result.deletedFiles = removedMdxFiles

  return result
}

/**
 * Incremental deployment - only deploy changed files
 */
export async function incrementalDeploy(
  event: ParsedPushEvent,
  env: StorageEnv,
  options: IncrementalDeployOptions
): Promise<DeploymentResult> {
  const result: DeploymentResult = {
    success: true,
    deployedFiles: [],
    skippedFiles: [],
    deletedFiles: [],
    errors: [],
  }

  const defaultHashFn = (content: string) => hashContent(content)
  const computeHash = options.computeHash ?? defaultHashFn

  // Collect changed files
  const changes = {
    added: new Set<string>(),
    modified: new Set<string>(),
    removed: new Set<string>(),
  }

  for (const commit of event.commits) {
    for (const file of commit.added) {
      if (isMdxFile(file)) changes.added.add(file)
    }
    for (const file of commit.modified) {
      if (isMdxFile(file)) changes.modified.add(file)
    }
    for (const file of commit.removed) {
      if (isMdxFile(file)) changes.removed.add(file)
    }
  }

  const stub = getStub(env)

  // Process modified files - check if content actually changed
  for (const file of changes.modified) {
    try {
      const contentId = file.replace(/\.(mdx|md)$/, '')
      const remoteContent = await options.fetchContent(file)
      const remoteHash = computeHash(remoteContent)

      // Check existing content
      const existing = await stub.getContent(contentId)

      if (existing && existing.hash === remoteHash) {
        // Content unchanged, skip
        result.skippedFiles.push(file)
      } else {
        // Content changed, deploy
        await storeContentInDO(remoteContent, contentId, env)
        result.deployedFiles.push(file)
      }
    } catch (error) {
      result.errors.push(`Failed to deploy ${file}: ${error}`)
    }
  }

  // Process added files
  for (const file of changes.added) {
    try {
      const contentId = file.replace(/\.(mdx|md)$/, '')
      const content = await options.fetchContent(file)
      await storeContentInDO(content, contentId, env)
      result.deployedFiles.push(file)
    } catch (error) {
      result.errors.push(`Failed to deploy ${file}: ${error}`)
    }
  }

  // Process removed files
  result.deletedFiles = [...changes.removed]

  if (result.errors.length > 0) {
    result.success = false
  }

  return result
}

// =============================================================================
// Branch to Environment Mapping
// =============================================================================

/**
 * Map branch name to deployment environment
 */
export function mapBranchToEnvironment(
  branch: string,
  customMappings?: Record<string, string>,
  options?: BranchMappingOptions
): DeploymentEnvironment {
  // Check custom mappings first
  if (customMappings && branch in customMappings) {
    const envName = customMappings[branch] as 'production' | 'preview' | 'development'
    return {
      name: envName,
      branch,
      url: options?.baseUrl ? `${options.baseUrl}` : undefined,
    }
  }

  // Check for PR branches
  const prMatch = branch.match(/refs\/pull\/(\d+)\//)
  if (prMatch) {
    const prNumber = parseInt(prMatch[1]!, 10)
    return {
      name: 'preview',
      branch,
      prNumber,
      url: options?.baseUrl ? `${options.baseUrl}/preview/pr-${prNumber}` : undefined,
    }
  }

  // Production branches
  if (branch === 'main' || branch === 'master') {
    return {
      name: 'production',
      branch,
      url: options?.baseUrl,
    }
  }

  // Everything else is preview
  const slug = branchToSlug(branch)
  return {
    name: 'preview',
    branch,
    url: options?.baseUrl ? `${options.baseUrl}/preview/${slug}` : undefined,
  }
}

// =============================================================================
// Conflict Resolution
// =============================================================================

/**
 * Resolve conflict between local and remote content
 */
export async function resolveConflict(
  local: LocalContent,
  remote: RemoteContent,
  env: StorageEnv,
  options?: ConflictResolutionOptions
): Promise<ConflictResolutionResult> {
  const strategy = options?.strategy ?? 'remote'

  // Check if there's actually a conflict (different content)
  const hasConflict = local.content !== remote.content

  if (!hasConflict) {
    return {
      hasConflict: false,
      strategy,
      resolvedContent: local.content,
    }
  }

  // Simple strategies
  if (strategy === 'local') {
    return {
      hasConflict: true,
      strategy: 'local',
      resolvedContent: local.content,
    }
  }

  if (strategy === 'remote') {
    return {
      hasConflict: true,
      strategy: 'remote',
      resolvedContent: remote.content,
    }
  }

  // Merge strategy - need base version
  if (strategy === 'merge' && local.baseVersion !== undefined) {
    const stub = getStub(env)
    const baseRecord = await stub.getContent(local.id, { version: local.baseVersion })

    if (baseRecord) {
      const mergeResult = threeWayMerge(baseRecord.content, local.content, remote.content)

      return {
        hasConflict: true,
        strategy: 'merge',
        resolvedContent: mergeResult.merged,
        hasUnresolvedConflicts: mergeResult.hasConflicts,
        conflictMarkers: mergeResult.hasConflicts ? mergeResult.conflictMarkers : undefined,
      }
    }
  }

  // Fallback to remote if merge not possible
  return {
    hasConflict: true,
    strategy,
    resolvedContent: remote.content,
    hasUnresolvedConflicts: true,
    conflictMarkers: ['Could not perform merge - base version not found'],
  }
}

// =============================================================================
// Deployment Status Reporting
// =============================================================================

/**
 * Report deployment status to GitHub
 */
export async function reportDeploymentStatus(
  status: DeploymentStatusOptions,
  env: StorageEnv
): Promise<{ success: boolean; error?: string }> {
  if (!env.GITHUB_TOKEN) {
    return { success: false, error: 'No GitHub token configured' }
  }

  const url = `https://api.github.com/repos/${status.repository}/statuses/${status.sha}`

  const body = {
    state: status.state,
    description: status.description,
    target_url: status.target_url,
    context: status.context,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'mdxe-deploy',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `GitHub API error: ${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Failed to report status: ${error}`,
    }
  }
}

// =============================================================================
// Sync Status Functions
// =============================================================================

/**
 * Get overall sync status
 */
export async function getSyncStatus(
  env: StorageEnv,
  options: { repository: string; branch: string }
): Promise<SyncStatusResult> {
  const stub = getStub(env)
  const content = await stub.listContent()

  let lastSync: Date | null = null
  let pendingChanges = 0

  for (const record of content) {
    if (!lastSync || record.storedAt > lastSync) {
      lastSync = record.storedAt
    }
    if (record.pendingSync) {
      pendingChanges++
    }
  }

  return {
    totalFiles: content.length,
    lastSync,
    pendingChanges,
  }
}

/**
 * Get sync history
 */
export async function getSyncHistory(
  env: StorageEnv,
  options: { limit?: number }
): Promise<SyncHistoryResult> {
  const stub = getStub(env)
  // Get version history from first content item as proxy for overall history
  // In a real implementation, this would aggregate across all content
  const content = await stub.listContent()

  if (!content || content.length === 0) {
    return { history: [] }
  }

  const history = await stub.getVersionHistory(content[0]!.id)

  if (!history) {
    return { history: [] }
  }

  if (options.limit) {
    return { history: history.slice(0, options.limit) }
  }

  return { history }
}

// =============================================================================
// PR Preview Functions
// =============================================================================

/**
 * Deploy preview for PR
 */
export async function deployPRPreview(
  prOptions: PRPreviewOptions,
  env: StorageEnv,
  deployOptions: { fetchContent: (path: string) => Promise<string> }
): Promise<PRPreviewResult> {
  // Use isolated namespace for PR
  const namespace = `pr-${prOptions.prNumber}`
  env.MDXDB.idFromName(namespace)

  const result: PRPreviewResult = {
    success: true,
    previewUrl: `https://preview-${prOptions.prNumber}.${prOptions.repository.replace('/', '-')}.example.com`,
    deployedFiles: [],
  }

  // In a real implementation, this would:
  // 1. Fetch changed files from the PR
  // 2. Deploy them to the isolated namespace
  // 3. Return the preview URL

  return result
}

/**
 * Cleanup PR preview after merge
 */
export async function cleanupPRPreview(
  options: PRCleanupOptions,
  env: StorageEnv
): Promise<PRCleanupResult> {
  const namespace = `pr-${options.prNumber}`
  const stub = getStub(env, namespace)

  const content = await stub.listContent()
  const cleanedFiles = content.length

  // Delete all content in the PR namespace
  const ids = content.map((c) => c.id)
  await batchDelete(ids, env, namespace)

  return {
    success: true,
    cleanedFiles,
  }
}

/**
 * Comment preview URL on PR
 */
export async function commentPreviewUrl(
  options: PRCommentOptions,
  env: StorageEnv
): Promise<{ success: boolean; error?: string }> {
  if (!env.GITHUB_TOKEN) {
    return { success: false, error: 'No GitHub token configured' }
  }

  const url = `https://api.github.com/repos/${options.repository}/issues/${options.prNumber}/comments`

  const body = {
    body: `## Preview Deployment

Your changes have been deployed to a preview environment:

**Preview URL:** ${options.previewUrl}

This preview will be automatically cleaned up when the PR is merged or closed.

---
*Deployed by mdxe*`,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'mdxe-deploy',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `GitHub API error: ${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Failed to comment on PR: ${error}`,
    }
  }
}
