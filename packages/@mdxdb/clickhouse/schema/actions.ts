/**
 * Actions Table Schema
 *
 * Durable action queue with linguistic verb conjugations and staged objects.
 * Actions serve as the staging layer for all data changes, with git integration
 * providing versioning and audit trail.
 *
 * ## Core Concepts
 *
 * **Linguistic verb forms:**
 * - act: Present tense 3rd person (creates, publishes, generates)
 * - action: Base verb form (create, publish, generate)
 * - activity: Gerund/progressive (creating, publishing, generating)
 *
 * **Staged Objects:**
 * The `objects` field is a nested JSON array that holds staged data for import/transformation.
 * This enables Actions to be the single source of truth for all changes before they're
 * transformed into Things, Relationships, Search, and Artifacts.
 *
 * **Git Integration:**
 * Actions can be linked to git commits, enabling:
 * - Post-commit hooks that create Actions from commits
 * - Namespace inference from repo/branch
 * - Full audit trail with commit hashes
 * - Change tracking and replay
 *
 * ## Workflow
 *
 * ```
 * Git Commit → Action (objects[]) → Transform → Things + Relationships + Search + Artifacts
 * ```
 *
 * @example
 * ```sql
 * -- Create a publish action from git commit
 * INSERT INTO Actions (ns, actor, act, action, activity, repo, branch, commit, objects)
 * VALUES (
 *   'example.com',
 *   'user:john',
 *   'publishes', 'publish', 'publishing',
 *   'github.com/org/repo',
 *   'main',
 *   'abc123',
 *   '[{"path": "posts/hello.mdx", "type": "Post", "data": {...}, "content": "..."}]'
 * )
 *
 * -- Query pending publish actions
 * SELECT * FROM Actions FINAL WHERE action = 'publish' AND status = 'pending'
 *
 * -- Query actions by commit
 * SELECT * FROM Actions FINAL WHERE commit = 'abc123'
 * ```
 */

export const ACTIONS_TABLE = 'Actions'

export const ACTIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS Actions (
  -- Identity
  ns LowCardinality(String),
  id String DEFAULT generateULID(),

  -- Linguistic verb conjugations
  act LowCardinality(String),
  action LowCardinality(String),
  activity LowCardinality(String),
  event LowCardinality(String) DEFAULT '',

  -- Actor (who triggered the action)
  actor String DEFAULT '',
  actorData JSON,

  -- Target object (singular)
  object String DEFAULT '',
  objectData JSON,

  -- Staged objects (batch/nested data for transformation)
  -- Array of objects to be transformed into Things, Relationships, etc.
  objects JSON,
  objectsCount UInt32 DEFAULT 0,

  -- Git integration
  repo String DEFAULT '',
  branch LowCardinality(String) DEFAULT 'main',
  commit String DEFAULT '',
  commitMessage String DEFAULT '',
  commitAuthor String DEFAULT '',
  commitEmail String DEFAULT '',
  commitTs Nullable(DateTime64(3)),
  diff String DEFAULT '',

  -- Workflow state
  status LowCardinality(String) DEFAULT 'pending',
  progress UInt32 DEFAULT 0,
  total UInt32 DEFAULT 0,
  result JSON,
  error String DEFAULT '',

  -- Action data and metadata
  data JSON,
  meta JSON,

  -- Execution control
  priority UInt8 DEFAULT 5,
  attempts UInt8 DEFAULT 0,
  maxAttempts UInt8 DEFAULT 3,
  timeout UInt32 DEFAULT 0,
  ttl UInt32 DEFAULT 0,

  -- Batch processing
  batch String DEFAULT '',
  batchIndex UInt32 DEFAULT 0,
  batchTotal UInt32 DEFAULT 0,

  -- Hierarchy (parent/child actions)
  parent String DEFAULT '',
  children Array(String) DEFAULT [],
  dependencies Array(String) DEFAULT [],

  -- Timestamps
  scheduledAt Nullable(DateTime64(3)),
  startedAt Nullable(DateTime64(3)),
  completedAt Nullable(DateTime64(3)),
  createdAt DateTime64(3) DEFAULT now64(3),
  updatedAt DateTime64(3) DEFAULT now64(3),

  -- Indexes
  INDEX idx_status status TYPE set(10) GRANULARITY 1,
  INDEX idx_actor actor TYPE bloom_filter GRANULARITY 1,
  INDEX idx_object object TYPE bloom_filter GRANULARITY 1,
  INDEX idx_batch batch TYPE bloom_filter GRANULARITY 1,
  INDEX idx_parent parent TYPE bloom_filter GRANULARITY 1,
  INDEX idx_repo repo TYPE bloom_filter GRANULARITY 1,
  INDEX idx_commit commit TYPE bloom_filter GRANULARITY 1,
  INDEX idx_branch branch TYPE set(100) GRANULARITY 1
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, status, act, createdAt, id)
PRIMARY KEY (ns, status, act, createdAt)
`

/**
 * Action status values
 */
export const ACTION_STATUSES = [
  'pending',
  'active',
  'completed',
  'failed',
  'cancelled',
] as const

export type ActionStatus = (typeof ACTION_STATUSES)[number]

/**
 * Standard action types for the publish workflow
 */
export const PUBLISH_ACTIONS = [
  'publish',    // Deploy content to production
  'import',     // Import from external source
  'sync',       // Sync with remote
  'transform',  // Transform objects into Things
  'index',      // Index for search
  'embed',      // Generate embeddings
  'build',      // Build artifacts
] as const

export type PublishAction = (typeof PUBLISH_ACTIONS)[number]

// =============================================================================
// ActionObject - Staged data for transformation
// =============================================================================

/**
 * An object staged within an Action for transformation.
 *
 * This represents a single item (file, record, etc.) that will be transformed
 * into Things, Relationships, Search entries, and/or Artifacts.
 *
 * @example
 * ```typescript
 * const stagedPost: ActionObject = {
 *   path: 'posts/hello-world.mdx',
 *   type: 'Post',
 *   id: 'hello-world',
 *   operation: 'upsert',
 *   data: { title: 'Hello World', author: 'Author/john' },
 *   content: '# Hello World\n\nThis is my first post...',
 *   hash: 'sha256:abc123...',
 *   // Git change info
 *   change: 'modified',
 *   previousHash: 'sha256:def456...',
 * }
 * ```
 */
export interface ActionObject {
  /** File path relative to repo root */
  path: string
  /** Entity type (inferred from path or frontmatter) */
  type: string
  /** Entity ID (inferred from filename or frontmatter) */
  id?: string
  /** Operation to perform */
  operation: 'create' | 'update' | 'upsert' | 'delete'
  /** Parsed frontmatter/data */
  data?: Record<string, unknown>
  /** Raw content (markdown body) */
  content?: string
  /** Compiled code (if applicable) */
  code?: string
  /** Content hash for change detection */
  hash?: string
  /** Previous hash (for updates) */
  previousHash?: string
  /** Git change type */
  change?: 'added' | 'modified' | 'deleted' | 'renamed'
  /** Previous path (for renames) */
  previousPath?: string
  /** Extracted relationships */
  relationships?: Array<{
    predicate: string
    target: string
    reverse?: string
  }>
  /** Search metadata */
  search?: {
    title?: string
    description?: string
    keywords?: string[]
    embedding?: number[]
    model?: string
  }
  /** Artifact references */
  artifacts?: Array<{
    type: string
    path?: string
    content?: string
    hash?: string
  }>
  /** Validation errors (if any) */
  errors?: string[]
  /** Additional metadata */
  meta?: Record<string, unknown>
}

/**
 * Result of transforming an ActionObject
 */
export interface TransformResult {
  /** Things created/updated */
  things: Array<{
    url: string
    operation: 'created' | 'updated' | 'deleted'
  }>
  /** Relationships created/deleted */
  relationships: Array<{
    from: string
    predicate: string
    to: string
    operation: 'created' | 'deleted'
  }>
  /** Search entries indexed */
  search: Array<{
    url: string
    indexed: boolean
  }>
  /** Artifacts stored */
  artifacts: Array<{
    key: string
    type: string
    stored: boolean
  }>
  /** Errors encountered */
  errors: Array<{
    path: string
    error: string
  }>
}

// =============================================================================
// Pipeline Stages - Every mutation flows through this pipeline
// =============================================================================

/**
 * Pipeline stages for processing Actions
 *
 * Every mutation (create, update, delete) goes through these stages:
 * 1. things      - Insert/update the core entity in Things table
 * 2. relations   - Extract and create relationship edges
 * 3. chunk       - Split content into chunks for RAG
 * 4. embed       - Generate embeddings for each chunk
 * 5. search      - Index for full-text + vector search
 * 6. artifacts   - Build all output formats
 * 7. events      - Emit completion events (audit trail)
 *
 * Each stage can emit events as it progresses:
 * - Thing.created, Thing.updated, Thing.deleted
 * - Relationship.created, Relationship.deleted
 * - Chunk.created
 * - Embedding.generated
 * - Search.indexed
 * - Artifact.built
 * - Action.completed, Action.failed
 */
export const PIPELINE_STAGES = [
  'things',      // Insert/update Things table
  'relations',   // Extract & create Relationships
  'chunk',       // Split content into RAG chunks
  'embed',       // Generate vector embeddings
  'search',      // Index in Search table
  'artifacts',   // Build output artifacts
  'events',      // Emit completion events
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

/**
 * Status of a pipeline stage
 */
export const STAGE_STATUSES = [
  'pending',     // Not started
  'active',      // Currently processing
  'completed',   // Successfully finished
  'failed',      // Error encountered
  'skipped',     // Intentionally skipped
] as const

export type StageStatus = (typeof STAGE_STATUSES)[number]

/**
 * Tracking info for a single pipeline stage
 */
export interface PipelineStageInfo {
  /** Stage name */
  stage: PipelineStage
  /** Current status */
  status: StageStatus
  /** Progress within stage (0-100) */
  progress: number
  /** Items processed in this stage */
  processed: number
  /** Total items to process */
  total: number
  /** When stage started */
  startedAt?: string
  /** When stage completed */
  completedAt?: string
  /** Error message if failed */
  error?: string
  /** Stage-specific result data */
  result?: Record<string, unknown>
}

/**
 * Full pipeline state for an Action
 */
export interface ActionPipeline {
  /** Current stage being processed */
  currentStage: PipelineStage | null
  /** All stage states */
  stages: Record<PipelineStage, PipelineStageInfo>
  /** Overall pipeline progress (0-100) */
  progress: number
  /** When pipeline started */
  startedAt?: string
  /** When pipeline completed */
  completedAt?: string
}

/**
 * Create initial pipeline state
 */
export function createPipeline(): ActionPipeline {
  const stages = {} as Record<PipelineStage, PipelineStageInfo>

  for (const stage of PIPELINE_STAGES) {
    stages[stage] = {
      stage,
      status: 'pending',
      progress: 0,
      processed: 0,
      total: 0,
    }
  }

  return {
    currentStage: null,
    stages,
    progress: 0,
  }
}

/**
 * Calculate overall pipeline progress from stage states
 */
export function calculatePipelineProgress(pipeline: ActionPipeline): number {
  const stageCount = PIPELINE_STAGES.length
  let completedStages = 0
  let currentProgress = 0

  for (const stage of PIPELINE_STAGES) {
    const info = pipeline.stages[stage]
    if (info.status === 'completed' || info.status === 'skipped') {
      completedStages++
    } else if (info.status === 'active') {
      currentProgress = info.progress / 100
    }
  }

  return Math.round(((completedStages + currentProgress) / stageCount) * 100)
}

// =============================================================================
// Artifact Types - All output formats
// =============================================================================

/**
 * All artifact types that can be built from content
 */
export const BUILD_ARTIFACT_TYPES = [
  // Compiled code
  'esm',        // ES Module (compiled JS)
  'cjs',        // CommonJS module
  'ast',        // MDX AST (for manipulation)

  // Rendered content
  'html',       // Rendered HTML
  'markdown',   // Plain markdown (JSX stripped)
  'text',       // Plain text (for search)

  // Structured data
  'json',       // JSON-LD representation
  'jsonld',     // Expanded JSON-LD
  'yaml',       // YAML frontmatter only

  // Search/RAG
  'chunks',     // Chunked content for RAG
  'embedding',  // Vector embedding

  // Media
  'thumbnail',  // Generated thumbnail
  'preview',    // Preview render
  'og-image',   // Open Graph image

  // Export formats
  'pdf',        // PDF export
  'docx',       // Word export
  'epub',       // ePub export
] as const

export type BuildArtifactType = (typeof BUILD_ARTIFACT_TYPES)[number]

/**
 * Configuration for which artifacts to build
 */
export interface ArtifactConfig {
  /** Which artifacts to build */
  types: BuildArtifactType[]
  /** Embedding model to use */
  embeddingModel?: string
  /** Chunk size for RAG */
  chunkSize?: number
  /** Chunk overlap */
  chunkOverlap?: number
  /** Custom build options per type */
  options?: Partial<Record<BuildArtifactType, Record<string, unknown>>>
}

/**
 * Default artifact configuration
 */
export const DEFAULT_ARTIFACT_CONFIG: ArtifactConfig = {
  types: ['html', 'esm', 'json', 'chunks', 'embedding'],
  embeddingModel: 'text-embedding-3-small',
  chunkSize: 1000,
  chunkOverlap: 200,
}

/**
 * Chunk for RAG/vector search
 */
export interface ContentChunk {
  /** Chunk index within document */
  index: number
  /** Chunk content */
  content: string
  /** Start character offset in original content */
  start: number
  /** End character offset */
  end: number
  /** Chunk hash for deduplication */
  hash: string
  /** Vector embedding */
  embedding?: number[]
  /** Metadata extracted from chunk */
  metadata?: {
    heading?: string
    section?: string
    codeBlock?: boolean
    language?: string
  }
}

/**
 * Column definitions for documentation and migration
 */
export const ACTIONS_COLUMNS = {
  // Identity
  ns: 'LowCardinality(String)',
  id: 'String DEFAULT generateULID()',

  // Linguistic verb conjugations
  act: 'LowCardinality(String)',
  action: 'LowCardinality(String)',
  activity: 'LowCardinality(String)',
  event: "LowCardinality(String) DEFAULT ''",

  // Actor
  actor: "String DEFAULT ''",
  actorData: 'JSON',

  // Target object (singular)
  object: "String DEFAULT ''",
  objectData: 'JSON',

  // Staged objects (batch)
  objects: 'JSON',
  objectsCount: 'UInt32 DEFAULT 0',

  // Git integration
  repo: "String DEFAULT ''",
  branch: "LowCardinality(String) DEFAULT 'main'",
  commit: "String DEFAULT ''",
  commitMessage: "String DEFAULT ''",
  commitAuthor: "String DEFAULT ''",
  commitEmail: "String DEFAULT ''",
  commitTs: 'Nullable(DateTime64(3))',
  diff: "String DEFAULT ''",

  // Workflow state
  status: "LowCardinality(String) DEFAULT 'pending'",
  progress: 'UInt32 DEFAULT 0',
  total: 'UInt32 DEFAULT 0',
  result: 'JSON',
  error: "String DEFAULT ''",

  // Action data
  data: 'JSON',
  meta: 'JSON',

  // Execution control
  priority: 'UInt8 DEFAULT 5',
  attempts: 'UInt8 DEFAULT 0',
  maxAttempts: 'UInt8 DEFAULT 3',
  timeout: 'UInt32 DEFAULT 0',
  ttl: 'UInt32 DEFAULT 0',

  // Batch processing
  batch: "String DEFAULT ''",
  batchIndex: 'UInt32 DEFAULT 0',
  batchTotal: 'UInt32 DEFAULT 0',

  // Hierarchy
  parent: "String DEFAULT ''",
  children: 'Array(String) DEFAULT []',
  dependencies: 'Array(String) DEFAULT []',

  // Timestamps
  scheduledAt: 'Nullable(DateTime64(3))',
  startedAt: 'Nullable(DateTime64(3))',
  completedAt: 'Nullable(DateTime64(3))',
  createdAt: 'DateTime64(3) DEFAULT now64(3)',
  updatedAt: 'DateTime64(3) DEFAULT now64(3)',
} as const

// =============================================================================
// Git Utilities
// =============================================================================

/**
 * Infer namespace from git repository
 *
 * @example
 * ```typescript
 * inferNsFromRepo('https://github.com/org/repo') // 'repo.org.github.com'
 * inferNsFromRepo('github.com/org/repo')         // 'repo.org.github.com'
 * inferNsFromRepo('git@github.com:org/repo.git') // 'repo.org.github.com'
 * ```
 */
export function inferNsFromRepo(repo: string): string {
  // Remove protocol and git@ prefix
  let cleaned = repo
    .replace(/^https?:\/\//, '')
    .replace(/^git@/, '')
    .replace(/\.git$/, '')
    .replace(':', '/')

  // Split into parts: host/org/repo
  const parts = cleaned.split('/').filter(Boolean)

  if (parts.length >= 3) {
    // github.com/org/repo -> repo.org.github.com
    const [host, org, ...repoParts] = parts
    const repoName = repoParts.join('-')
    return `${repoName}.${org}.${host}`
  }

  if (parts.length === 2) {
    // org/repo (local) -> repo.org.local
    const [org, repoName] = parts
    return `${repoName}.${org}.local`
  }

  // Fallback
  return parts.join('.') || 'local'
}

/**
 * Parse git remote URL into components
 */
export function parseGitRemote(remote: string): {
  host: string
  org: string
  repo: string
  ns: string
} {
  const cleaned = remote
    .replace(/^https?:\/\//, '')
    .replace(/^git@/, '')
    .replace(/\.git$/, '')
    .replace(':', '/')

  const parts = cleaned.split('/').filter(Boolean)

  return {
    host: parts[0] ?? 'local',
    org: parts[1] ?? 'unknown',
    repo: parts[2] ?? parts[1] ?? 'unknown',
    ns: inferNsFromRepo(remote),
  }
}
