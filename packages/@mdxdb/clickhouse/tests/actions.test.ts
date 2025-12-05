/**
 * Actions Tests
 *
 * Tests for Actions schema, pipeline stages, verb conjugations, and git integration.
 */

import { describe, it, expect } from 'vitest'
import {
  // Pipeline
  PIPELINE_STAGES,
  STAGE_STATUSES,
  createPipeline,
  calculatePipelineProgress,
  // Action types
  ACTION_STATUSES,
  PUBLISH_ACTIONS,
  // Artifact types
  BUILD_ARTIFACT_TYPES,
  DEFAULT_ARTIFACT_CONFIG,
  // Git utilities
  inferNsFromRepo,
  parseGitRemote,
  // Types
  type ActionObject,
  type ActionPipeline,
  type PipelineStage,
  type PipelineStageInfo,
  type ArtifactConfig,
  type ContentChunk,
} from '../schema/actions'

// =============================================================================
// Pipeline Stages Tests
// =============================================================================

describe('Pipeline Stages', () => {
  it('has all 7 pipeline stages in correct order', () => {
    expect(PIPELINE_STAGES).toEqual([
      'things',
      'relations',
      'chunk',
      'embed',
      'search',
      'artifacts',
      'events',
    ])
  })

  it('pipeline stages are readonly tuple', () => {
    expect(PIPELINE_STAGES.length).toBe(7)
    // TypeScript ensures readonly at compile time via 'as const'
    // At runtime, 'as const' doesn't freeze the array, just provides type safety
    expect(Array.isArray(PIPELINE_STAGES)).toBe(true)
  })

  it('has all stage statuses', () => {
    expect(STAGE_STATUSES).toContain('pending')
    expect(STAGE_STATUSES).toContain('active')
    expect(STAGE_STATUSES).toContain('completed')
    expect(STAGE_STATUSES).toContain('failed')
    expect(STAGE_STATUSES).toContain('skipped')
  })
})

// =============================================================================
// Pipeline Creation Tests
// =============================================================================

describe('createPipeline', () => {
  it('creates pipeline with all stages in pending state', () => {
    const pipeline = createPipeline()

    expect(pipeline.currentStage).toBeNull()
    expect(pipeline.progress).toBe(0)

    for (const stage of PIPELINE_STAGES) {
      expect(pipeline.stages[stage]).toBeDefined()
      expect(pipeline.stages[stage].status).toBe('pending')
      expect(pipeline.stages[stage].progress).toBe(0)
      expect(pipeline.stages[stage].processed).toBe(0)
      expect(pipeline.stages[stage].total).toBe(0)
    }
  })

  it('creates pipeline with correct stage names', () => {
    const pipeline = createPipeline()

    for (const stage of PIPELINE_STAGES) {
      expect(pipeline.stages[stage].stage).toBe(stage)
    }
  })

  it('pipeline has independent stage objects', () => {
    const pipeline1 = createPipeline()
    const pipeline2 = createPipeline()

    pipeline1.stages.things.status = 'active'

    expect(pipeline2.stages.things.status).toBe('pending')
  })
})

// =============================================================================
// Pipeline Progress Tests
// =============================================================================

describe('calculatePipelineProgress', () => {
  it('returns 0 for empty pipeline', () => {
    const pipeline = createPipeline()
    expect(calculatePipelineProgress(pipeline)).toBe(0)
  })

  it('returns 100 for fully completed pipeline', () => {
    const pipeline = createPipeline()

    for (const stage of PIPELINE_STAGES) {
      pipeline.stages[stage].status = 'completed'
    }

    expect(calculatePipelineProgress(pipeline)).toBe(100)
  })

  it('calculates partial progress correctly', () => {
    const pipeline = createPipeline()

    // Complete first 3 stages (things, relations, chunk)
    pipeline.stages.things.status = 'completed'
    pipeline.stages.relations.status = 'completed'
    pipeline.stages.chunk.status = 'completed'

    // 3 out of 7 stages = ~43%
    const progress = calculatePipelineProgress(pipeline)
    expect(progress).toBe(43) // Math.round(3/7 * 100) = 43
  })

  it('includes active stage progress', () => {
    const pipeline = createPipeline()

    // Complete first stage
    pipeline.stages.things.status = 'completed'

    // Relations is 50% complete
    pipeline.stages.relations.status = 'active'
    pipeline.stages.relations.progress = 50

    // 1 completed + 0.5 active = 1.5 out of 7 = ~21%
    const progress = calculatePipelineProgress(pipeline)
    expect(progress).toBe(21) // Math.round(1.5/7 * 100) = 21
  })

  it('treats skipped stages as completed', () => {
    const pipeline = createPipeline()

    // Skip all stages
    for (const stage of PIPELINE_STAGES) {
      pipeline.stages[stage].status = 'skipped'
    }

    expect(calculatePipelineProgress(pipeline)).toBe(100)
  })
})

// =============================================================================
// Action Statuses Tests
// =============================================================================

describe('Action Statuses', () => {
  it('has all required statuses', () => {
    expect(ACTION_STATUSES).toHaveLength(5)
    expect(ACTION_STATUSES).toContain('pending')
    expect(ACTION_STATUSES).toContain('active')
    expect(ACTION_STATUSES).toContain('completed')
    expect(ACTION_STATUSES).toContain('failed')
    expect(ACTION_STATUSES).toContain('cancelled')
  })

  it('statuses are in logical order', () => {
    expect(ACTION_STATUSES[0]).toBe('pending')
    expect(ACTION_STATUSES[1]).toBe('active')
    // Terminal states come after
    expect(ACTION_STATUSES.indexOf('completed')).toBeGreaterThan(1)
    expect(ACTION_STATUSES.indexOf('failed')).toBeGreaterThan(1)
    expect(ACTION_STATUSES.indexOf('cancelled')).toBeGreaterThan(1)
  })
})

// =============================================================================
// Publish Actions Tests
// =============================================================================

describe('Publish Actions', () => {
  it('has all required publish action types', () => {
    expect(PUBLISH_ACTIONS).toContain('publish')
    expect(PUBLISH_ACTIONS).toContain('import')
    expect(PUBLISH_ACTIONS).toContain('sync')
    expect(PUBLISH_ACTIONS).toContain('transform')
    expect(PUBLISH_ACTIONS).toContain('index')
    expect(PUBLISH_ACTIONS).toContain('embed')
    expect(PUBLISH_ACTIONS).toContain('build')
  })

  it('publish is first action type', () => {
    expect(PUBLISH_ACTIONS[0]).toBe('publish')
  })
})

// =============================================================================
// Build Artifact Types Tests
// =============================================================================

describe('Build Artifact Types', () => {
  it('includes compiled code types', () => {
    expect(BUILD_ARTIFACT_TYPES).toContain('esm')
    expect(BUILD_ARTIFACT_TYPES).toContain('cjs')
    expect(BUILD_ARTIFACT_TYPES).toContain('ast')
  })

  it('includes rendered content types', () => {
    expect(BUILD_ARTIFACT_TYPES).toContain('html')
    expect(BUILD_ARTIFACT_TYPES).toContain('markdown')
    expect(BUILD_ARTIFACT_TYPES).toContain('text')
  })

  it('includes structured data types', () => {
    expect(BUILD_ARTIFACT_TYPES).toContain('json')
    expect(BUILD_ARTIFACT_TYPES).toContain('jsonld')
    expect(BUILD_ARTIFACT_TYPES).toContain('yaml')
  })

  it('includes search/RAG types', () => {
    expect(BUILD_ARTIFACT_TYPES).toContain('chunks')
    expect(BUILD_ARTIFACT_TYPES).toContain('embedding')
  })

  it('includes media types', () => {
    expect(BUILD_ARTIFACT_TYPES).toContain('thumbnail')
    expect(BUILD_ARTIFACT_TYPES).toContain('preview')
    expect(BUILD_ARTIFACT_TYPES).toContain('og-image')
  })

  it('includes export format types', () => {
    expect(BUILD_ARTIFACT_TYPES).toContain('pdf')
    expect(BUILD_ARTIFACT_TYPES).toContain('docx')
    expect(BUILD_ARTIFACT_TYPES).toContain('epub')
  })
})

// =============================================================================
// Default Artifact Config Tests
// =============================================================================

describe('Default Artifact Config', () => {
  it('has default artifact types', () => {
    expect(DEFAULT_ARTIFACT_CONFIG.types).toContain('html')
    expect(DEFAULT_ARTIFACT_CONFIG.types).toContain('esm')
    expect(DEFAULT_ARTIFACT_CONFIG.types).toContain('json')
    expect(DEFAULT_ARTIFACT_CONFIG.types).toContain('chunks')
    expect(DEFAULT_ARTIFACT_CONFIG.types).toContain('embedding')
  })

  it('has default embedding model', () => {
    expect(DEFAULT_ARTIFACT_CONFIG.embeddingModel).toBe('text-embedding-3-small')
  })

  it('has default chunk settings', () => {
    expect(DEFAULT_ARTIFACT_CONFIG.chunkSize).toBe(1000)
    expect(DEFAULT_ARTIFACT_CONFIG.chunkOverlap).toBe(200)
  })
})

// =============================================================================
// Git Namespace Inference Tests
// =============================================================================

describe('inferNsFromRepo', () => {
  it('parses HTTPS GitHub URL', () => {
    expect(inferNsFromRepo('https://github.com/org/repo')).toBe('repo.org.github.com')
  })

  it('parses plain GitHub URL without protocol', () => {
    expect(inferNsFromRepo('github.com/org/repo')).toBe('repo.org.github.com')
  })

  it('parses git@ SSH URL', () => {
    expect(inferNsFromRepo('git@github.com:org/repo.git')).toBe('repo.org.github.com')
  })

  it('handles .git suffix', () => {
    expect(inferNsFromRepo('https://github.com/org/repo.git')).toBe('repo.org.github.com')
  })

  it('handles multi-part repo names', () => {
    expect(inferNsFromRepo('https://github.com/org/my-repo-name')).toBe('my-repo-name.org.github.com')
  })

  it('handles org/repo format (local)', () => {
    expect(inferNsFromRepo('org/repo')).toBe('repo.org.local')
  })

  it('handles single part (fallback)', () => {
    expect(inferNsFromRepo('single')).toBe('single')
  })

  it('handles empty string', () => {
    expect(inferNsFromRepo('')).toBe('local')
  })

  it('handles GitLab URLs', () => {
    expect(inferNsFromRepo('https://gitlab.com/org/repo')).toBe('repo.org.gitlab.com')
  })

  it('handles Bitbucket URLs', () => {
    expect(inferNsFromRepo('https://bitbucket.org/org/repo')).toBe('repo.org.bitbucket.org')
  })
})

// =============================================================================
// Parse Git Remote Tests
// =============================================================================

describe('parseGitRemote', () => {
  it('parses HTTPS GitHub URL', () => {
    const result = parseGitRemote('https://github.com/org/repo')

    expect(result.host).toBe('github.com')
    expect(result.org).toBe('org')
    expect(result.repo).toBe('repo')
    expect(result.ns).toBe('repo.org.github.com')
  })

  it('parses git@ SSH URL', () => {
    const result = parseGitRemote('git@github.com:org/repo.git')

    expect(result.host).toBe('github.com')
    expect(result.org).toBe('org')
    expect(result.repo).toBe('repo')
  })

  it('handles missing parts gracefully', () => {
    const result = parseGitRemote('single')

    expect(result.host).toBe('single')
    expect(result.org).toBe('unknown')
    expect(result.repo).toBe('unknown')
  })

  it('handles empty string', () => {
    const result = parseGitRemote('')

    expect(result.host).toBe('local')
    expect(result.org).toBe('unknown')
    expect(result.repo).toBe('unknown')
  })
})

// =============================================================================
// ActionObject Type Tests
// =============================================================================

describe('ActionObject', () => {
  it('can create a minimal ActionObject', () => {
    const obj: ActionObject = {
      path: 'posts/hello.mdx',
      type: 'Post',
      operation: 'create',
    }

    expect(obj.path).toBe('posts/hello.mdx')
    expect(obj.type).toBe('Post')
    expect(obj.operation).toBe('create')
  })

  it('can create a full ActionObject', () => {
    const obj: ActionObject = {
      path: 'posts/hello-world.mdx',
      type: 'Post',
      id: 'hello-world',
      operation: 'upsert',
      data: { title: 'Hello World', author: 'Author/john' },
      content: '# Hello World\n\nThis is my first post...',
      code: 'export const title = "Hello World"',
      hash: 'sha256:abc123',
      previousHash: 'sha256:def456',
      change: 'modified',
      previousPath: 'posts/old-name.mdx',
      relationships: [
        { predicate: 'author', target: 'Author/john', reverse: 'posts' },
      ],
      search: {
        title: 'Hello World',
        description: 'This is my first post',
        keywords: ['hello', 'world'],
        embedding: [0.1, 0.2, 0.3],
        model: 'text-embedding-3-small',
      },
      artifacts: [
        { type: 'html', content: '<h1>Hello World</h1>' },
        { type: 'esm', path: 'hello-world.js', hash: 'sha256:xyz' },
      ],
      errors: [],
      meta: { custom: 'value' },
    }

    expect(obj.id).toBe('hello-world')
    expect(obj.data?.title).toBe('Hello World')
    expect(obj.relationships).toHaveLength(1)
    expect(obj.search?.keywords).toContain('hello')
    expect(obj.artifacts).toHaveLength(2)
  })

  it('supports all operation types', () => {
    const operations: ActionObject['operation'][] = ['create', 'update', 'upsert', 'delete']

    for (const operation of operations) {
      const obj: ActionObject = {
        path: 'test.mdx',
        type: 'Test',
        operation,
      }
      expect(obj.operation).toBe(operation)
    }
  })

  it('supports all change types', () => {
    const changes: ActionObject['change'][] = ['added', 'modified', 'deleted', 'renamed']

    for (const change of changes) {
      const obj: ActionObject = {
        path: 'test.mdx',
        type: 'Test',
        operation: 'update',
        change,
      }
      expect(obj.change).toBe(change)
    }
  })
})

// =============================================================================
// ContentChunk Type Tests
// =============================================================================

describe('ContentChunk', () => {
  it('can create a basic chunk', () => {
    const chunk: ContentChunk = {
      index: 0,
      content: 'This is the first chunk of content.',
      start: 0,
      end: 35,
      hash: 'sha256:abc123',
    }

    expect(chunk.index).toBe(0)
    expect(chunk.content).toHaveLength(35)
    expect(chunk.start).toBe(0)
    expect(chunk.end).toBe(35)
  })

  it('can create a chunk with embedding', () => {
    const chunk: ContentChunk = {
      index: 0,
      content: 'Content',
      start: 0,
      end: 7,
      hash: 'sha256:abc123',
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    }

    expect(chunk.embedding).toHaveLength(5)
  })

  it('can create a chunk with metadata', () => {
    const chunk: ContentChunk = {
      index: 2,
      content: '```typescript\nconst x = 1\n```',
      start: 100,
      end: 130,
      hash: 'sha256:def456',
      metadata: {
        heading: 'Code Example',
        section: 'Getting Started',
        codeBlock: true,
        language: 'typescript',
      },
    }

    expect(chunk.metadata?.codeBlock).toBe(true)
    expect(chunk.metadata?.language).toBe('typescript')
  })
})

// =============================================================================
// ArtifactConfig Type Tests
// =============================================================================

describe('ArtifactConfig', () => {
  it('can create minimal config', () => {
    const config: ArtifactConfig = {
      types: ['html'],
    }

    expect(config.types).toContain('html')
  })

  it('can create full config', () => {
    const config: ArtifactConfig = {
      types: ['html', 'esm', 'json', 'chunks', 'embedding'],
      embeddingModel: 'text-embedding-3-large',
      chunkSize: 500,
      chunkOverlap: 100,
      options: {
        html: { minify: true },
        embedding: { dimensions: 1536 },
      },
    }

    expect(config.embeddingModel).toBe('text-embedding-3-large')
    expect(config.chunkSize).toBe(500)
    expect(config.options?.html).toEqual({ minify: true })
  })
})

// =============================================================================
// Pipeline Type Tests
// =============================================================================

describe('ActionPipeline', () => {
  it('has correct shape', () => {
    const pipeline: ActionPipeline = {
      currentStage: 'things',
      stages: {
        things: { stage: 'things', status: 'active', progress: 50, processed: 5, total: 10 },
        relations: { stage: 'relations', status: 'pending', progress: 0, processed: 0, total: 0 },
        chunk: { stage: 'chunk', status: 'pending', progress: 0, processed: 0, total: 0 },
        embed: { stage: 'embed', status: 'pending', progress: 0, processed: 0, total: 0 },
        search: { stage: 'search', status: 'pending', progress: 0, processed: 0, total: 0 },
        artifacts: { stage: 'artifacts', status: 'pending', progress: 0, processed: 0, total: 0 },
        events: { stage: 'events', status: 'pending', progress: 0, processed: 0, total: 0 },
      },
      progress: 7,
      startedAt: new Date().toISOString(),
    }

    expect(pipeline.currentStage).toBe('things')
    expect(pipeline.stages.things.status).toBe('active')
    expect(pipeline.stages.things.processed).toBe(5)
  })

  it('stage info can have error', () => {
    const stageInfo: PipelineStageInfo = {
      stage: 'embed',
      status: 'failed',
      progress: 25,
      processed: 2,
      total: 8,
      startedAt: new Date().toISOString(),
      error: 'Rate limit exceeded',
    }

    expect(stageInfo.status).toBe('failed')
    expect(stageInfo.error).toBe('Rate limit exceeded')
  })

  it('stage info can have result', () => {
    const stageInfo: PipelineStageInfo = {
      stage: 'things',
      status: 'completed',
      progress: 100,
      processed: 10,
      total: 10,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result: {
        created: 5,
        updated: 3,
        deleted: 2,
      },
    }

    expect(stageInfo.result?.created).toBe(5)
  })
})
