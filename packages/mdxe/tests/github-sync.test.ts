/**
 * Tests for GitHub webhook sync for mdxe deploy
 *
 * This tests keeping deployed DOs in sync with GitHub repos via gitx:
 * - Webhook payload handling (parse GitHub push events)
 * - Post-receive hook triggers deployment
 * - Conflict resolution on concurrent edits
 * - Branch-based deployment (main -> production, other branches -> preview)
 * - Incremental deployment (only changed files)
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// =============================================================================
// Mock Types (matching GitHub webhook and deployment interfaces)
// =============================================================================

interface StorageEnv {
  /** Durable Object namespace for content storage */
  MDXDB: MockDurableObjectNamespace
  /** R2 bucket for large file storage */
  CONTENT_BUCKET: MockR2Bucket
  /** Worker loader for dynamic execution */
  LOADER: MockWorkerLoader
  /** GitHub API token for status updates */
  GITHUB_TOKEN?: string
  /** Secret for webhook signature verification */
  GITHUB_WEBHOOK_SECRET?: string
}

interface MockDurableObjectNamespace {
  idFromName: (name: string) => MockDurableObjectId
  get: (id: MockDurableObjectId) => MockDurableObjectStub
}

interface MockDurableObjectId {
  name: string
}

interface MockDurableObjectStub {
  storeContent: Mock
  getContent: Mock
  listContent: Mock
  getVersionHistory: Mock
  storeMetadata: Mock
  getDatabaseSize: Mock
}

interface MockR2Bucket {
  put: Mock
  get: Mock
  delete: Mock
  head: Mock
}

interface MockWorkerLoader {
  get: Mock
}

// GitHub Push Event types
interface GitHubPushEvent {
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

interface GitHubCommit {
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

interface DeploymentEnvironment {
  name: 'production' | 'preview' | 'development'
  url?: string
  branch: string
}

interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge'
  localVersion: number
  remoteVersion: string
  resolvedContent?: string
}

interface DeploymentStatus {
  state: 'pending' | 'success' | 'error' | 'failure'
  target_url?: string
  description?: string
  context: string
}

// =============================================================================
// Test Setup
// =============================================================================

function createMockEnv(): StorageEnv {
  const mockStub: MockDurableObjectStub = {
    storeContent: vi.fn(),
    getContent: vi.fn(),
    listContent: vi.fn(),
    getVersionHistory: vi.fn(),
    storeMetadata: vi.fn(),
    getDatabaseSize: vi.fn().mockReturnValue(0),
  }

  const mockId: MockDurableObjectId = { name: 'test-namespace' }

  return {
    MDXDB: {
      idFromName: vi.fn().mockReturnValue(mockId),
      get: vi.fn().mockReturnValue(mockStub),
    },
    CONTENT_BUCKET: {
      put: vi.fn().mockResolvedValue({ key: 'test-key' }),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null),
    },
    LOADER: {
      get: vi.fn(),
    },
    GITHUB_TOKEN: 'ghp_test_token_123',
    GITHUB_WEBHOOK_SECRET: 'webhook_secret_456',
  }
}

function createMockPushEvent(overrides: Partial<GitHubPushEvent> = {}): GitHubPushEvent {
  return {
    ref: 'refs/heads/main',
    before: '0000000000000000000000000000000000000000',
    after: 'abc123def456789012345678901234567890abcd',
    repository: {
      id: 12345,
      name: 'test-repo',
      full_name: 'owner/test-repo',
      html_url: 'https://github.com/owner/test-repo',
      default_branch: 'main',
    },
    pusher: {
      name: 'Test User',
      email: 'test@example.com',
    },
    sender: {
      id: 1,
      login: 'testuser',
      avatar_url: 'https://avatars.githubusercontent.com/u/1',
    },
    commits: [
      {
        id: 'abc123def456789012345678901234567890abcd',
        tree_id: 'tree123',
        message: 'Update content',
        timestamp: '2024-01-15T10:00:00Z',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          username: 'testuser',
        },
        added: [],
        removed: [],
        modified: ['docs/page.mdx'],
      },
    ],
    head_commit: {
      id: 'abc123def456789012345678901234567890abcd',
      tree_id: 'tree123',
      message: 'Update content',
      timestamp: '2024-01-15T10:00:00Z',
      author: {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
      },
      added: [],
      removed: [],
      modified: ['docs/page.mdx'],
    },
    forced: false,
    compare: 'https://github.com/owner/test-repo/compare/000...abc',
    ...overrides,
  }
}

// =============================================================================
// Webhook Payload Handling Tests
// =============================================================================

describe('GitHub Webhook Payload Handling', () => {
  let env: StorageEnv

  beforeEach(() => {
    env = createMockEnv()
  })

  describe('parseGitHubPushEvent', () => {
    it('should parse push event payload correctly', async () => {
      const { parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent()
      const result = parseGitHubPushEvent(payload)

      expect(result).toBeDefined()
      expect(result.branch).toBe('main')
      expect(result.repository).toBe('owner/test-repo')
      expect(result.sha).toBe('abc123def456789012345678901234567890abcd')
    })

    it('should extract branch name from ref', async () => {
      const { parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const mainPush = createMockPushEvent({ ref: 'refs/heads/main' })
      const featurePush = createMockPushEvent({ ref: 'refs/heads/feature/new-docs' })
      const tagPush = createMockPushEvent({ ref: 'refs/tags/v1.0.0' })

      expect(parseGitHubPushEvent(mainPush).branch).toBe('main')
      expect(parseGitHubPushEvent(featurePush).branch).toBe('feature/new-docs')
      expect(parseGitHubPushEvent(tagPush).isTag).toBe(true)
    })

    it('should handle multiple commits in push event', async () => {
      const { parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [
          {
            id: 'commit1',
            tree_id: 'tree1',
            message: 'First commit',
            timestamp: '2024-01-15T10:00:00Z',
            author: { name: 'User', email: 'user@example.com', username: 'user' },
            added: ['new-file.mdx'],
            removed: [],
            modified: [],
          },
          {
            id: 'commit2',
            tree_id: 'tree2',
            message: 'Second commit',
            timestamp: '2024-01-15T10:01:00Z',
            author: { name: 'User', email: 'user@example.com', username: 'user' },
            added: [],
            removed: [],
            modified: ['existing-file.mdx'],
          },
        ],
      })

      const result = parseGitHubPushEvent(payload)
      expect(result.commits).toHaveLength(2)
    })

    it('should detect force push', async () => {
      const { parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const forcePush = createMockPushEvent({ forced: true })
      const normalPush = createMockPushEvent({ forced: false })

      expect(parseGitHubPushEvent(forcePush).isForced).toBe(true)
      expect(parseGitHubPushEvent(normalPush).isForced).toBe(false)
    })
  })

  describe('handleGitHubWebhook', () => {
    it('should verify webhook signature', async () => {
      const { handleGitHubWebhook } = await import('../src/commands/github-sync.js')

      const payload = JSON.stringify(createMockPushEvent())
      const invalidRequest = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': 'sha256=invalid_signature',
          'x-github-event': 'push',
        },
        body: payload,
      })

      const result = await handleGitHubWebhook(invalidRequest, env)

      expect(result.status).toBe(401)
    })

    it('should reject non-push events gracefully', async () => {
      const { handleGitHubWebhook } = await import('../src/commands/github-sync.js')

      const request = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'ping',
        },
        body: JSON.stringify({ zen: 'test' }),
      })

      const result = await handleGitHubWebhook(request, env)

      // Ping events should be acknowledged but not trigger deployment
      expect(result.status).toBe(200)
      const json = await result.json()
      expect(json.action).toBe('acknowledged')
    })

    it('should accept valid webhook and trigger deployment', async () => {
      const { handleGitHubWebhook, computeWebhookSignature } = await import('../src/commands/github-sync.js')

      const payload = JSON.stringify(createMockPushEvent())
      const signature = await computeWebhookSignature(payload, env.GITHUB_WEBHOOK_SECRET!)

      const request = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
        },
        body: payload,
      })

      const mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
      mockStub.storeContent.mockResolvedValue({
        id: 'docs/page',
        hash: 'abc123',
        content: '# Test',
        data: {},
        size: 6,
        storedAt: new Date(),
        version: 1,
      })

      const result = await handleGitHubWebhook(request, env)

      expect(result.status).toBe(200)
      const json = await result.json()
      expect(json.action).toBe('deployment_triggered')
    })
  })
})

// =============================================================================
// Post-receive Hook Deployment Tests
// =============================================================================

describe('Post-receive Hook Deployment', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('triggerDeployment', () => {
    it('should trigger deployment from push event', async () => {
      const { triggerDeployment, parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Add new page',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: ['docs/new-page.mdx'],
          removed: [],
          modified: [],
        }],
      })

      const event = parseGitHubPushEvent(payload)
      mockStub.storeContent.mockResolvedValue({
        id: 'docs/new-page',
        hash: 'newHash',
        content: '# New Page',
        data: {},
        size: 10,
        storedAt: new Date(),
        version: 1,
      })

      const result = await triggerDeployment(event, env)

      expect(result.success).toBe(true)
      expect(result.deployedFiles).toContain('docs/new-page.mdx')
    })

    it('should skip deployment for non-MDX files', async () => {
      const { triggerDeployment, parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Update config',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: [],
          removed: [],
          modified: ['package.json', 'tsconfig.json'],
        }],
      })

      const event = parseGitHubPushEvent(payload)
      const result = await triggerDeployment(event, env)

      expect(result.success).toBe(true)
      expect(result.deployedFiles).toHaveLength(0)
      expect(result.skippedFiles).toContain('package.json')
    })

    it('should handle deleted files', async () => {
      const { triggerDeployment, parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Remove old page',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: [],
          removed: ['docs/old-page.mdx'],
          modified: [],
        }],
      })

      const event = parseGitHubPushEvent(payload)
      const result = await triggerDeployment(event, env)

      expect(result.success).toBe(true)
      expect(result.deletedFiles).toContain('docs/old-page.mdx')
    })
  })
})

// =============================================================================
// Conflict Resolution Tests
// =============================================================================

describe('Conflict Resolution', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('resolveConflict', () => {
    it('should detect concurrent edits', async () => {
      const { resolveConflict } = await import('../src/commands/github-sync.js')

      const localContent = {
        id: 'page',
        content: '# Local Version\n\nLocal changes.',
        version: 2,
        hash: 'localHash',
      }

      const remoteContent = {
        content: '# Remote Version\n\nRemote changes.',
        sha: 'remoteSha',
      }

      const result = await resolveConflict(localContent, remoteContent, env)

      expect(result.hasConflict).toBe(true)
    })

    it('should use remote-wins strategy by default', async () => {
      const { resolveConflict } = await import('../src/commands/github-sync.js')

      const localContent = {
        id: 'page',
        content: '# Local',
        version: 2,
        hash: 'localHash',
      }

      const remoteContent = {
        content: '# Remote',
        sha: 'remoteSha',
      }

      const result = await resolveConflict(localContent, remoteContent, env, { strategy: 'remote' })

      expect(result.resolvedContent).toBe('# Remote')
      expect(result.strategy).toBe('remote')
    })

    it('should support local-wins strategy', async () => {
      const { resolveConflict } = await import('../src/commands/github-sync.js')

      const localContent = {
        id: 'page',
        content: '# Local',
        version: 2,
        hash: 'localHash',
      }

      const remoteContent = {
        content: '# Remote',
        sha: 'remoteSha',
      }

      const result = await resolveConflict(localContent, remoteContent, env, { strategy: 'local' })

      expect(result.resolvedContent).toBe('# Local')
      expect(result.strategy).toBe('local')
    })

    it('should attempt three-way merge when possible', async () => {
      const { resolveConflict } = await import('../src/commands/github-sync.js')

      const baseContent = '# Title\n\nOriginal paragraph.\n\n## Section'

      const localContent = {
        id: 'page',
        content: '# Title\n\nLocal edit to paragraph.\n\n## Section',
        version: 2,
        hash: 'localHash',
        baseVersion: 1,
      }

      const remoteContent = {
        content: '# Title\n\nOriginal paragraph.\n\n## Section\n\nNew section from remote.',
        sha: 'remoteSha',
      }

      mockStub.getContent.mockResolvedValueOnce({
        id: 'page',
        content: baseContent,
        version: 1,
        hash: 'baseHash',
      })

      const result = await resolveConflict(localContent, remoteContent, env, { strategy: 'merge' })

      expect(result.strategy).toBe('merge')
      // Merge should combine non-conflicting changes
      expect(result.resolvedContent).toContain('Local edit')
      expect(result.resolvedContent).toContain('New section from remote')
    })

    it('should report unresolvable conflicts', async () => {
      const { resolveConflict } = await import('../src/commands/github-sync.js')

      const localContent = {
        id: 'page',
        content: '# Title\n\nLocal version of paragraph.',
        version: 2,
        hash: 'localHash',
        baseVersion: 1,
      }

      const remoteContent = {
        content: '# Title\n\nRemote version of paragraph.',
        sha: 'remoteSha',
      }

      // Base version has original that both sides modified
      mockStub.getContent.mockResolvedValueOnce({
        id: 'page',
        content: '# Title\n\nOriginal paragraph.',
        version: 1,
        hash: 'baseHash',
      })

      const result = await resolveConflict(localContent, remoteContent, env, { strategy: 'merge' })

      expect(result.hasUnresolvedConflicts).toBe(true)
      expect(result.conflictMarkers).toBeDefined()
    })
  })
})

// =============================================================================
// Branch-based Deployment Tests
// =============================================================================

describe('Branch-based Deployment', () => {
  let env: StorageEnv

  beforeEach(() => {
    env = createMockEnv()
  })

  describe('mapBranchToEnvironment', () => {
    it('should map main branch to production', async () => {
      const { mapBranchToEnvironment } = await import('../src/commands/github-sync.js')

      const result = mapBranchToEnvironment('main')

      expect(result.name).toBe('production')
    })

    it('should map master branch to production', async () => {
      const { mapBranchToEnvironment } = await import('../src/commands/github-sync.js')

      const result = mapBranchToEnvironment('master')

      expect(result.name).toBe('production')
    })

    it('should map feature branches to preview', async () => {
      const { mapBranchToEnvironment } = await import('../src/commands/github-sync.js')

      const result = mapBranchToEnvironment('feature/new-docs')

      expect(result.name).toBe('preview')
      expect(result.branch).toBe('feature/new-docs')
    })

    it('should map PR branches to preview with PR number', async () => {
      const { mapBranchToEnvironment } = await import('../src/commands/github-sync.js')

      // GitHub PR branches often follow patterns like pr/123 or refs/pull/123/merge
      const result = mapBranchToEnvironment('refs/pull/123/merge')

      expect(result.name).toBe('preview')
      expect(result.prNumber).toBe(123)
    })

    it('should support custom branch mappings', async () => {
      const { mapBranchToEnvironment } = await import('../src/commands/github-sync.js')

      const customMappings = {
        staging: 'development',
        develop: 'development',
        release: 'production',
      }

      expect(mapBranchToEnvironment('staging', customMappings).name).toBe('development')
      expect(mapBranchToEnvironment('develop', customMappings).name).toBe('development')
      expect(mapBranchToEnvironment('release', customMappings).name).toBe('production')
    })

    it('should generate preview URLs for non-production branches', async () => {
      const { mapBranchToEnvironment } = await import('../src/commands/github-sync.js')

      const result = mapBranchToEnvironment('feature/docs-update', undefined, {
        baseUrl: 'https://example.com',
      })

      expect(result.url).toContain('preview')
      expect(result.url).toContain('feature-docs-update') // URL-safe branch name
    })
  })
})

// =============================================================================
// Incremental Deployment Tests
// =============================================================================

describe('Incremental Deployment', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('getChangedFiles', () => {
    it('should extract added files from push event', async () => {
      const { getChangedFiles } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Add pages',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: ['docs/page1.mdx', 'docs/page2.mdx'],
          removed: [],
          modified: [],
        }],
      })

      const result = getChangedFiles(payload)

      expect(result.added).toContain('docs/page1.mdx')
      expect(result.added).toContain('docs/page2.mdx')
    })

    it('should extract modified files from push event', async () => {
      const { getChangedFiles } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Update pages',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: [],
          removed: [],
          modified: ['docs/page1.mdx', 'docs/page2.mdx'],
        }],
      })

      const result = getChangedFiles(payload)

      expect(result.modified).toContain('docs/page1.mdx')
      expect(result.modified).toContain('docs/page2.mdx')
    })

    it('should extract removed files from push event', async () => {
      const { getChangedFiles } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Remove pages',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: [],
          removed: ['docs/old-page.mdx'],
          modified: [],
        }],
      })

      const result = getChangedFiles(payload)

      expect(result.removed).toContain('docs/old-page.mdx')
    })

    it('should deduplicate files across multiple commits', async () => {
      const { getChangedFiles } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [
          {
            id: 'commit1',
            tree_id: 'tree1',
            message: 'First change',
            timestamp: '2024-01-15T10:00:00Z',
            author: { name: 'User', email: 'user@example.com', username: 'user' },
            added: [],
            removed: [],
            modified: ['docs/page.mdx'],
          },
          {
            id: 'commit2',
            tree_id: 'tree2',
            message: 'Second change',
            timestamp: '2024-01-15T10:01:00Z',
            author: { name: 'User', email: 'user@example.com', username: 'user' },
            added: [],
            removed: [],
            modified: ['docs/page.mdx'], // Same file modified again
          },
        ],
      })

      const result = getChangedFiles(payload)

      // File should only appear once
      expect(result.modified.filter((f) => f === 'docs/page.mdx')).toHaveLength(1)
    })

    it('should filter to only MDX files', async () => {
      const { getChangedFiles } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Mixed changes',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: ['docs/page.mdx', 'package.json'],
          removed: ['old.mdx', 'config.js'],
          modified: ['README.md', 'content.mdx'],
        }],
      })

      const result = getChangedFiles(payload, { mdxOnly: true })

      expect(result.added).toContain('docs/page.mdx')
      expect(result.added).not.toContain('package.json')
      expect(result.removed).toContain('old.mdx')
      expect(result.removed).not.toContain('config.js')
      expect(result.modified).toContain('content.mdx')
      expect(result.modified).not.toContain('README.md')
    })
  })

  describe('incrementalDeploy', () => {
    it('should only deploy changed files', async () => {
      const { incrementalDeploy, parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Update one page',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: [],
          removed: [],
          modified: ['docs/changed-page.mdx'],
        }],
      })

      const event = parseGitHubPushEvent(payload)

      mockStub.storeContent.mockResolvedValue({
        id: 'docs/changed-page',
        hash: 'newHash',
        content: '# Changed',
        data: {},
        size: 9,
        storedAt: new Date(),
        version: 2,
      })

      const result = await incrementalDeploy(event, env, {
        fetchContent: async (path) => `# Content for ${path}`,
      })

      expect(result.deployedFiles).toHaveLength(1)
      expect(result.deployedFiles).toContain('docs/changed-page.mdx')
    })

    it('should skip unchanged files based on hash comparison', async () => {
      const { incrementalDeploy, parseGitHubPushEvent } = await import('../src/commands/github-sync.js')

      const payload = createMockPushEvent({
        commits: [{
          id: 'commit1',
          tree_id: 'tree1',
          message: 'Update pages',
          timestamp: '2024-01-15T10:00:00Z',
          author: { name: 'User', email: 'user@example.com', username: 'user' },
          added: [],
          removed: [],
          modified: ['docs/page.mdx'],
        }],
      })

      const event = parseGitHubPushEvent(payload)
      const existingContent = '# Existing Content'

      // Content exists with same hash
      mockStub.getContent.mockResolvedValue({
        id: 'docs/page',
        hash: 'sameHash123',
        content: existingContent,
        data: {},
        size: existingContent.length,
        storedAt: new Date(),
        version: 1,
      })

      const result = await incrementalDeploy(event, env, {
        fetchContent: async () => existingContent, // Same content from GitHub
        computeHash: () => 'sameHash123', // Same hash
      })

      expect(result.skippedFiles).toContain('docs/page.mdx')
      expect(result.deployedFiles).toHaveLength(0)
    })
  })
})

// =============================================================================
// Deployment Status Reporting Tests
// =============================================================================

describe('Deployment Status Reporting', () => {
  let env: StorageEnv

  beforeEach(() => {
    env = createMockEnv()
    // Mock fetch for GitHub API calls
    global.fetch = vi.fn()
  })

  describe('reportDeploymentStatus', () => {
    it('should report pending status to GitHub', async () => {
      const { reportDeploymentStatus } = await import('../src/commands/github-sync.js')

      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })

      const result = await reportDeploymentStatus({
        state: 'pending',
        description: 'Deployment in progress...',
        context: 'mdxe/deploy',
        repository: 'owner/repo',
        sha: 'abc123',
      }, env)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `token ${env.GITHUB_TOKEN}`,
          }),
        })
      )
      expect(result.success).toBe(true)
    })

    it('should report success status with deployment URL', async () => {
      const { reportDeploymentStatus } = await import('../src/commands/github-sync.js')

      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })

      await reportDeploymentStatus({
        state: 'success',
        description: 'Deployment successful!',
        target_url: 'https://example.com/preview/abc123',
        context: 'mdxe/deploy',
        repository: 'owner/repo',
        sha: 'abc123',
      }, env)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('target_url'),
        })
      )
    })

    it('should report failure status with error details', async () => {
      const { reportDeploymentStatus } = await import('../src/commands/github-sync.js')

      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })

      await reportDeploymentStatus({
        state: 'failure',
        description: 'Deployment failed: Invalid MDX syntax',
        context: 'mdxe/deploy',
        repository: 'owner/repo',
        sha: 'abc123',
      }, env)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('failure'),
        })
      )
    })
  })
})

// =============================================================================
// Sync Status Dashboard Data Tests
// =============================================================================

describe('Sync Status Dashboard Data', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('getSyncStatus', () => {
    it('should return overall sync status', async () => {
      const { getSyncStatus } = await import('../src/commands/github-sync.js')

      mockStub.listContent.mockResolvedValue([
        { id: 'page1', hash: 'hash1', version: 2, storedAt: new Date() },
        { id: 'page2', hash: 'hash2', version: 1, storedAt: new Date() },
      ])

      const result = await getSyncStatus(env, {
        repository: 'owner/repo',
        branch: 'main',
      })

      expect(result.totalFiles).toBe(2)
      expect(result.lastSync).toBeDefined()
    })

    it('should report pending changes awaiting sync', async () => {
      const { getSyncStatus } = await import('../src/commands/github-sync.js')

      mockStub.listContent.mockResolvedValue([
        { id: 'page1', hash: 'hash1', version: 2, pendingSync: true },
        { id: 'page2', hash: 'hash2', version: 1, pendingSync: false },
      ])

      const result = await getSyncStatus(env, {
        repository: 'owner/repo',
        branch: 'main',
      })

      expect(result.pendingChanges).toBe(1)
    })

    it('should track sync history', async () => {
      const { getSyncHistory } = await import('../src/commands/github-sync.js')

      // Must mock listContent since getSyncHistory uses it to get a content ID
      mockStub.listContent.mockResolvedValue([
        { id: 'page1', hash: 'hash1', version: 1, storedAt: new Date() },
      ])

      mockStub.getVersionHistory.mockResolvedValue([
        { version: 3, hash: 'hash3', storedAt: new Date(), syncedFromGitHub: true },
        { version: 2, hash: 'hash2', storedAt: new Date(), syncedFromGitHub: true },
        { version: 1, hash: 'hash1', storedAt: new Date(), syncedFromGitHub: false },
      ])

      const result = await getSyncHistory(env, { limit: 10 })

      expect(result.history).toBeDefined()
      expect(result.history.length).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// PR Preview Deployment Tests
// =============================================================================

describe('PR Preview Deployments', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
    global.fetch = vi.fn()
  })

  describe('deployPRPreview', () => {
    it('should deploy preview for PR', async () => {
      const { deployPRPreview } = await import('../src/commands/github-sync.js')

      mockStub.storeContent.mockResolvedValue({
        id: 'docs/page',
        hash: 'previewHash',
        content: '# Preview',
        data: {},
        size: 9,
        storedAt: new Date(),
        version: 1,
      })

      const result = await deployPRPreview({
        prNumber: 123,
        repository: 'owner/repo',
        headSha: 'abc123',
        headBranch: 'feature/new-docs',
      }, env, {
        fetchContent: async () => '# Preview content',
      })

      expect(result.success).toBe(true)
      expect(result.previewUrl).toContain('preview')
      expect(result.previewUrl).toContain('123') // PR number in URL
    })

    it('should use isolated namespace for PR preview', async () => {
      const { deployPRPreview } = await import('../src/commands/github-sync.js')

      mockStub.storeContent.mockResolvedValue({
        id: 'docs/page',
        hash: 'previewHash',
        content: '# Preview',
        data: {},
        size: 9,
        storedAt: new Date(),
        version: 1,
      })

      await deployPRPreview({
        prNumber: 123,
        repository: 'owner/repo',
        headSha: 'abc123',
        headBranch: 'feature/new-docs',
      }, env, {
        fetchContent: async () => '# Preview content',
      })

      // Should create namespace specific to PR
      expect(env.MDXDB.idFromName).toHaveBeenCalledWith(expect.stringContaining('pr-123'))
    })

    it('should cleanup preview after PR merge', async () => {
      const { cleanupPRPreview } = await import('../src/commands/github-sync.js')

      mockStub.listContent.mockResolvedValue([
        { id: 'page1', r2Key: 'r2-key-1' },
        { id: 'page2', r2Key: 'r2-key-2' },
      ])

      const result = await cleanupPRPreview({
        prNumber: 123,
        repository: 'owner/repo',
      }, env)

      expect(result.success).toBe(true)
      expect(result.cleanedFiles).toBeGreaterThan(0)
    })

    it('should comment preview URL on PR', async () => {
      const { commentPreviewUrl } = await import('../src/commands/github-sync.js')

      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })

      await commentPreviewUrl({
        prNumber: 123,
        repository: 'owner/repo',
        previewUrl: 'https://preview-123.example.com',
      }, env)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('issues/123/comments'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('preview-123.example.com'),
        })
      )
    })
  })
})
