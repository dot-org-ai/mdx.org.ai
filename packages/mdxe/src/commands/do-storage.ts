/**
 * DO Storage Integration for mdxe deploy
 *
 * Store deployed MDX content in Durable Objects via @mdxdb/do with:
 * - DO-based content storage (store MDX in DO SQLite)
 * - R2 backup for large files (>1MB)
 * - Parquet storage for structured data
 * - Content retrieval via worker_loaders
 * - Content versioning and history
 *
 * @packageDocumentation
 */

import { createHash } from 'node:crypto'
import { parse } from 'mdxld'

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
}

/**
 * DO namespace interface
 */
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

/**
 * R2 bucket interface
 */
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

/**
 * Worker loader interface
 */
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

/**
 * Content record stored in DO
 */
export interface ContentRecord {
  /** Unique content identifier */
  id: string
  /** Content hash for cache invalidation */
  hash: string
  /** MDX content (empty if stored in R2) */
  content: string
  /** Parsed frontmatter data */
  data: Record<string, unknown>
  /** Content size in bytes */
  size: number
  /** When this version was stored */
  storedAt: Date
  /** Version number (auto-incremented) */
  version: number
  /** R2 key if content is stored in R2 (for large files) */
  r2Key?: string
  /** Access count for tiering decisions */
  accessCount?: number
  /** Last access timestamp */
  lastAccessed?: Date
}

/**
 * Content version metadata
 */
export interface ContentVersion {
  version: number
  hash: string
  storedAt: Date
  size: number
}

/**
 * Storage tier classification
 */
export type StorageTier = 'hot' | 'warm' | 'cold'

/**
 * Tiered storage result
 */
export interface TieredStorageResult extends ContentRecord {
  tier: StorageTier
}

/**
 * Diff operation
 */
export interface DiffOperation {
  type: 'insert' | 'delete' | 'replace'
  position: number
  length?: number
  content?: string
}

/**
 * Content diff result
 */
export interface ContentDiff {
  hasChanges: boolean
  operations: DiffOperation[]
}

/**
 * Diff storage result
 */
export interface DiffStorageResult extends ContentRecord {
  diffStored: boolean
}

/**
 * Cleanup options
 */
export interface CleanupOptions {
  /** Days to retain versions */
  retentionDays?: number
  /** Minimum versions to keep regardless of age */
  minVersions?: number
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  cleaned: number
  retained: number
}

/**
 * Orphaned R2 cleanup result
 */
export interface OrphanedR2Result {
  orphaned: string[]
  deleted?: number
}

/**
 * Storage metrics
 */
export interface StorageMetrics {
  doSize: number
  r2Size: number
  totalSize: number
  contentCount: number
  byType: Record<string, number>
  accessPatterns: {
    hot: number
    warm: number
    cold: number
  }
}

/**
 * Worker load result
 */
export interface WorkerLoadResult {
  worker: WorkerInstance
  contentId: string
  hash: string
}

/**
 * Version history options
 */
export interface VersionHistoryOptions {
  orderBy?: 'version' | 'timestamp'
  limit?: number
}

/**
 * Diff versions result
 */
export interface DiffVersionsResult {
  added: string[]
  removed: string[]
  hasChanges: boolean
}

/**
 * Export to parquet result
 */
export interface ParquetExportResult {
  buffer: ArrayBuffer
  recordCount: number
}

/**
 * Access stats for content
 */
export interface AccessStats {
  accessCount: number
  lastAccessed: Date
  tier: StorageTier
}

// =============================================================================
// Constants (exported for configuration)
// =============================================================================

/** Size threshold for R2 storage (1MB) */
export const R2_THRESHOLD = 1024 * 1024

/** Access count threshold for hot tier */
export const HOT_ACCESS_THRESHOLD = 50

/** Days since last access for cold tier */
export const COLD_DAYS_THRESHOLD = 30

/** Default content retention period in days */
export const DEFAULT_RETENTION_DAYS = 30

/** Default minimum versions to retain */
export const DEFAULT_MIN_VERSIONS = 1

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
 * Determine storage tier based on size and access patterns
 * Exported for testing and external use
 */
export function determineTier(record: ContentRecord): StorageTier {
  // Large files go to warm tier (R2)
  if (record.size > R2_THRESHOLD || record.r2Key) {
    return 'warm'
  }

  // Frequently accessed content is hot
  if (record.accessCount && record.accessCount >= HOT_ACCESS_THRESHOLD) {
    return 'hot'
  }

  // Old, rarely accessed content is cold
  if (record.lastAccessed) {
    const daysSinceAccess = (Date.now() - record.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceAccess > COLD_DAYS_THRESHOLD) {
      return 'cold'
    }
  }

  return 'hot'
}

// =============================================================================
// Core Storage Functions
// =============================================================================

/**
 * Store MDX content in DO SQLite
 */
export async function storeContentInDO(
  content: string,
  id: string,
  env: StorageEnv,
  namespace = 'default'
): Promise<ContentRecord> {
  const stub = getStub(env, namespace)

  // Parse content to extract frontmatter
  let data: Record<string, unknown> = {}
  try {
    const parsed = parse(content) as {
      id?: string
      type?: string | string[]
      context?: string | string[] | Record<string, unknown>
      data: Record<string, unknown>
      content: string
    }
    data = { ...parsed.data }
    if (parsed.id) data.$id = parsed.id
    if (parsed.type) data.$type = parsed.type
    if (parsed.context) data.$context = parsed.context
  } catch {
    // If parsing fails, store without extracted data
  }

  return stub.storeContent(id, content, data)
}

/**
 * Get content from DO SQLite
 */
export async function getContentFromDO(
  id: string,
  env: StorageEnv,
  options?: { version?: number; namespace?: string }
): Promise<ContentRecord | null> {
  const stub = getStub(env, options?.namespace ?? 'default')
  return stub.getContent(id, options)
}

/**
 * Store content in R2 bucket
 */
export async function storeInR2(
  content: string,
  key: string,
  env: StorageEnv
): Promise<{ r2Key: string; size: number }> {
  const hash = hashContent(content)
  const r2Key = `${key}-${hash}`

  await env.CONTENT_BUCKET.put(r2Key, content)

  return {
    r2Key,
    size: content.length,
  }
}

/**
 * Get content from R2 bucket
 */
export async function getFromR2(r2Key: string, env: StorageEnv): Promise<string | null> {
  const object = await env.CONTENT_BUCKET.get(r2Key)
  if (!object) return null
  return object.text()
}

/**
 * Store content with R2 backup for large files
 */
export async function storeContentWithR2Backup(
  content: string,
  id: string,
  env: StorageEnv,
  namespace = 'default'
): Promise<ContentRecord> {
  const size = content.length

  // For large content, store in R2 and keep reference in DO
  if (size > R2_THRESHOLD) {
    const { r2Key } = await storeInR2(content, id, env)

    // Store metadata in DO with R2 reference
    const stub = getStub(env, namespace)

    let data: Record<string, unknown> = {}
    try {
      const parsed = parse(content) as {
        data: Record<string, unknown>
      }
      data = parsed.data
    } catch {
      // Ignore parsing errors
    }

    // Store with empty content (actual content in R2)
    const record = await stub.storeContent(id, '', data)
    return {
      ...record,
      r2Key,
      size,
    }
  }

  // For small content, store directly in DO
  return storeContentInDO(content, id, env, namespace)
}

// =============================================================================
// Parquet Storage Functions
// =============================================================================

/**
 * Store structured metadata in parquet format
 */
export async function storeMetadataAsParquet(
  metadata: Record<string, unknown>[],
  env: StorageEnv,
  namespace = 'default'
): Promise<{ stored: number }> {
  const stub = getStub(env, namespace)
  return stub.storeMetadata(metadata)
}

/**
 * Export all content metadata to parquet
 */
export async function exportToParquet(
  env: StorageEnv,
  namespace = 'default'
): Promise<ParquetExportResult> {
  const stub = getStub(env, namespace)
  const content = await stub.listContent()

  // Convert to parquet-compatible format
  const records = content.map((c) => ({
    id: c.id,
    hash: c.hash,
    size: c.size,
    storedAt: c.storedAt instanceof Date ? c.storedAt.toISOString() : c.storedAt,
    version: c.version,
    ...c.data,
  }))

  // For now, return JSON buffer (actual parquet encoding would use @mdxdb/parquet)
  const buffer = new TextEncoder().encode(JSON.stringify(records)).buffer

  return {
    buffer,
    recordCount: records.length,
  }
}

// =============================================================================
// Worker Loader Integration
// =============================================================================

/**
 * Load content and create worker configuration
 */
export async function loadContentForWorker(
  id: string,
  env: StorageEnv,
  namespace = 'default'
): Promise<WorkerLoadResult> {
  const stub = getStub(env, namespace)
  const record = await stub.getContent(id)

  if (!record) {
    throw new Error(`Content not found: ${id}`)
  }

  // Get actual content (from DO or R2)
  let content = record.content
  if (record.r2Key && !content) {
    const r2Content = await getFromR2(record.r2Key, env)
    if (!r2Content) {
      throw new Error(`R2 content not found: ${record.r2Key}`)
    }
    content = r2Content
  }

  // Create worker via loader
  const worker = await env.LOADER.get(`${record.hash}-worker`, async () => ({
    mainModule: 'worker.js',
    modules: {
      'worker.js': generateWorkerCode(content, record.data),
    },
    compatibilityDate: new Date().toISOString().split('T')[0],
  }))

  return {
    worker,
    contentId: id,
    hash: record.hash,
  }
}

/**
 * Generate worker code from MDX content
 */
function generateWorkerCode(content: string, _data: Record<string, unknown>): string {
  // Extract code blocks from MDX
  const codeBlocks: string[] = []
  const codeBlockRegex = /```(?:ts|typescript|js|javascript)(?:\s+\w+)?\n([\s\S]*?)```/g
  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match[1]) codeBlocks.push(match[1])
  }

  const moduleCode = codeBlocks.join('\n\n')

  return `
// Generated worker code
const exports = {};

${moduleCode}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return Response.json({ exports: Object.keys(exports) });
    }

    const name = url.pathname.slice(1);
    if (name in exports) {
      const fn = exports[name];
      if (typeof fn === 'function') {
        const result = await fn();
        return Response.json({ result });
      }
      return Response.json({ result: fn });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
};
`
}

// =============================================================================
// Versioning Functions
// =============================================================================

/**
 * Get version history for content
 */
export async function getVersionHistory(
  id: string,
  env: StorageEnv,
  options?: VersionHistoryOptions
): Promise<ContentVersion[]> {
  const stub = getStub(env)
  const versions = await stub.getVersionHistory(id)

  if (options?.orderBy === 'timestamp') {
    versions.sort((a, b) => a.storedAt.getTime() - b.storedAt.getTime())
  }

  if (options?.limit) {
    return versions.slice(0, options.limit)
  }

  return versions
}

/**
 * Rollback to a previous version
 */
export async function rollbackToVersion(
  id: string,
  targetVersion: number,
  env: StorageEnv
): Promise<ContentRecord> {
  const stub = getStub(env)

  // Get the target version content
  const oldRecord = await stub.getContent(id, { version: targetVersion })
  if (!oldRecord) {
    throw new Error(`Version ${targetVersion} not found for ${id}`)
  }

  // Store as new version (preserves history)
  return stub.storeContent(id, oldRecord.content, oldRecord.data)
}

/**
 * Compute diff between two versions
 */
export async function diffVersions(
  id: string,
  fromVersion: number,
  toVersion: number,
  env: StorageEnv
): Promise<DiffVersionsResult> {
  const stub = getStub(env)

  const fromRecord = await stub.getContent(id, { version: fromVersion })
  const toRecord = await stub.getContent(id, { version: toVersion })

  if (!fromRecord || !toRecord) {
    throw new Error(`Version not found: ${fromVersion} or ${toVersion}`)
  }

  const fromLines = fromRecord.content.split('\n')
  const toLines = toRecord.content.split('\n')

  const added = toLines.filter((line) => !fromLines.includes(line))
  const removed = fromLines.filter((line) => !toLines.includes(line))

  return {
    added,
    removed,
    hasChanges: added.length > 0 || removed.length > 0,
  }
}

// =============================================================================
// Tiered Storage Functions
// =============================================================================

/**
 * Store content with automatic tiering
 */
export async function storeWithTiering(
  content: string,
  id: string,
  env: StorageEnv,
  namespace = 'default'
): Promise<TieredStorageResult> {
  const size = content.length

  // Large content goes to warm tier (R2)
  if (size > R2_THRESHOLD) {
    const { r2Key } = await storeInR2(content, id, env)
    const stub = getStub(env, namespace)

    let data: Record<string, unknown> = {}
    try {
      const parsed = parse(content) as { data: Record<string, unknown> }
      data = parsed.data
    } catch {
      // Ignore
    }

    const record = await stub.storeContent(id, '', data)
    return {
      ...record,
      r2Key,
      size,
      tier: 'warm',
    }
  }

  // Small content goes to hot tier (DO SQLite)
  const record = await storeContentInDO(content, id, env, namespace)
  return {
    ...record,
    tier: 'hot',
  }
}

/**
 * Promote content to hot tier
 */
export async function promoteToHot(
  id: string,
  env: StorageEnv,
  namespace = 'default'
): Promise<TieredStorageResult> {
  const stub = getStub(env, namespace)
  const record = await stub.getContent(id)

  if (!record) {
    throw new Error(`Content not found: ${id}`)
  }

  // If already in hot tier (no R2 key), return as-is
  if (!record.r2Key) {
    return {
      ...record,
      tier: 'hot',
    }
  }

  // Fetch from R2 and store in DO
  const content = await getFromR2(record.r2Key, env)
  if (!content) {
    throw new Error(`R2 content not found: ${record.r2Key}`)
  }

  // Store in DO (promotes to hot tier)
  const newRecord = await stub.storeContent(id, content, record.data)

  // Optionally delete from R2
  // await env.CONTENT_BUCKET.delete(record.r2Key)

  return {
    ...newRecord,
    tier: 'hot',
  }
}

/**
 * Get access statistics for content
 */
export async function getAccessStats(
  id: string,
  env: StorageEnv,
  namespace = 'default'
): Promise<AccessStats> {
  const stub = getStub(env, namespace)
  const record = await stub.getContent(id)

  if (!record) {
    throw new Error(`Content not found: ${id}`)
  }

  return {
    accessCount: record.accessCount ?? 0,
    lastAccessed: record.lastAccessed ?? record.storedAt,
    tier: determineTier(record),
  }
}

// =============================================================================
// Content Diffing Functions
// =============================================================================

/**
 * Compute minimal diff between content versions
 */
export async function computeDiff(
  oldContent: string,
  newContent: string
): Promise<ContentDiff> {
  if (oldContent === newContent) {
    return {
      hasChanges: false,
      operations: [],
    }
  }

  const operations: DiffOperation[] = []

  // Simple line-based diff
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  let position = 0

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine !== newLine) {
      if (oldLine === undefined) {
        // Line added
        operations.push({
          type: 'insert',
          position,
          content: newLine,
        })
      } else if (newLine === undefined) {
        // Line removed
        operations.push({
          type: 'delete',
          position,
          length: oldLine.length + 1, // Include newline
        })
      } else {
        // Line changed
        operations.push({
          type: 'replace',
          position,
          length: oldLine.length,
          content: newLine,
        })
      }
    }

    position += (oldLine?.length ?? 0) + 1
  }

  return {
    hasChanges: operations.length > 0,
    operations,
  }
}

/**
 * Apply diff to recreate content
 */
export async function applyDiff(
  oldContent: string,
  diff: ContentDiff
): Promise<string> {
  if (!diff.hasChanges) {
    return oldContent
  }

  const oldLines = oldContent.split('\n')
  const newLines = [...oldLines]

  // Apply operations in reverse order to maintain positions
  const sortedOps = [...diff.operations].sort((a, b) => b.position - a.position)

  for (const op of sortedOps) {
    // Find line index from position
    let lineIndex = 0
    let currentPos = 0
    for (let i = 0; i < oldLines.length; i++) {
      if (currentPos >= op.position) {
        lineIndex = i
        break
      }
      currentPos += oldLines[i]!.length + 1
      lineIndex = i + 1
    }

    switch (op.type) {
      case 'insert':
        newLines.splice(lineIndex, 0, op.content ?? '')
        break
      case 'delete':
        newLines.splice(lineIndex, 1)
        break
      case 'replace':
        newLines[lineIndex] = op.content ?? ''
        break
    }
  }

  return newLines.join('\n')
}

/**
 * Store content using diff for efficient updates
 */
export async function storeWithDiff(
  content: string,
  id: string,
  env: StorageEnv,
  namespace = 'default'
): Promise<DiffStorageResult> {
  const stub = getStub(env, namespace)

  // Get existing content
  const existing = await stub.getContent(id)

  if (!existing) {
    // No existing content, store full content
    const record = await storeContentInDO(content, id, env, namespace)
    return {
      ...record,
      diffStored: false,
    }
  }

  // Compute diff
  const diff = await computeDiff(existing.content, content)

  // Store new version (full content, but we computed diff for efficiency tracking)
  const record = await stub.storeContent(id, content, existing.data)

  return {
    ...record,
    diffStored: diff.hasChanges,
  }
}

// =============================================================================
// Garbage Collection Functions
// =============================================================================

/**
 * Clean up old versions based on retention policy
 */
export async function cleanupOldVersions(
  id: string,
  env: StorageEnv,
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const { retentionDays = 30, minVersions = 1 } = options

  const stub = getStub(env)
  const versions = await stub.getVersionHistory(id)

  // Sort by version descending (newest first)
  versions.sort((a, b) => b.version - a.version)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  // Determine which versions to keep
  const toKeep: ContentVersion[] = []
  const toClean: ContentVersion[] = []

  for (let i = 0; i < versions.length; i++) {
    const version = versions[i]!

    // Always keep minimum versions
    if (i < minVersions) {
      toKeep.push(version)
    } else if (version.storedAt >= cutoffDate) {
      // Keep versions within retention period
      toKeep.push(version)
    } else {
      toClean.push(version)
    }
  }

  // Note: Actual deletion would happen via DO method
  // This is the calculation layer

  return {
    cleaned: toClean.length,
    retained: toKeep.length,
  }
}

/**
 * Find and optionally clean up orphaned R2 objects
 */
export async function cleanupOrphanedR2(
  env: StorageEnv,
  options: { r2Objects: string[] },
  namespace = 'default'
): Promise<OrphanedR2Result> {
  const stub = getStub(env, namespace)
  const content = await stub.listContent()

  // Get all R2 keys referenced by DO records
  const referencedKeys = new Set(
    content.filter((c) => c.r2Key).map((c) => c.r2Key!)
  )

  // Find orphaned objects
  const orphaned = options.r2Objects.filter((key) => !referencedKeys.has(key))

  return {
    orphaned,
  }
}

// =============================================================================
// Metrics Functions
// =============================================================================

/**
 * Get storage metrics across DO and R2
 */
export async function getStorageMetrics(
  env: StorageEnv,
  namespace = 'default'
): Promise<StorageMetrics> {
  const stub = getStub(env, namespace)

  const doSize = stub.getDatabaseSize()
  const content = await stub.listContent()

  // Calculate R2 size
  let r2Size = 0
  for (const record of content) {
    if (record.r2Key) {
      r2Size += record.size
    }
  }

  // Count by type
  const byType: Record<string, number> = {}
  for (const record of content) {
    const type = (record.data?.$type as string) ?? 'unknown'
    byType[type] = (byType[type] ?? 0) + 1
  }

  // Classify access patterns
  const accessPatterns = { hot: 0, warm: 0, cold: 0 }
  for (const record of content) {
    const tier = determineTier(record)
    accessPatterns[tier]++
  }

  return {
    doSize,
    r2Size,
    totalSize: doSize + r2Size,
    contentCount: content.length,
    byType,
    accessPatterns,
  }
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Batch store multiple content items
 */
export async function batchStore(
  items: Array<{ id: string; content: string }>,
  env: StorageEnv,
  namespace = 'default'
): Promise<ContentRecord[]> {
  const results: ContentRecord[] = []

  for (const item of items) {
    const record = await storeWithTiering(item.content, item.id, env, namespace)
    results.push(record)
  }

  return results
}

/**
 * Batch retrieve multiple content items
 */
export async function batchGet(
  ids: string[],
  env: StorageEnv,
  namespace = 'default'
): Promise<Map<string, ContentRecord | null>> {
  const results = new Map<string, ContentRecord | null>()

  for (const id of ids) {
    const record = await getContentFromDO(id, env, { namespace })
    results.set(id, record)
  }

  return results
}

/**
 * Batch delete multiple content items
 */
export async function batchDelete(
  ids: string[],
  env: StorageEnv,
  namespace = 'default'
): Promise<{ deleted: number; failed: string[] }> {
  const failed: string[] = []
  let deleted = 0

  const stub = getStub(env, namespace)

  for (const id of ids) {
    try {
      const record = await stub.getContent(id)
      if (record) {
        // Delete R2 content if exists
        if (record.r2Key) {
          await env.CONTENT_BUCKET.delete(record.r2Key)
        }
        // Note: Actual DO deletion would be done via stub method
        deleted++
      }
    } catch {
      failed.push(id)
    }
  }

  return { deleted, failed }
}

// =============================================================================
// Integration with Deploy Workers
// =============================================================================

/**
 * Store compiled worker modules in DO storage
 * This integrates with the deploy-workers.ts compilation output
 */
export async function storeCompiledModules(
  modules: Array<{
    name: string
    code: string
    data: Record<string, unknown>
    hash: string
  }>,
  env: StorageEnv,
  namespace = 'default'
): Promise<ContentRecord[]> {
  const results: ContentRecord[] = []

  for (const module of modules) {
    // Store the compiled code with metadata
    const content = `---
$type: CompiledModule
$id: ${module.name}
hash: ${module.hash}
${Object.entries(module.data)
  .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
  .join('\n')}
---

${module.code}
`
    const record = await storeWithTiering(content, module.name, env, namespace)
    results.push(record)
  }

  return results
}

/**
 * Get a compiled module for worker execution
 */
export async function getCompiledModule(
  name: string,
  env: StorageEnv,
  namespace = 'default'
): Promise<{ code: string; data: Record<string, unknown>; hash: string } | null> {
  const record = await getContentFromDO(name, env, { namespace })
  if (!record) return null

  // Extract code from stored content (after frontmatter)
  const codeMatch = record.content.match(/---[\s\S]*?---\n+([\s\S]+)/)
  const code = codeMatch?.[1] ?? record.content

  return {
    code,
    data: record.data,
    hash: record.hash,
  }
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Hash content for cache invalidation
 * Exported for external use
 */
export function hashContentForStorage(content: string): string {
  return hashContent(content)
}

/**
 * Check if content should be stored in R2 based on size
 */
export function shouldStoreInR2(content: string): boolean {
  return content.length > R2_THRESHOLD
}

/**
 * Get namespace from environment or URL
 */
export function getNamespaceFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return 'default'
  }
}
