/**
 * ClickHouse Row Types
 *
 * TypeScript interfaces matching the ClickHouse table schemas.
 * These represent the raw data as stored/retrieved from ClickHouse.
 */

// =============================================================================
// Thing Row (Versioned resources with git integration)
// =============================================================================

export interface ThingRow {
  url: string
  ns: string
  type: string
  id: string
  branch: string
  variant: string
  version: number
  repo: string
  patch: string
  commit: string
  data: Record<string, unknown>
  content: string
  code: string
  meta: Record<string, unknown>
  visibility: string
  event: string
  ts: string
}

// =============================================================================
// Relationship Row (Semantic predicates)
// =============================================================================

export interface RelationshipRow {
  ns: string
  from: string
  to: string
  predicate: string
  reverse: string
  data: Record<string, unknown>
  meta: Record<string, unknown>
  visibility: string
  event: string
  ts: string
}

// =============================================================================
// Event Row (Actor-Event-Object-Result pattern)
// =============================================================================

export interface EventRow {
  ulid: string
  ns: string
  actor: string
  actorData: Record<string, unknown>
  event: string
  object: string
  objectData: Record<string, unknown>
  result: string
  resultData: Record<string, unknown>
  meta: Record<string, unknown>
  ts: string
}

// =============================================================================
// Action Row (Linguistic verb conjugations with staged objects and git)
// =============================================================================

export interface ActionRow {
  // Identity
  ns: string
  id: string

  // Linguistic verb conjugations
  act: string
  action: string
  activity: string
  event: string

  // Actor
  actor: string
  actorData: Record<string, unknown>

  // Target object (singular)
  object: string
  objectData: Record<string, unknown>

  // Staged objects (batch/nested data for transformation)
  objects: Record<string, unknown>[] | null
  objectsCount: number

  // Git integration
  repo: string
  branch: string
  commit: string
  commitMessage: string
  commitAuthor: string
  commitEmail: string
  commitTs: string | null
  diff: string

  // Workflow state
  status: string
  progress: number
  total: number
  result: Record<string, unknown>
  error: string

  // Action data
  data: Record<string, unknown>
  meta: Record<string, unknown>

  // Execution control
  priority: number
  attempts: number
  maxAttempts: number
  timeout: number
  ttl: number

  // Batch processing
  batch: string
  batchIndex: number
  batchTotal: number

  // Hierarchy
  parent: string
  children: string[]
  dependencies: string[]

  // Timestamps
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

// =============================================================================
// Artifact Row (Build artifacts with storage references)
// =============================================================================

export interface ArtifactRow {
  ns: string
  id: string
  type: string
  thing: string
  source: string
  name: string
  description: string
  path: string
  storage: string
  content: string
  code: string
  data: Record<string, unknown>
  meta: Record<string, unknown>
  contentType: string
  encoding: string
  size: number
  hash: string
  build: string
  status: string
  log: string
  expires: string
  event: string
  ts: string
}

// =============================================================================
// Search Row (Hybrid full-text + vector with HNSW)
// =============================================================================

export interface SearchRow {
  url: string
  ns: string
  type: string
  id: string
  title: string
  description: string
  content: string
  keywords: string[]
  embedding: number[]
  model: string
  data: Record<string, unknown>
  meta: Record<string, unknown>
  language: string
  locale: string
  event: string
  ts: string
}
